import { createApp } from '../server/src/app';

/**
 * Vercel serverless entry point.
 *
 * Vercel cannot run the long-lived Express process in `server/src/index.ts`
 * (which calls app.listen). Instead, @vercel/node hosts this function and
 * routes every request to the same Express app — so `/api/*` and the built
 * SPA are both served from one handler. Environment variables (e.g.
 * ADOBE_STOCK_API_KEY) come from the Vercel project settings and are never
 * part of the frontend bundle.
 */
const app = createApp();

export default app;
