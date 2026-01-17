import { createTRPCRouter, publicProcedure } from './trpc';
import { productRouter } from './routers/product';

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  product: productRouter,
  // Add routers here as they are created:
  // customer: customerRouter,
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
