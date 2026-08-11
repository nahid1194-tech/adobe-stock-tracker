import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import adobeRouter from './routes/adobe';
import analyticsRouter from './routes/analytics';
import assetRouter from './routes/assets';
import creatorRouter from './routes/creator';
import licenseHistoryRouter from './routes/licenseHistory';
import searchRouter from './routes/search';
import settingsRouter from './routes/settings';
import { apiRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api', apiRateLimiter);
  app.use('/api', adobeRouter);
  app.use('/api', creatorRouter);
  app.use('/api', searchRouter);
  app.use('/api', assetRouter);
  app.use('/api', analyticsRouter);
  app.use('/api', licenseHistoryRouter);
  app.use('/api', settingsRouter);

  // Serve the built client in production (npm run build && npm start).
  // The bundle lands at different relative paths depending on the runtime:
  // locally the compiled app lives at server/dist (client/dist is two levels
  // up), while a Vercel serverless bundle may place it one level deep or next
  // to the entry. Probe several candidates so the SPA renders in every case.
  const cwd = process.cwd();
  const clientDistCandidates = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve(__dirname, 'client/dist'),
    path.resolve(cwd, 'client/dist'),
  ];
  const clientDist = clientDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
