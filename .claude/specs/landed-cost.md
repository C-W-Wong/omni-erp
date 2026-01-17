# Landed Cost 規格

## 概述

Landed Cost（到岸成本）是進口貿易的核心計算，包含產品成本和所有相關費用（運費、關稅、保險等）。本系統以批次為單位追蹤 Landed Cost。

---

## 公式

```
Landed Cost = FOB 價格 + 運費 + 關稅 + 保險 + 其他費用

單位成本 = Landed Cost ÷ 數量
```

---

## 成本項目類型

### 預設項目 (Seed Data)

```typescript
// prisma/seed.ts

const costItemTypes = [
  { code: 'PRODUCT_COST', name: '產品成本 (FOB)', isSystem: true, displayOrder: 1 },
  { code: 'OCEAN_FREIGHT', name: '海運費', isSystem: true, displayOrder: 2 },
  { code: 'AIR_FREIGHT', name: '空運費', isSystem: true, displayOrder: 3 },
  { code: 'CUSTOMS_DUTY', name: '關稅', isSystem: true, displayOrder: 4 },
  { code: 'BROKERAGE_FEE', name: '報關費', isSystem: true, displayOrder: 5 },
  { code: 'INSURANCE', name: '保險費', isSystem: true, displayOrder: 6 },
  { code: 'THC', name: '碼頭處理費', isSystem: true, displayOrder: 7 },
  { code: 'INLAND_FREIGHT', name: '內陸運費', isSystem: true, displayOrder: 8 },
  { code: 'WAREHOUSING', name: '倉儲費', isSystem: true, displayOrder: 9 },
  { code: 'OTHER', name: '其他費用', isSystem: true, displayOrder: 10 },
];
```

### 管理規則

- `isSystem = true` 的項目不可刪除
- 用戶可以新增自定義成本項目類型
- 項目按 `displayOrder` 排序顯示

---

## 批次生命週期

```
┌─────────┐     ┌───────────┐     ┌──────────┐
│ PENDING │────▶│ CONFIRMED │────▶│ DEPLETED │
└─────────┘     └───────────┘     └──────────┘
```

| 狀態 | 說明 | 可執行操作 |
|------|------|-----------|
| PENDING | 待確認成本 | 新增/編輯/刪除成本項目 |
| CONFIRMED | 成本已確認 | 無法修改成本 |
| DEPLETED | 庫存已用完 | 無法修改 |

---

## 成本輸入流程

### 1. 到貨時建立批次

```typescript
// 在 receivePurchaseOrder 中
const batch = await tx.batch.create({
  data: {
    batchNumber: await generateBatchNumber(tx),
    productId: orderItem.productId,
    supplierId: order.supplierId,
    purchaseOrderId: order.id,
    quantity: receivedQuantity,
    receivedDate: new Date(),
    status: 'PENDING',
  },
});
```

### 2. 輸入成本項目

```typescript
// src/server/services/batch.service.ts

interface AddLandedCostInput {
  batchId: string;
  costTypeId: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  vendor?: string;
  referenceNo?: string;
  notes?: string;
}

export async function addLandedCostItem(
  input: AddLandedCostInput
): Promise<LandedCostItem> {
  const batch = await prisma.batch.findUnique({
    where: { id: input.batchId },
  });

  if (!batch) {
    throw new TRPCError({ code: 'NOT_FOUND', message: '批次不存在' });
  }

  if (batch.status !== 'PENDING') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '批次成本已確認，無法修改',
    });
  }

  const exchangeRate = input.exchangeRate || 1;
  const amountInBase = input.amount * exchangeRate;

  return prisma.landedCostItem.create({
    data: {
      batchId: input.batchId,
      costTypeId: input.costTypeId,
      amount: input.amount,
      currency: input.currency || 'USD',
      exchangeRate,
      amountInBase,
      vendor: input.vendor,
      referenceNo: input.referenceNo,
      notes: input.notes,
    },
  });
}
```

### 3. 重新計算批次成本

```typescript
export async function recalculateBatchCost(batchId: string): Promise<Batch> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { landedCostItems: true },
  });

  if (!batch) {
    throw new TRPCError({ code: 'NOT_FOUND', message: '批次不存在' });
  }

  const totalLandedCost = batch.landedCostItems.reduce(
    (sum, item) => sum + Number(item.amountInBase),
    0
  );

  const costPerUnit = batch.quantity > 0 
    ? totalLandedCost / batch.quantity 
    : 0;

  return prisma.batch.update({
    where: { id: batchId },
    data: {
      totalLandedCost,
      costPerUnit,
    },
  });
}
```

### 4. 確認批次成本

```typescript
export async function confirmBatchCost(batchId: string): Promise<Batch> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { landedCostItems: true },
  });

  if (!batch) {
    throw new TRPCError({ code: 'NOT_FOUND', message: '批次不存在' });
  }

  if (batch.status !== 'PENDING') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '批次已確認或已用完',
    });
  }

  if (batch.landedCostItems.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '請先輸入成本項目',
    });
  }

  // 重新計算確保準確
  const totalLandedCost = batch.landedCostItems.reduce(
    (sum, item) => sum + Number(item.amountInBase),
    0
  );
  const costPerUnit = totalLandedCost / batch.quantity;

  return prisma.batch.update({
    where: { id: batchId },
    data: {
      totalLandedCost,
      costPerUnit,
      status: 'CONFIRMED',
    },
  });
}
```

---

## 多產品批次成本分攤

當一個採購訂單包含多個產品，且有共同費用（如整櫃運費）時，需要分攤成本。

### 分攤方法

| 方法 | 公式 | 適用場景 |
|------|------|---------|
| 按金額比例 | 產品金額 ÷ 總金額 | 預設方法 |
| 按數量比例 | 產品數量 ÷ 總數量 | 同類產品 |
| 按重量比例 | 產品重量 ÷ 總重量 | 運費分攤 |
| 按體積比例 | 產品體積 ÷ 總體積 | 海運分攤 |

### 實現

```typescript
// 在到貨處理時分攤共同費用

interface ReceivedItem {
  itemId: string;
  quantity: number;
}

interface SharedCost {
  costTypeId: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  vendor?: string;
  referenceNo?: string;
}

export async function allocateSharedCosts(
  receivedItems: ReceivedItem[],
  sharedCosts: SharedCost[],
  method: 'amount' | 'quantity' | 'weight' | 'volume' = 'amount'
): Promise<Map<string, SharedCost[]>> {
  // 計算各項目的分攤比例
  let totalWeight = 0;
  const itemWeights = new Map<string, number>();

  for (const item of receivedItems) {
    let weight: number;
    
    switch (method) {
      case 'quantity':
        weight = item.quantity;
        break;
      case 'amount':
      default:
        // 需要從訂單項目取得金額
        const orderItem = await prisma.purchaseOrderItem.findUnique({
          where: { id: item.itemId },
        });
        weight = Number(orderItem?.amount || 0);
        break;
      // weight 和 volume 需要產品資料支援
    }

    itemWeights.set(item.itemId, weight);
    totalWeight += weight;
  }

  // 分攤成本
  const allocations = new Map<string, SharedCost[]>();

  for (const item of receivedItems) {
    const ratio = totalWeight > 0 
      ? itemWeights.get(item.itemId)! / totalWeight 
      : 1 / receivedItems.length;

    const itemCosts = sharedCosts.map(cost => ({
      ...cost,
      amount: cost.amount * ratio,
    }));

    allocations.set(item.itemId, itemCosts);
  }

  return allocations;
}
```

---

## Batch tRPC Router

```typescript
// src/server/trpc/routers/batch.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, warehouseProcedure } from '../trpc';
import {
  addLandedCostItem,
  updateLandedCostItem,
  deleteLandedCostItem,
  recalculateBatchCost,
  confirmBatchCost,
} from '../../services/batch.service';

export const batchRouter = createTRPCRouter({
  // 列表
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      status: z.enum(['PENDING', 'CONFIRMED', 'DEPLETED']).optional(),
      productId: z.string().optional(),
      supplierId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, status, productId, supplierId, startDate, endDate } = input;
      const skip = (page - 1) * pageSize;

      const where: Prisma.BatchWhereInput = {};
      if (status) where.status = status;
      if (productId) where.productId = productId;
      if (supplierId) where.supplierId = supplierId;
      if (startDate || endDate) {
        where.receivedDate = {};
        if (startDate) where.receivedDate.gte = startDate;
        if (endDate) where.receivedDate.lte = endDate;
      }

      const [items, total] = await Promise.all([
        ctx.prisma.batch.findMany({
          where,
          include: {
            product: true,
            supplier: true,
            purchaseOrder: true,
            _count: { select: { landedCostItems: true } },
          },
          orderBy: { receivedDate: 'desc' },
          skip,
          take: pageSize,
        }),
        ctx.prisma.batch.count({ where }),
      ]);

      return {
        items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }),

  // 詳情（含成本明細）
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const batch = await ctx.prisma.batch.findUnique({
        where: { id: input },
        include: {
          product: true,
          supplier: true,
          purchaseOrder: true,
          landedCostItems: {
            include: { costType: true },
            orderBy: { costType: { displayOrder: 'asc' } },
          },
        },
      });

      if (!batch) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '批次不存在' });
      }

      return batch;
    }),

  // 新增成本項目
  addCostItem: warehouseProcedure
    .input(z.object({
      batchId: z.string(),
      costTypeId: z.string(),
      amount: z.number().min(0),
      currency: z.string().default('USD'),
      exchangeRate: z.number().min(0).default(1),
      vendor: z.string().optional(),
      referenceNo: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await addLandedCostItem(input);
      await recalculateBatchCost(input.batchId);
      return item;
    }),

  // 更新成本項目
  updateCostItem: warehouseProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        amount: z.number().min(0).optional(),
        currency: z.string().optional(),
        exchangeRate: z.number().min(0).optional(),
        vendor: z.string().optional(),
        referenceNo: z.string().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await updateLandedCostItem(input.id, input.data);
      await recalculateBatchCost(item.batchId);
      return item;
    }),

  // 刪除成本項目
  deleteCostItem: warehouseProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const item = await deleteLandedCostItem(input);
      await recalculateBatchCost(item.batchId);
      return { success: true };
    }),

  // 確認批次成本
  confirm: warehouseProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return confirmBatchCost(input);
    }),
});
```

---

## 前端介面

### 批次詳情頁面結構

```
┌─────────────────────────────────────────────────────────────────┐
│ 批次 BTH-20260117-0001                          [確認成本] 按鈕 │
├─────────────────────────────────────────────────────────────────┤
│ 基本資訊                                                         │
│ ┌─────────────┬─────────────┬─────────────┬─────────────────┐  │
│ │ 產品        │ 供應商      │ 數量        │ 到貨日期        │  │
│ │ Widget A    │ ABC Corp    │ 1,000 PCS   │ 2026-01-17      │  │
│ └─────────────┴─────────────┴─────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ 成本明細                                        [新增成本] 按鈕  │
│ ┌──────────────┬──────────┬───────┬──────────┬────────┬─────┐ │
│ │ 成本類型     │ 金額     │ 幣別  │ 匯率     │ 本幣   │     │ │
│ ├──────────────┼──────────┼───────┼──────────┼────────┼─────┤ │
│ │ 產品成本     │ 5,000.00 │ USD   │ 1.0000   │ 5,000  │ [X] │ │
│ │ 海運費       │   300.00 │ USD   │ 1.0000   │   300  │ [X] │ │
│ │ 關稅         │   250.00 │ TWD   │ 0.0313   │   7.83 │ [X] │ │
│ │ 報關費       │    50.00 │ USD   │ 1.0000   │    50  │ [X] │ │
│ └──────────────┴──────────┴───────┴──────────┴────────┴─────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 成本彙總                                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 總 Landed Cost: $5,357.83                                   │ │
│ │ 單位成本: $5.36 / PCS                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### React 元件範例

```tsx
// src/app/(dashboard)/batches/[id]/page.tsx

'use client';

import { trpc } from '@/lib/trpc';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LandedCostDialog } from './LandedCostDialog';

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: batch, isLoading } = trpc.batch.getById.useQuery(id);
  const utils = trpc.useUtils();

  const confirmMutation = trpc.batch.confirm.useMutation({
    onSuccess: () => {
      utils.batch.getById.invalidate(id);
    },
  });

  if (isLoading) return <div>載入中...</div>;
  if (!batch) return <div>批次不存在</div>;

  const isPending = batch.status === 'PENDING';

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">批次 {batch.batchNumber}</h1>
        {isPending && (
          <Button onClick={() => confirmMutation.mutate(id)}>
            確認成本
          </Button>
        )}
      </div>

      {/* 基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle>基本資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">產品</div>
              <div>{batch.product.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">供應商</div>
              <div>{batch.supplier.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">數量</div>
              <div>{batch.quantity} {batch.product.unit}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">到貨日期</div>
              <div>{batch.receivedDate.toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 成本明細 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>成本明細</CardTitle>
          {isPending && <LandedCostDialog batchId={id} />}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>成本類型</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>幣別</TableHead>
                <TableHead className="text-right">匯率</TableHead>
                <TableHead className="text-right">本幣金額</TableHead>
                {isPending && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.landedCostItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.costType.name}</TableCell>
                  <TableCell className="text-right">
                    {Number(item.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{item.currency}</TableCell>
                  <TableCell className="text-right">
                    {Number(item.exchangeRate).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.amountInBase).toLocaleString()}
                  </TableCell>
                  {isPending && (
                    <TableCell>
                      <DeleteCostItemButton itemId={item.id} batchId={id} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 成本彙總 */}
      <Card>
        <CardHeader>
          <CardTitle>成本彙總</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>總 Landed Cost</span>
              <span className="font-bold">
                ${Number(batch.totalLandedCost).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>單位成本</span>
              <span className="font-bold">
                ${Number(batch.costPerUnit).toFixed(4)} / {batch.product.unit}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 報表

### 批次成本分析

```typescript
// src/server/trpc/routers/report.ts

export const reportRouter = createTRPCRouter({
  batchCostAnalysis: protectedProcedure
    .input(z.object({
      productId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: Prisma.BatchWhereInput = {
        status: 'CONFIRMED',
      };
      if (input.productId) where.productId = input.productId;
      if (input.startDate || input.endDate) {
        where.receivedDate = {};
        if (input.startDate) where.receivedDate.gte = input.startDate;
        if (input.endDate) where.receivedDate.lte = input.endDate;
      }

      const batches = await ctx.prisma.batch.findMany({
        where,
        include: {
          product: true,
          supplier: true,
          landedCostItems: {
            include: { costType: true },
          },
        },
        orderBy: { receivedDate: 'desc' },
      });

      // 彙總各成本類型
      const costByType = new Map<string, number>();
      let totalCost = 0;

      for (const batch of batches) {
        for (const item of batch.landedCostItems) {
          const current = costByType.get(item.costType.code) || 0;
          costByType.set(item.costType.code, current + Number(item.amountInBase));
          totalCost += Number(item.amountInBase);
        }
      }

      return {
        batches,
        summary: {
          totalBatches: batches.length,
          totalCost,
          costByType: Object.fromEntries(costByType),
          averageCostPerBatch: batches.length > 0 ? totalCost / batches.length : 0,
        },
      };
    }),
});
```
