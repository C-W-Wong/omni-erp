# 開發進度追蹤

## 當前狀態

- **目前階段**: Phase 3 - Landed Cost 模組
- **下一個任務**: 3.1 成本項目類型管理
- **最後更新**: 2026-01-17
- **Phase 1 完成**: ✓
- **Phase 2 完成**: ✓

---

## 進度記錄

### Session Log

| 日期 | Session | 完成功能 | 備註 |
|------|---------|---------|------|
| 2026-01-17 | 1 | 1.1 專案設置 | Next.js 14, TypeScript, Tailwind, Docker, ESLint/Prettier |
| 2026-01-17 | 1 | 1.2 Prisma 設置 | PostgreSQL 連線, User model with roles |
| 2026-01-17 | 1 | 1.3 tRPC 設置 | tRPC server/client, React Query integration |
| 2026-01-17 | 1 | 1.4 UI 基礎設置 | shadcn/ui, Dashboard layout, Sidebar, Header, Dark mode |
| 2026-01-17 | 1 | 1.5 認證系統 | NextAuth.js v5, Login page, Middleware, useAuth hook |
| 2026-01-17 | 2 | 2.1 產品管理 | Product/Category models, tRPC router, DataTable, ProductForm |
| 2026-01-17 | 3 | 2.2 客戶管理 | Customer model, payment terms, credit limits |
| 2026-01-17 | 3 | 2.3 供應商管理 | Supplier model, lead times, currency settings |
| 2026-01-17 | 3 | 2.4 倉庫管理 | Warehouse model, default warehouse logic |

---

## 已完成功能

| ID | 功能名稱 | 完成日期 | 備註 |
|----|---------|---------|------|
| 1.1 | 專案設置 | 2026-01-17 | Next.js 14 with App Router |
| 1.2 | Prisma 設置 | 2026-01-17 | PostgreSQL on Docker port 5433 |
| 1.3 | tRPC 設置 | 2026-01-17 | Type-safe API layer |
| 1.4 | UI 基礎設置 | 2026-01-17 | Industrial design theme |
| 1.5 | 認證系統 | 2026-01-17 | NextAuth.js v5, JWT strategy, 5 roles |
| 2.1 | 產品管理 | 2026-01-17 | Product/Category CRUD, DataTable, CategoryManager |
| 2.2 | 客戶管理 | 2026-01-17 | Customer CRUD, payment terms, credit limits |
| 2.3 | 供應商管理 | 2026-01-17 | Supplier CRUD, lead times, currency settings |
| 2.4 | 倉庫管理 | 2026-01-17 | Warehouse CRUD, default warehouse logic |

---

## 待處理問題

| ID | 問題描述 | 優先級 | 狀態 |
|----|---------|--------|------|
| - | - | - | - |

---

## 測試狀態

| 模組 | 單元測試 | 整合測試 | 備註 |
|------|---------|---------|------|
| Auth | - | - | Pending |
| tRPC | - | - | Pending |

---

## 使用說明

### 更新進度

每次開發會話結束時：

1. 更新 `features.json` 中對應功能的 `status`
2. 在此文件的 Session Log 添加記錄
3. 如有待處理問題，記錄在「待處理問題」區塊

### 狀態定義

- `pending`: 尚未開始
- `in_progress`: 進行中
- `completed`: 已完成
- `blocked`: 被阻擋

### 優先級定義

- `critical`: 必須優先完成
- `high`: 重要
- `medium`: 一般
- `low`: 可延後

### 測試帳號

| 角色 | Email | 密碼 |
|------|-------|------|
| Admin | admin@erp.local | admin123 |
| Sales | sales@erp.local | test123 |
| Warehouse | warehouse@erp.local | test123 |
| Purchasing | purchasing@erp.local | test123 |
| Accounting | accounting@erp.local | test123 |
