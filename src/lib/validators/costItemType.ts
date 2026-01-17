import { z } from 'zod';

export const createCostItemTypeSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20, 'Code must be at most 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, underscores, or hyphens'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500).optional().default(''),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCostItemTypeSchema = createCostItemTypeSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export type CreateCostItemTypeInput = z.infer<typeof createCostItemTypeSchema>;
export type CreateCostItemTypeFormInput = z.input<typeof createCostItemTypeSchema>;
export type UpdateCostItemTypeInput = z.infer<typeof updateCostItemTypeSchema>;
