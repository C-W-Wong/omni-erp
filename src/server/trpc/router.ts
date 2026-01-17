import { createTRPCRouter, publicProcedure } from './trpc';
import { productRouter } from './routers/product';
import { customerRouter } from './routers/customer';
import { supplierRouter } from './routers/supplier';
import { warehouseRouter } from './routers/warehouse';
import { costItemTypeRouter } from './routers/costItemType';
import { batchRouter } from './routers/batch';
import { inventoryRouter } from './routers/inventory';
import { transferRouter } from './routers/transfer';
import { purchaseOrderRouter } from './routers/purchaseOrder';
import { salesOrderRouter } from './routers/salesOrder';
import { accountingRouter } from './routers/accounting';

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  product: productRouter,
  customer: customerRouter,
  supplier: supplierRouter,
  warehouse: warehouseRouter,
  costItemType: costItemTypeRouter,
  batch: batchRouter,
  inventory: inventoryRouter,
  transfer: transferRouter,
  purchaseOrder: purchaseOrderRouter,
  salesOrder: salesOrderRouter,
  accounting: accountingRouter,
  // Add routers here as they are created:
  // report: reportRouter,
});

export type AppRouter = typeof appRouter;
