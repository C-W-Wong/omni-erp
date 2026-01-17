import { z } from 'zod';

export const allocationMethodSchema = z.enum(['FIFO', 'LIFO', 'SPECIFIC', 'WEIGHTED_AVG']);

export const inventoryFilterSchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  batchId: z.string().optional(),
  lowStock: z.boolean().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number(),
  reason: z.string().min(1).max(500),
});

export const createTransferSchema = z.object({
  sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
  targetWarehouseId: z.string().min(1, 'Target warehouse is required'),
  notes: z.string().max(500).optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        batchId: z.string().min(1),
        quantity: z.number().positive('Quantity must be positive'),
      })
    )
    .min(1, 'At least one item is required'),
});

export const updateSystemSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type AllocationMethod = z.infer<typeof allocationMethodSchema>;
export type InventoryFilter = z.infer<typeof inventoryFilterSchema>;
export type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type CreateTransferFormInput = z.input<typeof createTransferSchema>;
