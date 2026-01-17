import { createTRPCRouter, publicProcedure } from './trpc';

// Import routers as they are created
// import { productRouter } from './routers/product';
// import { customerRouter } from './routers/customer';
// etc.

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  // Add routers here as they are created:
  // product: productRouter,
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
