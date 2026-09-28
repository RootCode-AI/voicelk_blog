// A post body is an ordered list of typed blocks. The order is the layout: the
// reader sees each image, chart or code sample exactly where the author put it.
// Every block type declares the fields it keeps; anything else is dropped so the
// database only ever holds shapes the client knows how to render.

import { badRequest } from './errors.js';

const MAX_BLOCKS = 400;

const str = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
const oneOf = (value, options, fallback) => (options.includes(value) ? value : fallback);

// Uploaded media is served from /api/media/<id>; external assets must be http(s).
function url(value) {
  const s = str(value, 2048).trim();
  return /^(https?:\/\/|\/api\/media\/[a-f0-9]{24}$)/i.test(s) ? s : '';
}

const shapes = {
  text: (d) => ({ markdown: str(d.markdown, 100_000) }),
  heading: (d) => ({ text: str(d.text, 300), level: oneOf(Number(d.level), [2, 3, 4], 2) }),
  image: (d) => ({
    url: url(d.url),
    alt: str(d.alt, 300),
    caption: str(d.caption, 600),
    width: oneOf(d.width, ['normal', 'wide', 'full'], 'normal'),
  }),
  code: (d) => ({ language: str(d.language, 40), filename: str(d.filename, 200), code: str(d.code, 100_000) }),
  chart: (d) => ({
    chartType: oneOf(d.chartType, ['bar', 'line', 'area', 'pie'], 'bar'),
    title: str(d.title, 200),
    caption: str(d.caption, 600),
    yLabel: str(d.yLabel, 100),
    stacked: Boolean(d.stacked),
    csv: str(d.csv, 50_000),
  }),
  table: (d) => ({ csv: str(d.csv, 50_000), caption: str(d.caption, 600), header: d.header !== false }),
  math: (d) => ({ latex: str(d.latex, 20_000), caption: str(d.caption, 600) }),
  audio: (d) => ({ url: url(d.url), title: str(d.title, 200), caption: str(d.caption, 600), transcript: str(d.transcript, 5_000) }),
  video: (d) => ({ url: url(d.url), caption: str(d.caption, 600) }),
  quote: (d) => ({ text: str(d.text, 3_000), cite: str(d.cite, 300) }),
  callout: (d) => ({
    tone: oneOf(d.tone, ['note', 'tip', 'warning', 'important'], 'note'),
    title: str(d.title, 200),
    markdown: str(d.markdown, 20_000),
  }),
  divider: () => ({}),
};

export const BLOCK_TYPES = Object.keys(shapes);

export function sanitizeBlocks(input) {
  if (input == null) return [];
  if (!Array.isArray(input)) throw badRequest('blocks must be an array');
  if (input.length > MAX_BLOCKS) throw badRequest(`A post can hold at most ${MAX_BLOCKS} blocks`);

  const seen = new Set();
  return input.map((block, index) => {
    if (!block || typeof block !== 'object') throw badRequest(`Block ${index + 1} is malformed`);
    const shape = shapes[block.type];
    if (!shape) throw badRequest(`Block ${index + 1} has unknown type "${block.type}"`);

    let id = str(block.id, 64) || `b${index}`;
    while (seen.has(id)) id = `${id}-${index}`;
    seen.add(id);

    return { id, type: block.type, data: shape(block.data ?? {}) };
  });
}

// Plain text of a post, used for search and reading time.
export function blocksToText(blocks) {
  return blocks
    .map(({ type, data }) => {
      switch (type) {
        case 'text':
          return data.markdown;
        case 'heading':
          return data.text;
        case 'quote':
          return data.text;
        case 'callout':
          return `${data.title} ${data.markdown}`;
        case 'image':
        case 'chart':
        case 'table':
        case 'math':
        case 'video':
          return data.caption ?? '';
        case 'audio':
          return `${data.title} ${data.caption} ${data.transcript}`;
        default:
          return '';
      }
    })
    .join('\n')
    .replace(/[#*_`>[\]()|~-]/g, ' ');
}

export function readingMinutes(blocks) {
  const words = blocksToText(blocks).split(/\s+/).filter(Boolean).length;
  const codeLines = blocks
    .filter((b) => b.type === 'code')
    .reduce((n, b) => n + b.data.code.split('\n').length, 0);
  const figures = blocks.filter((b) => ['image', 'chart', 'table', 'math', 'video', 'audio'].includes(b.type)).length;
  // ~220 words a minute, code reads at roughly 10 lines a minute, ~12 s per figure.
  return Math.max(1, Math.round(words / 220 + codeLines / 10 + figures * 0.2));
}
