# 會計規格

## 概述

本系統採用複式記帳法。所有業務交易自動產生會計分錄。

---

## 會計科目類別

| code | name | normalBalance |
|------|------|---------------|
| 1 | 資產 | DEBIT |
| 2 | 負債 | CREDIT |
| 3 | 權益 | CREDIT |
| 4 | 收入 | CREDIT |
| 5 | 費用/成本 | DEBIT |

---

## 預設會計科目 (Seed)

```typescript
const chartOfAccounts = [
  // 資產 (1xxx)
  { accountCode: '1000', name: '資產', level: 1, isDetail: false },
  { accountCode: '1100', name: '流動資產', parentCode: '1000', level: 2, isDetail: false },
  { accountCode: '1101', name: '現金', parentCode: '1100', level: 3, isDetail: true },
  { accountCode: '1102', name: '銀行存款', parentCode: '1100', level: 3, isDetail: true },
  { accountCode: '1110', name: '應收帳款', parentCode: '1100', level: 3, isDetail: true },
  { accountCode: '1120', name: '存貨', parentCode: '1100', level: 3, isDetail: true },

  // 負債 (2xxx)
  { accountCode: '2000', name: '負債', level: 1, isDetail: false },
  { accountCode: '2100', name: '流動負債', parentCode: '2000', level: 2, isDetail: false },
  { accountCode: '2110', name: '應付帳款', parentCode: '2100', level: 3, isDetail: true },

  // 權益 (3xxx)
  { accountCode: '3000', name: '權益', level: 1, isDetail: false },
  { accountCode: '3100', name: '股本', parentCode: '3000', level: 2, isDetail: true },
  { accountCode: '3300', name: '保留盈餘', parentCode: '3000', level: 2, isDetail: true },

  // 收入 (4xxx)
  { accountCode: '4000', name: '收入', level: 1, isDetail: false },
  { accountCode: '4110', name: '銷貨收入', parentCode: '4000', level: 2, isDetail: true },

  // 費用 (5xxx)
  { accountCode: '5000', name: '費用與成本', level: 1, isDetail: false },
  { accountCode: '5100', name: '銷貨成本', parentCode: '5000', level: 2, isDetail: true },
];
```

---

## 科目代碼常數

```typescript
export const ACCOUNTS = {
  CASH: '1101',
  BANK: '1102',
  ACCOUNTS_RECEIVABLE: '1110',
  INVENTORY: '1120',
  ACCOUNTS_PAYABLE: '2110',
  SALES_REVENUE: '4110',
  COST_OF_GOODS_SOLD: '5100',
} as const;
```

---

## 自動分錄規則

### 1. 銷售確認

```
借：應收帳款 (1110)     訂單總額
    貸：銷貨收入 (4110)         訂單總額

借：銷貨成本 (5100)     總成本
    貸：存貨 (1120)             總成本
```

### 2. 採購到貨

```
借：存貨 (1120)         總 Landed Cost
    貸：應付帳款 (2110)         總 Landed Cost
```

### 3. 收款

```
借：銀行存款 (1102)     收款金額
    貸：應收帳款 (1110)         收款金額
```

### 4. 付款

```
借：應付帳款 (2110)     付款金額
    貸：銀行存款 (1102)         付款金額
```

---

## 分錄服務

```typescript
// src/server/services/accounting.service.ts

export async function createSalesJournalEntry(
  tx: TransactionClient,
  order: SalesOrderWithRelations,
  totalCost: number,
  userId: string
): Promise<JournalEntry> {
  const entryNumber = await generateJENumber(tx);

  return await tx.journalEntry.create({
    data: {
      entryNumber,
      entryDate: new Date(),
      referenceType: 'SalesOrder',
      referenceId: order.id,
      description: `銷售訂單 ${order.orderNumber}`,
      status: 'POSTED',
      totalDebit: Number(order.totalAmount) + totalCost,
      totalCredit: Number(order.totalAmount) + totalCost,
      createdById: userId,
      postedById: userId,
      postedAt: new Date(),
      lines: {
        create: [
          { accountId: await getAccountId(tx, '1110'), debitAmount: order.totalAmount, creditAmount: 0 },
          { accountId: await getAccountId(tx, '4110'), debitAmount: 0, creditAmount: order.totalAmount },
          { accountId: await getAccountId(tx, '5100'), debitAmount: totalCost, creditAmount: 0 },
          { accountId: await getAccountId(tx, '1120'), debitAmount: 0, creditAmount: totalCost },
        ],
      },
    },
  });
}

export async function createPurchaseJournalEntry(
  tx: TransactionClient,
  order: PurchaseOrderWithRelations,
  totalLandedCost: number,
  userId: string
): Promise<JournalEntry> {
  const entryNumber = await generateJENumber(tx);

  return await tx.journalEntry.create({
    data: {
      entryNumber,
      entryDate: new Date(),
      referenceType: 'PurchaseOrder',
      referenceId: order.id,
      description: `採購到貨 ${order.orderNumber}`,
      status: 'POSTED',
      totalDebit: totalLandedCost,
      totalCredit: totalLandedCost,
      createdById: userId,
      postedById: userId,
      postedAt: new Date(),
      lines: {
        create: [
          { accountId: await getAccountId(tx, '1120'), debitAmount: totalLandedCost, creditAmount: 0 },
          { accountId: await getAccountId(tx, '2110'), debitAmount: 0, creditAmount: totalLandedCost },
        ],
      },
    },
  });
}

async function getAccountId(tx: TransactionClient, accountCode: string): Promise<string> {
  const account = await tx.chartOfAccount.findUnique({ where: { accountCode } });
  if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: `科目不存在: ${accountCode}` });
  return account.id;
}
```

---

## 應收帳款

```typescript
export async function createAccountReceivable(tx: TransactionClient, order: SalesOrderWithRelations) {
  const paymentTerms = order.customer.paymentTerms || 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentTerms);

  return await tx.accountReceivable.create({
    data: {
      customerId: order.customerId,
      salesOrderId: order.id,
      invoiceDate: new Date(),
      dueDate,
      amount: order.totalAmount,
      paidAmount: 0,
      balance: order.totalAmount,
      status: 'PENDING',
    },
  });
}
```

---

## 帳齡分析

```typescript
export async function getARAgingAnalysis(customerId?: string) {
  const receivables = await prisma.accountReceivable.findMany({
    where: { status: { not: 'PAID' }, customerId },
  });

  const today = new Date();
  const aging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days91plus: 0, total: 0 };

  for (const ar of receivables) {
    const balance = Number(ar.balance);
    const daysOverdue = Math.floor((today.getTime() - ar.dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) aging.current += balance;
    else if (daysOverdue <= 30) aging.days1to30 += balance;
    else if (daysOverdue <= 60) aging.days31to60 += balance;
    else if (daysOverdue <= 90) aging.days61to90 += balance;
    else aging.days91plus += balance;

    aging.total += balance;
  }

  return aging;
}
```

---

## 科目餘額計算

```typescript
export async function getAccountBalance(accountCode: string, asOfDate?: Date): Promise<number> {
  const account = await prisma.chartOfAccount.findUnique({
    where: { accountCode },
    include: { category: true },
  });

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: account.id,
      journalEntry: { status: 'POSTED', entryDate: asOfDate ? { lte: asOfDate } : undefined },
    },
  });

  let balance = 0;
  for (const line of lines) {
    const debit = Number(line.debitAmount);
    const credit = Number(line.creditAmount);

    if (account.category.normalBalance === 'DEBIT') {
      balance += debit - credit;
    } else {
      balance += credit - debit;
    }
  }

  return balance;
}
```

---

## 傳票驗證

```typescript
export function validateJournalEntry(lines: { debitAmount: number; creditAmount: number }[]) {
  const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `借貸不平衡：借方 ${totalDebit}，貸方 ${totalCredit}`,
    });
  }
}
```
