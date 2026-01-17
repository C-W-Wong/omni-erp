import { z } from 'zod';

export const salesOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
]);

export const salesOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  notes: z.string().max(500).optional(),
});

export const createSalesOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  currency: z.string().default('USD'),
  expectedShipDate: z.coerce.date().optional(),
  shippingAddress: z.string().max(500).optional(),
  taxRate: z.number().min(0).max(1).default(0), // e.g., 0.05 for 5%
  shippingFee: z.number().min(0).default(0),
  notes: z.string().max(1000).optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

export const updateSalesOrderSchema = z.object({
  customerId: z.string().min(1).optional(),
  warehouseId: z.string().min(1).optional(),
  currency: z.string().optional(),
  expectedShipDate: z.coerce.date().nullable().optional(),
  shippingAddress: z.string().max(500).nullable().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  shippingFee: z.number().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(salesOrderItemSchema).min(1).optional(),
});

export const salesOrderFilterSchema = z.object({
  status: salesOrderStatusSchema.optional(),
  customerId: z.string().optional(),
  warehouseId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

// Schema for shipping goods
export const shipGoodsItemSchema = z.object({
  salesOrderItemId: z.string().min(1, 'Order item ID is required'),
  quantityShipped: z.number().positive('Quantity must be positive'),
});

export const shipGoodsSchema = z.object({
  salesOrderId: z.string().min(1, 'Sales order ID is required'),
  items: z.array(shipGoodsItemSchema).min(1, 'At least one item must be shipped'),
  trackingNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export type SalesOrderStatus = z.infer<typeof salesOrderStatusSchema>;
export type SalesOrderItem = z.infer<typeof salesOrderItemSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type CreateSalesOrderFormInput = z.input<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
export type SalesOrderFilter = z.infer<typeof salesOrderFilterSchema>;
export type ShipGoodsInput = z.infer<typeof shipGoodsSchema>;
export type ShipGoodsFormInput = z.input<typeof shipGoodsSchema>;
