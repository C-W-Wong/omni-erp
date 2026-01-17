import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { createCostItemTypeSchema, updateCostItemTypeSchema } from '@/lib/validators/costItemType';

export const costItemTypeRouter = router({
  // List all cost item types with pagination
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, includeInactive } = input;
      const skip = (page - 1) * pageSize;

      const where = includeInactive ? {} : { isActive: true };

      const [items, total] = await Promise.all([
        ctx.db.costItemType.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          skip,
          take: pageSize,
        }),
        ctx.db.costItemType.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // List active cost item types (for dropdowns)
  listActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.costItemType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }),

  // Get cost item type by ID
  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const costItemType = await ctx.db.costItemType.findUnique({
      where: { id: input },
    });

    if (!costItemType) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cost item type not found',
      });
    }

    return costItemType;
  }),

  // Create cost item type
  create: protectedProcedure.input(createCostItemTypeSchema).mutation(async ({ ctx, input }) => {
    // Check if code already exists
    const existing = await ctx.db.costItemType.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A cost item type with this code already exists',
      });
    }

    return ctx.db.costItemType.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description || null,
        sortOrder: input.sortOrder,
        isSystem: false,
      },
    });
  }),

  // Update cost item type
  update: protectedProcedure.input(updateCostItemTypeSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db.costItemType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cost item type not found',
      });
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existing.code) {
      const codeExists = await ctx.db.costItemType.findUnique({
        where: { code: data.code },
      });

      if (codeExists) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A cost item type with this code already exists',
        });
      }
    }

    // Cannot change code of system types
    if (existing.isSystem && data.code && data.code !== existing.code) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot change the code of system cost item types',
      });
    }

    return ctx.db.costItemType.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  }),

  // Delete cost item type
  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const costItemType = await ctx.db.costItemType.findUnique({
      where: { id: input },
    });

    if (!costItemType) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cost item type not found',
      });
    }

    // Cannot delete system types
    if (costItemType.isSystem) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete system cost item types',
      });
    }

    // TODO: Check if type is used in any landed cost items before deleting
    // This will be added when the LandedCostItem model is created

    return ctx.db.costItemType.delete({
      where: { id: input },
    });
  }),

  // Seed default cost item types
  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const defaultTypes = [
      {
        code: 'FREIGHT',
        name: 'Freight / Shipping',
        description: 'Ocean, air, or land freight costs',
        sortOrder: 1,
      },
      {
        code: 'DUTY',
        name: 'Customs Duty',
        description: 'Import customs duties and tariffs',
        sortOrder: 2,
      },
      {
        code: 'CLEARANCE',
        name: 'Customs Clearance',
        description: 'Customs clearance and brokerage fees',
        sortOrder: 3,
      },
      {
        code: 'INSURANCE',
        name: 'Insurance',
        description: 'Cargo insurance premiums',
        sortOrder: 4,
      },
      {
        code: 'HANDLING',
        name: 'Handling',
        description: 'Port handling and terminal charges',
        sortOrder: 5,
      },
      {
        code: 'INSPECTION',
        name: 'Inspection',
        description: 'Quality inspection and certification fees',
        sortOrder: 6,
      },
      { code: 'STORAGE', name: 'Storage', description: 'Warehouse storage charges', sortOrder: 7 },
      {
        code: 'OTHER',
        name: 'Other Costs',
        description: 'Miscellaneous landed costs',
        sortOrder: 99,
      },
    ];

    const results = [];

    for (const type of defaultTypes) {
      const existing = await ctx.db.costItemType.findUnique({
        where: { code: type.code },
      });

      if (!existing) {
        const created = await ctx.db.costItemType.create({
          data: {
            ...type,
            isSystem: true,
          },
        });
        results.push({ action: 'created', ...created });
      } else {
        results.push({ action: 'skipped', ...existing });
      }
    }

    return results;
  }),
});
