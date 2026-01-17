import { db } from '../db';
import { TRPCError } from '@trpc/server';
import Decimal from 'decimal.js';
import type { Inventory, Batch } from '@prisma/client';

type AllocationMethod = 'FIFO' | 'LIFO' | 'SPECIFIC' | 'WEIGHTED_AVG';

interface AllocationResult {
  batchId: string;
  quantity: Decimal;
  costPerUnit: Decimal;
  totalCost: Decimal;
}

/**
 * Get available inventory for a product in a warehouse
 */
export async function getAvailableInventory(
  productId: string,
  warehouseId?: string
): Promise<
  Array<{
    inventory: Inventory;
    batch: Batch;
    availableQuantity: Decimal;
  }>
> {
  const where: { productId: string; warehouseId?: string } = { productId };
  if (warehouseId) where.warehouseId = warehouseId;

  const inventoryRecords = await db.inventory.findMany({
    where,
    include: {
      batch: true,
    },
    orderBy: {
      batch: { receivedDate: 'asc' },
    },
  });

  return inventoryRecords
    .map((inv) => ({
      inventory: inv,
      batch: inv.batch,
      availableQuantity: new Decimal(inv.quantity.toString()).minus(
        inv.reservedQuantity.toString()
      ),
    }))
    .filter((item) => item.availableQuantity.gt(0));
}

/**
 * Allocate inventory using FIFO (First In, First Out)
 */
export async function allocateFIFO(
  productId: string,
  requiredQuantity: number,
  warehouseId?: string
): Promise<AllocationResult[]> {
  const available = await getAvailableInventory(productId, warehouseId);

  // Sort by batch received date (oldest first)
  available.sort(
    (a, b) => new Date(a.batch.receivedDate).getTime() - new Date(b.batch.receivedDate).getTime()
  );

  return allocateFromBatches(available, new Decimal(requiredQuantity));
}

/**
 * Allocate inventory using LIFO (Last In, First Out)
 */
export async function allocateLIFO(
  productId: string,
  requiredQuantity: number,
  warehouseId?: string
): Promise<AllocationResult[]> {
  const available = await getAvailableInventory(productId, warehouseId);

  // Sort by batch received date (newest first)
  available.sort(
    (a, b) => new Date(b.batch.receivedDate).getTime() - new Date(a.batch.receivedDate).getTime()
  );

  return allocateFromBatches(available, new Decimal(requiredQuantity));
}

/**
 * Allocate inventory from specific batches
 */
export async function allocateSpecific(
  allocations: Array<{ batchId: string; quantity: number }>
): Promise<AllocationResult[]> {
  const results: AllocationResult[] = [];

  for (const allocation of allocations) {
    const inventory = await db.inventory.findFirst({
      where: { batchId: allocation.batchId },
      include: { batch: true },
    });

    if (!inventory) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Batch ${allocation.batchId} not found in inventory`,
      });
    }

    const availableQty = new Decimal(inventory.quantity.toString()).minus(
      inventory.reservedQuantity.toString()
    );

    if (availableQty.lt(allocation.quantity)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient quantity in batch. Available: ${availableQty}, Requested: ${allocation.quantity}`,
      });
    }

    const costPerUnit = new Decimal(inventory.batch.costPerUnit.toString());
    const qty = new Decimal(allocation.quantity);

    results.push({
      batchId: allocation.batchId,
      quantity: qty,
      costPerUnit,
      totalCost: qty.times(costPerUnit),
    });
  }

  return results;
}

/**
 * Calculate weighted average cost for a product
 */
export async function calculateWeightedAverageCost(
  productId: string,
  warehouseId?: string
): Promise<Decimal> {
  const available = await getAvailableInventory(productId, warehouseId);

  if (available.length === 0) {
    return new Decimal(0);
  }

  let totalValue = new Decimal(0);
  let totalQuantity = new Decimal(0);

  for (const item of available) {
    const qty = item.availableQuantity;
    const cost = new Decimal(item.batch.costPerUnit.toString());
    totalValue = totalValue.plus(qty.times(cost));
    totalQuantity = totalQuantity.plus(qty);
  }

  return totalQuantity.gt(0) ? totalValue.div(totalQuantity) : new Decimal(0);
}

/**
 * Allocate inventory using Weighted Average cost
 * Returns allocation using FIFO but with weighted average cost applied
 */
export async function allocateWeightedAvg(
  productId: string,
  requiredQuantity: number,
  warehouseId?: string
): Promise<AllocationResult[]> {
  const avgCost = await calculateWeightedAverageCost(productId, warehouseId);
  const allocations = await allocateFIFO(productId, requiredQuantity, warehouseId);

  // Apply weighted average cost to all allocations
  return allocations.map((alloc) => ({
    ...alloc,
    costPerUnit: avgCost,
    totalCost: alloc.quantity.times(avgCost),
  }));
}

/**
 * Main allocation function - routes to appropriate method
 */
export async function allocateInventory(
  productId: string,
  requiredQuantity: number,
  method: AllocationMethod,
  warehouseId?: string,
  specificAllocations?: Array<{ batchId: string; quantity: number }>
): Promise<AllocationResult[]> {
  switch (method) {
    case 'FIFO':
      return allocateFIFO(productId, requiredQuantity, warehouseId);
    case 'LIFO':
      return allocateLIFO(productId, requiredQuantity, warehouseId);
    case 'SPECIFIC':
      if (!specificAllocations) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Specific allocations required for SPECIFIC method',
        });
      }
      return allocateSpecific(specificAllocations);
    case 'WEIGHTED_AVG':
      return allocateWeightedAvg(productId, requiredQuantity, warehouseId);
    default:
      return allocateFIFO(productId, requiredQuantity, warehouseId);
  }
}

/**
 * Helper function to allocate from sorted batches
 */
function allocateFromBatches(
  available: Array<{
    inventory: Inventory;
    batch: Batch;
    availableQuantity: Decimal;
  }>,
  requiredQuantity: Decimal
): AllocationResult[] {
  const results: AllocationResult[] = [];
  let remaining = requiredQuantity;

  for (const item of available) {
    if (remaining.lte(0)) break;

    const allocateQty = Decimal.min(remaining, item.availableQuantity);
    const costPerUnit = new Decimal(item.batch.costPerUnit.toString());

    results.push({
      batchId: item.batch.id,
      quantity: allocateQty,
      costPerUnit,
      totalCost: allocateQty.times(costPerUnit),
    });

    remaining = remaining.minus(allocateQty);
  }

  if (remaining.gt(0)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient inventory. Short by ${remaining} units`,
    });
  }

  return results;
}

/**
 * Reserve inventory for an order
 */
export async function reserveInventory(
  allocations: AllocationResult[],
  warehouseId: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const alloc of allocations) {
      await tx.inventory.updateMany({
        where: {
          batchId: alloc.batchId,
          warehouseId,
        },
        data: {
          reservedQuantity: {
            increment: alloc.quantity.toNumber(),
          },
        },
      });
    }
  });
}

/**
 * Release reserved inventory (e.g., order cancelled)
 */
export async function releaseReservation(
  allocations: AllocationResult[],
  warehouseId: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const alloc of allocations) {
      await tx.inventory.updateMany({
        where: {
          batchId: alloc.batchId,
          warehouseId,
        },
        data: {
          reservedQuantity: {
            decrement: alloc.quantity.toNumber(),
          },
        },
      });
    }
  });
}

/**
 * Deduct inventory (after shipment)
 */
export async function deductInventory(
  allocations: AllocationResult[],
  warehouseId: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const alloc of allocations) {
      await tx.inventory.updateMany({
        where: {
          batchId: alloc.batchId,
          warehouseId,
        },
        data: {
          quantity: {
            decrement: alloc.quantity.toNumber(),
          },
          reservedQuantity: {
            decrement: alloc.quantity.toNumber(),
          },
        },
      });
    }
  });
}

/**
 * Add inventory from batch receipt
 */
export async function addInventoryFromBatch(
  batchId: string,
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<Inventory> {
  // Upsert inventory record
  return db.inventory.upsert({
    where: {
      productId_batchId_warehouseId: {
        productId,
        batchId,
        warehouseId,
      },
    },
    create: {
      productId,
      batchId,
      warehouseId,
      quantity,
      reservedQuantity: 0,
    },
    update: {
      quantity: {
        increment: quantity,
      },
    },
  });
}

/**
 * Get inventory summary by product
 */
export async function getInventorySummaryByProduct(productId: string) {
  const inventory = await db.inventory.findMany({
    where: { productId },
    include: {
      batch: true,
      warehouse: true,
    },
  });

  let totalQuantity = new Decimal(0);
  let totalReserved = new Decimal(0);
  let totalValue = new Decimal(0);

  for (const inv of inventory) {
    const qty = new Decimal(inv.quantity.toString());
    const reserved = new Decimal(inv.reservedQuantity.toString());
    const costPerUnit = new Decimal(inv.batch.costPerUnit.toString());

    totalQuantity = totalQuantity.plus(qty);
    totalReserved = totalReserved.plus(reserved);
    totalValue = totalValue.plus(qty.times(costPerUnit));
  }

  return {
    totalQuantity: totalQuantity.toNumber(),
    totalReserved: totalReserved.toNumber(),
    availableQuantity: totalQuantity.minus(totalReserved).toNumber(),
    totalValue: totalValue.toDecimalPlaces(2).toNumber(),
    avgCostPerUnit: totalQuantity.gt(0)
      ? totalValue.div(totalQuantity).toDecimalPlaces(4).toNumber()
      : 0,
  };
}
