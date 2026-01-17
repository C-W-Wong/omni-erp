# 數據模型規格 (Prisma Schema)

## 概述

本文件定義 ERP 系統的完整 Prisma 資料模型。

---

## 完整 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 認證與用戶
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String    // bcrypt hashed
  role          Role      @relation(fields: [roleId], references: [id])
  roleId        String
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  salesOrders       SalesOrder[]
  purchaseOrders    PurchaseOrder[]
  journalEntries    JournalEntry[]   @relation("CreatedBy")
  postedEntries     JournalEntry[]   @relation("PostedBy")
  inventoryTransfers InventoryTransfer[]

  @@map("users")
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique  // Admin, Sales, Warehouse, Purchasing, Accounting
  code        String   @unique
  description String?
  permissions Json     // 權限配置 JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users User[]

  @@map("roles")
}

// ============================================
// 產品管理
// ============================================

model ProductCategory {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique
  description String?
  parentId    String?
  parent      ProductCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ProductCategory[] @relation("CategoryHierarchy")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  products Product[]

  @@map("product_categories")
}

model Product {
  id            String   @id @default(cuid())
  sku           String   @unique
  name          String
  description   String?
  categoryId    String?
  category      ProductCategory? @relation(fields: [categoryId], references: [id])
  unit          String   @default("PCS")
  defaultPrice  Decimal  @default(0) @db.Decimal(15, 4)
  minStockLevel Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  batches              Batch[]
  inventories          Inventory[]
  purchaseOrderItems   PurchaseOrderItem[]
  salesOrderItems      SalesOrderItem[]
  transferItems        InventoryTransferItem[]

  @@map("products")
}

// ============================================
// 客戶管理
// ============================================

model Customer {
  id              String   @id @default(cuid())
  code            String   @unique
  name            String
  contactPerson   String?
  email           String?
  phone           String?
  address         String?
  shippingAddress String?
  taxId           String?
  paymentTerms    Int      @default(30)
  creditLimit     Decimal  @default(0) @db.Decimal(15, 2)
  notes           String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  salesOrders        SalesOrder[]
  accountReceivables AccountReceivable[]

  @@map("customers")
}

// ============================================
// 供應商管理
// ============================================

model Supplier {
  id            String   @id @default(cuid())
  code          String   @unique
  name          String
  contactPerson String?
  email         String?
  phone         String?
  address       String?
  country       String?
  taxId         String?
  paymentTerms  Int      @default(30)
  currency      String   @default("USD")
  notes         String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  purchaseOrders  PurchaseOrder[]
  batches         Batch[]
  accountPayables AccountPayable[]

  @@map("suppliers")
}

// ============================================
// 倉庫管理
// ============================================

model Warehouse {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  address   String?
  manager   String?
  phone     String?
  isDefault Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  inventories      Inventory[]
  salesOrders      SalesOrder[]
  purchaseOrders   PurchaseOrder[]
  transfersFrom    InventoryTransfer[] @relation("FromWarehouse")
  transfersTo      InventoryTransfer[] @relation("ToWarehouse")

  @@map("warehouses")
}

// ============================================
// Landed Cost 模組
// ============================================

model CostItemType {
  id           String   @id @default(cuid())
  code         String   @unique
  name         String
  description  String?
  isSystem     Boolean  @default(false)
  isActive     Boolean  @default(true)
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  landedCostItems LandedCostItem[]

  @@map("cost_item_types")
}

model Batch {
  id              String      @id @default(cuid())
  batchNumber     String      @unique
  productId       String
  product         Product     @relation(fields: [productId], references: [id])
  supplierId      String
  supplier        Supplier    @relation(fields: [supplierId], references: [id])
  purchaseOrderId String?
  purchaseOrder   PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
  quantity        Int
  receivedDate    DateTime
  totalLandedCost Decimal     @default(0) @db.Decimal(15, 4)
  costPerUnit     Decimal     @default(0) @db.Decimal(15, 6)
  status          BatchStatus @default(PENDING)
  notes           String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  landedCostItems   LandedCostItem[]
  inventories       Inventory[]
  salesOrderItems   SalesOrderItem[]
  transferItems     InventoryTransferItem[]

  @@map("batches")
}

enum BatchStatus {
  PENDING
  CONFIRMED
  DEPLETED
}

model LandedCostItem {
  id            String       @id @default(cuid())
  batchId       String
  batch         Batch        @relation(fields: [batchId], references: [id], onDelete: Cascade)
  costTypeId    String
  costType      CostItemType @relation(fields: [costTypeId], references: [id])
  amount        Decimal      @db.Decimal(15, 4)
  currency      String       @default("USD")
  exchangeRate  Decimal      @default(1) @db.Decimal(10, 6)
  amountInBase  Decimal      @db.Decimal(15, 4)
  vendor        String?
  referenceNo   String?
  notes         String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@map("landed_cost_items")
}

// ============================================
// 庫存管理
// ============================================

model Inventory {
  id               String    @id @default(cuid())
  productId        String
  product          Product   @relation(fields: [productId], references: [id])
  batchId          String
  batch            Batch     @relation(fields: [batchId], references: [id])
  warehouseId      String
  warehouse        Warehouse @relation(fields: [warehouseId], references: [id])
  quantity         Int       @default(0)
  reservedQuantity Int       @default(0)
  location         String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@unique([productId, batchId, warehouseId])
  @@map("inventories")
}

model InventoryTransfer {
  id              String         @id @default(cuid())
  transferNumber  String         @unique
  fromWarehouseId String
  fromWarehouse   Warehouse      @relation("FromWarehouse", fields: [fromWarehouseId], references: [id])
  toWarehouseId   String
  toWarehouse     Warehouse      @relation("ToWarehouse", fields: [toWarehouseId], references: [id])
  status          TransferStatus @default(DRAFT)
  transferDate    DateTime?
  completedDate   DateTime?
  notes           String?
  createdById     String
  createdBy       User           @relation(fields: [createdById], references: [id])
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  items InventoryTransferItem[]

  @@map("inventory_transfers")
}

model InventoryTransferItem {
  id         String            @id @default(cuid())
  transferId String
  transfer   InventoryTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  productId  String
  product    Product           @relation(fields: [productId], references: [id])
  batchId    String
  batch      Batch             @relation(fields: [batchId], references: [id])
  quantity   Int
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  @@map("inventory_transfer_items")
}

enum TransferStatus {
  DRAFT
  IN_TRANSIT
  COMPLETED
  CANCELLED
}

// ============================================
// 採購模組
// ============================================

model PurchaseOrder {
  id            String   @id @default(cuid())
  orderNumber   String   @unique
  supplierId    String
  supplier      Supplier @relation(fields: [supplierId], references: [id])
  warehouseId   String
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
  status        PurchaseOrderStatus @default(DRAFT)
  orderDate     DateTime
  expectedDate  DateTime?
  receivedDate  DateTime?
  currency      String   @default("USD")
  exchangeRate  Decimal  @default(1) @db.Decimal(10, 6)
  subtotal      Decimal  @default(0) @db.Decimal(15, 2)
  taxAmount     Decimal  @default(0) @db.Decimal(15, 2)
  totalAmount   Decimal  @default(0) @db.Decimal(15, 2)
  notes         String?
  createdById   String
  createdBy     User     @relation(fields: [createdById], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  items           PurchaseOrderItem[]
  batches         Batch[]
  accountPayables AccountPayable[]

  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id              String        @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product       @relation(fields: [productId], references: [id])
  quantity        Int
  receivedQuantity Int          @default(0)
  unitPrice       Decimal       @db.Decimal(15, 4)
  amount          Decimal       @db.Decimal(15, 2)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("purchase_order_items")
}

enum PurchaseOrderStatus {
  DRAFT
  CONFIRMED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

// ============================================
// 銷售模組
// ============================================

model SalesOrder {
  id               String   @id @default(cuid())
  orderNumber      String   @unique
  customerId       String
  customer         Customer @relation(fields: [customerId], references: [id])
  warehouseId      String
  warehouse        Warehouse @relation(fields: [warehouseId], references: [id])
  status           SalesOrderStatus @default(DRAFT)
  orderDate        DateTime
  expectedShipDate DateTime?
  shippedDate      DateTime?
  shippingAddress  String?
  subtotal         Decimal  @default(0) @db.Decimal(15, 2)
  taxRate          Decimal  @default(0) @db.Decimal(5, 4)
  taxAmount        Decimal  @default(0) @db.Decimal(15, 2)
  shippingFee      Decimal  @default(0) @db.Decimal(15, 2)
  totalAmount      Decimal  @default(0) @db.Decimal(15, 2)
  totalCost        Decimal  @default(0) @db.Decimal(15, 2)
  notes            String?
  createdById      String
  createdBy        User     @relation(fields: [createdById], references: [id])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  items              SalesOrderItem[]
  accountReceivables AccountReceivable[]

  @@map("sales_orders")
}

model SalesOrderItem {
  id           String     @id @default(cuid())
  salesOrderId String
  salesOrder   SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Cascade)
  productId    String
  product      Product    @relation(fields: [productId], references: [id])
  batchId      String?
  batch        Batch?     @relation(fields: [batchId], references: [id])
  quantity     Int
  unitPrice    Decimal    @db.Decimal(15, 4)
  unitCost     Decimal    @default(0) @db.Decimal(15, 6)
  amount       Decimal    @db.Decimal(15, 2)
  costAmount   Decimal    @default(0) @db.Decimal(15, 2)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@map("sales_order_items")
}

enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  PROCESSING
  SHIPPED
  COMPLETED
  CANCELLED
}

// ============================================
// 會計模組
// ============================================

model AccountCategory {
  id            String   @id @default(cuid())
  code          String   @unique
  name          String
  normalBalance NormalBalance
  displayOrder  Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts ChartOfAccount[]

  @@map("account_categories")
}

enum NormalBalance {
  DEBIT
  CREDIT
}

model ChartOfAccount {
  id          String          @id @default(cuid())
  accountCode String          @unique
  name        String
  categoryId  String
  category    AccountCategory @relation(fields: [categoryId], references: [id])
  parentId    String?
  parent      ChartOfAccount? @relation("AccountHierarchy", fields: [parentId], references: [id])
  children    ChartOfAccount[] @relation("AccountHierarchy")
  level       Int             @default(1)
  isDetail    Boolean         @default(true)
  isActive    Boolean         @default(true)
  description String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  journalLines JournalEntryLine[]

  @@map("chart_of_accounts")
}

model JournalEntry {
  id            String       @id @default(cuid())
  entryNumber   String       @unique
  entryDate     DateTime
  referenceType String
  referenceId   String?
  description   String?
  status        JournalStatus @default(DRAFT)
  totalDebit    Decimal      @default(0) @db.Decimal(15, 2)
  totalCredit   Decimal      @default(0) @db.Decimal(15, 2)
  createdById   String
  createdBy     User         @relation("CreatedBy", fields: [createdById], references: [id])
  postedById    String?
  postedBy      User?        @relation("PostedBy", fields: [postedById], references: [id])
  postedAt      DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  lines JournalEntryLine[]

  @@map("journal_entries")
}

model JournalEntryLine {
  id             String         @id @default(cuid())
  journalEntryId String
  journalEntry   JournalEntry   @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  accountId      String
  account        ChartOfAccount @relation(fields: [accountId], references: [id])
  description    String?
  debitAmount    Decimal        @default(0) @db.Decimal(15, 2)
  creditAmount   Decimal        @default(0) @db.Decimal(15, 2)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@map("journal_entry_lines")
}

enum JournalStatus {
  DRAFT
  POSTED
  VOIDED
}

// ============================================
// 應收/應付帳款
// ============================================

model AccountReceivable {
  id           String    @id @default(cuid())
  customerId   String
  customer     Customer  @relation(fields: [customerId], references: [id])
  salesOrderId String
  salesOrder   SalesOrder @relation(fields: [salesOrderId], references: [id])
  invoiceNumber String?
  invoiceDate  DateTime
  dueDate      DateTime
  amount       Decimal   @db.Decimal(15, 2)
  paidAmount   Decimal   @default(0) @db.Decimal(15, 2)
  balance      Decimal   @db.Decimal(15, 2)
  status       ARStatus  @default(PENDING)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@map("account_receivables")
}

enum ARStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
  WRITTEN_OFF
}

model AccountPayable {
  id              String        @id @default(cuid())
  supplierId      String
  supplier        Supplier      @relation(fields: [supplierId], references: [id])
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  invoiceNumber   String?
  invoiceDate     DateTime
  dueDate         DateTime
  amount          Decimal       @db.Decimal(15, 2)
  paidAmount      Decimal       @default(0) @db.Decimal(15, 2)
  balance         Decimal       @db.Decimal(15, 2)
  status          APStatus      @default(PENDING)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("account_payables")
}

enum APStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
}

// ============================================
// 系統設定
// ============================================

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  updatedAt   DateTime @updatedAt

  @@map("system_settings")
}
```

---

## 預設資料 (Seed)

詳見 `accounting.md` 和 `landed-cost.md` 中的 Seed Data 定義。

---

## 索引策略

```sql
-- 庫存查詢優化
CREATE INDEX idx_inventory_product_warehouse ON inventories(product_id, warehouse_id);

-- 訂單查詢優化
CREATE INDEX idx_sales_order_status_date ON sales_orders(status, order_date);
CREATE INDEX idx_purchase_order_status_date ON purchase_orders(status, order_date);

-- 批次查詢優化
CREATE INDEX idx_batch_product_status ON batches(product_id, status);

-- 會計查詢優化
CREATE INDEX idx_journal_entry_date_status ON journal_entries(entry_date, status);
CREATE INDEX idx_journal_line_account ON journal_entry_lines(account_id);

-- 應收應付查詢
CREATE INDEX idx_ar_customer_status ON account_receivables(customer_id, status);
CREATE INDEX idx_ap_supplier_status ON account_payables(supplier_id, status);
```
