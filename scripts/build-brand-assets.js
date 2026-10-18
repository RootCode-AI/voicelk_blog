import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Build-only. Every brand image the site serves is cut from one source file, so a
// new logo means replacing assets/brand/voicelk-logo.png and nothing else.
//
// The five sound bars are removed from the mark and redrawn as SVG by
// client/src/components/Brand.jsx, which lets them animate. Their geometry there
// matches BARS below; both are measured from the source at 2172 x 724.

const source = fileURLToPath(new URL('../assets/brand/voicelk-logo.png', import.meta.url));
const pub = (path) => fileURLToPath(new URL(`../client/public/${path}`, import.meta.url));

// Regions of the source image (left, top, width, height).
const LOGO = { left: 127, top: 170, width: 1930, height: 381 };
const MARK = { left: 127, top: 170, width: 644, height: 381 };
const WORDMARK = { left: 800, top: 257, width: 1257, height: 254 };
const BARS = [
  { left: 345, top: 254, width: 26, height: 47 },
  { left: 387, top: 214, width: 36, height: 126 },
  { left: 439, top: 170, width: 39, height: 217 },
  { left: 493, top: 215, width: 30, height: 123 },
  { left: 537, top: 254, width: 25, height: 47 },
];
// Anti-aliased edges reach a pixel or two past each bar; the pages are further away.
const BAR_MARGIN = 3;

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== 2172 || info.height !== 724) {
  throw new Error(`Expected a 2172 x 724 logo, got ${info.width} x ${info.height}. Re-measure the regions in this script.`);
}

// The mark without its bars. The pages are the large solid shapes of the mark; in
// the area around the bars, everything that is not a page (or a page's soft edge)
// is cleared, so no faint bar fringe survives.
const W = info.width;
const alpha = (x, y) => data[(y * W + x) * 4 + 3];
const page = new Uint8Array(W * info.height);
const seen = new Uint8Array(W * info.height);
for (let y = MARK.top; y < MARK.top + MARK.height; y += 1) {
  for (let x = MARK.left; x < MARK.left + MARK.width; x += 1) {
    if (seen[y * W + x] || alpha(x, y) <= 40) continue;
    const shape = [];
    const stack = [y * W + x];
    seen[y * W + x] = 1;
    while (stack.length) {
      const i = stack.pop();
      shape.push(i);
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (!seen[j] && alpha(j % W, Math.floor(j / W)) > 40) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    // Bars are under 8,000 pixels; each page is over 18,000.
    if (shape.length > 15000) for (const i of shape) page[i] = 1;
  }
}
const nearPage = (x, y) => {
  for (let dy = -BAR_MARGIN; dy <= BAR_MARGIN; dy += 1) {
    for (let dx = -BAR_MARGIN; dx <= BAR_MARGIN; dx += 1) if (page[(y + dy) * W + x + dx]) return true;
  }
  return false;
};
const zone = {
  left: Math.min(...BARS.map((b) => b.left)) - 12,
  right: Math.max(...BARS.map((b) => b.left + b.width)) + 12,
  top: Math.min(...BARS.map((b) => b.top)) - 12,
  bottom: Math.max(...BARS.map((b) => b.top + b.height)) + 12,
};
const bookless = Buffer.from(data);
for (let y = Math.max(0, zone.top); y < zone.bottom; y += 1) {
  for (let x = zone.left; x < zone.right; x += 1) if (!nearPage(x, y)) bookless[(y * W + x) * 4 + 3] = 0;
}
const raw = (buffer) => sharp(buffer, { raw: { width: info.width, height: info.height, channels: 4 } });

await mkdir(pub('brand'), { recursive: true });
const webp = { quality: 92, alphaQuality: 100, effort: 6 };

// On the website the logo is drawn in the site's ink (--color-ink), matching its black
// text and buttons. Every pixel takes the ink colour and keeps its own transparency, so
// shapes, gaps and soft edges stay exactly as drawn. Email, the social card and the
// icons below keep the full-colour logo.
const INK = { r: 0x1a, g: 0x1a, b: 0x1a };
async function inked(image) {
  const { data: pixels, info: size } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = INK.r;
    pixels[i + 1] = INK.g;
    pixels[i + 2] = INK.b;
  }
  return sharp(pixels, { raw: { width: size.width, height: size.height, channels: 4 } });
}

await (await inked(raw(bookless).extract(MARK).resize({ height: 256 }))).webp(webp).toFile(pub('brand/voicelk-book.webp'));
await (await inked(sharp(source).extract(WORDMARK).resize({ height: 96 }))).webp(webp).toFile(pub('brand/voicelk-wordmark.webp'));
// The whole logo in ink, for the moment before the app has loaded (index.css).
await (await inked(sharp(source).extract(LOGO).resize({ width: 480 }))).png({ compressionLevel: 9 }).toFile(pub('brand/voicelk-logo-ink.png'));
// Whole logo for places that cannot draw SVG bars: email, the social card, documents.
await sharp(source).extract(LOGO).resize({ width: 960 }).png({ compressionLevel: 9 }).toFile(pub('brand/voicelk-logo.png'));

// Square icons from the complete mark, bars included, in ink like the logo on the site.
// Always on white: a black mark on a transparent favicon would vanish on dark tabs.
const mark = await (await inked(sharp(source).extract(MARK))).png().toBuffer();
async function icon(size, file, { padding = 0.08, radius = 0 } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const art = await sharp(mark).resize({ width: inner, height: inner, fit: 'inside' }).toBuffer();
  const tile = radius
    ? sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#ffffff"/></svg>`))
    : sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } });
  await tile
    .composite([{ input: art, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(pub(file));
}
// The browser-tab icon is a rounded white tile, so it reads on light and dark tabs alike.
await icon(32, 'favicon-32.png', { padding: 0.1, radius: 7 });
await icon(192, 'icon-192.png');
await icon(512, 'icon-512.png');
await icon(180, 'apple-touch-icon.png', { padding: 0.12 });

// Fingerprinted like the icon links in index.html (client/vite.config.js), so an
// installed app picks up a changed icon.
const version = async (file) => createHash('sha256').update(await readFile(pub(file))).digest('hex').slice(0, 10);
await writeFile(pub('site.webmanifest'), `${JSON.stringify({
  name: 'VoiceLK',
  short_name: 'VoiceLK',
  description: 'Sinhala-English text to speech',
  start_url: '/',
  display: 'browser',
  background_color: '#fcfcfc',
  theme_color: '#002251',
  icons: [
    { src: `/icon-192.png?v=${await version('icon-192.png')}`, sizes: '192x192', type: 'image/png' },
    { src: `/icon-512.png?v=${await version('icon-512.png')}`, sizes: '512x512', type: 'image/png' },
  ],
}, null, 2)}\n`);

console.log('Generated brand images, icons and site.webmanifest from assets/brand/voicelk-logo.png.');
