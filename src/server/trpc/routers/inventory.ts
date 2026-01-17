import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  inventoryFilterSchema,
  updateSystemSettingSchema,
  allocationMethodSchema,
} from '@/lib/validators/inventory';
import { getAvailableInventory, allocateInventory } from '@/server/services/inventory.service';

export const inventoryRouter = router({
  // List inventory with filters
  list: protectedProcedure.input(inventoryFilterSchema.optional()).query(async ({ ctx, input }) => {
    const { productId, warehouseId, batchId, lowStock, page = 1, pageSize = 20 } = input || {};
    const skip = (page - 1) * pageSize;

    const where: {
      productId?: string;
      warehouseId?: string;
      batchId?: string;
    } = {};

    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (batchId) where.batchId = batchId;

    const [items, total] = await Promise.all([
      ctx.db.inventory.findMany({
        where,
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true, minStockLevel: true } },
          batch: { select: { id: true, batchNumber: true, costPerUnit: true, status: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ product: { name: 'asc' } }, { batch: { receivedDate: 'desc' } }],
        skip,
        take: pageSize,
      }),
      ctx.db.inventory.count({ where }),
    ]);

    // Filter low stock items if requested
    let filteredItems = items;
    if (lowStock) {
      filteredItems = items.filter((inv) => {
        const available = Number(inv.quantity) - Number(inv.reservedQuantity);
        return available <= inv.product.minStockLevel;
      });
    }

    return {
      items: filteredItems,
      total: lowStock ? filteredItems.length : total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }),

  // Get inventory summary by product (aggregated view)
  summaryByProduct: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        lowStockOnly: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, lowStockOnly } = input;
      const skip = (page - 1) * pageSize;

      // Get products with inventory
      const productWhere = {
        ...(search && {
          OR: [
            { sku: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        inventory: { some: {} },
      };

      const [products, total] = await Promise.all([
        ctx.db.product.findMany({
          where: productWhere,
          include: {
            inventory: {
              include: {
                batch: true,
                warehouse: true,
              },
            },
          },
          skip,
          take: pageSize,
          orderBy: { name: 'asc' },
        }),
        ctx.db.product.count({ where: productWhere }),
      ]);

      const summaries = products.map((product) => {
        let totalQty = 0;
        let totalReserved = 0;
        let totalValue = 0;

        for (const inv of product.inventory) {
          const qty = Number(inv.quantity);
          const reserved = Number(inv.reservedQuantity);
          const cost = Number(inv.batch.costPerUnit);

          totalQty += qty;
          totalReserved += reserved;
          totalValue += qty * cost;
        }

        const available = totalQty - totalReserved;

        return {
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            minStockLevel: product.minStockLevel,
          },
          totalQuantity: totalQty,
          reservedQuantity: totalReserved,
          availableQuantity: available,
          totalValue,
          avgCostPerUnit: totalQty > 0 ? totalValue / totalQty : 0,
          isLowStock: available <= product.minStockLevel,
          warehouseCount: new Set(product.inventory.map((i) => i.warehouseId)).size,
          batchCount: product.inventory.length,
        };
      });

      const filtered = lowStockOnly ? summaries.filter((s) => s.isLowStock) : summaries;

      return {
        items: filtered,
        total: lowStockOnly ? filtered.length : total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Get inventory detail by warehouse
  byWarehouse: protectedProcedure.input(z.string()).query(async ({ ctx, input: warehouseId }) => {
    const warehouse = await ctx.db.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Warehouse not found' });
    }

    const inventory = await ctx.db.inventory.findMany({
      where: { warehouseId },
      include: {
        product: true,
        batch: true,
      },
      orderBy: { product: { name: 'asc' } },
    });

    return {
      warehouse,
      inventory,
    };
  }),

  // Check available quantity for a product
  checkAvailability: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        warehouseId: z.string().optional(),
        quantity: z.number().positive(),
      })
    )
    .query(async ({ input }) => {
      const available = await getAvailableInventory(input.productId, input.warehouseId);

      const totalAvailable = available.reduce(
        (sum, item) => sum + item.availableQuantity.toNumber(),
        0
      );

      return {
        isAvailable: totalAvailable >= input.quantity,
        availableQuantity: totalAvailable,
        requestedQuantity: input.quantity,
        shortfall: Math.max(0, input.quantity - totalAvailable),
        batches: available.map((item) => ({
          batchId: item.batch.id,
          batchNumber: item.batch.batchNumber,
          availableQuantity: item.availableQuantity.toNumber(),
          costPerUnit: Number(item.batch.costPerUnit),
        })),
      };
    }),

  // Simulate allocation (preview without committing)
  previewAllocation: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().positive(),
        method: allocationMethodSchema.default('FIFO'),
        warehouseId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const allocations = await allocateInventory(
          input.productId,
          input.quantity,
          input.method,
          input.warehouseId
        );

        const totalCost = allocations.reduce((sum, a) => sum + a.totalCost.toNumber(), 0);

        return {
          success: true,
          allocations: allocations.map((a) => ({
            batchId: a.batchId,
            quantity: a.quantity.toNumber(),
            costPerUnit: a.costPerUnit.toNumber(),
            totalCost: a.totalCost.toNumber(),
          })),
          totalQuantity: input.quantity,
          totalCost,
          avgCostPerUnit: totalCost / input.quantity,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          return {
            success: false,
            error: error.message,
            allocations: [],
            totalQuantity: input.quantity,
            totalCost: 0,
            avgCostPerUnit: 0,
          };
        }
        throw error;
      }
    }),

  // Get inventory statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [totalProducts, totalValue, lowStockCount, warehouseStats] = await Promise.all([
      ctx.db.inventory
        .groupBy({
          by: ['productId'],
        })
        .then((groups) => groups.length),

      ctx.db.inventory
        .findMany({
          include: { batch: true },
        })
        .then((items) =>
          items.reduce((sum, inv) => sum + Number(inv.quantity) * Number(inv.batch.costPerUnit), 0)
        ),

      ctx.db.product
        .findMany({
          where: { isActive: true },
          include: {
            inventory: true,
          },
        })
        .then(
          (products) =>
            products.filter((p) => {
              const total = p.inventory.reduce(
                (sum, i) => sum + Number(i.quantity) - Number(i.reservedQuantity),
                0
              );
              return total <= p.minStockLevel;
            }).length
        ),

      ctx.db.warehouse.findMany({
        where: { isActive: true },
        include: {
          inventory: {
            include: { batch: true },
          },
        },
      }),
    ]);

    const warehouseSummaries = warehouseStats.map((wh) => ({
      warehouse: { id: wh.id, code: wh.code, name: wh.name },
      productCount: new Set(wh.inventory.map((i) => i.productId)).size,
      totalValue: wh.inventory.reduce(
        (sum, i) => sum + Number(i.quantity) * Number(i.batch.costPerUnit),
        0
      ),
    }));

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      warehouses: warehouseSummaries,
    };
  }),

  // ==================
  // System Settings
  // ==================

  // Get system settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Return as key-value object
    return settings.reduce(
      (acc, s) => {
        acc[s.key] = s.value;
        return acc;
      },
      {} as Record<string, string>
    );
  }),

  // Update system setting
  updateSetting: protectedProcedure
    .input(updateSystemSettingSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.systemSetting.upsert({
        where: { key: input.key },
        create: {
          key: input.key,
          value: input.value,
        },
        update: {
          value: input.value,
        },
      });
    }),

  // Seed default settings
  seedSettings: protectedProcedure.mutation(async ({ ctx }) => {
    const defaults = [
      {
        key: 'ALLOCATION_METHOD',
        value: 'FIFO',
        description: 'Default inventory allocation method',
        isSystem: true,
      },
      {
        key: 'ALLOW_NEGATIVE_INVENTORY',
        value: 'false',
        description: 'Allow inventory to go negative',
        isSystem: true,
      },
      {
        key: 'DEFAULT_CURRENCY',
        value: 'USD',
        description: 'Default currency for transactions',
        isSystem: true,
      },
      {
        key: 'LOW_STOCK_ALERT_ENABLED',
        value: 'true',
        description: 'Enable low stock alerts',
        isSystem: true,
      },
    ];

    const results = [];

    for (const setting of defaults) {
      const existing = await ctx.db.systemSetting.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        const created = await ctx.db.systemSetting.create({ data: setting });
        results.push({ action: 'created', ...created });
      } else {
        results.push({ action: 'skipped', ...existing });
      }
    }

    return results;
  }),
});
