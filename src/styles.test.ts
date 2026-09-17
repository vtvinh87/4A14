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

  it('keeps the feature rail in a vertical icon layout at narrow widths', () => {
    expect(styles).toContain('grid-template-columns: minmax(130px, 0.85fr) minmax(330px, 1.3fr) minmax(130px, 0.85fr);');
    expect(styles).toContain('.journey-feature-list {\n  display: flex;\n  flex-direction: column;');
    expect(styles).toContain('transform: translateY(28px);');
    expect(styles).toContain('grid-template-columns: 1fr;');
  });

  it('keeps upcoming features as accessible icon-only actions near the right edge', () => {
    expect(ruleFor('.journey-feature-rail')).toContain('justify-self: end;');
    expect(styles).toContain('grid-template-columns: 1fr;');
    expect(styles).toMatch(/\.journey-feature-label \{\s+position: absolute;/);
    expect(styles).toContain('right: -4px;');
  });

  it('lowers the large journey Pet slightly on landscape screens', () => {
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.append(style);
    try {
      const landscapeRule = [...(style.sheet?.cssRules ?? [])].find((rule) => (
        rule.constructor.name === 'CSSMediaRule'
        && (rule as CSSMediaRule).conditionText === '(orientation: landscape) and (min-width: 701px)'
      )) as CSSMediaRule | undefined;
      const petRule = [...(landscapeRule?.cssRules ?? [])].find((rule) => (
        rule.constructor.name === 'CSSStyleRule'
        && (rule as CSSStyleRule).selectorText === '.pet-zone'
      )) as CSSStyleRule | undefined;

      expect(petRule?.style.transform).toBe('translateY(48px)');
    } finally {
      style.remove();
    }
  });
});

describe('Friends dialog layout', () => {
  it('gives the friend heading a full title column and a compact title scale', () => {
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.append(style);
    const dialog = document.createElement('section');
    try {
      dialog.className = 'feature-dialog';
      dialog.setAttribute('data-friend-list-dialog', '');
      const heading = document.createElement('div');
      heading.className = 'feature-dialog-heading';
      heading.innerHTML = '<div><p class="eyebrow">BẠN BÈ</p><h2>Bạn cùng lớp</h2></div><button type="button">×</button>';
      dialog.append(heading);
      document.body.append(dialog);

      expect(getComputedStyle(heading).gridTemplateColumns).toBe('minmax(0, 1fr) 48px');
      expect(getComputedStyle(heading.querySelector('h2')!).fontSize).toContain('1.6rem');
    } finally {
      dialog.remove();
      style.remove();
    }
  });
});

describe('Challenge responsive layout', () => {
  it('bounds the daily/report overlays, collapses the weekly map, and honors reduced motion on narrow screens', () => {
    expect(styles).toMatch(/\.challenge-dialog \{[\s\S]*?max-height: min\(880px, calc\(100svh - 28px\)\);/);
    expect(styles).toMatch(/\.challenge-report-dialog \{[\s\S]*?max-height: min\(720px, calc\(100svh - 36px\)\);/);
    expect(styles).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.challenge-weekly-day-grid \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \}/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration: 0\.001ms !important;/);
  });
});

describe('Challenge actions and approval modal', () => {
  it('makes incomplete challenge submission visibly disabled', () => {
    const rule = ruleFor('.primary-small-button:disabled');
    expect(rule).toContain('cursor: not-allowed;');
    expect(rule).toContain('opacity: 0.46;');
    expect(rule).toContain('transform: none;');
  });

  it('keeps the approval backdrop viewport-wide and frosted', () => {
    const rule = ruleFor('.challenge-approval-modal-backdrop');
    expect(rule).toContain('position: fixed;');
    expect(rule).toContain('inset: 0;');
    expect(rule).toContain('backdrop-filter: blur(8px);');
    expect(rule).toContain('-webkit-backdrop-filter: blur(8px);');
  });
});
