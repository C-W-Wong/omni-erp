import { z } from 'zod';

// Account Category schema
export const createAccountCategorySchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  normalBalance: z.enum(['DEBIT', 'CREDIT']),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateAccountCategorySchema = createAccountCategorySchema.partial();

// Chart of Account schema
export const createAccountSchema = z.object({
  accountCode: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  categoryId: z.string().min(1),
  parentId: z.string().optional(),
  level: z.number().int().min(1).max(10).default(1),
  isDetail: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

// Journal Entry Line schema
export const journalEntryLineSchema = z.object({
  accountId: z.string().min(1),
  description: z.string().max(500).optional(),
  debitAmount: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
});

// Manual Journal Entry schema
export const createJournalEntrySchema = z.object({
  entryDate: z.coerce.date(),
  description: z.string().max(500).optional(),
  lines: z.array(journalEntryLineSchema).min(2, 'At least two lines are required'),
});

// Payment receipt schema (for AR)
export const receivePaymentSchema = z.object({
  accountReceivableId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.coerce.date().optional(),
  paymentMethod: z.string().max(50).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Payment made schema (for AP)
export const makePaymentSchema = z.object({
  accountPayableId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.coerce.date().optional(),
  paymentMethod: z.string().max(50).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Filter schemas
export const journalEntryFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'POSTED', 'VOIDED']).optional(),
  referenceType: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const arFilterSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WRITTEN_OFF']).optional(),
  overdueOnly: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const apFilterSchema = z.object({
  search: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
  overdueOnly: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Type exports
export type CreateAccountCategoryInput = z.input<typeof createAccountCategorySchema>;
export type UpdateAccountCategoryInput = z.input<typeof updateAccountCategorySchema>;
export type CreateAccountInput = z.input<typeof createAccountSchema>;
export type UpdateAccountInput = z.input<typeof updateAccountSchema>;
export type CreateJournalEntryInput = z.input<typeof createJournalEntrySchema>;
export type JournalEntryLineInput = z.input<typeof journalEntryLineSchema>;
export type ReceivePaymentInput = z.input<typeof receivePaymentSchema>;
export type MakePaymentInput = z.input<typeof makePaymentSchema>;
export type JournalEntryFilterInput = z.input<typeof journalEntryFilterSchema>;
export type ARFilterInput = z.input<typeof arFilterSchema>;
export type APFilterInput = z.input<typeof apFilterSchema>;
