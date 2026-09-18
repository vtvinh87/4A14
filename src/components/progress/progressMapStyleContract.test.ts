import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('progress map style contract', () => {
  it('removes the route presentation and styles landmark interactions', () => {
    expect(styles).not.toContain('.progress-map-route');
    expect(styles).not.toContain('[data-progress-map-route]');
    expect(styles).toContain('.progress-map-landmark-hit-area');
    expect(styles).toContain('.progress-map-info-panel');
    expect(styles).toContain('.progress-map-panel-foliage');
    expect(styles).toContain('aspect-ratio: 1840 / 1940;');
    expect(styles).toMatch(/\.progress-map-landmark-layer \{[\s\S]*?z-index: 5;/);
    expect(styles).toMatch(/\.progress-map-landmark-hit-area \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
    expect(styles).toMatch(/@media \(max-width: 899px\)[\s\S]*?\.progress-board-content \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  });

  it('defines the landmark image trigger and responsive modal contract', () => {
    expect(styles).toContain('.progress-map-landmark-image-trigger:focus-visible');
    expect(styles).toMatch(/\.progress-map-landmark-image-modal-backdrop \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
    expect(styles).toMatch(/\.progress-map-landmark-image-modal \{[\s\S]*?overflow-y: auto;/);
    expect(styles).toMatch(/\.progress-map-landmark-image-modal-image \{[\s\S]*?object-fit: contain;/);
    expect(styles).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.progress-map-landmark-image-modal/);
    expect(styles).toMatch(/@media \(min-width: 900px\) and \(max-height: 720px\)[\s\S]*?\.progress-map-landmark-image-modal/);
    expect(styles).toMatch(/@media \(orientation: landscape\) and \(max-height: 720px\)[\s\S]*?\.progress-map-landmark-image-modal-copy/);
  });

  it('clips the illustrated map to the rounded scene frame', () => {
    expect(styles).toContain('  aspect-ratio: 1840 / 1940;\n  margin: 0;\n  border-radius: inherit;');
    expect(styles).toContain('  width: 100%;\n  height: auto;\n  overflow: hidden;\n  border-radius: inherit;\n}');
  });
});
