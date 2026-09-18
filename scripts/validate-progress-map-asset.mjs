import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const referencePath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map.svg');
const illustratedPath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map-illustrated.png');
const referenceMaxBytes = 150 * 1024;
const illustratedMaxBytes = 2 * 1024 * 1024;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function fail(message) {
  console.error(`[progress-map] ${message}`);
  process.exitCode = 1;
}

function readAsset(path, encoding) {
  try {
    return readFileSync(path, encoding);
  } catch (error) {
    fail(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const svg = readAsset(referencePath, 'utf8');
const png = readAsset(illustratedPath);

if (svg !== null) {
  const featureNames = ['mainland', 'hoang-sa', 'truong-sa'];
  const checks = [
    [statSync(referencePath).size <= referenceMaxBytes, `reference SVG must be <= ${referenceMaxBytes} bytes`],
    [/^<svg\b/.test(svg), 'reference SVG must start with an SVG root'],
    [/viewBox="0 0 920 970"/.test(svg), 'reference SVG must keep viewBox 0 0 920 970'],
    ...featureNames.map((feature) => [svg.includes(`data-geo-feature="${feature}"`), `${feature} feature is missing`]),
    [/<path\b[^>]*\bd="/i.test(svg), 'reference SVG must contain vector geometry'],
    [!/<script\b/i.test(svg), 'scripts are not allowed in the reference SVG'],
    [!/<image\b/i.test(svg), 'embedded raster images are not allowed in the reference SVG'],
    [!/(?:href|xlink:href)="https?:\/\//i.test(svg), 'remote href is not allowed in the reference SVG'],
  ];

  for (const [passed, message] of checks) {
    if (!passed) fail(message);
  }
}

if (png !== null) {
  const dimensions = png.length >= 24 && png.subarray(0, 8).equals(pngSignature)
    ? { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
    : null;
  const checks = [
    [statSync(illustratedPath).size <= illustratedMaxBytes, `illustrated PNG must be <= ${illustratedMaxBytes} bytes`],
    [png.subarray(0, 8).equals(pngSignature), 'illustrated asset must have a PNG signature'],
    [dimensions?.width === 1840 && dimensions?.height === 1940, 'illustrated PNG must be 1840x1940'],
  ];

  for (const [passed, message] of checks) {
    if (!passed) fail(message);
  }
}

if (process.exitCode) process.exit(1);
console.log('[progress-map] valid reference SVG and illustrated PNG');
