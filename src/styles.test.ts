import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

function ruleFor(selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  if (start < 0) return '';
  const end = styles.indexOf('}', start);
  return styles.slice(start, end);
}

describe('Parent dashboard layout', () => {
  it('leaves a deliberate breathing gap below the summary card group', () => {
    expect(ruleFor('.parent-summary-grid')).toContain('margin-bottom: 24px;');
  });
});

describe('Journey layout', () => {
  it('keeps the launch group in the centered middle column with room for the feature rail', () => {
    expect(ruleFor('.journey-layout')).toContain('grid-template-columns: minmax(210px, 1fr) minmax(430px, 1.25fr) minmax(210px, 1fr);');
    expect(ruleFor('.journey-center')).toContain('grid-column: 2;');
  });

  it('moves the pet toward the foreground stones', () => {
    expect(ruleFor('.pet-zone')).toContain('transform: translateY(22px);');
  });

  it('reflows the feature rail for narrow screens without restoring the old two-column layout', () => {
    expect(styles).toContain('grid-template-columns: minmax(130px, 0.85fr) minmax(330px, 1.3fr) minmax(130px, 0.85fr);');
    expect(styles).toContain('.journey-feature-list { flex-direction: row; gap: 8px; }');
    expect(styles).toContain('transform: translateY(28px);');
    expect(styles).toContain('.journey-feature-button { flex: 1 1 0; grid-template-columns: 42px minmax(0, 1fr); min-height: 62px; }');
  });
});
