import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Build-only dependency. The production server serves the PNG, never rasterizes it.
const svg = await readFile(new URL('../assets/og-image.svg', import.meta.url));
const output = fileURLToPath(new URL('../client/public/og-image.png', import.meta.url));
// Generated just before this by build-brand-assets.js, from the source logo.
const logoFile = fileURLToPath(new URL('../client/public/brand/voicelk-logo.png', import.meta.url));
const logo = await sharp(logoFile).resize({ height: 60 }).toBuffer();
await sharp(svg)
  .resize(1200, 630)
  .flatten({ background: '#f8f7f3' })
  .composite([{ input: logo, left: 64, top: 56 }])
  .png()
  .toFile(output);
console.log('Generated /og-image.png (1200 x 630).');
