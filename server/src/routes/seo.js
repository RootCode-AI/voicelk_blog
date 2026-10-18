import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { renderPublicContent } from '../../../client/src/seo/render.js';
import { seoSite, seoPages, unlistedPages, isEvaluateConsolePath } from '../../../shared/seo.js';
import { pageMetadata, renderDocument, renderRobots, renderSitemap } from '../lib/seo.js';
import { renderLlms, renderMarkdown } from '../lib/llms.js';
import { isPostListing, sectionFromPath } from '../../../shared/postSections.js';

const templateUrl = new URL('../../../client/dist/index.html', import.meta.url);
let template;
async function loadTemplate() {
  template ??= readFile(templateUrl, 'utf8').catch((error) => { template = undefined; throw error; });
  return template;
}

// Dependencies are injected so crawl behavior can be tested without a live database.
export function createSeoRouter({ findPost, listPosts, sitemapPosts, getTemplate = loadTemplate,
  origin = seoSite.url, preview = process.env.SITE_PREVIEW === 'true' }) {
  const router = Router();
  router.get('/robots.txt', (_req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=300').send(renderRobots(origin, preview));
  });
  router.get('/llms.txt', async (_req, res) => {
    try {
      const { posts } = await listPosts({ page: 1, size: 30, q: '', tag: '' });
      if (preview) res.set('X-Robots-Tag', 'noindex');
      res.type('text/plain').set('Cache-Control', 'private, no-store').send(renderLlms(posts, origin));
    } catch {
      res.status(503).set({ 'Cache-Control': 'no-store', 'Retry-After': '60' }).type('text/plain').send('VoiceLK guide temporarily unavailable.');
    }
  });
  router.get(['/index.md', '/about.md', '/blog.md', '/journey.md', '/research.md', '/privacy.md', '/terms.md', '/faq.md', '/blog/:slug.md'], async (req, res) => {
    const path = req.path === '/index.md' ? '/' : req.path.slice(0, -3);
    const page = /^\d+$/.test(String(req.query.page ?? '')) ? Math.min(10000, Math.max(1, Number(req.query.page))) : 1;
    try {
      let post;
      let result = { posts: [], hasMore: false };
      if (req.params.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.params.slug)) post = await findPost(req.params.slug);
      if (isPostListing(path)) result = await listPosts({ page, size: 8, q: '', tag: '', section: sectionFromPath(path) });
      res.set({ 'X-Robots-Tag': 'noindex, follow', 'Cache-Control': 'private, no-store' });
      if ((req.params.slug && !post) || (isPostListing(path) && page > 1 && !result.posts.length)) {
        return res.status(404).type('text/plain').send('Not found');
      }
      const canonical = `${origin}${path}${isPostListing(path) && page > 1 ? `?page=${page}` : ''}`;
      res.set('Link', `<${canonical}>; rel="canonical", <${origin}/llms.txt>; rel="describedby"`)
        .type('text/markdown').send(renderMarkdown({ path, post, page, ...result, origin }));
    } catch {
      res.status(503).set({ 'Cache-Control': 'no-store', 'Retry-After': '60' }).type('text/plain').send('VoiceLK content temporarily unavailable.');
    }
  });
  router.get(['/sitemap.xml', '/api/sitemap'], async (_req, res) => {
    try {
      const posts = await sitemapPosts();
      if (preview) res.set('X-Robots-Tag', 'noindex');
      res.type('application/xml').set('Cache-Control', 'public, max-age=0, s-maxage=300')
        .send(renderSitemap(posts, origin));
    } catch {
      res.status(503).set({ 'Cache-Control': 'no-store', 'Retry-After': '60' }).type('text/plain').send('Sitemap temporarily unavailable.');
    }
  });
  router.get('/{*path}', async (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.path.startsWith('/assets/') || /\.[a-z0-9]{2,8}$/i.test(req.path)) {
      return res.status(404).set('X-Robots-Tag', 'noindex').type('text/plain').send('Not found');
    }
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const queryIndex = req.url.indexOf('?');
      const query = queryIndex === -1 ? '' : req.url.slice(queryIndex);
      return res.redirect(308, '/' + req.path.replace(/^\/+|\/+$/g, '') + query);
    }
    const path = req.path;
    const page = /^\d+$/.test(String(req.query.page ?? '')) ? Math.min(10000, Math.max(1, Number(req.query.page))) : 1;
    const filtered = isPostListing(path) && Boolean(req.query.q || req.query.tag);
    const privatePage = /^\/(admin|write)(?:\/|$)/.test(path) || isEvaluateConsolePath(path) || ['/newsletter/confirm', '/newsletter/unsubscribe'].includes(path);
    let post;
    let posts = [];
    let hasMore = false;
    let status = 200;
    try {
      const match = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
      if (match) {
        post = await findPost(match[1]);
        if (!post) status = 404;
      } else if (path === '/' || isPostListing(path)) {
        const size = path === '/' ? 3 : 8;
        const result = await listPosts({ page: path === '/' ? 1 : page, size,
          section: sectionFromPath(path),
          q: isPostListing(path) ? String(req.query.q || '').trim().slice(0, 100) : '',
          tag: isPostListing(path) ? String(req.query.tag || '').trim().toLowerCase() : '' });
        posts = result.posts;
        hasMore = result.hasMore;
        if (isPostListing(path) && page > 1 && !posts.length) status = 404;
      } else if (!seoPages[path] && !unlistedPages[path] && !privatePage) {
        status = 404;
      }
      const meta = pageMetadata({ path, post, status, page: isPostListing(path) ? page : 1, filtered, preview, origin });
      const content = renderPublicContent({ path, post, posts, page: path === '/' ? 1 : page, hasMore: path === '/' ? false : hasMore, status });
      const html = renderDocument(await getTemplate(), meta, content);
      if (meta.noIndex) res.set('X-Robots-Tag', 'noindex, follow');
      // No shared HTML cache: unpublishing must immediately remove article content.
      res.status(status).set('Cache-Control', 'private, no-store').type('html').send(html);
    } catch {
      // A database outage is temporary, not an absent article or a successful empty page.
      res.status(503).set({ 'Cache-Control': 'no-store', 'Retry-After': '60' })
        .type('text/plain').send('This page is temporarily unavailable. Please try again shortly.');
    }
  });
  return router;
}
