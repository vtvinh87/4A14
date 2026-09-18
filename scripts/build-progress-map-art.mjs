import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const WIDTH = 1840;
const HEIGHT = 1940;
const sourcePath = resolve(process.cwd(), 'design/progress-map/ai/vietnam-map-ai-source.png');
const outputPath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map-illustrated.png');

function createLabelSvg() {
  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .archipelago-label { font-family: Arial, Helvetica, sans-serif; font-size: 34px; font-weight: 700; letter-spacing: .4px; }
  </style>
  <g aria-label="Hoàng Sa và Trường Sa">
    <g transform="translate(1440 790)">
      <rect x="-126" y="-31" width="252" height="62" rx="31" fill="#fffbe8" fill-opacity=".94" stroke="#1e656f" stroke-opacity=".48" stroke-width="5" />
      <text class="archipelago-label" text-anchor="middle" dominant-baseline="middle" fill="#1d6470">Hoàng Sa</text>
    </g>
    <g transform="translate(1550 1770)">
      <rect x="-132" y="-31" width="264" height="62" rx="31" fill="#fffbe8" fill-opacity=".94" stroke="#1e656f" stroke-opacity=".48" stroke-width="5" />
      <text class="archipelago-label" text-anchor="middle" dominant-baseline="middle" fill="#1d6470">Trường Sa</text>
    </g>
  </g>
</svg>`;
}

const sourceBytes = await readFile(sourcePath);
const fullArtwork = await sharp(sourceBytes)
  .resize(WIDTH, HEIGHT, { fit: 'fill' })
  .ensureAlpha()
  .png({ palette: true, colours: 256, dither: 0.5, compressionLevel: 9 })
  .toBuffer();

await mkdir(dirname(outputPath), { recursive: true });
await sharp(fullArtwork)
  .composite([{ input: Buffer.from(createLabelSvg()), blend: 'over' }])
  .png({ palette: true, colours: 256, dither: 0.5, compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outputPath);

console.log(`[progress-map] built ${outputPath}`);
console.log(`[progress-map] dimensions ${WIDTH}x${HEIGHT}`);
