import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, isProduction } from './config.js';
import app, { initializeApp } from './app.js';

// Local/standalone production keeps serving the Vite build through Express.
// On Vercel, static files are served directly by its CDN instead.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (!process.env.VERCEL && fs.existsSync(clientDist)) {
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientDist, { index: false, maxAge: isProduction ? '1h' : 0 }));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

await initializeApp();
app.listen(config.port, () => {
  console.info(`[api] listening on http://localhost:${config.port}`);
});
