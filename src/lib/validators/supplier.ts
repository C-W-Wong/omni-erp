import { z } from 'zod';

export const createSupplierSchema = z.object({
  code: z
    .string()
    .min(1, 'Supplier code is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  name: z.string().min(1, 'Supplier name is required').max(200),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  taxId: z.string().max(50).optional(),
  paymentTerms: z.number().int().min(0).max(365).default(30),
  currency: z.string().min(3).max(3).default('USD'),
  leadTimeDays: z.number().int().min(0).max(365).default(14),
  notes: z.string().max(1000).optional(),
});

export const updateSupplierSchema = z.object({
  id: z.string(),
  code: z
    .string()
    .min(1, 'Supplier code is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'Code can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  name: z.string().min(1, 'Supplier name is required').max(200).optional(),
  contactPerson: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  fax: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
  currency: z.string().min(3).max(3).optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
  notes: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const supplierFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['code', 'name', 'createdAt', 'updatedAt', 'country']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type CreateSupplierFormInput = z.input<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierFilterInput = z.infer<typeof supplierFilterSchema>;
