import { z } from 'zod';

// ============================================
// Product Category Schemas
// ============================================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});

export const updateCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Category name is required').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ============================================
// Product Schemas
// ============================================

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU can only contain letters, numbers, hyphens, and underscores'),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().optional(),
  unit: z.string().min(1).max(20).default('PCS'),
  defaultPrice: z.number().min(0, 'Price must be non-negative').default(0),
  minStockLevel: z.number().int().min(0, 'Min stock level must be non-negative').default(0),
});

export const updateProductSchema = z.object({
  id: z.string(),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  name: z.string().min(1, 'Product name is required').max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  unit: z.string().min(1).max(20).optional(),
  defaultPrice: z.number().min(0, 'Price must be non-negative').optional(),
  minStockLevel: z.number().int().min(0, 'Min stock level must be non-negative').optional(),
  isActive: z.boolean().optional(),
});

export const productFilterSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['sku', 'name', 'createdAt', 'updatedAt', 'defaultPrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateProductFormInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
