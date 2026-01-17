import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createSalesOrderSchema,
  updateSalesOrderSchema,
  salesOrderFilterSchema,
  shipGoodsSchema,
} from '@/lib/validators/salesOrder';
import { generateNumber } from '@/server/services/number.service';
import { allocateInventory } from '@/server/services/inventory.service';
import Decimal from 'decimal.js';

export const salesOrderRouter = router({
  // List sales orders with filters
  list: protectedProcedure
    .input(salesOrderFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      const {
        status,
        customerId,
        warehouseId,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = input || {};
      const skip = (page - 1) * pageSize;

      const where: {
        status?: 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
        customerId?: string;
        warehouseId?: string;
        orderDate?: { gte?: Date; lte?: Date };
      } = {};

      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (warehouseId) where.warehouseId = warehouseId;
      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate.gte = startDate;
        if (endDate) where.orderDate.lte = endDate;
      }

      const [items, total] = await Promise.all([
        ctx.db.salesOrder.findMany({
          where,
          include: {
            customer: { select: { id: true, code: true, name: true } },
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
        ctx.db.salesOrder.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Get sales order by ID
  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const order = await ctx.db.salesOrder.findUnique({
      where: { id: input },
      include: {
        customer: true,
        warehouse: true,
        createdBy: { select: { id: true, name: true, email: true } },
        confirmedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, unit: true, defaultPrice: true },
            },
            allocations: {
              include: {
                batch: { select: { id: true, batchNumber: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found' });
    }

    return order;
  }),

  // Create sales order
  create: protectedProcedure.input(createSalesOrderSchema).mutation(async ({ ctx, input }) => {
    const orderNumber = await generateNumber('sales');

    // Calculate totals
    let subtotal = new Decimal(0);
    const itemsWithTotals = input.items.map((item) => {
      const amount = new Decimal(item.quantity).times(item.unitPrice);
      subtotal = subtotal.plus(amount);
      return {
        ...item,
        amount: amount.toDecimalPlaces(2).toNumber(),
      };
    });

    const taxAmount = subtotal.times(input.taxRate || 0);
    const shippingFee = new Decimal(input.shippingFee || 0);
    const totalAmount = subtotal.plus(taxAmount).plus(shippingFee);

    return ctx.db.salesOrder.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        warehouseId: input.warehouseId,
        currency: input.currency,
        expectedShipDate: input.expectedShipDate,
        shippingAddress: input.shippingAddress,
        taxRate: input.taxRate || 0,
        shippingFee: shippingFee.toNumber(),
        notes: input.notes,
        subtotal: subtotal.toDecimalPlaces(2).toNumber(),
        taxAmount: taxAmount.toDecimalPlaces(2).toNumber(),
        totalAmount: totalAmount.toDecimalPlaces(2).toNumber(),
        createdById: ctx.session.user.id,
        items: {
          create: itemsWithTotals.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            notes: item.notes,
          })),
        },
      },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }),

  // Update sales order (only draft)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateSalesOrderSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.salesOrder.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found' });
      }

      if (order.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft orders can be edited',
        });
      }

      const updateData: {
        customerId?: string;
        warehouseId?: string;
        currency?: string;
        expectedShipDate?: Date | null;
        shippingAddress?: string | null;
        taxRate?: number;
        shippingFee?: number;
        notes?: string | null;
        subtotal?: number;
        taxAmount?: number;
        totalAmount?: number;
      } = {};

      if (input.data.customerId) updateData.customerId = input.data.customerId;
      if (input.data.warehouseId) updateData.warehouseId = input.data.warehouseId;
      if (input.data.currency) updateData.currency = input.data.currency;
      if (input.data.expectedShipDate !== undefined)
        updateData.expectedShipDate = input.data.expectedShipDate;
      if (input.data.shippingAddress !== undefined)
        updateData.shippingAddress = input.data.shippingAddress;
      if (input.data.taxRate !== undefined) updateData.taxRate = input.data.taxRate;
      if (input.data.shippingFee !== undefined) updateData.shippingFee = input.data.shippingFee;
      if (input.data.notes !== undefined) updateData.notes = input.data.notes;

      // If items are provided, recalculate totals
      if (input.data.items) {
        let subtotal = new Decimal(0);
        const itemsWithTotals = input.data.items.map((item) => {
          const amount = new Decimal(item.quantity).times(item.unitPrice);
          subtotal = subtotal.plus(amount);
          return {
            ...item,
            amount: amount.toDecimalPlaces(2).toNumber(),
          };
        });

        const taxRate = input.data.taxRate ?? Number(order.taxRate);
        const shippingFee = new Decimal(input.data.shippingFee ?? Number(order.shippingFee));
        const taxAmount = subtotal.times(taxRate);
        const totalAmount = subtotal.plus(taxAmount).plus(shippingFee);

        updateData.subtotal = subtotal.toDecimalPlaces(2).toNumber();
        updateData.taxAmount = taxAmount.toDecimalPlaces(2).toNumber();
        updateData.totalAmount = totalAmount.toDecimalPlaces(2).toNumber();

        // Delete existing items and create new ones in a transaction
        return ctx.db.$transaction(async (tx) => {
          await tx.salesOrderItem.deleteMany({
            where: { salesOrderId: input.id },
          });

          return tx.salesOrder.update({
            where: { id: input.id },
            data: {
              ...updateData,
              items: {
                create: itemsWithTotals.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: item.amount,
                  notes: item.notes,
                })),
              },
            },
            include: {
              customer: true,
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

      return ctx.db.salesOrder.update({
        where: { id: input.id },
        data: updateData,
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Confirm sales order (DRAFT -> CONFIRMED)
  // This allocates inventory from batches based on the configured allocation method
  confirm: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.salesOrder.findUnique({
      where: { id: input },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found' });
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

    // Allocate inventory and calculate costs in a transaction
    return ctx.db.$transaction(async (tx) => {
      let totalCost = new Decimal(0);

      for (const item of order.items) {
        // Allocate inventory using FIFO (default)
        const allocations = await allocateInventory(
          item.productId,
          Number(item.quantity),
          'FIFO',
          order.warehouseId
        );

        // Calculate item cost
        let itemCost = new Decimal(0);
        for (const alloc of allocations) {
          itemCost = itemCost.plus(alloc.totalCost);

          // Create allocation record
          await tx.salesOrderAllocation.create({
            data: {
              salesOrderItemId: item.id,
              batchId: alloc.batchId,
              quantity: alloc.quantity.toNumber(),
              costPerUnit: alloc.costPerUnit.toNumber(),
            },
          });

          // Reserve inventory
          await tx.inventory.updateMany({
            where: {
              batchId: alloc.batchId,
              warehouseId: order.warehouseId,
            },
            data: {
              reservedQuantity: {
                increment: alloc.quantity.toNumber(),
              },
            },
          });
        }

        // Update item with cost info
        const unitCost = itemCost.div(item.quantity);
        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: {
            unitCost: unitCost.toDecimalPlaces(6).toNumber(),
            costAmount: itemCost.toDecimalPlaces(2).toNumber(),
          },
        });

        totalCost = totalCost.plus(itemCost);
      }

      // Update order status and total cost
      return tx.salesOrder.update({
        where: { id: input },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedById: ctx.session.user.id,
          totalCost: totalCost.toDecimalPlaces(2).toNumber(),
        },
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: true,
              allocations: {
                include: { batch: true },
              },
            },
          },
        },
      });
    });
  }),

  // Cancel sales order
  cancel: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.salesOrder.findUnique({
      where: { id: input },
      include: {
        items: {
          include: { allocations: true },
        },
      },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found' });
    }

    if (
      order.status === 'SHIPPED' ||
      order.status === 'COMPLETED' ||
      order.status === 'CANCELLED'
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot cancel a shipped, completed, or already cancelled order',
      });
    }

    // Release reserved inventory if order was confirmed
    if (order.status === 'CONFIRMED' || order.status === 'PROCESSING') {
      await ctx.db.$transaction(async (tx) => {
        for (const item of order.items) {
          for (const alloc of item.allocations) {
            await tx.inventory.updateMany({
              where: {
                batchId: alloc.batchId,
                warehouseId: order.warehouseId,
              },
              data: {
                reservedQuantity: {
                  decrement: Number(alloc.quantity),
                },
              },
            });
          }
        }
      });
    }

    return ctx.db.salesOrder.update({
      where: { id: input },
      data: { status: 'CANCELLED' },
    });
  }),

  // Delete sales order (only draft)
  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.salesOrder.findUnique({
      where: { id: input },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found' });
    }

    if (order.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft orders can be deleted',
      });
    }

    return ctx.db.salesOrder.delete({
      where: { id: input },
    });
  }),

  // Ship goods (CONFIRMED/PROCESSING -> PROCESSING/SHIPPED)
  ship: protectedProcedure.input(shipGoodsSchema).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.salesOrder.findUnique({
      where: { id: input.salesOrderId },
      include: {
        items: {
          include: {
            product: true,
            allocations: true,
          },
        },
      },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found' });
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'PROCESSING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only confirmed or processing orders can be shipped',
      });
    }

    // Validate items exist and quantities are valid
    for (const item of input.items) {
      const orderItem = order.items.find((i) => i.id === item.salesOrderItemId);
      if (!orderItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Order item ${item.salesOrderItemId} not found`,
        });
      }

      const remainingQty = new Decimal(orderItem.quantity.toString()).minus(
        orderItem.shippedQuantity.toString()
      );

      if (new Decimal(item.quantityShipped).gt(remainingQty)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot ship more than remaining quantity for ${orderItem.product.name}. Remaining: ${remainingQty}`,
        });
      }
    }

    // Process shipment in a transaction
    return ctx.db.$transaction(async (tx) => {
      for (const item of input.items) {
        const orderItem = order.items.find((i) => i.id === item.salesOrderItemId)!;
        const shipQty = new Decimal(item.quantityShipped);

        // Deduct inventory from allocated batches (FIFO order)
        let remainingToShip = shipQty;
        for (const alloc of orderItem.allocations) {
          if (remainingToShip.lte(0)) break;

          const allocQty = new Decimal(alloc.quantity.toString());
          const deductQty = Decimal.min(remainingToShip, allocQty);

          // Deduct from inventory
          await tx.inventory.updateMany({
            where: {
              batchId: alloc.batchId,
              warehouseId: order.warehouseId,
            },
            data: {
              quantity: { decrement: deductQty.toNumber() },
              reservedQuantity: { decrement: deductQty.toNumber() },
            },
          });

          remainingToShip = remainingToShip.minus(deductQty);
        }

        // Update shipped quantity
        await tx.salesOrderItem.update({
          where: { id: item.salesOrderItemId },
          data: {
            shippedQuantity: {
              increment: shipQty.toNumber(),
            },
          },
        });
      }

      // Check if order is fully shipped
      const updatedOrder = await tx.salesOrder.findUnique({
        where: { id: input.salesOrderId },
        include: { items: true },
      });

      const isFullyShipped = updatedOrder!.items.every((item) =>
        new Decimal(item.shippedQuantity.toString()).gte(item.quantity.toString())
      );

      // Update order status
      const newStatus = isFullyShipped ? 'SHIPPED' : 'PROCESSING';
      return tx.salesOrder.update({
        where: { id: input.salesOrderId },
        data: {
          status: newStatus,
          shippedDate: isFullyShipped ? new Date() : undefined,
        },
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: true,
              allocations: {
                include: { batch: true },
              },
            },
          },
        },
      });
    });
  }),

  // Complete order (SHIPPED -> COMPLETED)
  complete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const order = await ctx.db.salesOrder.findUnique({
      where: { id: input },
    });

    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found' });
    }

    if (order.status !== 'SHIPPED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only shipped orders can be completed',
      });
    }

    return ctx.db.salesOrder.update({
      where: { id: input },
      data: { status: 'COMPLETED' },
    });
  }),

  // Get statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [draft, confirmed, processing, shipped, completed] = await Promise.all([
      ctx.db.salesOrder.count({ where: { status: 'DRAFT' } }),
      ctx.db.salesOrder.count({ where: { status: 'CONFIRMED' } }),
      ctx.db.salesOrder.count({ where: { status: 'PROCESSING' } }),
      ctx.db.salesOrder.count({ where: { status: 'SHIPPED' } }),
      ctx.db.salesOrder.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Get total value of pending orders (confirmed + processing)
    const pendingOrders = await ctx.db.salesOrder.findMany({
      where: { status: { in: ['CONFIRMED', 'PROCESSING'] } },
      select: { totalAmount: true },
    });

    const pendingValue = pendingOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      draft,
      confirmed,
      processing,
      shipped,
      completed,
      pendingValue,
    };
  }),
});
