# API 規格 (tRPC)

## 概述

本系統使用 tRPC 作為 API 層，提供全棧類型安全。

---

## tRPC 設置

```typescript
// src/server/trpc/trpc.ts

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// 認證中間件
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// 角色檢查
const enforceUserHasRole = (roles: string[]) => t.middleware(({ ctx, next }) => {
  if (!roles.includes(ctx.session?.user?.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(enforceUserHasRole(['admin']));
export const salesProcedure = protectedProcedure.use(enforceUserHasRole(['admin', 'sales']));
```

---

## 根路由

```typescript
// src/server/trpc/router.ts

export const appRouter = createTRPCRouter({
  product: productRouter,
  customer: customerRouter,
  supplier: supplierRouter,
  warehouse: warehouseRouter,
  batch: batchRouter,
  inventory: inventoryRouter,
  purchaseOrder: purchaseOrderRouter,
  salesOrder: salesOrderRouter,
  accounting: accountingRouter,
  report: reportRouter,
  setting: settingRouter,
});

export type AppRouter = typeof appRouter;
```

---

## Router 範例

### Product Router

```typescript
export const productRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const where = search ? {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      } : {};

      const [items, total] = await Promise.all([
        ctx.prisma.product.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { category: true },
        }),
        ctx.prisma.product.count({ where }),
      ]);

      return { items, pagination: { page, pageSize, total } };
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) => ctx.prisma.product.findUnique({
      where: { id: input },
      include: { category: true },
    })),

  create: adminProcedure
    .input(productSchema)
    .mutation(({ ctx, input }) => ctx.prisma.product.create({ data: input })),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: productSchema.partial() }))
    .mutation(({ ctx, input }) => ctx.prisma.product.update({
      where: { id: input.id },
      data: input.data,
    })),

  delete: adminProcedure
    .input(z.string())
    .mutation(({ ctx, input }) => ctx.prisma.product.update({
      where: { id: input },
      data: { isActive: false },
    })),
});
```

### Sales Order Router

```typescript
export const salesOrderRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      status: z.enum(['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
      customerId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => { /* ... */ }),

  create: salesProcedure
    .input(createSalesOrderSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  confirm: salesProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return confirmSalesOrder(input, ctx.session.user.id);
    }),

  ship: warehouseProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return shipSalesOrder(input);
    }),
});
```

### Inventory Router

```typescript
export const inventoryRouter = createTRPCRouter({
  summary: protectedProcedure
    .input(z.object({
      warehouseId: z.string().optional(),
      lowStockOnly: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => { /* 按產品彙總 */ }),

  getByProduct: protectedProcedure
    .input(z.object({
      productId: z.string(),
      warehouseId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => { /* 按批次展開 */ }),

  checkAvailability: protectedProcedure
    .input(z.object({
      productId: z.string(),
      warehouseId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return getAvailableQuantity(ctx.prisma, input.productId, input.warehouseId);
    }),

  createTransfer: warehouseProcedure
    .input(z.object({
      fromWarehouseId: z.string(),
      toWarehouseId: z.string(),
      items: z.array(z.object({
        productId: z.string(),
        batchId: z.string(),
        quantity: z.number().int().min(1),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  confirmTransfer: warehouseProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return confirmTransfer(input);
    }),
});
```

### Accounting Router

```typescript
export const accountingRouter = createTRPCRouter({
  chartOfAccounts: protectedProcedure
    .query(async ({ ctx }) => { /* 樹狀結構 */ }),

  journalEntries: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      status: z.enum(['DRAFT', 'POSTED', 'VOIDED']).optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  createJournalEntry: accountingProcedure
    .input(z.object({
      entryDate: z.date(),
      description: z.string().optional(),
      lines: z.array(z.object({
        accountId: z.string(),
        debitAmount: z.number().min(0),
        creditAmount: z.number().min(0),
      })).min(2),
    }))
    .mutation(async ({ ctx, input }) => { /* 驗證借貸平衡 */ }),

  trialBalance: accountingProcedure
    .input(z.object({ asOfDate: z.date().optional() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  arAgingAnalysis: accountingProcedure
    .input(z.object({ customerId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return getARAgingAnalysis(input.customerId);
    }),
});
```

---

## 客戶端使用

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/trpc/router';

export const trpc = createTRPCReact<AppRouter>();
```

```tsx
// React 元件中
function ProductList() {
  const { data, isLoading } = trpc.product.list.useQuery({ page: 1 });
  const utils = trpc.useUtils();

  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => utils.product.list.invalidate(),
  });

  // ...
}
```

---

## 權限矩陣

| Router | Admin | Sales | Warehouse | Purchasing | Accounting |
|--------|-------|-------|-----------|------------|------------|
| product | CRUD | R | R | R | R |
| customer | CRUD | CRUD | R | - | R |
| supplier | CRUD | R | R | CRUD | R |
| warehouse | CRUD | R | CRUD | R | R |
| salesOrder | CRUD | CRUD | R | - | R |
| purchaseOrder | CRUD | R | R | CRUD | R |
| inventory | CRUD | R | CRUD | R | R |
| batch | CRUD | R | CRUD | R | R |
| accounting | CRUD | - | - | - | CRUD |
| report | ALL | LIMITED | LIMITED | LIMITED | ALL |
