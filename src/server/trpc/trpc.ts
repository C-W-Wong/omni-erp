import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { prisma } from '../db';

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    prisma,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

// Protected procedure - requires authentication (to be implemented with NextAuth)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // TODO: Implement authentication check when NextAuth is set up
  // For now, allow all requests
  return next({
    ctx: {
      ...ctx,
      // session: ctx.session,
    },
  });
});
