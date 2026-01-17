import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { createTransferSchema } from '@/lib/validators/inventory';
import { generateNumber } from '@/server/services/number.service';

const transferFilterSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']).optional(),
  sourceWarehouseId: z.string().optional(),
  targetWarehouseId: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

export const transferRouter = router({
  // List transfers with filters
  list: protectedProcedure.input(transferFilterSchema.optional()).query(async ({ ctx, input }) => {
    const { status, sourceWarehouseId, targetWarehouseId, page = 1, pageSize = 20 } = input || {};
    const skip = (page - 1) * pageSize;

    const where: {
      status?: 'DRAFT' | 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
      sourceWarehouseId?: string;
      targetWarehouseId?: string;
    } = {};

    if (status) where.status = status;
    if (sourceWarehouseId) where.sourceWarehouseId = sourceWarehouseId;
    if (targetWarehouseId) where.targetWarehouseId = targetWarehouseId;

    const [items, total] = await Promise.all([
      ctx.db.inventoryTransfer.findMany({
        where,
        include: {
          sourceWarehouse: { select: { id: true, code: true, name: true } },
          targetWarehouse: { select: { id: true, code: true, name: true } },
          requestedBy: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true, unit: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      ctx.db.inventoryTransfer.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }),

  // Get transfer by ID
  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const transfer = await ctx.db.inventoryTransfer.findUnique({
      where: { id: input },
      include: {
        sourceWarehouse: true,
        targetWarehouse: true,
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        completedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true } },
            batch: { select: { id: true, batchNumber: true, costPerUnit: true } },
          },
        },
      },
    });

    if (!transfer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }

    return transfer;
  }),

  // Create transfer
  create: protectedProcedure.input(createTransferSchema).mutation(async ({ ctx, input }) => {
    if (input.sourceWarehouseId === input.targetWarehouseId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Source and target warehouses must be different',
      });
    }

    // Validate that all items have sufficient inventory
    for (const item of input.items) {
      const inventory = await ctx.db.inventory.findFirst({
        where: {
          productId: item.productId,
          batchId: item.batchId,
          warehouseId: input.sourceWarehouseId,
        },
      });

      if (!inventory) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Product/batch not found in source warehouse`,
        });
      }

      const available = Number(inventory.quantity) - Number(inventory.reservedQuantity);
      if (available < item.quantity) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient quantity available. Available: ${available}, Requested: ${item.quantity}`,
        });
      }
    }

    const transferNumber = await generateNumber('transfer');

    return ctx.db.inventoryTransfer.create({
      data: {
        transferNumber,
        sourceWarehouseId: input.sourceWarehouseId,
        targetWarehouseId: input.targetWarehouseId,
        notes: input.notes,
        requestedById: ctx.session.user.id,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            batchId: item.batchId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        sourceWarehouse: true,
        targetWarehouse: true,
        items: {
          include: {
            product: true,
            batch: true,
          },
        },
      },
    });
  }),

  // Submit for approval (DRAFT -> PENDING)
  submit: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const transfer = await ctx.db.inventoryTransfer.findUnique({
      where: { id: input },
      include: { items: true },
    });

    if (!transfer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }

    if (transfer.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft transfers can be submitted',
      });
    }

    // Validate inventory availability again
    for (const item of transfer.items) {
      const inventory = await ctx.db.inventory.findFirst({
        where: {
          productId: item.productId,
          batchId: item.batchId,
          warehouseId: transfer.sourceWarehouseId,
        },
      });

      if (!inventory) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Inventory record not found for transfer item',
        });
      }

      const available = Number(inventory.quantity) - Number(inventory.reservedQuantity);
      if (available < Number(item.quantity)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Insufficient inventory available for transfer',
        });
      }
    }

    return ctx.db.inventoryTransfer.update({
      where: { id: input },
      data: { status: 'PENDING' },
    });
  }),

  // Approve transfer (PENDING -> IN_TRANSIT)
  approve: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const transfer = await ctx.db.inventoryTransfer.findUnique({
      where: { id: input },
      include: { items: true },
    });

    if (!transfer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }

    if (transfer.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only pending transfers can be approved',
      });
    }

    // Reserve inventory at source warehouse
    return ctx.db.$transaction(async (tx) => {
      for (const item of transfer.items) {
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            batchId: item.batchId,
            warehouseId: transfer.sourceWarehouseId,
          },
          data: {
            reservedQuantity: {
              increment: Number(item.quantity),
            },
          },
        });
      }

      return tx.inventoryTransfer.update({
        where: { id: input },
        data: {
          status: 'IN_TRANSIT',
          approvedAt: new Date(),
          approvedById: ctx.session.user.id,
        },
      });
    });
  }),

  // Complete transfer (IN_TRANSIT -> COMPLETED)
  complete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const transfer = await ctx.db.inventoryTransfer.findUnique({
      where: { id: input },
      include: { items: true },
    });

    if (!transfer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }

    if (transfer.status !== 'IN_TRANSIT') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only in-transit transfers can be completed',
      });
    }

    return ctx.db.$transaction(async (tx) => {
      for (const item of transfer.items) {
        // Deduct from source warehouse
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            batchId: item.batchId,
            warehouseId: transfer.sourceWarehouseId,
          },
          data: {
            quantity: { decrement: Number(item.quantity) },
            reservedQuantity: { decrement: Number(item.quantity) },
          },
        });

        // Add to target warehouse (upsert)
        await tx.inventory.upsert({
          where: {
            productId_batchId_warehouseId: {
              productId: item.productId,
              batchId: item.batchId,
              warehouseId: transfer.targetWarehouseId,
            },
          },
          create: {
            productId: item.productId,
            batchId: item.batchId,
            warehouseId: transfer.targetWarehouseId,
            quantity: Number(item.quantity),
            reservedQuantity: 0,
          },
          update: {
            quantity: { increment: Number(item.quantity) },
          },
        });
      }

      return tx.inventoryTransfer.update({
        where: { id: input },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedById: ctx.session.user.id,
        },
      });
    });
  }),

  // Cancel transfer (DRAFT/PENDING -> CANCELLED, IN_TRANSIT -> release reservation + CANCELLED)
  cancel: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const transfer = await ctx.db.inventoryTransfer.findUnique({
      where: { id: input },
      include: { items: true },
    });

    if (!transfer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }

    if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot cancel completed or already cancelled transfers',
      });
    }

    return ctx.db.$transaction(async (tx) => {
      // If in transit, release reservations
      if (transfer.status === 'IN_TRANSIT') {
        for (const item of transfer.items) {
          await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              batchId: item.batchId,
              warehouseId: transfer.sourceWarehouseId,
            },
            data: {
              reservedQuantity: { decrement: Number(item.quantity) },
            },
          });
        }
      }

      return tx.inventoryTransfer.update({
        where: { id: input },
        data: { status: 'CANCELLED' },
      });
    });
  }),

  // Delete draft transfer
  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const transfer = await ctx.db.inventoryTransfer.findUnique({
      where: { id: input },
    });

    if (!transfer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }

    if (transfer.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft transfers can be deleted',
      });
    }

    return ctx.db.inventoryTransfer.delete({
      where: { id: input },
    });
  }),
});
