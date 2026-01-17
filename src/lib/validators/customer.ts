import { z } from 'zod';

export const createCustomerSchema = z.object({
  code: z
    .string()
    .min(1, 'Customer code is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  name: z.string().min(1, 'Customer name is required').max(200),
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
  creditLimit: z.number().min(0).default(0),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = z.object({
  id: z.string(),
  code: z
    .string()
    .min(1, 'Customer code is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'Code can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  name: z.string().min(1, 'Customer name is required').max(200).optional(),
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
  creditLimit: z.number().min(0).optional(),
  notes: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const customerFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['code', 'name', 'createdAt', 'updatedAt', 'creditLimit']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateCustomerFormInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerFilterInput = z.infer<typeof customerFilterSchema>;
