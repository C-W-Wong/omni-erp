import { z } from 'zod';

export const purchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PARTIAL',
  'RECEIVED',
  'CANCELLED',
]);

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  notes: z.string().max(500).optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  currency: z.string().default('USD'),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1).optional(),
  warehouseId: z.string().min(1).optional(),
  currency: z.string().optional(),
  expectedDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(purchaseOrderItemSchema).min(1).optional(),
});

export const purchaseOrderFilterSchema = z.object({
  status: purchaseOrderStatusSchema.optional(),
  supplierId: z.string().optional(),
  warehouseId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

// Schema for receiving goods against a purchase order
export const receiveGoodsItemSchema = z.object({
  purchaseOrderItemId: z.string().min(1, 'Order item ID is required'),
  quantityReceived: z.number().positive('Quantity must be positive'),
});

export const receiveGoodsSchema = z.object({
  purchaseOrderId: z.string().min(1, 'Purchase order ID is required'),
  items: z.array(receiveGoodsItemSchema).min(1, 'At least one item must be received'),
  notes: z.string().max(1000).optional(),
});

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type CreatePurchaseOrderFormInput = z.input<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderFilter = z.infer<typeof purchaseOrderFilterSchema>;
export type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;
export type ReceiveGoodsFormInput = z.input<typeof receiveGoodsSchema>;
