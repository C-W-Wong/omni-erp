import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createBatchSchema,
  updateBatchSchema,
  createLandedCostItemSchema,
  updateLandedCostItemSchema,
} from '@/lib/validators/batch';
import { getNextBatchNumber } from '@/server/services/number.service';
import {
  recalculateBatchCosts,
  confirmBatch,
  addLandedCostItem,
  updateLandedCostItem,
  removeLandedCostItem,
} from '@/server/services/batch.service';
import Decimal from 'decimal.js';

export const batchRouter = router({
  // List batches with pagination and filters
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        productId: z.string().optional(),
        supplierId: z.string().optional(),
        warehouseId: z.string().optional(),
        status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, productId, supplierId, warehouseId, status, search } = input;
      const skip = (page - 1) * pageSize;

      const where: {
        productId?: string;
        supplierId?: string;
        warehouseId?: string;
        status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
        OR?: Array<{
          batchNumber?: { contains: string; mode: 'insensitive' };
          product?: {
            name?: { contains: string; mode: 'insensitive' };
            sku?: { contains: string; mode: 'insensitive' };
          };
        }>;
      } = {};

      if (productId) where.productId = productId;
      if (supplierId) where.supplierId = supplierId;
      if (warehouseId) where.warehouseId = warehouseId;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { batchNumber: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
          { product: { sku: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.db.batch.findMany({
          where,
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true } },
            supplier: { select: { id: true, code: true, name: true } },
            warehouse: { select: { id: true, code: true, name: true } },
            _count: { select: { landedCostItems: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        ctx.db.batch.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Get batch by ID with full details
  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const batch = await ctx.db.batch.findUnique({
      where: { id: input },
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

    if (!batch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Batch not found',
      });
    }

    return batch;
  }),

  // Create a new batch
  create: protectedProcedure.input(createBatchSchema).mutation(async ({ ctx, input }) => {
    // Generate batch number
    const batchNumber = await getNextBatchNumber();

    // Calculate total purchase cost
    const totalPurchaseCost = new Decimal(input.quantity)
      .times(input.unitPurchaseCost)
      .toDecimalPlaces(2);

    const batch = await ctx.db.batch.create({
      data: {
        batchNumber,
        productId: input.productId,
        supplierId: input.supplierId || null,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
        unitPurchaseCost: input.unitPurchaseCost,
        totalPurchaseCost: totalPurchaseCost.toNumber(),
        currency: input.currency,
        receivedDate: input.receivedDate || new Date(),
        notes: input.notes || null,
        // Initial calculated values
        totalLandedCost: 0,
        totalCost: totalPurchaseCost.toNumber(),
        costPerUnit: input.unitPurchaseCost,
      },
      include: {
        product: true,
        supplier: true,
        warehouse: true,
        landedCostItems: true,
      },
    });

    return batch;
  }),

  // Update batch (only allowed for DRAFT status)
  update: protectedProcedure.input(updateBatchSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db.batch.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Batch not found',
      });
    }

    if (existing.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot modify confirmed or cancelled batches',
      });
    }

    // Calculate new total purchase cost if quantity or unit cost changed
    const quantity = data.quantity ?? Number(existing.quantity);
    const unitPurchaseCost = data.unitPurchaseCost ?? Number(existing.unitPurchaseCost);
    const totalPurchaseCost = new Decimal(quantity)
      .times(unitPurchaseCost)
      .toDecimalPlaces(2)
      .toNumber();

    await ctx.db.batch.update({
      where: { id },
      data: {
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        unitPurchaseCost: data.unitPurchaseCost,
        totalPurchaseCost,
        currency: data.currency,
        receivedDate: data.receivedDate,
        notes: data.notes,
      },
    });

    // Recalculate costs after update
    return recalculateBatchCosts(id);
  }),

  // Delete batch (only allowed for DRAFT status with no inventory movements)
  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const batch = await ctx.db.batch.findUnique({
      where: { id: input },
    });

    if (!batch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Batch not found',
      });
    }

    if (batch.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete confirmed or cancelled batches',
      });
    }

    // TODO: Check for inventory movements when inventory module is implemented

    // Delete batch (cascade will remove landed cost items)
    await ctx.db.batch.delete({
      where: { id: input },
    });

    return { success: true };
  }),

  // Confirm batch - locks costs
  confirm: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // Get user ID from session
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    return confirmBatch(input, userId);
  }),

  // Cancel batch
  cancel: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const batch = await ctx.db.batch.findUnique({
      where: { id: input },
    });

    if (!batch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Batch not found',
      });
    }

    if (batch.status === 'CANCELLED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Batch is already cancelled',
      });
    }

    // TODO: Check for inventory movements when inventory module is implemented

    return ctx.db.batch.update({
      where: { id: input },
      data: { status: 'CANCELLED' },
      include: {
        product: true,
        supplier: true,
        warehouse: true,
        landedCostItems: {
          include: { costType: true },
        },
      },
    });
  }),

  // ==================
  // Landed Cost Items
  // ==================

  // Add landed cost item
  addCostItem: protectedProcedure.input(createLandedCostItemSchema).mutation(async ({ input }) => {
    return addLandedCostItem(input);
  }),

  // Update landed cost item
  updateCostItem: protectedProcedure
    .input(updateLandedCostItemSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateLandedCostItem(id, data);
    }),

  // Remove landed cost item
  removeCostItem: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    return removeLandedCostItem(input);
  }),

  // Get batch statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, draft, confirmed, cancelled] = await Promise.all([
      ctx.db.batch.count(),
      ctx.db.batch.count({ where: { status: 'DRAFT' } }),
      ctx.db.batch.count({ where: { status: 'CONFIRMED' } }),
      ctx.db.batch.count({ where: { status: 'CANCELLED' } }),
    ]);

    // Get total value of confirmed batches
    const confirmedBatches = await ctx.db.batch.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { totalCost: true },
    });

    return {
      total,
      draft,
      confirmed,
      cancelled,
      totalConfirmedValue: confirmedBatches._sum.totalCost?.toNumber() || 0,
    };
  }),
});
