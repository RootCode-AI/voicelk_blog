import { seoSite, seoPages, unlistedPages, isEvaluateConsolePath, absoluteUrl, articleSchema, socialImage, websiteSchema } from '../../../shared/seo.js';
import { isPostListing } from '../../../shared/postSections.js';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g,
  (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function pageMetadata({ path, post, status = 200, page = 1, filtered = false, preview = false, origin = seoSite.url }) {
  const privatePage = path.startsWith('/admin') || path.startsWith('/newsletter/') || isEvaluateConsolePath(path);
  const canonicalPath = isPostListing(path) && page > 1 && !filtered ? `${path}?page=${page}` : path;
  const canonical = absoluteUrl(canonicalPath, origin);
  const defaults = seoPages[path] ?? unlistedPages[path];
  const title = status === 404 ? `Page not found | ${seoSite.name}` : post ? `${post.title} | ${seoSite.name}` :
    privatePage ? `Private page | ${seoSite.name}` : page > 1 ? `${defaults?.title.split(' | ')[0] || 'Product updates'} — Page ${page} | ${seoSite.name}` : defaults?.title || seoSite.title;
  const description = status === 404 ? 'This VoiceLK page is unavailable. Explore the product journey, visit the homepage or find answers in the FAQ.' : post?.excerpt || defaults?.description || seoSite.description;
  const noIndex = preview || privatePage || Boolean(unlistedPages[path]) || filtered || status !== 200;
  const schema = post ? articleSchema(post, origin) : websiteSchema(canonicalPath, title, origin);
  const social = socialImage(post?.coverImage?.url, post?.coverImage?.alt || post?.title, origin);
  const markdown = !noIndex && (post || seoPages[path]) ?
    absoluteUrl(path === '/' ? '/index.md' : `${path}.md${isPostListing(path) && page > 1 ? `?page=${page}` : ''}`, origin) : '';
  return { title, description, canonical, origin, noIndex, preview, schema, post, image: social.url, social, markdown };
}

export function renderHead(meta) {
  const tag = (attribute, name, value) => value ? `<meta ${attribute}="${name}" content="${escapeHtml(value)}" />` : '';
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    tag('name', 'description', meta.description),
    tag('name', 'robots', meta.noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large'),
    tag('name', 'voicelk:site-url', meta.origin),
    tag('name', 'voicelk:preview', meta.preview ? 'true' : 'false'),
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<link rel="sitemap" type="application/xml" href="${escapeHtml(meta.origin)}/sitemap.xml" />`,
    `<link rel="describedby" type="text/plain" href="${escapeHtml(meta.origin)}/llms.txt" />`,
    meta.markdown ? `<link rel="alternate" type="text/markdown" href="${escapeHtml(meta.markdown)}" />` : '',
    ...Object.entries({ title: meta.title, description: meta.description, type: meta.post ? 'article' : 'website',
      url: meta.canonical, site_name: seoSite.name, locale: 'en_LK', image: meta.image, 'image:alt': meta.social.alt,
      'image:width': meta.social.width, 'image:height': meta.social.height, 'image:type': meta.social.type })
      .map(([key, value]) => tag('property', `og:${key}`, value)),
    ...Object.entries({ card: 'summary_large_image', title: meta.title, description: meta.description, image: meta.image, 'image:alt': meta.social.alt })
      .map(([key, value]) => tag('name', `twitter:${key}`, value)),
    ...(meta.post ? [tag('property', 'article:published_time', meta.post.publishedAt ? new Date(meta.post.publishedAt).toISOString() : ''),
      tag('property', 'article:modified_time', meta.post.updatedAt || meta.post.publishedAt ? new Date(meta.post.updatedAt || meta.post.publishedAt).toISOString() : ''),
      tag('property', 'article:author', meta.post.author || seoSite.publisher),
      ...(meta.post.tags || []).map((value) => tag('property', 'article:tag', value))] : []),
    !meta.noIndex ? `<script type="application/ld+json" data-voicelk-seo="true">${safeJson(meta.schema)}</script>` : '',
  ].join('\n');
}

export function renderDocument(template, meta, content) {
  if (!template.includes('<!--seo:start-->') || !template.includes('<div id="root"></div>')) {
    throw new Error('SEO template is missing. Run npm run build before starting the server.');
  }
  return template.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => `<!--seo:start-->${renderHead(meta)}<!--seo:end-->`)
    .replace('<div id="root"></div>', () => `<div id="root">${content}</div>`);
}

export function renderSitemap(posts, origin = seoSite.url) {
  const urls = [
    ...Object.keys(seoPages).map((path) => `<url><loc>${escapeHtml(absoluteUrl(path, origin))}</loc></url>`),
    ...posts.map((post) => {
      const image = post.coverImage?.url && absoluteUrl(post.coverImage.url, origin);
      return `<url><loc>${escapeHtml(absoluteUrl(`/blog/${post.slug}`, origin))}</loc>${
        post.updatedAt || post.publishedAt ? `<lastmod>${new Date(post.updatedAt || post.publishedAt).toISOString()}</lastmod>` : ''}${
        image ? `<image:image><image:loc>${escapeHtml(image)}</image:loc></image:image>` : ''}</url>`;
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}</urlset>`;
}

export function renderRobots(origin = seoSite.url, preview = false) {
  // Let crawlers read private-page noindex directives; API data isn't a search result.
  return preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /api/\nAllow: /api/media/\n\nSitemap: ${origin}/sitemap.xml\n`;
}
