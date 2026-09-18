import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const illustratedMapPath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map-illustrated.png');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('Progress map illustrated runtime asset', () => {
  it('keeps the flattened map local and the retired texture out of active CSS', () => {
    expect(statSync(illustratedMapPath).size).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(styles).toContain('background-image: linear-gradient(145deg');
    expect(styles).not.toContain('adventure-paper-texture.png');
    expect(styles).not.toMatch(/url\(['"]https?:/);
  });
});
