import { createTRPCRouter, publicProcedure } from './trpc';
import { productRouter } from './routers/product';
import { customerRouter } from './routers/customer';
import { supplierRouter } from './routers/supplier';
import { warehouseRouter } from './routers/warehouse';

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  product: productRouter,
  customer: customerRouter,
  supplier: supplierRouter,
  warehouse: warehouseRouter,
  // Add routers here as they are created:
  // supplier: supplierRouter,
  // warehouse: warehouseRouter,
  // purchaseOrder: purchaseOrderRouter,
  // salesOrder: salesOrderRouter,
  // inventory: inventoryRouter,
  // batch: batchRouter,
  // accounting: accountingRouter,
  // report: reportRouter,
});

export type AppRouter = typeof appRouter;
