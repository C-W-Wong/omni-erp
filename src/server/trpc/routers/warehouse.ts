import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseFilterSchema,
} from '@/lib/validators/warehouse';

export const warehouseRouter = router({
  list: protectedProcedure.input(warehouseFilterSchema.optional()).query(async ({ ctx, input }) => {
    const {
      search,
      isActive,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = input || {};

    const where = {
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
          { city: { contains: search, mode: 'insensitive' as const } },
          { manager: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    const [items, total] = await Promise.all([
      ctx.db.warehouse.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      ctx.db.warehouse.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const warehouse = await ctx.db.warehouse.findUnique({
      where: { id: input },
    });

    if (!warehouse) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Warehouse not found' });
    }

    return warehouse;
  }),

  create: protectedProcedure.input(createWarehouseSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.warehouse.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Warehouse code already exists' });
    }

    // If setting as default, remove default from others
    if (input.isDefault) {
      await ctx.db.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const data = {
      ...input,
      address: input.address || null,
      city: input.city || null,
      country: input.country || null,
      postalCode: input.postalCode || null,
      phone: input.phone || null,
      manager: input.manager || null,
    };

    return ctx.db.warehouse.create({ data });
  }),

  update: protectedProcedure.input(updateWarehouseSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const warehouse = await ctx.db.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Warehouse not found' });
    }

    if (data.code && data.code !== warehouse.code) {
      const existing = await ctx.db.warehouse.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Warehouse code already exists' });
      }
    }

    // If setting as default, remove default from others
    if (data.isDefault === true) {
      await ctx.db.warehouse.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return ctx.db.warehouse.update({
      where: { id },
      data,
    });
  }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const warehouse = await ctx.db.warehouse.findUnique({ where: { id: input } });
    if (!warehouse) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Warehouse not found' });
    }

    if (warehouse.isDefault) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete the default warehouse. Set another warehouse as default first.',
      });
    }

    return ctx.db.warehouse.delete({ where: { id: input } });
  }),

  toggleActive: protectedProcedure
    .input(z.object({ ids: z.array(z.string()), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.warehouse.updateMany({
        where: { id: { in: input.ids } },
        data: { isActive: input.isActive },
      });
    }),

  listActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, isDefault: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }),

  getDefault: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.warehouse.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }),
});
