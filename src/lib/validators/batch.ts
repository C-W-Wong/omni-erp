import { z } from 'zod';

export const createBatchSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  supplierId: z.string().optional(),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPurchaseCost: z.number().min(0, 'Unit cost must be non-negative'),
  currency: z.string().default('USD'),
  receivedDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional().default(''),
});

export const updateBatchSchema = z.object({
  id: z.string(),
  supplierId: z.string().optional().nullable(),
  warehouseId: z.string().optional(),
  quantity: z.number().positive().optional(),
  unitPurchaseCost: z.number().min(0).optional(),
  currency: z.string().optional(),
  receivedDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const createLandedCostItemSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  costTypeId: z.string().min(1, 'Cost type is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  currency: z.string().default('USD'),
  exchangeRate: z.number().positive().default(1),
  description: z.string().max(500).optional().default(''),
  referenceNumber: z.string().max(100).optional().default(''),
});

export const updateLandedCostItemSchema = z.object({
  id: z.string(),
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  exchangeRate: z.number().positive().optional(),
  description: z.string().max(500).optional().nullable(),
  referenceNumber: z.string().max(100).optional().nullable(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type CreateBatchFormInput = z.input<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type CreateLandedCostItemInput = z.infer<typeof createLandedCostItemSchema>;
export type CreateLandedCostItemFormInput = z.input<typeof createLandedCostItemSchema>;
export type UpdateLandedCostItemInput = z.infer<typeof updateLandedCostItemSchema>;
