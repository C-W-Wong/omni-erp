import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerFilterSchema,
} from '@/lib/validators/customer';

export const customerRouter = router({
  list: protectedProcedure.input(customerFilterSchema.optional()).query(async ({ ctx, input }) => {
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
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    const [items, total] = await Promise.all([
      ctx.db.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      ctx.db.customer.count({ where }),
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
    const customer = await ctx.db.customer.findUnique({
      where: { id: input },
    });

    if (!customer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
    }

    return customer;
  }),

  getByCode: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const customer = await ctx.db.customer.findUnique({
      where: { code: input },
    });

    if (!customer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
    }

    return customer;
  }),

  create: protectedProcedure.input(createCustomerSchema).mutation(async ({ ctx, input }) => {
    // Check for duplicate code
    const existing = await ctx.db.customer.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Customer code already exists' });
    }

    // Clean empty strings to null
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

    return ctx.db.customer.create({ data });
  }),

  update: protectedProcedure.input(updateCustomerSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    // Check if customer exists
    const customer = await ctx.db.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
    }

    // Check for duplicate code if changing
    if (data.code && data.code !== customer.code) {
      const existing = await ctx.db.customer.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Customer code already exists' });
      }
    }

    return ctx.db.customer.update({
      where: { id },
      data,
    });
  }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const customer = await ctx.db.customer.findUnique({ where: { id: input } });
    if (!customer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
    }

    // TODO: Add check for sales orders when that model is added

    return ctx.db.customer.delete({ where: { id: input } });
  }),

  toggleActive: protectedProcedure
    .input(z.object({ ids: z.array(z.string()), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.customer.updateMany({
        where: { id: { in: input.ids } },
        data: { isActive: input.isActive },
      });
    }),

  // For dropdowns/selects - returns minimal data
  listActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.customer.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }),
});
