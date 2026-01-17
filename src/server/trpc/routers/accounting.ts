import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import Decimal from 'decimal.js';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  createAccountCategorySchema,
  updateAccountCategorySchema,
  createAccountSchema,
  updateAccountSchema,
  createJournalEntrySchema,
  receivePaymentSchema,
  makePaymentSchema,
  journalEntryFilterSchema,
  arFilterSchema,
  apFilterSchema,
} from '@/lib/validators/accounting';
import {
  generateJENumber,
  validateJournalEntry,
  getAccountBalance,
  getARAgingAnalysis,
  getAPAgingAnalysis,
  ACCOUNTS,
  getAccountId,
} from '../../services/accounting.service';

export const accountingRouter = createTRPCRouter({
  // ===============================
  // Account Categories
  // ===============================

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.accountCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });
  }),

  createCategory: protectedProcedure
    .input(createAccountCategorySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountCategory.create({
        data: input,
      });
    }),

  updateCategory: protectedProcedure
    .input(z.object({ id: z.string(), data: updateAccountCategorySchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accountCategory.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  // ===============================
  // Chart of Accounts
  // ===============================

  getAccounts: protectedProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          isDetail: z.boolean().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.chartOfAccount.findMany({
        where: {
          ...(input?.categoryId && { categoryId: input.categoryId }),
          ...(input?.isDetail !== undefined && { isDetail: input.isDetail }),
          ...(input?.search && {
            OR: [
              { accountCode: { contains: input.search, mode: 'insensitive' } },
              { name: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
          isActive: true,
        },
        orderBy: { accountCode: 'asc' },
        include: {
          category: true,
          parent: true,
          _count: {
            select: { children: true, journalLines: true },
          },
        },
      });
    }),

  getAccountById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const account = await ctx.db.chartOfAccount.findUnique({
      where: { id: input },
      include: {
        category: true,
        parent: true,
        children: true,
      },
    });

    if (!account) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found' });
    }

    return account;
  }),

  createAccount: protectedProcedure.input(createAccountSchema).mutation(async ({ ctx, input }) => {
    // Check for duplicate account code
    const existing = await ctx.db.chartOfAccount.findUnique({
      where: { accountCode: input.accountCode },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Account code already exists',
      });
    }

    return ctx.db.chartOfAccount.create({
      data: input,
      include: {
        category: true,
      },
    });
  }),

  updateAccount: protectedProcedure
    .input(z.object({ id: z.string(), data: updateAccountSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chartOfAccount.update({
        where: { id: input.id },
        data: input.data,
        include: {
          category: true,
        },
      });
    }),

  deleteAccount: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // Check if account has any journal entries
    const account = await ctx.db.chartOfAccount.findUnique({
      where: { id: input },
      include: {
        _count: {
          select: { journalLines: true, children: true },
        },
      },
    });

    if (!account) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found' });
    }

    if (account._count.journalLines > 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Cannot delete account with journal entries',
      });
    }

    if (account._count.children > 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Cannot delete account with sub-accounts',
      });
    }

    // Soft delete
    return ctx.db.chartOfAccount.update({
      where: { id: input },
      data: { isActive: false },
    });
  }),

  getAccountBalance: protectedProcedure
    .input(
      z.object({
        accountCode: z.string(),
        asOfDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return getAccountBalance(input.accountCode, input.asOfDate);
    }),

  // ===============================
  // Journal Entries
  // ===============================

  getJournalEntries: protectedProcedure
    .input(journalEntryFilterSchema)
    .query(async ({ ctx, input }) => {
      const { search, status, referenceType, startDate, endDate, page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { entryNumber: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
        ...(status && { status }),
        ...(referenceType && { referenceType }),
        ...(startDate && { entryDate: { gte: startDate } }),
        ...(endDate && { entryDate: { lte: endDate } }),
      };

      const [entries, total] = await Promise.all([
        ctx.db.journalEntry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { entryDate: 'desc' },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            postedBy: { select: { id: true, name: true, email: true } },
            lines: {
              include: {
                account: { select: { accountCode: true, name: true } },
              },
            },
          },
        }),
        ctx.db.journalEntry.count({ where }),
      ]);

      return {
        data: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  getJournalEntryById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const entry = await ctx.db.journalEntry.findUnique({
      where: { id: input },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        postedBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            account: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
    }

    return entry;
  }),

  createJournalEntry: protectedProcedure
    .input(createJournalEntrySchema)
    .mutation(async ({ ctx, input }) => {
      // Validate that entry balances
      validateJournalEntry(input.lines);

      const totalDebit = input.lines.reduce((sum, l) => sum + l.debitAmount, 0);
      const totalCredit = input.lines.reduce((sum, l) => sum + l.creditAmount, 0);

      const entryNumber = await generateJENumber();

      return ctx.db.journalEntry.create({
        data: {
          entryNumber,
          entryDate: input.entryDate,
          referenceType: 'Manual',
          description: input.description,
          status: 'DRAFT',
          totalDebit,
          totalCredit,
          createdById: ctx.session.user.id,
          lines: {
            create: input.lines,
          },
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });
    }),

  postJournalEntry: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const entry = await ctx.db.journalEntry.findUnique({
      where: { id: input },
      include: { lines: true },
    });

    if (!entry) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
    }

    if (entry.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Only draft entries can be posted',
      });
    }

    // Validate balance again
    validateJournalEntry(
      entry.lines.map((l) => ({
        debitAmount: Number(l.debitAmount),
        creditAmount: Number(l.creditAmount),
      }))
    );

    return ctx.db.journalEntry.update({
      where: { id: input },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postedById: ctx.session.user.id,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }),

  voidJournalEntry: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const entry = await ctx.db.journalEntry.findUnique({
      where: { id: input },
    });

    if (!entry) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
    }

    if (entry.status === 'VOIDED') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Entry is already voided',
      });
    }

    return ctx.db.journalEntry.update({
      where: { id: input },
      data: { status: 'VOIDED' },
    });
  }),

  // ===============================
  // Accounts Receivable
  // ===============================

  getAccountsReceivable: protectedProcedure.input(arFilterSchema).query(async ({ ctx, input }) => {
    const { search, customerId, status, overdueOnly, page, limit } = input;
    const skip = (page - 1) * limit;
    const today = new Date();

    const where = {
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
          { customer: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(overdueOnly && {
        dueDate: { lt: today },
        status: { notIn: ['PAID' as const, 'WRITTEN_OFF' as const] },
      }),
    };

    const [receivables, total] = await Promise.all([
      ctx.db.accountReceivable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
        },
      }),
      ctx.db.accountReceivable.count({ where }),
    ]);

    return {
      data: receivables,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }),

  getARById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const ar = await ctx.db.accountReceivable.findUnique({
      where: { id: input },
      include: {
        customer: true,
        salesOrder: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!ar) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Account receivable not found' });
    }

    return ar;
  }),

  receivePayment: protectedProcedure
    .input(receivePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const ar = await tx.accountReceivable.findUnique({
          where: { id: input.accountReceivableId },
          include: { customer: true, salesOrder: true },
        });

        if (!ar) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Account receivable not found' });
        }

        if (ar.status === 'PAID') {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Invoice is already fully paid',
          });
        }

        const balance = new Decimal(ar.balance);
        const paymentAmount = new Decimal(input.amount);

        if (paymentAmount.gt(balance)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Payment amount exceeds balance of ${balance.toFixed(2)}`,
          });
        }

        const newPaidAmount = new Decimal(ar.paidAmount).plus(paymentAmount);
        const newBalance = balance.minus(paymentAmount);
        const newStatus = newBalance.eq(0) ? 'PAID' : 'PARTIAL';

        // Create journal entry for payment
        const entryNumber = await generateJENumber();
        const bankAccountId = await getAccountId(tx, ACCOUNTS.BANK);
        const arAccountId = await getAccountId(tx, ACCOUNTS.ACCOUNTS_RECEIVABLE);

        await tx.journalEntry.create({
          data: {
            entryNumber,
            entryDate: input.paymentDate || new Date(),
            referenceType: 'Payment',
            referenceId: ar.id,
            description: `Payment received for Invoice ${ar.invoiceNumber || ar.salesOrder.orderNumber}`,
            status: 'POSTED',
            totalDebit: paymentAmount.toNumber(),
            totalCredit: paymentAmount.toNumber(),
            createdById: ctx.session.user.id,
            postedById: ctx.session.user.id,
            postedAt: new Date(),
            lines: {
              create: [
                {
                  accountId: bankAccountId,
                  description: 'Bank deposit',
                  debitAmount: paymentAmount.toNumber(),
                  creditAmount: 0,
                },
                {
                  accountId: arAccountId,
                  description: 'Accounts Receivable',
                  debitAmount: 0,
                  creditAmount: paymentAmount.toNumber(),
                },
              ],
            },
          },
        });

        return tx.accountReceivable.update({
          where: { id: input.accountReceivableId },
          data: {
            paidAmount: newPaidAmount.toNumber(),
            balance: newBalance.toNumber(),
            status: newStatus,
          },
          include: {
            customer: true,
            salesOrder: true,
          },
        });
      });
    }),

  getARAgingAnalysis: protectedProcedure
    .input(z.object({ customerId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return getARAgingAnalysis(input?.customerId);
    }),

  // ===============================
  // Accounts Payable
  // ===============================

  getAccountsPayable: protectedProcedure.input(apFilterSchema).query(async ({ ctx, input }) => {
    const { search, supplierId, status, overdueOnly, page, limit } = input;
    const skip = (page - 1) * limit;
    const today = new Date();

    const where = {
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
          { supplier: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(supplierId && { supplierId }),
      ...(status && { status }),
      ...(overdueOnly && {
        dueDate: { lt: today },
        status: { notIn: ['PAID' as const] },
      }),
    };

    const [payables, total] = await Promise.all([
      ctx.db.accountPayable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          purchaseOrder: { select: { id: true, orderNumber: true } },
        },
      }),
      ctx.db.accountPayable.count({ where }),
    ]);

    return {
      data: payables,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }),

  getAPById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const ap = await ctx.db.accountPayable.findUnique({
      where: { id: input },
      include: {
        supplier: true,
        purchaseOrder: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!ap) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Account payable not found' });
    }

    return ap;
  }),

  makePayment: protectedProcedure.input(makePaymentSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.$transaction(async (tx) => {
      const ap = await tx.accountPayable.findUnique({
        where: { id: input.accountPayableId },
        include: { supplier: true, purchaseOrder: true },
      });

      if (!ap) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Account payable not found' });
      }

      if (ap.status === 'PAID') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Invoice is already fully paid',
        });
      }

      const balance = new Decimal(ap.balance);
      const paymentAmount = new Decimal(input.amount);

      if (paymentAmount.gt(balance)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Payment amount exceeds balance of ${balance.toFixed(2)}`,
        });
      }

      const newPaidAmount = new Decimal(ap.paidAmount).plus(paymentAmount);
      const newBalance = balance.minus(paymentAmount);
      const newStatus = newBalance.eq(0) ? 'PAID' : 'PARTIAL';

      // Create journal entry for payment
      const entryNumber = await generateJENumber();
      const bankAccountId = await getAccountId(tx, ACCOUNTS.BANK);
      const apAccountId = await getAccountId(tx, ACCOUNTS.ACCOUNTS_PAYABLE);

      await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: input.paymentDate || new Date(),
          referenceType: 'Payment',
          referenceId: ap.id,
          description: `Payment to ${ap.supplier.name} for PO ${ap.purchaseOrder.orderNumber}`,
          status: 'POSTED',
          totalDebit: paymentAmount.toNumber(),
          totalCredit: paymentAmount.toNumber(),
          createdById: ctx.session.user.id,
          postedById: ctx.session.user.id,
          postedAt: new Date(),
          lines: {
            create: [
              {
                accountId: apAccountId,
                description: 'Accounts Payable',
                debitAmount: paymentAmount.toNumber(),
                creditAmount: 0,
              },
              {
                accountId: bankAccountId,
                description: 'Bank payment',
                debitAmount: 0,
                creditAmount: paymentAmount.toNumber(),
              },
            ],
          },
        },
      });

      return tx.accountPayable.update({
        where: { id: input.accountPayableId },
        data: {
          paidAmount: newPaidAmount.toNumber(),
          balance: newBalance.toNumber(),
          status: newStatus,
        },
        include: {
          supplier: true,
          purchaseOrder: true,
        },
      });
    });
  }),

  getAPAgingAnalysis: protectedProcedure
    .input(z.object({ supplierId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return getAPAgingAnalysis(input?.supplierId);
    }),

  // ===============================
  // Dashboard Stats
  // ===============================

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();

    const [arAging, apAging, recentEntries, accountsCount] = await Promise.all([
      getARAgingAnalysis(),
      getAPAgingAnalysis(),
      ctx.db.journalEntry.count({
        where: {
          status: 'POSTED',
          entryDate: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
      }),
      ctx.db.chartOfAccount.count({ where: { isActive: true } }),
    ]);

    return {
      totalReceivables: arAging.total,
      overdueReceivables:
        arAging.days1to30 + arAging.days31to60 + arAging.days61to90 + arAging.days91plus,
      totalPayables: apAging.total,
      overduePayables:
        apAging.days1to30 + apAging.days31to60 + apAging.days61to90 + apAging.days91plus,
      journalEntriesThisMonth: recentEntries,
      activeAccounts: accountsCount,
    };
  }),
});
