import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createProductSchema,
  updateProductSchema,
  productFilterSchema,
  createCategorySchema,
  updateCategorySchema,
} from '@/lib/validators/product';

export const productRouter = router({
  // ============================================
  // Product Category Procedures
  // ============================================

  listCategories: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.includeInactive ? {} : { isActive: true };

      return ctx.db.productCategory.findMany({
        where,
        include: {
          parent: true,
          _count: { select: { products: true, children: true } },
        },
        orderBy: { name: 'asc' },
      });
    }),

  getCategoryById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const category = await ctx.db.productCategory.findUnique({
      where: { id: input },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
    }

    return category;
  }),

  createCategory: protectedProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name
      const existing = await ctx.db.productCategory.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Category name already exists' });
      }

      // Validate parent exists if provided
      if (input.parentId) {
        const parent = await ctx.db.productCategory.findUnique({
          where: { id: input.parentId },
        });

        if (!parent) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Parent category not found' });
        }
      }

      return ctx.db.productCategory.create({
        data: input,
      });
    }),

  updateCategory: protectedProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if category exists
      const category = await ctx.db.productCategory.findUnique({ where: { id } });
      if (!category) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }

      // Check for duplicate name if changing
      if (data.name && data.name !== category.name) {
        const existing = await ctx.db.productCategory.findUnique({
          where: { name: data.name },
        });

        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Category name already exists' });
        }
      }

      // Prevent circular reference
      if (data.parentId === id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Category cannot be its own parent' });
      }

      return ctx.db.productCategory.update({
        where: { id },
        data,
      });
    }),

  deleteCategory: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // Check if category has products
    const productCount = await ctx.db.product.count({
      where: { categoryId: input },
    });

    if (productCount > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete category with ${productCount} products. Move or delete products first.`,
      });
    }

    // Check if category has children
    const childCount = await ctx.db.productCategory.count({
      where: { parentId: input },
    });

    if (childCount > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete category with ${childCount} child categories.`,
      });
    }

    return ctx.db.productCategory.delete({ where: { id: input } });
  }),

  // ============================================
  // Product Procedures
  // ============================================

  list: protectedProcedure.input(productFilterSchema.optional()).query(async ({ ctx, input }) => {
    const {
      search,
      categoryId,
      isActive,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = input || {};

    const where = {
      ...(search && {
        OR: [
          { sku: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    const [items, total] = await Promise.all([
      ctx.db.product.findMany({
        where,
        include: { category: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      ctx.db.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }),

  // List active products for dropdowns
  listActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        defaultPrice: true,
      },
      orderBy: { name: 'asc' },
    });
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const product = await ctx.db.product.findUnique({
      where: { id: input },
      include: { category: true },
    });

    if (!product) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
    }

    return product;
  }),

  getBySku: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const product = await ctx.db.product.findUnique({
      where: { sku: input },
      include: { category: true },
    });

    if (!product) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
    }

    return product;
  }),

  create: protectedProcedure.input(createProductSchema).mutation(async ({ ctx, input }) => {
    // Check for duplicate SKU
    const existing = await ctx.db.product.findUnique({
      where: { sku: input.sku },
    });

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'SKU already exists' });
    }

    // Validate category exists if provided
    if (input.categoryId) {
      const category = await ctx.db.productCategory.findUnique({
        where: { id: input.categoryId },
      });

      if (!category) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Category not found' });
      }
    }

    return ctx.db.product.create({
      data: input,
      include: { category: true },
    });
  }),

  update: protectedProcedure.input(updateProductSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    // Check if product exists
    const product = await ctx.db.product.findUnique({ where: { id } });
    if (!product) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
    }

    // Check for duplicate SKU if changing
    if (data.sku && data.sku !== product.sku) {
      const existing = await ctx.db.product.findUnique({
        where: { sku: data.sku },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'SKU already exists' });
      }
    }

    // Validate category exists if changing
    if (data.categoryId) {
      const category = await ctx.db.productCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Category not found' });
      }
    }

    return ctx.db.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // Check if product exists
    const product = await ctx.db.product.findUnique({ where: { id: input } });
    if (!product) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
    }

    // TODO: Add check for inventory/orders when those models are added

    return ctx.db.product.delete({ where: { id: input } });
  }),

  // Bulk operations
  toggleActive: protectedProcedure
    .input(z.object({ ids: z.array(z.string()), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.product.updateMany({
        where: { id: { in: input.ids } },
        data: { isActive: input.isActive },
      });
    }),
});
