import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const assetPath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map-illustrated.png');
const sourcePath = resolve(process.cwd(), 'design/progress-map/ai/vietnam-map-ai-source.png');

function readPngDimensions(bytes: Buffer) {
  expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  expect(bytes.toString('ascii', 12, 16)).toBe('IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('illustrated Vietnam progress map asset', () => {
  it('contains the single illustrated progress-map runtime artwork', () => {
    const bytes = readFileSync(assetPath);

    expect(statSync(assetPath).size).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(readPngDimensions(bytes)).toEqual({ width: 1840, height: 1940 });
  });

  it('preserves the full AI source canvas instead of clipping it to the land mask', async () => {
    const [source, runtime] = await Promise.all([
      sharp(sourcePath).resize(1840, 1940, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(assetPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);
    const samplePoints = [[100, 100], [1780, 100], [100, 1800], [1780, 1800], [1700, 700], [1700, 1200]] as const;

    for (const [x, y] of samplePoints) {
      const offset = (y * 1840 + x) * 3;
      const sourcePixel = source.data.subarray(offset, offset + 3);
      const runtimePixel = runtime.data.subarray(offset, offset + 3);
      const distance = sourcePixel.reduce((sum, channel, index) => sum + Math.abs(channel - runtimePixel[index]), 0);
      expect(distance, `full-canvas sample ${x},${y}`).toBeLessThan(16);
    }
  });
});
