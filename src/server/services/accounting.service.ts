import { TRPCError } from '@trpc/server';
import Decimal from 'decimal.js';
import { db } from '../db';

// Account code constants
export const ACCOUNTS = {
  CASH: '1101',
  BANK: '1102',
  ACCOUNTS_RECEIVABLE: '1110',
  INVENTORY: '1120',
  ACCOUNTS_PAYABLE: '2110',
  SALES_REVENUE: '4110',
  COST_OF_GOODS_SOLD: '5100',
} as const;

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Get account ID by code
 */
export async function getAccountId(tx: TransactionClient, accountCode: string): Promise<string> {
  const account = await tx.chartOfAccount.findUnique({
    where: { accountCode },
  });

  if (!account) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Account not found: ${accountCode}`,
    });
  }

  return account.id;
}

/**
 * Generate journal entry number: JE-YYYYMMDD-XXXX
 */
export async function generateJENumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `JE-${dateStr}-`;

  const count = await db.journalEntry.count({
    where: {
      entryNumber: {
        startsWith: prefix,
      },
    },
  });

  const nextNum = (count + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
}

/**
 * Validate journal entry lines - must balance
 */
export function validateJournalEntry(lines: { debitAmount: number; creditAmount: number }[]) {
  const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Journal entry not balanced: Debit ${totalDebit}, Credit ${totalCredit}`,
    });
  }
}

/**
 * Create journal entry for sales order confirmation
 * Debit: Accounts Receivable
 * Credit: Sales Revenue
 * Debit: Cost of Goods Sold
 * Credit: Inventory
 */
export async function createSalesJournalEntry(
  tx: TransactionClient,
  order: {
    id: string;
    orderNumber: string;
    totalAmount: Decimal | number;
  },
  totalCost: number,
  userId: string
) {
  const totalAmount = new Decimal(order.totalAmount).toNumber();
  const entryNumber = await generateJENumber();

  const arAccountId = await getAccountId(tx, ACCOUNTS.ACCOUNTS_RECEIVABLE);
  const revenueAccountId = await getAccountId(tx, ACCOUNTS.SALES_REVENUE);
  const cogsAccountId = await getAccountId(tx, ACCOUNTS.COST_OF_GOODS_SOLD);
  const inventoryAccountId = await getAccountId(tx, ACCOUNTS.INVENTORY);

  const totalDebit = new Decimal(totalAmount).plus(totalCost).toNumber();
  const totalCredit = totalDebit;

  const lines = [
    {
      accountId: arAccountId,
      description: 'Accounts Receivable',
      debitAmount: totalAmount,
      creditAmount: 0,
    },
    {
      accountId: revenueAccountId,
      description: 'Sales Revenue',
      debitAmount: 0,
      creditAmount: totalAmount,
    },
  ];

  // Only add COGS entries if there's actual cost
  if (totalCost > 0) {
    lines.push(
      {
        accountId: cogsAccountId,
        description: 'Cost of Goods Sold',
        debitAmount: totalCost,
        creditAmount: 0,
      },
      {
        accountId: inventoryAccountId,
        description: 'Inventory',
        debitAmount: 0,
        creditAmount: totalCost,
      }
    );
  }

  return tx.journalEntry.create({
    data: {
      entryNumber,
      entryDate: new Date(),
      referenceType: 'SalesOrder',
      referenceId: order.id,
      description: `Sales Order ${order.orderNumber}`,
      status: 'POSTED',
      totalDebit,
      totalCredit,
      createdById: userId,
      postedById: userId,
      postedAt: new Date(),
      lines: {
        create: lines,
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
}

/**
 * Create journal entry for purchase order receiving
 * Debit: Inventory
 * Credit: Accounts Payable
 */
export async function createPurchaseJournalEntry(
  tx: TransactionClient,
  order: {
    id: string;
    orderNumber: string;
  },
  totalLandedCost: number,
  userId: string
) {
  const entryNumber = await generateJENumber();

  const inventoryAccountId = await getAccountId(tx, ACCOUNTS.INVENTORY);
  const apAccountId = await getAccountId(tx, ACCOUNTS.ACCOUNTS_PAYABLE);

  return tx.journalEntry.create({
    data: {
      entryNumber,
      entryDate: new Date(),
      referenceType: 'PurchaseOrder',
      referenceId: order.id,
      description: `Purchase Order ${order.orderNumber} Received`,
      status: 'POSTED',
      totalDebit: totalLandedCost,
      totalCredit: totalLandedCost,
      createdById: userId,
      postedById: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: inventoryAccountId,
            description: 'Inventory',
            debitAmount: totalLandedCost,
            creditAmount: 0,
          },
          {
            accountId: apAccountId,
            description: 'Accounts Payable',
            debitAmount: 0,
            creditAmount: totalLandedCost,
          },
        ],
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
}

/**
 * Create account receivable for sales order
 */
export async function createAccountReceivable(
  tx: TransactionClient,
  order: {
    id: string;
    customerId: string;
    totalAmount: Decimal | number;
    customer: { paymentTerms: number };
  }
) {
  const amount = new Decimal(order.totalAmount).toNumber();
  const paymentTerms = order.customer.paymentTerms || 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentTerms);

  return tx.accountReceivable.create({
    data: {
      customerId: order.customerId,
      salesOrderId: order.id,
      invoiceDate: new Date(),
      dueDate,
      amount,
      paidAmount: 0,
      balance: amount,
      status: 'PENDING',
    },
  });
}

/**
 * Create account payable for purchase order
 */
export async function createAccountPayable(
  tx: TransactionClient,
  order: {
    id: string;
    supplierId: string;
    supplier: { paymentTerms: number };
  },
  totalAmount: number
) {
  const paymentTerms = order.supplier.paymentTerms || 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentTerms);

  return tx.accountPayable.create({
    data: {
      supplierId: order.supplierId,
      purchaseOrderId: order.id,
      invoiceDate: new Date(),
      dueDate,
      amount: totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      status: 'PENDING',
    },
  });
}

/**
 * Get account balance
 */
export async function getAccountBalance(accountCode: string, asOfDate?: Date): Promise<number> {
  const account = await db.chartOfAccount.findUnique({
    where: { accountCode },
    include: { category: true },
  });

  if (!account) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Account not found: ${accountCode}`,
    });
  }

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId: account.id,
      journalEntry: {
        status: 'POSTED',
        entryDate: asOfDate ? { lte: asOfDate } : undefined,
      },
    },
  });

  let balance = new Decimal(0);
  for (const line of lines) {
    const debit = new Decimal(line.debitAmount);
    const credit = new Decimal(line.creditAmount);

    if (account.category.normalBalance === 'DEBIT') {
      balance = balance.plus(debit).minus(credit);
    } else {
      balance = balance.plus(credit).minus(debit);
    }
  }

  return balance.toNumber();
}

/**
 * Get AR aging analysis
 */
export async function getARAgingAnalysis(customerId?: string) {
  const receivables = await db.accountReceivable.findMany({
    where: {
      status: { not: 'PAID' },
      ...(customerId && { customerId }),
    },
  });

  const today = new Date();
  const aging = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days91plus: 0,
    total: 0,
  };

  for (const ar of receivables) {
    const balance = new Decimal(ar.balance).toNumber();
    const daysOverdue = Math.floor(
      (today.getTime() - ar.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue <= 0) aging.current += balance;
    else if (daysOverdue <= 30) aging.days1to30 += balance;
    else if (daysOverdue <= 60) aging.days31to60 += balance;
    else if (daysOverdue <= 90) aging.days61to90 += balance;
    else aging.days91plus += balance;

    aging.total += balance;
  }

  return aging;
}

/**
 * Get AP aging analysis
 */
export async function getAPAgingAnalysis(supplierId?: string) {
  const payables = await db.accountPayable.findMany({
    where: {
      status: { not: 'PAID' },
      ...(supplierId && { supplierId }),
    },
  });

  const today = new Date();
  const aging = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days91plus: 0,
    total: 0,
  };

  for (const ap of payables) {
    const balance = new Decimal(ap.balance).toNumber();
    const daysOverdue = Math.floor(
      (today.getTime() - ap.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue <= 0) aging.current += balance;
    else if (daysOverdue <= 30) aging.days1to30 += balance;
    else if (daysOverdue <= 60) aging.days31to60 += balance;
    else if (daysOverdue <= 90) aging.days61to90 += balance;
    else aging.days91plus += balance;

    aging.total += balance;
  }

  return aging;
}
