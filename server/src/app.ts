import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { errorHandler, notFoundHandler } from './lib/http';
import { attachUser } from './middleware/auth';
import { apiGuards, securityHeaders } from './middleware/security';
import accountRoutes from './routes/account';
import authRoutes from './routes/auth';
import examRoutes from './routes/exams';
import studyRoutes from './routes/study';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiGuards);
  app.use(attachUser);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'bactrack-dz', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', accountRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api', studyRoutes);
  app.use('/api', notFoundHandler);

  if (fs.existsSync(config.clientDist)) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get(/^(?!\/api\/).*/, (req, res, next) => {
      if (req.method !== 'GET') {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(config.clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
