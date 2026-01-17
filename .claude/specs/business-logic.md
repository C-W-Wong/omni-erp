# 業務邏輯規格

## 概述

本文件定義 ERP 系統的核心業務邏輯，包含訂單流程、庫存分配演算法、事務處理等。

---

## 訂單流程

### 銷售訂單狀態流轉

```
DRAFT → CONFIRMED → PROCESSING → SHIPPED → COMPLETED
  │         │
  └─────────┴──────→ CANCELLED
```

| 狀態變更 | 動作 | 庫存變化 | 會計影響 |
|---------|------|---------|---------|
| DRAFT → CONFIRMED | 確認 | reserved += qty | AR, Revenue, COGS |
| CONFIRMED → PROCESSING | 開始處理 | 無 | 無 |
| PROCESSING → SHIPPED | 出貨 | qty -= reserved -= | 無 |
| SHIPPED → COMPLETED | 完成 | 無 | 無 |
| Any → CANCELLED | 取消 | 恢復 reserved | 沖銷分錄 |

### 採購訂單狀態流轉

```
DRAFT → CONFIRMED → PARTIALLY_RECEIVED → RECEIVED
  │         │
  └─────────┴──────→ CANCELLED
```

---

## 庫存分配演算法

```typescript
// src/server/services/inventory.service.ts

export type InventoryMethod = 'FIFO' | 'LIFO' | 'SPECIFIC' | 'WEIGHTED_AVG';

interface BatchAllocation {
  batchId: string;
  quantity: number;
  costPerUnit: Prisma.Decimal;
}

export async function allocateBatches(
  tx: TransactionClient,
  productId: string,
  warehouseId: string,
  requiredQty: number,
  method: InventoryMethod,
  specificBatchId?: string
): Promise<BatchAllocation[]> {
  switch (method) {
    case 'FIFO':
      return allocateFIFO(tx, productId, warehouseId, requiredQty);
    case 'LIFO':
      return allocateLIFO(tx, productId, warehouseId, requiredQty);
    case 'SPECIFIC':
      return allocateSpecific(tx, productId, warehouseId, specificBatchId!, requiredQty);
    case 'WEIGHTED_AVG':
      return allocateWeightedAvg(tx, productId, warehouseId, requiredQty);
  }
}

// FIFO: 按到貨日期升序
async function allocateFIFO(tx, productId, warehouseId, requiredQty) {
  const inventories = await tx.inventory.findMany({
    where: { productId, warehouseId, quantity: { gt: 0 } },
    include: { batch: true },
    orderBy: { batch: { receivedDate: 'asc' } },
  });
  return allocateFromInventories(inventories, requiredQty);
}

// LIFO: 按到貨日期降序
async function allocateLIFO(tx, productId, warehouseId, requiredQty) {
  const inventories = await tx.inventory.findMany({
    where: { productId, warehouseId, quantity: { gt: 0 } },
    include: { batch: true },
    orderBy: { batch: { receivedDate: 'desc' } },
  });
  return allocateFromInventories(inventories, requiredQty);
}

// 通用分配邏輯
function allocateFromInventories(inventories, requiredQty): BatchAllocation[] {
  const allocations = [];
  let remaining = requiredQty;

  for (const inv of inventories) {
    if (remaining <= 0) break;
    const available = inv.quantity - inv.reservedQuantity;
    if (available <= 0) continue;

    const allocQty = Math.min(available, remaining);
    allocations.push({
      batchId: inv.batch.id,
      quantity: allocQty,
      costPerUnit: inv.batch.costPerUnit,
    });
    remaining -= allocQty;
  }

  if (remaining > 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `庫存不足，缺少 ${remaining}` });
  }
  return allocations;
}
```

---

## 訂單確認服務

```typescript
// src/server/services/order.service.ts

export async function confirmSalesOrder(orderId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, customer: true },
    });

    if (order.status !== 'DRAFT') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '只有草稿可確認' });
    }

    const inventoryMethod = await getSystemSetting('inventoryMethod') || 'FIFO';
    let totalCost = 0;

    for (const item of order.items) {
      const allocations = await allocateBatches(
        tx, item.productId, order.warehouseId, item.quantity, inventoryMethod
      );

      let itemCost = 0;
      for (const alloc of allocations) {
        await tx.inventory.update({
          where: { productId_batchId_warehouseId: {
            productId: item.productId,
            batchId: alloc.batchId,
            warehouseId: order.warehouseId,
          }},
          data: { reservedQuantity: { increment: alloc.quantity } },
        });
        itemCost += alloc.quantity * Number(alloc.costPerUnit);
      }

      await tx.salesOrderItem.update({
        where: { id: item.id },
        data: {
          batchId: allocations[0].batchId,
          unitCost: allocations[0].costPerUnit,
          costAmount: itemCost,
        },
      });
      totalCost += itemCost;
    }

    const updatedOrder = await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED', totalCost },
    });

    await createSalesJournalEntry(tx, order, totalCost, userId);
    await createAccountReceivable(tx, order);

    return updatedOrder;
  });
}
```

---

## 到貨處理服務

```typescript
export async function receivePurchaseOrder(
  orderId: string,
  receivedItems: { itemId: string; quantity: number }[],
  landedCosts: { costTypeId: string; amount: number; currency?: string }[],
  userId: string
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, supplier: true },
    });

    const totalReceivedQty = receivedItems.reduce((sum, r) => sum + r.quantity, 0);
    const createdBatches = [];

    for (const received of receivedItems) {
      const orderItem = order.items.find(i => i.id === received.itemId);

      // 建立批次
      const batch = await tx.batch.create({
        data: {
          batchNumber: await generateBatchNumber(tx),
          productId: orderItem.productId,
          supplierId: order.supplierId,
          purchaseOrderId: orderId,
          quantity: received.quantity,
          receivedDate: new Date(),
          status: 'PENDING',
        },
      });

      // 分攤成本
      let batchTotalCost = 0;
      for (const cost of landedCosts) {
        const ratio = received.quantity / totalReceivedQty;
        const amountInBase = cost.amount * ratio;

        await tx.landedCostItem.create({
          data: {
            batchId: batch.id,
            costTypeId: cost.costTypeId,
            amount: cost.amount * ratio,
            currency: cost.currency || 'USD',
            exchangeRate: 1,
            amountInBase,
          },
        });
        batchTotalCost += amountInBase;
      }

      // 更新批次成本
      const costPerUnit = batchTotalCost / received.quantity;
      await tx.batch.update({
        where: { id: batch.id },
        data: { totalLandedCost: batchTotalCost, costPerUnit, status: 'CONFIRMED' },
      });

      // 入庫
      await tx.inventory.create({
        data: {
          productId: orderItem.productId,
          batchId: batch.id,
          warehouseId: order.warehouseId,
          quantity: received.quantity,
          reservedQuantity: 0,
        },
      });

      createdBatches.push(batch);
    }

    // 更新訂單狀態
    const allReceived = /* 檢查是否全部到貨 */;
    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
    });

    // 產生會計分錄
    const totalLandedCost = createdBatches.reduce((sum, b) => sum + Number(b.totalLandedCost), 0);
    await createPurchaseJournalEntry(tx, order, totalLandedCost, userId);
    await createAccountPayable(tx, order, totalLandedCost);

    return { success: true, batches: createdBatches };
  });
}
```

---

## 單號產生

```typescript
// src/server/services/number.service.ts

export async function generateNumber(tx, type: 'SO' | 'PO' | 'BTH' | 'TR' | 'JE'): Promise<string> {
  const now = new Date();
  const dateStr = type === 'JE'
    ? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    : `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const pattern = `${type}-${dateStr}-`;
  const seqLength = type === 'JE' ? 5 : 4;

  // 查詢最大序號並 +1
  const lastNumber = await getLastNumber(tx, type, pattern);
  const sequence = lastNumber ? parseInt(lastNumber.split('-')[2]) + 1 : 1;

  return `${pattern}${String(sequence).padStart(seqLength, '0')}`;
}
```

---

## 錯誤處理

```typescript
// src/lib/errors.ts

export const Errors = {
  ORDER_NOT_FOUND: (id: string) =>
    new TRPCError({ code: 'NOT_FOUND', message: `訂單不存在: ${id}` }),
  
  INVENTORY_INSUFFICIENT: (product: string, available: number, required: number) =>
    new TRPCError({ code: 'BAD_REQUEST', message: `庫存不足`, cause: { product, available, required } }),
  
  JOURNAL_UNBALANCED: (debit: number, credit: number) =>
    new TRPCError({ code: 'BAD_REQUEST', message: `借貸不平衡: 借${debit} 貸${credit}` }),
};
```

---

## Zod 驗證

```typescript
// src/lib/validators/order.ts

export const createSalesOrderSchema = z.object({
  customerId: z.string().min(1),
  warehouseId: z.string().min(1),
  orderDate: z.date(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
  })).min(1),
});
```
