import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applySyntheticProfilePatch, clearOwnedUiState, createFeatureFixtures, isFreshAccountResponse } from './featureFixtures';

describe('P7 synthetic feature fixtures', () => {
  it('keeps profile edits separate from the account progress snapshot', () => {
    const fixture = createFeatureFixtures();
    const before = structuredClone(fixture.progress);
    const updated = applySyntheticProfilePatch(fixture.student, { displayName: 'Bảo vui vẻ', birthDate: '2016-09-14' });
    expect(updated.displayName).toBe('Bảo vui vẻ');
    expect(fixture.progress).toEqual(before);
  });

  it('rejects late responses after account or session epoch changes', () => {
    expect(isFreshAccountResponse('student-a', 3, 'student-a', 3)).toBe(true);
    expect(isFreshAccountResponse('student-b', 4, 'student-a', 3)).toBe(false);
    expect(isFreshAccountResponse('student-a', 4, 'student-a', 3)).toBe(false);
  });

  it('clears all child and parent-only UI state on logout', () => {
    expect(clearOwnedUiState()).toEqual({ avatarId: null, birthDate: null, dashboard: null, parentProfile: null, celebration: null });
  });

  it('keeps responsive layout contracts explicit for narrow and desktop widths', () => {
    const css = readFileSync(`${process.cwd()}/src/styles.css`, 'utf8');
    expect(css).toContain('.parent-scroll-region');
    expect(css).toContain('overscroll-behavior: contain');
    expect(css).toContain('scrollbar-gutter: stable');
    expect(css).toContain('max-height: min(360px, 52svh)');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('max-width: 700px');
  });

  it('keeps the fixed HUD controls inside a 320px viewport', () => {
    const css = readFileSync(`${process.cwd()}/src/styles.css`, 'utf8');
    expect(css).toMatch(/@media\s*\(max-width:\s*390px\)[\s\S]*\.hud-icon-button,\s*\.user-menu-trigger\s*\{[^}]*min-width:\s*46px[^}]*min-height:\s*46px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)[\s\S]*\.passport-chip\s*\{[^}]*display:\s*none/);
  });
});
