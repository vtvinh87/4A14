import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const assetPath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map.svg');

describe('vietnam progress map asset', () => {
  it('keeps the verified local geography features and safe SVG surface', () => {
    const svg = readFileSync(assetPath, 'utf8');

    expect(statSync(assetPath).size).toBeLessThanOrEqual(150 * 1024);
    expect(svg).toMatch(/^<svg\b/);
    expect(svg).toContain('viewBox="0 0 920 970"');
    expect(svg).toContain('data-geo-feature="mainland"');
    expect(svg).toContain('data-geo-feature="hoang-sa"');
    expect(svg).toContain('data-geo-feature="truong-sa"');
    expect(svg).not.toMatch(/<script\b/i);
    expect(svg).not.toMatch(/<image\b/i);
    expect(svg).not.toMatch(/(?:href|xlink:href)="https?:\/\//i);
  });
});
