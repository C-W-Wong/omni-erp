import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierFilterSchema,
} from '@/lib/validators/supplier';

export const supplierRouter = router({
  list: protectedProcedure.input(supplierFilterSchema.optional()).query(async ({ ctx, input }) => {
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
          { contactPerson: { contains: search, mode: 'insensitive' as const } },
          { country: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    const [items, total] = await Promise.all([
      ctx.db.supplier.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      ctx.db.supplier.count({ where }),
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
    const supplier = await ctx.db.supplier.findUnique({
      where: { id: input },
    });

    if (!supplier) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Supplier not found' });
    }

    return supplier;
  }),

  create: protectedProcedure.input(createSupplierSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.supplier.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Supplier code already exists' });
    }

    const data = {
      ...input,
      email: input.email || null,
      contactPerson: input.contactPerson || null,
      phone: input.phone || null,
      fax: input.fax || null,
      address: input.address || null,
      city: input.city || null,
      country: input.country || null,
      postalCode: input.postalCode || null,
      taxId: input.taxId || null,
      notes: input.notes || null,
    };

    return ctx.db.supplier.create({ data });
  }),

  update: protectedProcedure.input(updateSupplierSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const supplier = await ctx.db.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Supplier not found' });
    }

    if (data.code && data.code !== supplier.code) {
      const existing = await ctx.db.supplier.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Supplier code already exists' });
      }
    }

    return ctx.db.supplier.update({
      where: { id },
      data,
    });
  }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const supplier = await ctx.db.supplier.findUnique({ where: { id: input } });
    if (!supplier) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Supplier not found' });
    }

    return ctx.db.supplier.delete({ where: { id: input } });
  }),

  toggleActive: protectedProcedure
    .input(z.object({ ids: z.array(z.string()), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.supplier.updateMany({
        where: { id: { in: input.ids } },
        data: { isActive: input.isActive },
      });
    }),

  listActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, currency: true, leadTimeDays: true },
      orderBy: { name: 'asc' },
    });
  }),
});
