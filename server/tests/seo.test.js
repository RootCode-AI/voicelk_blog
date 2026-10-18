import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import express from 'express';
import { createSeoRouter } from '../src/routes/seo.js';
import { pageMetadata, renderDocument, renderHead } from '../src/lib/seo.js';
import { renderPublicContent } from '../../client/src/seo/render.js';
import { renderLlms, renderMarkdown } from '../src/lib/llms.js';
import { articleSchema, socialImage, websiteSchema } from '../../shared/seo.js';
import sharp from 'sharp';
import { publicPages } from '../../shared/pages.js';
import { assertPublishedImageAlt } from '../src/lib/imageAlt.js';
import { imageAlt } from '../../shared/images.js';
import { sanitizeBlocks } from '../src/lib/blocks.js';
import { postSections } from '../../shared/postSections.js';

const template = await readFile(new URL('../../client/index.html', import.meta.url), 'utf8');
test('Vercel installs the build-only image dependency and its optional platform packages', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
  assert.match(config.installCommand, /--include=dev\b/);
  assert.match(config.installCommand, /--include=optional\b/);
  assert.ok(manifest.devDependencies.sharp);
  assert.equal(lock.packages[''].devDependencies.sharp, manifest.devDependencies.sharp);
  assert.ok(lock.packages['node_modules/sharp']);
});
const post = {
  title: 'Sinhala & English speech', slug: 'sinhala-english', excerpt: 'A bilingual speech experiment.',
  publishedAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z',
  author: '', tags: ['TTS'], coverImage: { url: '/api/media/123456789012345678901234', alt: 'Spectrogram' },
  blocks: [
    { id: 'heading', type: 'heading', data: { text: 'The experiment', level: 2 } },
    { id: 'text', type: 'text', data: { markdown: 'Read the **results** in Sinhala සිංහල. [Paper](https://example.com/paper)' } },
    { id: 'table', type: 'table', data: { csv: 'Model,Score\nVITS,4.2', header: true } },
    { id: 'audio', type: 'audio', data: { title: 'Speech sample', transcript: 'Hello from Sri Lanka.', url: '/api/media/123456789012345678901234' } },
  ],
};

async function withServer(options, run) {
  const app = express();
  app.use(createSeoRouter({
    findPost: async (slug) => slug === post.slug ? post : null,
    listPosts: async ({ page }) => ({ posts: [{ ...post, slug: page === 1 ? post.slug : 'older-note' }], hasMore: page === 1 }),
    sitemapPosts: async () => [post], getTemplate: async () => template,
    preview: false, ...options,
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}

test('public copy presents VoiceLK as a product with research origins', async () => {
  await withServer({}, async (base) => {
    for (const path of ['/', '/about', '/faq', '/privacy', '/terms', '/index.md', '/about.md', '/llms.txt']) {
      const content = await (await fetch(base + path)).text();
      assert.doesNotMatch(content, /VoiceLK Journal|VoiceLK Research Team|final-year research project|a research journal/i);
    }
    const home = await (await fetch(base + '/')).text();
    assert.match(home, /text-to-speech product built from research/);
    assert.match(home, /VoiceLK \| Sinhala-English Text to Speech/);
    const faq = await (await fetch(base + '/faq')).text();
    assert.match(faq, /It grew out of research/);
    assert.match(faq, /does not currently include a public speech-generation interface/);
  });
});

test('Journey and Research have separate filtered HTML, Markdown, pagination and sitemap entries', async () => {
  const calls = [];
  await withServer({ listPosts: async (query) => {
    calls.push(query);
    return { posts: [{ ...post, title: `${query.section} result`, section: query.section }], hasMore: true };
  } }, async (base) => {
    for (const [section, item] of Object.entries(postSections)) {
      const html = await (await fetch(`${base}${item.path}?page=2`)).text();
      assert.ok(html.includes(`${section} result`));
      assert.ok(html.includes(`href="https://voicelk.dev${item.path}?page=2"`));
      assert.ok(html.includes(`href="${item.path}?page=3"`));
      assert.equal(calls.at(-1).section, section);
      assert.equal(calls.at(-1).page, 2);
      const markdown = await (await fetch(`${base}${item.path}.md?page=2`)).text();
      assert.ok(markdown.includes(`# ${item.title}`));
      assert.ok(markdown.includes(`${item.path}.md?page=3`));
      assert.equal(calls.at(-1).section, section);
      const filtered = await fetch(`${base}${item.path}?q=voice&tag=tts`);
      assert.equal(filtered.headers.get('x-robots-tag'), 'noindex, follow');
      assert.equal(calls.at(-1).q, 'voice');
      assert.equal(calls.at(-1).tag, 'tts');
    }
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    assert.ok(sitemap.includes('<loc>https://voicelk.dev/journey</loc>'));
    assert.ok(sitemap.includes('<loc>https://voicelk.dev/research</loc>'));
    const guide = await (await fetch(`${base}/llms.txt`)).text();
    assert.ok(guide.includes('/journey.md'));
    assert.ok(guide.includes('/research.md'));
    assert.equal((await fetch(`${base}/blog/${post.slug}`)).status, 200);
  });
});

test('published post contains crawlable article, one canonical, social tags and matching schema without JavaScript', async () => {
  await withServer({}, async (base) => {
    const response = await fetch(`${base}/blog/${post.slug}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-robots-tag'), null);
    assert.match(html, /<title>Sinhala &amp; English speech \| VoiceLK<\/title>/);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.match(html, /rel="canonical" href="https:\/\/voicelk.dev\/blog\/sinhala-english"/);
    assert.match(html, /og:image" content="https:\/\/voicelk.dev\/api\/media\//);
    assert.match(html, /<h2>The experiment<\/h2>/);
    assert.match(html, /<strong>results<\/strong>/);
    assert.match(html, /සිංහල/);
    assert.match(html, /<td>4.2<\/td>/);
    assert.match(html, /Hello from Sri Lanka/);
    assert.equal((html.match(/application\/ld\+json/g) || []).length, 1);
    const schema = JSON.parse(html.match(/data-voicelk-seo="true">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@type'], 'BlogPosting');
    assert.equal(schema.author['@type'], 'Organization');
    assert.equal(schema.mainEntityOfPage['@id'], 'https://voicelk.dev/blog/sinhala-english');
  });
});

test('unpublished and missing posts, unknown pages, and missing assets have real 404 responses', async () => {
  await withServer({}, async (base) => {
    for (const path of ['/blog/draft', '/missing', '/assets/missing.js']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404);
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert.doesNotMatch(await response.text(), /The experiment|BlogPosting/);
    }
  });
});

test('robots and sitemap point to the confirmed domain and omit private URLs', async () => {
  await withServer({}, async (base) => {
    const robots = await (await fetch(`${base}/robots.txt`)).text();
    assert.match(robots, /Sitemap: https:\/\/voicelk.dev\/sitemap.xml/);
    assert.match(robots, /Allow: \/api\/media\//);
    assert.doesNotMatch(robots, /Disallow: \/admin/);
    for (const path of ['/sitemap.xml', '/api/sitemap']) {
      const response = await fetch(base + path);
      assert.match(response.headers.get('content-type'), /application\/xml/);
      const xml = await response.text();
      assert.match(xml, /<loc>https:\/\/voicelk.dev\/blog\/sinhala-english<\/loc>/);
      assert.match(xml, /<lastmod>2026-10-08T00:00:00.000Z<\/lastmod>/);
      assert.match(xml, /xmlns:image="http:\/\/www.google.com\/schemas\/sitemap-image\/1.1"/);
      assert.match(xml, /<image:loc>https:\/\/voicelk.dev\/api\/media\/123456789012345678901234<\/image:loc>/);
      assert.doesNotMatch(xml, /admin|newsletter|draft/);
    }
  });
});

test('private pages and filtered searches are noindex; newsletter tokens never enter HTML', async () => {
  await withServer({}, async (base) => {
    for (const path of ['/admin/login', '/newsletter/confirm?token=private-token', '/blog?q=voice', '/blog?tag=tts']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      const html = await response.text();
      assert.match(html, /name="robots" content="noindex, follow"/);
      assert.doesNotMatch(html, /private-token/);
    }
  });
});

test('preview deployments are noindex even on otherwise public pages', async () => {
  await withServer({ preview: true }, async (base) => {
    const response = await fetch(`${base}/blog/${post.slug}`);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.match(await response.text(), /voicelk:preview" content="true"/);
    assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Disallow: \/\n/);
  });
});

test('pagination is crawlable with distinct canonicals and slash URLs redirect', async () => {
  await withServer({}, async (base) => {
    assert.match(await (await fetch(`${base}/blog`)).text(), /href="\/blog\?page=2"/);
    const second = await (await fetch(`${base}/blog?page=2`)).text();
    assert.match(second, /rel="canonical" href="https:\/\/voicelk.dev\/blog\?page=2"/);
    assert.match(second, /href="\/blog\/older-note"/);
    const redirect = await fetch(`${base}/blog/?page=2`, { redirect: 'manual' });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('location'), '/blog?page=2');
    const safeRedirect = await fetch(`${base}//example.com/`, { redirect: 'manual' });
    assert.equal(safeRedirect.headers.get('location'), '/example.com');
  });
});

test('database and missing-template failures return retryable 503s, never false 404s', async () => {
  await withServer({ findPost: async () => { throw new Error('offline'); }, sitemapPosts: async () => { throw new Error('offline'); } }, async (base) => {
    for (const path of ['/blog/sinhala-english', '/sitemap.xml']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '60');
    }
  });
  await withServer({ getTemplate: async () => '' }, async (base) => {
    assert.equal((await fetch(`${base}/about`)).status, 503);
  });
});

test('author-controlled HTML, JSON and URL fields cannot inject executable markup', () => {
  const hostile = { ...post, title: '</title><script>alert(1)</script>',
    excerpt: '$& </script><script>alert(2)</script>', coverImage: { url: 'javascript:alert(3)' },
    blocks: [{ type: 'text', data: { markdown: '<script>alert(4)</script>\n\n[Click](javascript:alert(5))' } }] };
  const meta = pageMetadata({ path: '/blog/sinhala-english', post: hostile });
  const html = renderDocument(template, meta, renderPublicContent({ post: hostile }));
  assert.doesNotMatch(html, /<script>alert|href="javascript:|src="javascript:/);
  assert.match(html, /\$&amp;/);
  assert.match(html, /\\u003c\/script>/);
  assert.match(renderHead(meta), /og:image" content="https:\/\/voicelk.dev\/og-image.png"/);
});

test('all public pages have a valid social image; only known fallback dimensions are emitted', async () => {
  await withServer({}, async (base) => {
    for (const path of ['/', '/about', '/blog']) {
      const html = await (await fetch(base + path)).text();
      assert.match(html, /og:image" content="https:\/\/voicelk.dev\/og-image.png"/);
      assert.match(html, /og:image:width" content="1200"/);
      assert.match(html, /og:image:height" content="630"/);
      assert.match(html, /twitter:card" content="summary_large_image"/);
      assert.match(html, /twitter:image:alt" content="VoiceLK/);
      assert.match(html, /rel="describedby" type="text\/plain" href="https:\/\/voicelk.dev\/llms.txt"/);
      const schema = JSON.parse(html.match(/data-voicelk-seo="true">([\s\S]*?)<\/script>/)[1]);
      assert.ok(schema['@graph'].some((entity) => entity['@type'] === 'WebSite'));
    }
    const html = await (await fetch(`${base}/blog/${post.slug}`)).text();
    assert.match(html, /og:image:alt" content="Spectrogram"/);
    assert.doesNotMatch(html, /og:image:width/);
    assert.match(html, /rel="alternate" type="text\/markdown" href="https:\/\/voicelk.dev\/blog\/sinhala-english.md"/);
  });
  assert.equal(socialImage('data:image/svg+xml,unsafe').url, 'https://voicelk.dev/og-image.png');
});

test('LLM guide and Markdown expose public content, canonical links and crawlable pagination', async () => {
  await withServer({}, async (base) => {
    const guide = await fetch(`${base}/llms.txt`);
    assert.match(guide.headers.get('content-type'), /text\/plain; charset=utf-8/);
    assert.equal(guide.headers.get('cache-control'), 'private, no-store');
    const text = await guide.text();
    assert.match(text, /^# VoiceLK\n/);
    assert.match(text, /https:\/\/voicelk.dev\/blog\/sinhala-english.md/);
    assert.doesNotMatch(text, /\/admin|\/newsletter|draft|MONGODB|JWT/);
    for (const path of ['/index.md', '/about.md', '/blog.md', '/blog/sinhala-english.md']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/markdown; charset=utf-8/);
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert.match(response.headers.get('link'), /rel="canonical"/);
      assert.match(await response.text(), /Canonical HTML: https:\/\/voicelk.dev\//);
    }
    const article = await (await fetch(`${base}/blog/sinhala-english.md`)).text();
    assert.match(article, /## The experiment/);
    assert.match(article, /\*\*results\*\*/);
    assert.match(article, /\| VITS \| 4.2 \|/);
    assert.match(article, /Transcript: Hello from Sri Lanka/);
    assert.match(await (await fetch(`${base}/blog.md`)).text(), /blog.md\?page=2/);
    const pageTwo = await fetch(`${base}/blog.md?page=2`);
    assert.match(pageTwo.headers.get('link'), /<https:\/\/voicelk.dev\/blog\?page=2>; rel="canonical"/);
    for (const path of ['/blog/draft.md', '/admin.md', '/newsletter/confirm.md']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404);
      assert.doesNotMatch(await response.text(), /The experiment/);
    }
  });
});

test('LLM guide is bounded and escapes link labels; code fences preserve embedded backticks', () => {
  const guide = renderLlms(Array.from({ length: 50 }, (_, i) => ({ ...post, slug: `note-${i}`, title: 'Bad ](https://untrusted.example) title' })));
  assert.match(guide, /note-29.md/);
  assert.doesNotMatch(guide, /note-30.md/);
  assert.match(guide, /Bad \\\]/);
  const markdown = renderMarkdown({ path: '/blog/code', post: { ...post, blocks: [{ type: 'code', data: { code: '```\nexample', language: 'js' } }] } });
  assert.match(markdown, /````js\n```\nexample\n````/);
});

test('LLM endpoints return 503 on failure and preview responses remain noindex', async () => {
  await withServer({ listPosts: async () => { throw new Error('offline'); }, findPost: async () => { throw new Error('offline'); } }, async (base) => {
    for (const path of ['/llms.txt', '/blog.md', '/blog/sinhala-english.md']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '60');
    }
  });
  await withServer({ preview: true }, async (base) => {
    for (const path of ['/llms.txt', '/index.md']) {
      assert.match((await fetch(base + path)).headers.get('x-robots-tag'), /noindex/);
    }
  });
});

test('production template works through Express and the Vercel entry point without connecting to MongoDB', {
  skip: !existsSync(new URL('../../client/dist/index.html', import.meta.url)) && 'Run npm run build for this smoke test',
}, async () => {
  // Deliberately non-live configuration: these routes must not require a database.
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/seo-smoke-test';
  process.env.JWT_SECRET = 'seo-smoke-test-only-not-a-production-secret';
  process.env.VERCEL_ENV = 'production';
  const { default: app } = await import('../src/app.js');
  const { default: handler } = await import('../../api/index.js');
  for (const [listener, rewrite] of [[app, false], [handler, true]]) {
    const server = createServer(listener).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const url = (path) => base + (rewrite ? `/api/index?__page=${encodeURIComponent(path)}` : `/${path}`);
    try {
      const response = await fetch(url('about'));
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /rel="canonical" href="https:\/\/voicelk.dev\/about"/);
      assert.match(html, /<main class="seo-document">/);
      assert.match(html, /src="\/assets\/index-[^"]+\.js"/);
      assert.match(await (await fetch(url('robots.txt'))).text(), /Sitemap: https:\/\/voicelk.dev\/sitemap.xml/);
      assert.equal((await fetch(url('nonexistent-page'))).status, 404);
      assert.match(await (await fetch(url('about.md'))).text(), /# About VoiceLK/);
      if (!rewrite) {
        const image = await fetch(url('og-image.png'));
        assert.equal(image.status, 200);
        assert.match(image.headers.get('content-type'), /image\/png/);
        const metadata = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
        assert.equal(metadata.width, 1200);
        assert.equal(metadata.height, 630);
      }
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }
});

test('privacy, terms and FAQ have matching visible content, unique metadata, Markdown and sitemap entries', async () => {
  await withServer({}, async (base) => {
    const titles = new Set();
    const descriptions = new Set();
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    for (const [path, page] of Object.entries(publicPages)) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`<h1 class="font-serif text-5xl leading-tight sm:text-6xl">${page.title}</h1>`));
      assert.ok(html.includes(`rel="canonical" href="https://voicelk.dev${path}"`));
      assert.ok(html.includes(page.sections[0].title));
      assert.match(html, /og-image.png/);
      titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
      descriptions.add(html.match(/name="description" content="([^"]+)"/)[1]);
      assert.ok(sitemap.includes(`<loc>https://voicelk.dev${path}</loc>`));
      const markdown = await (await fetch(`${base}${path}.md`)).text();
      assert.ok(markdown.includes(page.sections[0].body));
    }
    assert.equal(titles.size, 3);
    assert.equal(descriptions.size, 3);
    const privacy = await (await fetch(`${base}/privacy`)).text();
    assert.match(privacy, /mailto:rootcode.projects@gmail.com/);
    assert.match(await (await fetch(`${base}/faq`)).text(), /<details/);
    const missing = await fetch(`${base}/not-a-page`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Go to homepage/);
  });
});

test('published image checks cover covers, image blocks, Markdown and explicit decorations without blocking drafts', () => {
  const image = { type: 'image', data: { url: 'https://example.com/figure.png', alt: '' } };
  assert.throws(() => assertPublishedImageAlt({ status: 'published', coverImage: { url: '/cover.png' } }), /cover image/);
  assert.throws(() => assertPublishedImageAlt({ status: 'published', blocks: [image] }), /image block 1/);
  for (const markdown of ['![](https://example.com/a.png)', '![][figure]\n\n[figure]: https://example.com/a.png']) {
    assert.throws(() => assertPublishedImageAlt({ status: 'published', blocks: [{ type: 'text', data: { markdown } }] }), /Markdown image/);
  }
  assert.doesNotThrow(() => assertPublishedImageAlt({ status: 'draft', blocks: [image] }));
  const decorated = sanitizeBlocks([{ ...image, data: { ...image.data, decorative: true } }]);
  assert.equal(decorated[0].data.decorative, true);
  assert.doesNotThrow(() => assertPublishedImageAlt({ status: 'published', blocks: decorated }));
  assert.doesNotThrow(() => assertPublishedImageAlt({ status: 'published', blocks: [{ type: 'text', data: { markdown: '![A spectrogram](https://example.com/a.png)' } }] }));
  assert.equal(imageAlt('A spectrogram', '', true), '');
  assert.equal(imageAlt('', 'Experiment results'), 'Experiment results');
  const html = renderPublicContent({ post: { ...post, coverImage: { url: '/cover.png' }, blocks: [image, ...decorated] } });
  assert.match(html, /alt="Cover for Sinhala &amp; English speech"/);
  assert.match(html, /alt="Article illustration; description not provided"/);
  assert.match(html, /alt=""/);
});

test('analytics integration and preference controls are removed', async () => {
  const app = await readFile(new URL('../../client/src/App.jsx', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../../client/package.json', import.meta.url), 'utf8'));
  assert.doesNotMatch(app, /AnalyticsConsent|@vercel\/analytics/);
  assert.equal(manifest.dependencies['@vercel/analytics'], undefined);
  assert.equal(existsSync(new URL('../../client/src/components/AnalyticsConsent.jsx', import.meta.url)), false);
  const privacy = renderPublicContent({ path: '/privacy' });
  assert.doesNotMatch(privacy, /Change analytics choice|Analytics preferences|Allow analytics/);
  assert.match(privacy, /does not include visitor analytics tracking/);
});

test('search engines are told the site is called VoiceLK, with its logo, not the domain', async () => {
  const graph = websiteSchema('/')['@graph'];
  const organization = graph.find((node) => node['@type'] === 'Organization');
  const website = graph.find((node) => node['@type'] === 'WebSite');
  assert.equal(website.name, 'VoiceLK');
  assert.equal(organization.name, 'VoiceLK');
  assert.equal(organization.logo.url, 'https://voicelk.dev/icon-512.png');
  assert.equal(articleSchema(post).publisher.name, 'VoiceLK');
  for (const node of [website, organization]) {
    for (const name of [node.name, ...[node.alternateName].flat()]) assert.doesNotMatch(name, /\bdev\b/i);
  }
  const meta = renderHead(pageMetadata({ path: '/' }));
  assert.match(meta, /og:site_name" content="VoiceLK"/);
  assert.match(meta, /<title>VoiceLK \| Sinhala-English Text to Speech<\/title>/);
  const template = await readFile(new URL('../../client/index.html', import.meta.url), 'utf8');
  assert.match(template, /<meta name="application-name" content="VoiceLK" \/>/);
  assert.doesNotMatch(publicPages['/privacy'].intro, /voicelk\.dev/i);
});
