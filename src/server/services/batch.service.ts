import { db } from '../db';
import { TRPCError } from '@trpc/server';
import Decimal from 'decimal.js';

/**
 * Calculate and update batch costs based on landed cost items
 */
export async function recalculateBatchCosts(batchId: string) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: { landedCostItems: true },
  });

  if (!batch) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Batch not found',
    });
  }

  // Cannot recalculate confirmed batches
  if (batch.status === 'CONFIRMED') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cannot modify costs of confirmed batches',
    });
  }

  // Sum all landed cost items (in batch currency)
  const totalLandedCost = batch.landedCostItems.reduce((sum, item) => {
    return sum.plus(new Decimal(item.amountInBatchCurrency.toString()));
  }, new Decimal(0));

  // Calculate total cost = purchase cost + landed costs
  const totalPurchaseCost = new Decimal(batch.totalPurchaseCost.toString());
  const totalCost = totalPurchaseCost.plus(totalLandedCost);

  // Calculate cost per unit
  const quantity = new Decimal(batch.quantity.toString());
  const costPerUnit = quantity.gt(0) ? totalCost.div(quantity) : new Decimal(0);

  // Update batch with calculated values
  const updatedBatch = await db.batch.update({
    where: { id: batchId },
    data: {
      totalLandedCost: totalLandedCost.toDecimalPlaces(2).toNumber(),
      totalCost: totalCost.toDecimalPlaces(2).toNumber(),
      costPerUnit: costPerUnit.toDecimalPlaces(4).toNumber(),
    },
    include: {
      product: true,
      supplier: true,
      warehouse: true,
      landedCostItems: {
        include: { costType: true },
        orderBy: { createdAt: 'asc' },
      },
      confirmedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return updatedBatch;
}

/**
 * Confirm batch costs - locks the batch and prevents further cost modifications
 */
export async function confirmBatch(batchId: string, userId: string) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: { landedCostItems: true },
  });

  if (!batch) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Batch not found',
    });
  }

  if (batch.status === 'CONFIRMED') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Batch is already confirmed',
    });
  }

  if (batch.status === 'CANCELLED') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot confirm a cancelled batch',
    });
  }

  // Recalculate costs one final time before confirming
  await recalculateBatchCosts(batchId);

  // Update status to confirmed
  const confirmedBatch = await db.batch.update({
    where: { id: batchId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      confirmedById: userId,
    },
    include: {
      product: true,
      supplier: true,
      warehouse: true,
      landedCostItems: {
        include: { costType: true },
        orderBy: { createdAt: 'asc' },
      },
      confirmedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return confirmedBatch;
}

/**
 * Add a landed cost item to a batch
 */
export async function addLandedCostItem(data: {
  batchId: string;
  costTypeId: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  description?: string;
  referenceNumber?: string;
}) {
  const batch = await db.batch.findUnique({
    where: { id: data.batchId },
  });

  if (!batch) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Batch not found',
    });
  }

  if (batch.status === 'CONFIRMED') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cannot add costs to confirmed batches',
    });
  }

  const currency = data.currency || batch.currency;
  const exchangeRate = data.exchangeRate || 1;
  const amountInBatchCurrency = new Decimal(data.amount).times(exchangeRate).toDecimalPlaces(2);

  // Create the cost item
  const costItem = await db.landedCostItem.create({
    data: {
      batchId: data.batchId,
      costTypeId: data.costTypeId,
      amount: data.amount,
      currency,
      exchangeRate,
      amountInBatchCurrency: amountInBatchCurrency.toNumber(),
      description: data.description,
      referenceNumber: data.referenceNumber,
    },
    include: { costType: true },
  });

  // Recalculate batch costs
  await recalculateBatchCosts(data.batchId);

  return costItem;
}

/**
 * Update a landed cost item
 */
export async function updateLandedCostItem(
  costItemId: string,
  data: {
    amount?: number;
    currency?: string;
    exchangeRate?: number;
    description?: string | null;
    referenceNumber?: string | null;
  }
) {
  const costItem = await db.landedCostItem.findUnique({
    where: { id: costItemId },
    include: { batch: true },
  });

  if (!costItem) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Landed cost item not found',
    });
  }

  if (costItem.batch.status === 'CONFIRMED') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cannot modify costs of confirmed batches',
    });
  }

  // Calculate new amountInBatchCurrency if amount or exchangeRate changed
  const amount = data.amount !== undefined ? data.amount : Number(costItem.amount);
  const exchangeRate =
    data.exchangeRate !== undefined ? data.exchangeRate : Number(costItem.exchangeRate);
  const amountInBatchCurrency = new Decimal(amount).times(exchangeRate).toDecimalPlaces(2);

  // Update the cost item
  const updatedItem = await db.landedCostItem.update({
    where: { id: costItemId },
    data: {
      amount: data.amount,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      amountInBatchCurrency: amountInBatchCurrency.toNumber(),
      description: data.description,
      referenceNumber: data.referenceNumber,
    },
    include: { costType: true },
  });

  // Recalculate batch costs
  await recalculateBatchCosts(costItem.batchId);

  return updatedItem;
}

/**
 * Remove a landed cost item from a batch
 */
export async function removeLandedCostItem(costItemId: string) {
  const costItem = await db.landedCostItem.findUnique({
    where: { id: costItemId },
    include: { batch: true },
  });

  if (!costItem) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Landed cost item not found',
    });
  }

  if (costItem.batch.status === 'CONFIRMED') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cannot remove costs from confirmed batches',
    });
  }

  const batchId = costItem.batchId;

  // Delete the cost item
  await db.landedCostItem.delete({
    where: { id: costItemId },
  });

  // Recalculate batch costs
  await recalculateBatchCosts(batchId);

  return { success: true };
}
