// Readable initial HTML for every visitor, enhanced by the React application.
// Keep these snapshots sourced from the same post blocks and site configuration.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { parseCsv } from '../lib/csv.js';
import { site } from '../site.config.js';
import { absoluteUrl } from '../../../shared/seo.js';
import { publicPages } from '../../../shared/pages.js';
import InfoContent from '../components/InfoContent.js';
import { imageAlt } from '../../../shared/images.js';
import { postSections, isPostListing, sectionFromPath } from '../../../shared/postSections.js';

const markdown = (text) => h(ReactMarkdown, { remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [rehypeKatex],
  components: { img: ({ src, alt }) => h('img', { src, alt: imageAlt(alt), loading: 'lazy' }) } }, text || '');
const safeMedia = (url) => url && absoluteUrl(url, site.url);
const caption = (text) => text ? h('figcaption', null, text) : null;

function table(data) {
  const rows = parseCsv(data.csv);
  return h('table', null,
    data.caption && h('caption', null, data.caption),
    h('tbody', null, ...rows.map((row, index) => h('tr', { key: index },
      ...row.map((cell, column) => h(index === 0 && data.header !== false ? 'th' : 'td', { key: column }, cell))))));
}

function blockContent({ type, data: d }) {
  switch (type) {
    case 'text': return markdown(d.markdown);
    case 'heading': return h(`h${[2, 3, 4].includes(d.level) ? d.level : 2}`, null, d.text);
    case 'image': return h('figure', null, safeMedia(d.url) && h('img', { src: d.url, alt: imageAlt(d.alt, d.caption, d.decorative), loading: 'lazy' }), caption(d.caption));
    case 'code': return h('figure', null, caption(d.filename), h('pre', null, h('code', null, d.code)));
    case 'table': return table(d);
    case 'chart': return h('figure', null, d.title && h('h2', null, d.title), table({ ...d, header: true }));
    case 'math': return h('figure', null, markdown(`$$\n${d.latex || ''}\n$$`), caption(d.caption));
    case 'audio': return h('figure', null, d.title && h('h2', null, d.title),
      safeMedia(d.url) && h('audio', { src: d.url, controls: true, preload: 'none' }), caption(d.caption), d.transcript && h('p', null, d.transcript));
    case 'video': return h('figure', null, safeMedia(d.url) && h('a', { href: d.url }, d.caption || 'Watch video'));
    case 'quote': return h('figure', null, h('blockquote', null, d.text), caption(d.cite));
    case 'callout': return h('aside', null, d.title && h('h2', null, d.title), markdown(d.markdown));
    case 'divider': return h('hr');
    default: return null;
  }
}

function postLinks(posts) {
  return h('ul', null, ...posts.map((post) => h('li', { key: post.slug },
    h('h2', null, h('a', { href: `/blog/${post.slug}` }, post.title)),
    post.excerpt && h('p', null, post.excerpt))));
}

export function renderPublicContent({ path, post, posts = [], page = 1, hasMore = false, status = 200 }) {
  let body;
  if (status === 404) {
    body = h('section', null, h('h1', null, 'Nothing to hear here.'), h('p', null, 'That page does not exist, or the note has been unpublished.'), h('a', { href: '/research' }, 'Read the research'), ' · ', h('a', { href: '/' }, 'Go to homepage'));
  } else if (publicPages[path]) {
    body = h(InfoContent, { path });
  } else if (post) {
    body = h('article', null,
      h('h1', null, post.title), post.excerpt && h('p', null, post.excerpt),
      post.author && h('p', null, post.author),
      post.publishedAt && h('time', { dateTime: new Date(post.publishedAt).toISOString() }, new Date(post.publishedAt).toISOString().slice(0, 10)),
      safeMedia(post.coverImage?.url) && h('img', { src: post.coverImage.url, alt: imageAlt(post.coverImage.alt, `Cover for ${post.title}`) }),
      ...(post.blocks || []).map((block, index) => h('section', { key: block.id || index }, blockContent(block))));
  } else if (path === '/about') {
    body = h('section', null, h('h1', null, 'About VoiceLK'),
      h('p', null, `VoiceLK is a Sinhala-English text-to-speech product built for mixed-language speech. It grew out of research at ${site.university}. Explore the product journey and the research that informs it.`),
      ...site.team.map((member) => h('p', { key: member.name }, `${member.name} — ${member.role}`)));
  } else if (path === '/' || isPostListing(path)) {
    const collection = postSections[sectionFromPath(path)];
    body = h('section', null, h('h1', null, path === '/' ? 'Bring your words to life in Sinhala & English' : collection?.title || 'Product updates'),
      h('p', null, collection?.description || site.description), postLinks(posts),
      page > 1 && h('a', { href: page === 2 ? path : `${path}?page=${page - 1}` }, 'Previous notes'),
      hasMore && h('a', { href: `${path}?page=${page + 1}` }, 'More updates'),
      path === '/' && h('section', null, h('h2', null, 'How VoiceLK works'),
        ...site.pipeline.map((step) => h('section', { key: step.step }, h('h3', null, step.title), h('p', null, step.body)))));
  } else {
    body = h('section', null, h('h1', null, path.startsWith('/admin') ? 'Administration' : 'Newsletter preference'),
      h('p', null, 'Enable JavaScript to use this page.'));
  }
  return renderToStaticMarkup(h('main', { className: 'seo-document' },
    h('nav', { 'aria-label': 'Main navigation' }, h('a', { href: '/' }, 'VoiceLK'), ' · ',
      h('a', { href: '/journey' }, 'Journey'), ' · ', h('a', { href: '/research' }, 'Read the research'), ' · ', h('a', { href: '/about' }, 'About')),
    body, h('footer', null, h('a', { href: '/faq' }, 'FAQ'), ' · ', h('a', { href: '/privacy' }, 'Privacy Policy'), ' · ', h('a', { href: '/terms' }, 'Terms of Use'))));
}
