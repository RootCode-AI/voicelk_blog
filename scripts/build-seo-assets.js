import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Build-only dependency. The production server serves the PNG, never rasterizes it.
const svg = await readFile(new URL('../assets/og-image.svg', import.meta.url));
const output = fileURLToPath(new URL('../client/public/og-image.png', import.meta.url));
await sharp(svg).resize(1200, 630).flatten({ background: '#f8f7f3' }).png().toFile(output);
console.log('Generated /og-image.png (1200 x 630).');
