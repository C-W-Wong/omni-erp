import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  purchaseOrderFilterSchema,
  receiveGoodsSchema,
} from '@/lib/validators/purchaseOrder';
import { generateNumber } from '@/server/services/number.service';
import { addInventoryFromBatch } from '@/server/services/inventory.service';
import Decimal from 'decimal.js';

export const purchaseOrderRouter = router({
  // List purchase orders with filters
  list: protectedProcedure
    .input(purchaseOrderFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      const {
        status,
        supplierId,
        warehouseId,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = input || {};
      const skip = (page - 1) * pageSize;

      const where: {
        status?: 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
        supplierId?: string;
        warehouseId?: string;
        orderDate?: { gte?: Date; lte?: Date };
      } = {};

      if (status) where.status = status;
      if (supplierId) where.supplierId = supplierId;
      if (warehouseId) where.warehouseId = warehouseId;
      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate.gte = startDate;
        if (endDate) where.orderDate.lte = endDate;
      }

      const [items, total] = await Promise.all([
        ctx.db.purchaseOrder.findMany({
          where,
          include: {
            supplier: { select: { id: true, code: true, name: true } },
            warehouse: { select: { id: true, code: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            items: {
              include: {
                product: { select: { id: true, sku: true, name: true, unit: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        ctx.db.purchaseOrder.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Get purchase order by ID
  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const order = await ctx.db.purchaseOrder.findUnique({
      where: { id: input },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: { select: { id: true, name: true, email: true } },
        confirmedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, unit: true, defaultPrice: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
    }

    return order;
  }),

  // Create purchase order
  create: protectedProcedure.input(createPurchaseOrderSchema).mutation(async ({ ctx, input }) => {
    const orderNumber = await generateNumber('purchase');

    // Calculate totals
    let subtotal = new Decimal(0);
    const itemsWithTotals = input.items.map((item) => {
      const totalPrice = new Decimal(item.quantity).times(item.unitPrice);
      subtotal = subtotal.plus(totalPrice);
      return {
        ...item,
        totalPrice: totalPrice.toDecimalPlaces(2).toNumber(),
      };
    });

    return ctx.db.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        currency: input.currency,
        expectedDate: input.expectedDate,
        notes: input.notes,
        subtotal: subtotal.toDecimalPlaces(2).toNumber(),
        totalAmount: subtotal.toDecimalPlaces(2).toNumber(),
        createdById: ctx.session.user.id,
        items: {
          create: itemsWithTotals.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
          })),
        },
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }),

  // Update purchase order (only draft)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updatePurchaseOrderSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.purchaseOrder.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
      }

      if (order.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft orders can be edited',
        });
      }

      const updateData: {
        supplierId?: string;
        warehouseId?: string;
        currency?: string;
        expectedDate?: Date | null;
        notes?: string | null;
        subtotal?: number;
        totalAmount?: number;
      } = {};

      if (input.data.supplierId) updateData.supplierId = input.data.supplierId;
      if (input.data.warehouseId) updateData.warehouseId = input.data.warehouseId;
      if (input.data.currency) updateData.currency = input.data.currency;
      if (input.data.expectedDate !== undefined) updateData.expectedDate = input.data.expectedDate;
      if (input.data.notes !== undefined) updateData.notes = input.data.notes;

      // If items are provided, recalculate totals
      if (input.data.items) {
        let subtotal = new Decimal(0);
        const itemsWithTotals = input.data.items.map((item) => {
          const totalPrice = new Decimal(item.quantity).times(item.unitPrice);
          subtotal = subtotal.plus(totalPrice);
          return {
            ...item,
            totalPrice: totalPrice.toDecimalPlaces(2).toNumber(),
          };
        });

        updateData.subtotal = subtotal.toDecimalPlaces(2).toNumber();
        updateData.totalAmount = subtotal.toDecimalPlaces(2).toNumber();

        // Delete existing items and create new ones in a transaction
        return ctx.db.$transaction(async (tx) => {
          await tx.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: input.id },
          });

          return tx.purchaseOrder.update({
            where: { id: input.id },
            data: {
              ...updateData,
              items: {
                create: itemsWithTotals.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  notes: item.notes,
                })),
              },
            },
            include: {
              supplier: true,
              warehouse: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          });
        });
      }

      return ctx.db.purchaseOrder.update({
        where: { id: input.id },
        data: updateData,
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Confirm purchase order (DRAFT -> CONFIRMED)
  confirm: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.purchaseOrder.findUnique({
      where: { id: input },
      include: { items: true },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
    }

    if (order.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft orders can be confirmed',
      });
    }

    if (order.items.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot confirm an order with no items',
      });
    }

    return ctx.db.purchaseOrder.update({
      where: { id: input },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedById: ctx.session.user.id,
      },
    });
  }),

  // Cancel purchase order
  cancel: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.purchaseOrder.findUnique({
      where: { id: input },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
    }

    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot cancel a completed or already cancelled order',
      });
    }

    return ctx.db.purchaseOrder.update({
      where: { id: input },
      data: { status: 'CANCELLED' },
    });
  }),

  // Delete purchase order (only draft)
  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.purchaseOrder.findUnique({
      where: { id: input },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
    }

    if (order.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft orders can be deleted',
      });
    }

    return ctx.db.purchaseOrder.delete({
      where: { id: input },
    });
  }),

  // Receive goods against a purchase order
  receive: protectedProcedure.input(receiveGoodsSchema).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        warehouse: true,
      },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'PARTIAL') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only confirmed or partial orders can receive goods',
      });
    }

    // Validate items exist and quantities are valid
    for (const item of input.items) {
      const orderItem = order.items.find((i) => i.id === item.purchaseOrderItemId);
      if (!orderItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Order item ${item.purchaseOrderItemId} not found`,
        });
      }

      const remainingQty = new Decimal(orderItem.quantity.toString()).minus(
        orderItem.receivedQuantity.toString()
      );

      if (new Decimal(item.quantityReceived).gt(remainingQty)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot receive more than remaining quantity for ${orderItem.product.name}. Remaining: ${remainingQty}`,
        });
      }
    }

    // Process receiving in a transaction
    return ctx.db.$transaction(async (tx) => {
      const createdBatches: Array<{
        batchId: string;
        batchNumber: string;
        productName: string;
        quantity: number;
      }> = [];

      for (const item of input.items) {
        const orderItem = order.items.find((i) => i.id === item.purchaseOrderItemId)!;

        // Generate batch number
        const batchNumber = await generateNumber('batch');

        // Calculate costs
        const quantity = new Decimal(item.quantityReceived);
        const unitPrice = new Decimal(orderItem.unitPrice.toString());
        const totalPurchaseCost = quantity.times(unitPrice);

        // Create batch
        const batch = await tx.batch.create({
          data: {
            batchNumber,
            productId: orderItem.productId,
            supplierId: order.supplierId,
            warehouseId: order.warehouseId,
            purchaseOrderId: order.id,
            quantity: quantity.toNumber(),
            unitPurchaseCost: unitPrice.toNumber(),
            totalPurchaseCost: totalPurchaseCost.toDecimalPlaces(2).toNumber(),
            totalCost: totalPurchaseCost.toDecimalPlaces(2).toNumber(),
            costPerUnit: unitPrice.toDecimalPlaces(4).toNumber(),
            currency: order.currency,
            status: 'DRAFT',
            notes: input.notes,
          },
        });

        // Add inventory
        await addInventoryFromBatch(
          batch.id,
          orderItem.productId,
          order.warehouseId,
          quantity.toNumber()
        );

        // Update order item received quantity
        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: {
            receivedQuantity: {
              increment: quantity.toNumber(),
            },
          },
        });

        createdBatches.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          productName: orderItem.product.name,
          quantity: quantity.toNumber(),
        });
      }

      // Check if order is fully received
      const updatedOrder = await tx.purchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
        include: { items: true },
      });

      const isFullyReceived = updatedOrder!.items.every((item) =>
        new Decimal(item.receivedQuantity.toString()).gte(item.quantity.toString())
      );

      // Update order status
      const newStatus = isFullyReceived ? 'RECEIVED' : 'PARTIAL';
      await tx.purchaseOrder.update({
        where: { id: input.purchaseOrderId },
        data: { status: newStatus },
      });

      return {
        status: newStatus,
        batches: createdBatches,
      };
    });
  }),

  // Get statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [draft, confirmed, partial, received] = await Promise.all([
      ctx.db.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      ctx.db.purchaseOrder.count({ where: { status: 'CONFIRMED' } }),
      ctx.db.purchaseOrder.count({ where: { status: 'PARTIAL' } }),
      ctx.db.purchaseOrder.count({ where: { status: 'RECEIVED' } }),
    ]);

    // Get total value of confirmed and partial orders
    const pendingOrders = await ctx.db.purchaseOrder.findMany({
      where: { status: { in: ['CONFIRMED', 'PARTIAL'] } },
      select: { totalAmount: true },
    });

    const pendingValue = pendingOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      draft,
      confirmed,
      partial,
      received,
      pendingValue,
    };
  }),
});
