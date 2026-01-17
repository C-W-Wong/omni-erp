import { createTRPCRouter, publicProcedure } from './trpc';
import { productRouter } from './routers/product';
import { customerRouter } from './routers/customer';
import { supplierRouter } from './routers/supplier';
import { warehouseRouter } from './routers/warehouse';
import { costItemTypeRouter } from './routers/costItemType';
import { batchRouter } from './routers/batch';

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
  // Add routers here as they are created:
  // purchaseOrder: purchaseOrderRouter,
  // salesOrder: salesOrderRouter,
  // inventory: inventoryRouter,
  // accounting: accountingRouter,
  // report: reportRouter,
});

export type AppRouter = typeof appRouter;
