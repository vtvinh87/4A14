import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const texturePath = resolve(process.cwd(), 'public/art/progress/adventure-paper-texture.png');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('Progress map decorative skin', () => {
  it('keeps the paper texture local and lightweight', () => {
    expect(statSync(texturePath).size).toBeLessThanOrEqual(200 * 1024);
    expect(styles).toContain("url('/art/progress/adventure-paper-texture.png')");
    expect(styles).not.toMatch(/url\(['\"]https?:/);
  });
});
