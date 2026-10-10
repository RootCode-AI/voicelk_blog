import { seoSite, absoluteUrl } from '../../../shared/seo.js';
import { site } from '../../../client/src/site.config.js';
import { parseCsv } from '../../../client/src/lib/csv.js';
import { publicPages } from '../../../shared/pages.js';
import { postSections, isPostListing, sectionFromPath } from '../../../shared/postSections.js';

const text = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[\\`*_{}\[\]<>#|]/g, '\\$&');
const link = (label, url) => `[${text(label)}](${url})`;
const postUrl = (post, origin) => absoluteUrl(`/blog/${encodeURIComponent(post.slug)}.md`, origin);
const fence = (value, language = '') => {
  const source = String(value ?? '');
  const delimiter = '`'.repeat(Math.max(3, ...[...source.matchAll(/`+/g)].map((match) => match[0].length + 1)));
  return `${delimiter}${language.replace(/[^a-z0-9+-]/gi, '')}\n${source}\n${delimiter}`;
};

export function renderLlms(posts, origin = seoSite.url) {
  return [
    `# ${seoSite.name}`, `> ${seoSite.description}`,
    `VoiceLK is a Sinhala-English text-to-speech product developed from research at ${site.university}. Journey covers product development; Research documents the findings behind the product. Cite individual articles using their canonical HTML URLs.`,
    'The links below provide Markdown versions of public content. This file is a discovery guide, not a license grant or an access-control policy.',
    '## Product',
    ...Object.values(postSections).map((section) => `- ${link(section.label, `${origin}${section.path}.md`)}: ${section.description}`),
    `- ${link('Product overview', `${origin}/index.md`)}: Product overview and speech pipeline.\n- ${link('About VoiceLK', `${origin}/about.md`)}: Product background.\n- ${link('Product updates', `${origin}/blog.md`)}: Published notes and pagination.`,
    '## Recent updates',
    posts.length ? posts.slice(0, 30).map((post) => `- ${link(post.title || post.slug, postUrl(post, origin))}: ${text(post.excerpt || 'Published VoiceLK update.')}`).join('\n') : 'No updates have been published yet.',
    '## Optional',
    ...Object.entries(publicPages).map(([path, page]) => `- ${link(page.title, `${origin}${path}.md`)}: ${page.description}`),
    `- ${link('XML sitemap', `${origin}/sitemap.xml`)}: All canonical public HTML URLs.\n- ${link('Website', `${origin}/`)}: Interactive site for human readers.`,
  ].join('\n\n') + '\n';
}

function blockMarkdown({ type, data: d = {} }, origin) {
  const media = (label, url, image = false) => {
    const safe = url && absoluteUrl(url, origin);
    return safe ? `${image ? '!' : ''}${link(label || 'Media', safe.replace(/\(/g, '%28').replace(/\)/g, '%29'))}` : '';
  };
  switch (type) {
    case 'text': return d.markdown || '';
    case 'heading': return `${'#'.repeat([2, 3, 4].includes(d.level) ? d.level : 2)} ${text(d.text)}`;
    case 'image': return [media(d.alt, d.url, true), text(d.caption)].filter(Boolean).join('\n\n');
    case 'code': return [text(d.filename), fence(d.code, d.language || '')].filter(Boolean).join('\n\n');
    case 'table':
    case 'chart': {
      const rows = parseCsv(d.csv);
      if (!rows.length) return text(d.caption || d.title);
      const width = Math.max(...rows.map((row) => row.length));
      const row = (cells) => `| ${Array.from({ length: width }, (_, i) => text(cells[i])).join(' | ')} |`;
      const header = type === 'chart' || d.header !== false;
      return [text(d.title || d.caption), row(header ? rows[0] : Array(width).fill('')),
        row(Array(width).fill('---')), ...rows.slice(header ? 1 : 0).map(row)].filter(Boolean).join('\n');
    }
    case 'math': return `$$\n${d.latex || ''}\n$$\n\n${text(d.caption)}`;
    case 'audio': return [media(d.title || 'Audio sample', d.url), text(d.caption), d.transcript ? `Transcript: ${d.transcript}` : ''].filter(Boolean).join('\n\n');
    case 'video': return media(d.caption || 'Watch video', d.url);
    case 'quote': return `> ${text(d.text)}${d.cite ? `\n\n${text(d.cite)}` : ''}`;
    case 'callout': return [d.title ? `## ${text(d.title)}` : '', d.markdown].filter(Boolean).join('\n\n');
    case 'divider': return '---';
    default: return '';
  }
}

export function renderMarkdown({ path, post, posts = [], page = 1, hasMore = false, origin = seoSite.url }) {
  const canonical = absoluteUrl(`${path}${isPostListing(path) && page > 1 ? `?page=${page}` : ''}`, origin);
  const source = `Canonical HTML: ${canonical}`;
  if (publicPages[path]) {
    const page = publicPages[path];
    return [`# ${page.title}`, source, page.updated && `Last updated: ${page.updated}`, page.intro,
      ...page.sections.map((section) => `## ${section.title}\n\n${section.body}`),
      ...page.links.map((item) => link(item.label, item.href.startsWith('mailto:') ? item.href : absoluteUrl(item.href, origin)))].filter(Boolean).join('\n\n') + '\n';
  }
  if (post) return [
    `# ${text(post.title)}`, source, text(post.excerpt),
    `Author: ${text(post.author || seoSite.publisher)}`,
    post.publishedAt && `Published: ${new Date(post.publishedAt).toISOString()}`,
    post.updatedAt && `Updated: ${new Date(post.updatedAt).toISOString()}`,
    ...(post.blocks || []).map((block) => blockMarkdown(block, origin)),
  ].filter(Boolean).join('\n\n') + '\n';
  if (isPostListing(path)) return [
    `# ${postSections[sectionFromPath(path)]?.title || 'Product updates'}${page > 1 ? ` — Page ${page}` : ''}`, source,
    postSections[sectionFromPath(path)]?.description,
    posts.length ? posts.map((post) => `- ${link(post.title, postUrl(post, origin))}: ${text(post.excerpt)}`).join('\n') : 'No updates have been published yet.',
    page > 1 && link('Previous notes', `${origin}${path}.md${page > 2 ? `?page=${page - 1}` : ''}`),
    hasMore && link('More updates', `${origin}${path}.md?page=${page + 1}`),
  ].filter(Boolean).join('\n\n') + '\n';
  return [
    `# ${path === '/about' ? 'About VoiceLK' : seoSite.name}`, source, seoSite.description,
    `A text-to-speech product developed from research at ${site.university}.`,
    '## How VoiceLK works', ...site.pipeline.map((step) => `### ${step.title}\n\n${step.body}`),
    ...(site.team.length ? ['## Team', ...site.team.map((member) => `${text(member.name)} — ${text(member.role)}`)] : []),
    `## Product updates\n\n${link('Read published notes', `${origin}/blog.md`)}`,
  ].join('\n\n') + '\n';
}
