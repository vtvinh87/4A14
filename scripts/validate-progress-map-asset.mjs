import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const assetPath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map.svg');
const maxBytes = 150 * 1024;

function fail(message) {
  console.error(`[progress-map] ${message}`);
  process.exitCode = 1;
}

let svg;
try {
  svg = readFileSync(assetPath, 'utf8');
} catch (error) {
  fail(`cannot read ${assetPath}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit();
}

const checks = [
  [statSync(assetPath).size <= maxBytes, `asset must be <= ${maxBytes} bytes`],
  [/^<svg\b/.test(svg), 'asset must start with an SVG root'],
  [/\bviewBox="[^"]+"/.test(svg), 'asset must declare a viewBox'],
  [svg.includes('data-geo-feature="mainland"'), 'mainland feature is missing'],
  [svg.includes('data-geo-feature="hoang-sa"'), 'hoang-sa feature is missing'],
  [svg.includes('data-geo-feature="truong-sa"'), 'truong-sa feature is missing'],
  [/<(?:path|polygon|g)\b[^>]*\bd="/i.test(svg) || /<path\b/i.test(svg), 'asset must contain vector geometry'],
  [!/<script\b/i.test(svg), 'scripts are not allowed in the asset'],
  [!/(?:href|xlink:href)="https?:\/\//i.test(svg), 'remote href is not allowed in the asset'],
];

for (const [passed, message] of checks) {
  if (!passed) fail(message);
}

if (process.exitCode) process.exit();
console.log(`[progress-map] valid local SVG (${statSync(assetPath).size} bytes)`);
