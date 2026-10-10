import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
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
  [config.clientOrigin, 'http://localhost:5173', process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter(Boolean)
    .map((origin) => (origin.startsWith('http') ? origin : `https://${origin}`)),
);

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
app.use(async (_req, _res, next) => {
  try {
    await initializeApp();
    next();
  } catch (error) {
    next(error);
  }
});

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]);
}

app.get('/api/sitemap', async (_req, res) => {
  const posts = await Post.find({ status: 'published' }).select('slug publishedAt updatedAt').sort({ publishedAt: -1 }).lean();
  const staticUrls = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/blog', priority: '0.9', changefreq: 'weekly' },
    { path: '/about', priority: '0.6', changefreq: 'monthly' },
  ];
  const urls = [
    ...staticUrls.map(
      ({ path, priority, changefreq }) =>
        `<url><loc>${escapeXml(`${config.publicUrl}${path}`)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`,
    ),
    ...posts.map((post) => {
      const lastModified = post.updatedAt ?? post.publishedAt;
      return `<url><loc>${escapeXml(`${config.publicUrl}/blog/${post.slug}`)}</loc>${
        lastModified ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>` : ''
      }<changefreq>monthly</changefreq><priority>0.8</priority></url>`;
    }),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  res.set({ 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' });
  res.send(xml);
});
app.get('/api/health', (_req, res) => res.json({ ok: true, mail: mailEnabled ? 'resend' : 'console' }));

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
  res.json({ published, drafts, subscribers, pending, mail: mailEnabled ? 'resend' : 'console' });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin/posts', requireAdmin, adminPostRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', (req, _res, next) => next(notFound(`No API route ${req.method} ${req.originalUrl}`)));
app.use(errorHandler);

export default app;
