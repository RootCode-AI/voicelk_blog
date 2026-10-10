import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { badRequest } from './errors.js';

export function assertPublishedImageAlt(post) {
  if (post.status !== 'published') return;
  const missing = [];
  if (post.coverImage?.url && !post.coverImage.alt?.trim()) missing.push('cover image');
  for (const [index, block] of (post.blocks || []).entries()) {
    const d = block.data || {};
    if (block.type === 'image' && d.url && !d.decorative && !d.alt?.trim()) missing.push(`image block ${index + 1}`);
    if (['text', 'callout'].includes(block.type) && d.markdown) {
      // Parse inline and reference images instead of approximating Markdown with a regex.
      renderToStaticMarkup(createElement(ReactMarkdown, { components: {
        img: ({ alt }) => { if (!alt?.trim()) missing.push(`Markdown image in block ${index + 1}`); return null; },
      } }, d.markdown));
    }
  }
  if (missing.length) throw badRequest(`Add descriptive alt text before publishing: ${missing.join(', ')}. Decorative images can use an image block marked decorative.`);
}
