import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, isProduction } from './config.js';
import { connectDb } from './db.js';
import { errorHandler, notFound } from './lib/errors.js';
import { mailEnabled } from './lib/mailer.js';
import { requireAdmin } from './middleware/auth.js';
import { Post } from './models/Post.js';
import { Subscriber } from './models/Subscriber.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import adminPostRoutes from './routes/adminPosts.js';
import mediaRoutes from './routes/media.js';
import subscriberRoutes from './routes/subscribers.js';
import contactRoutes from './routes/contact.js';

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        frameSrc: ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
        connectSrc: ["'self'"],
      },
    },
  }),
);
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true, mail: mailEnabled ? 'resend' : 'console' }));

app.get('/api/stats', async (req, res) => {
  const [posts, subscribers, latest] = await Promise.all([
    Post.countDocuments({ status: 'published' }),
    Subscriber.countDocuments({ status: 'active' }),
    Post.findOne({ status: 'published' }).sort({ publishedAt: -1 }).select('publishedAt').lean(),
  ]);
  res.json({ posts, subscribers, latestAt: latest?.publishedAt ?? null });
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const [published, drafts, subscribers, pending] = await Promise.all([
    Post.countDocuments({ status: 'published' }),
    Post.countDocuments({ status: 'draft' }),
    Subscriber.countDocuments({ status: 'active' }),
    Subscriber.countDocuments({ status: 'pending' }),
  ]);
  res.json({ published, drafts, subscribers, pending, mail: mailEnabled ? 'resend' : 'console' });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin/posts', requireAdmin, adminPostRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', (req, res, next) => next(notFound(`No API route ${req.method} ${req.originalUrl}`)));

// In production the built client is served from the same origin as the API.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  // Vite fingerprints everything under /assets, so those files never change.
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientDist, { index: false, maxAge: isProduction ? '1h' : 0 }));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

await connectDb(config.mongoUri);
await Post.syncIndexes();
app.listen(config.port, () => {
  console.info(`[api] listening on http://localhost:${config.port}`);
});
