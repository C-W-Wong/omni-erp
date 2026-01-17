import { z } from 'zod';

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(1, 'Warehouse code is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  name: z.string().min(1, 'Warehouse name is required').max(200),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  manager: z.string().max(100).optional(),
  isDefault: z.boolean().default(false),
});

export const updateWarehouseSchema = z.object({
  id: z.string(),
  code: z
    .string()
    .min(1, 'Warehouse code is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'Code can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  name: z.string().min(1, 'Warehouse name is required').max(200).optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  manager: z.string().max(100).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const warehouseFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['code', 'name', 'createdAt', 'updatedAt', 'city']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type CreateWarehouseFormInput = z.input<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type WarehouseFilterInput = z.infer<typeof warehouseFilterSchema>;
