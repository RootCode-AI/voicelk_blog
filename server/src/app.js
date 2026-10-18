import express from 'express';
import compression from 'compression';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config, isProduction } from './config.js';
import { connectDb } from './db.js';
import { errorHandler, notFound } from './lib/errors.js';
import { mailMode } from './lib/mailer.js';
import { requireAdmin } from './middleware/auth.js';
import { Post } from './models/Post.js';
import { Subscriber } from './models/Subscriber.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import adminPostRoutes from './routes/adminPosts.js';
import mediaRoutes from './routes/media.js';
import subscriberRoutes from './routes/subscribers.js';
import contactRoutes from './routes/contact.js';
import evaluateRoutes from './routes/evaluate.js';
import writerRoutes from './routes/writer.js';
import bloggerRoutes from './routes/bloggers.js';
import { createSeoRouter } from './routes/seo.js';
import { sectionFilter } from './lib/postSections.js';
import { supabaseEnabled } from './supabase.js';

const app = express();
app.set('trust proxy', 1);

// The one inline script in client/index.html, allowed by hash; a test keeps them in step.
export const BOOT_SCRIPT_HASH = "'sha256-Du+OJKJSbdUgz5nrHeWWINvez6XKDDU/tyj/5c2uvwo='";

// Heroku's router accepts plain http too and passes the original scheme in
// X-Forwarded-Proto (trusted above). Send every visitor to https in production;
// 308 keeps the method, so a form posted over http is not silently turned into a GET.
if (isProduction) {
  app.use((req, res, next) => {
    if (req.secure || ['localhost', '127.0.0.1'].includes(req.hostname)) return next();
    res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  });
}
// The app serves its own pages, scripts and styles, so it compresses them itself.
app.use(compression());

let initialization;
export function initializeApp() {
  initialization ??= connectDb(config.mongoUri)
    .then(() => Post.syncIndexes())
    .catch((error) => {
      initialization = undefined;
      throw error;
    });
  return initialization;
}

const allowedOrigins = new Set(
  [config.clientOrigin, config.publicUrl, 'http://localhost:5173'].filter(Boolean),
);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", BOOT_SCRIPT_HASH],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        frameSrc: ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
        // Evaluation clips upload from the browser straight to Supabase Storage.
        connectSrc: ["'self'", ...(config.supabase.url ? [config.supabase.url] : [])],
      },
    },
  }),
);
app.use(
  cors({
    origin(origin, done) {
      done(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());
app.use('/api', async (_req, _res, next) => {
  // The sitemap handler owns initialization so outages keep its retryable 503 response.
  if (_req.path === '/sitemap') return next();
  try {
    await initializeApp();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, mail: mailMode, evaluation: supabaseEnabled ? 'supabase' : 'off' }));

app.get('/api/stats', async (_req, res) => {
  const [posts, subscribers, latest] = await Promise.all([
    Post.countDocuments({ status: 'published' }),
    Subscriber.countDocuments({ status: 'active' }),
    Post.findOne({ status: 'published' }).sort({ publishedAt: -1 }).select('publishedAt').lean(),
  ]);
  res.json({ posts, subscribers, latestAt: latest?.publishedAt ?? null });
});

app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  const [published, drafts, subscribers, pending] = await Promise.all([
    Post.countDocuments({ status: 'published' }),
    Post.countDocuments({ status: 'draft' }),
    Subscriber.countDocuments({ status: 'active' }),
    Subscriber.countDocuments({ status: 'pending' }),
  ]);
  res.json({ published, drafts, subscribers, pending, mail: mailMode });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin/posts', requireAdmin, adminPostRoutes);
app.use('/api/admin/bloggers', requireAdmin, bloggerRoutes);
app.use('/api/write', writerRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/evaluate', evaluateRoutes);
// The built client: fingerprinted bundles are cached for a year; icons for a day (the
// page links them with a content fingerprint, so a changed icon is a new address).
// Pages themselves go through the SEO router below.
const clientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));
if (fs.existsSync(clientDist)) {
  app.use('/assets', express.static(`${clientDist}/assets`, { immutable: true, maxAge: '1y' }));
  // Brand images keep their names when the logo changes, so browsers re-check them on
  // each visit (a cheap 304 when unchanged) instead of showing an old logo for a day.
  app.use('/brand', express.static(`${clientDist}/brand`, { maxAge: 0 }));
  for (const file of ['favicon-32.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'site.webmanifest']) {
    app.get(`/${file}`, (_req, res) => res.sendFile(`${clientDist}/${file}`, { maxAge: '1d' }));
  }
  app.get('/og-image.png', (_req, res) => res.sendFile(`${clientDist}/og-image.png`, { maxAge: '1h' }));
}
app.get('/index.html', (_req, res) => res.redirect(308, '/'));
app.use(createSeoRouter({
  async findPost(slug) {
    await initializeApp();
    return Post.findOne({ slug, status: 'published' }).lean();
  },
  async listPosts({ page, size, q, tag, section }) {
    await initializeApp();
    const filter = { status: 'published', ...sectionFilter(section), ...(q && { $text: { $search: q } }), ...(tag && { tags: tag }) };
    const sort = q ? { score: { $meta: 'textScore' }, publishedAt: -1 } : { publishedAt: -1 };
    const posts = await Post.find(filter).select('title slug excerpt section').sort(sort).skip((page - 1) * size).limit(size + 1).lean();
    return { posts: posts.slice(0, size), hasMore: posts.length > size };
  },
  async sitemapPosts() {
    await initializeApp();
    return Post.find({ status: 'published' }).select('slug publishedAt updatedAt coverImage').sort({ publishedAt: -1 }).lean();
  },
}));
app.use('/api', (req, _res, next) => next(notFound(`No API route ${req.method} ${req.originalUrl}`)));
app.use(errorHandler);

export default app;
