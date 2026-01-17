# Import Trading ERP - AI Agent 開發指引

## 專案概述

進口貿易 ERP 系統，專注於 **Landed Cost 追蹤** 和 **批次成本管理**。

**核心功能：**
- 採購管理（含到貨處理和 Landed Cost 輸入）
- 銷售管理（含批次分配和成本追蹤）
- 多倉庫庫存管理（Product × Batch × Warehouse 三維追蹤）
- 複式記帳會計模組
- 管理報表和儀表板

---

## 技術架構

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 14 (App Router)              │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │   Frontend    │  │    tRPC       │  │  Services   │ │
│  │  React + RSC  │◀▶│  API Layer    │◀▶│  Business   │ │
│  │  shadcn/ui    │  │  Type-safe    │  │   Logic     │ │
│  └───────────────┘  └───────────────┘  └─────────────┘ │
│                                              │          │
│                                              ▼          │
│                     ┌───────────────────────────────┐  │
│                     │         Prisma ORM            │  │
│                     └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    └─────────────────────┘
```

**技術棧：**

| 層級 | 技術 | 版本 |
|------|------|------|
| 框架 | Next.js | 14.x (App Router) |
| 語言 | TypeScript | 5.x |
| API | tRPC | 11.x |
| ORM | Prisma | 5.x |
| 資料庫 | PostgreSQL | 16.x |
| UI 元件 | shadcn/ui | latest |
| 樣式 | Tailwind CSS | 3.x |
| 表單 | React Hook Form + Zod | latest |
| 表格 | TanStack Table | 8.x |
| 認證 | NextAuth.js | 5.x |
| 容器 | Docker + Docker Compose | latest |

---

## 專案結構

```
erp-system/
├── prisma/
│   ├── schema.prisma          # 資料模型定義
│   ├── migrations/            # 資料庫遷移
│   └── seed.ts                # 初始資料
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # 認證相關頁面
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/      # 主要應用頁面
│   │   │   ├── layout.tsx    # Dashboard 佈局（含側邊欄）
│   │   │   ├── page.tsx      # 首頁/儀表板
│   │   │   ├── products/
│   │   │   ├── customers/
│   │   │   ├── suppliers/
│   │   │   ├── warehouses/
│   │   │   ├── purchase-orders/
│   │   │   ├── sales-orders/
│   │   │   ├── inventory/
│   │   │   ├── batches/
│   │   │   ├── accounting/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   └── trpc/[trpc]/  # tRPC API 端點
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── server/                # 伺服器端程式碼
│   │   ├── trpc/
│   │   │   ├── router.ts     # tRPC 根路由
│   │   │   ├── trpc.ts       # tRPC 初始化
│   │   │   └── routers/      # 各模組路由
│   │   │       ├── product.ts
│   │   │       ├── customer.ts
│   │   │       ├── supplier.ts
│   │   │       ├── warehouse.ts
│   │   │       ├── purchaseOrder.ts
│   │   │       ├── salesOrder.ts
│   │   │       ├── inventory.ts
│   │   │       ├── batch.ts
│   │   │       ├── accounting.ts
│   │   │       └── report.ts
│   │   │
│   │   ├── services/          # 業務邏輯層
│   │   │   ├── inventory.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── batch.service.ts
│   │   │   ├── accounting.service.ts
│   │   │   └── number.service.ts
│   │   │
│   │   └── db.ts              # Prisma Client 實例
│   │
│   ├── components/            # React 元件
│   │   ├── ui/               # shadcn/ui 元件
│   │   ├── forms/            # 表單元件
│   │   ├── tables/           # 資料表格元件
│   │   ├── layout/           # 佈局元件
│   │   └── shared/           # 共用元件
│   │
│   ├── lib/                   # 工具函數
│   │   ├── utils.ts
│   │   ├── trpc.ts           # tRPC 客戶端
│   │   └── validators/       # Zod schemas
│   │
│   └── types/                 # 類型定義
│       └── index.ts
│
├── .claude/                   # AI Agent 配置
│   ├── features.json         # 功能清單和進度
│   ├── progress.md           # 開發日誌
│   └── specs/                # 詳細規格文件
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 開發工作流程

### 每個功能的開發步驟

1. **閱讀規格** — 查看 `.claude/specs/` 中的相關文件
2. **更新 Schema** — 修改 `prisma/schema.prisma`
3. **執行遷移** — `npx prisma migrate dev`
4. **建立 Service** — 在 `src/server/services/` 實現業務邏輯
5. **建立 tRPC Router** — 在 `src/server/trpc/routers/` 定義 API
6. **建立前端頁面** — 在 `src/app/(dashboard)/` 建立頁面
7. **測試** — 確保功能正常
8. **更新進度** — 更新 `features.json` 狀態

### 關鍵命令

```bash
# 開發
npm run dev

# 資料庫
npx prisma migrate dev      # 建立遷移
npx prisma db push          # 快速同步（開發用）
npx prisma studio           # 資料庫 GUI
npx prisma db seed          # 執行 seed

# 類型生成
npx prisma generate         # 生成 Prisma Client
```

---

## 核心業務規則

### 訂單驅動流程

```
銷售訂單確認 → 批次分配 → 預留庫存 → 產生會計分錄
採購訂單到貨 → 建立批次 → 輸入 Landed Cost → 入庫 → 產生會計分錄
```

### 庫存分配方法

- **FIFO**：先進先出（預設）
- **LIFO**：後進先出
- **SPECIFIC**：指定批次
- **WEIGHTED_AVG**：加權平均

### 會計原則

- 所有分錄必須借貸平衡
- 系統自動產生分錄，狀態直接為 posted
- 已過帳分錄不可修改，只能作廢

---

## 命名規範

| 類型 | 規範 | 範例 |
|------|------|------|
| 資料庫表 | snake_case | `purchase_orders` |
| Prisma Model | PascalCase | `PurchaseOrder` |
| tRPC Router | camelCase | `purchaseOrder` |
| API Procedure | camelCase | `getById`, `create` |
| React Component | PascalCase | `OrderForm.tsx` |
| 函數/變數 | camelCase | `calculateTotal` |
| 常數 | UPPER_SNAKE | `INVENTORY_METHODS` |
| 檔案（元件） | PascalCase | `OrderTable.tsx` |
| 檔案（其他） | kebab-case | `use-order.ts` |

---

## Git Commit 規範

```
feat: 新功能
fix: 修復 bug
docs: 文件更新
refactor: 重構
style: 格式調整
test: 測試相關
chore: 其他雜項
```

範例：
```
feat(inventory): implement FIFO allocation algorithm
fix(order): correct total calculation with tax
docs: update API documentation
```

---

## 重要提醒

1. **事務處理**：涉及多表操作必須使用 Prisma Transaction
2. **類型安全**：善用 Prisma 生成的類型和 Zod schema
3. **錯誤處理**：使用 tRPC 的 TRPCError 統一錯誤格式
4. **驗證**：前後端都要驗證，使用共用的 Zod schema
5. **批次成本不可變**：確認後的批次成本不可修改

---

## 開始開發

1. 查看 `.claude/features.json` 確認下一個任務
2. 閱讀 `.claude/specs/` 中的相關規格
3. 按照開發步驟實現功能
4. 完成後更新進度
