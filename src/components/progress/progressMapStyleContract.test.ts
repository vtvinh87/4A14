import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('progress map style contract', () => {
  it('removes the route presentation and styles landmark interactions', () => {
    expect(styles).not.toContain('.progress-map-route');
    expect(styles).not.toContain('[data-progress-map-route]');
    expect(styles).toContain('.progress-map-landmark-hit-area');
    expect(styles).toContain('.progress-map-landmark-card');
    expect(styles).toMatch(/\.progress-map-landmark-layer \{[\s\S]*?z-index: 5;/);
    expect(styles).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.progress-map-landmark-card \{[\s\S]*?position: relative;[\s\S]*?margin:/);
    expect(styles).toContain('margin: 8px 8px 32px;');
  });
});
