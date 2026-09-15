import { describe, expect, it } from 'vitest';
import { AVATAR_ASSET_URL, AVATAR_CATALOG, AVATAR_IDS, getAvatarDefinition } from './avatarCatalog';
import { DEFAULT_AVATAR_ID, isAvatarId, isCalendarDateOnOrBefore, validateAvatarId, validateBirthDate } from '../../shared/account-contracts';

describe('student avatar and profile date contract', () => {
  it('maps every allowlisted avatar to the local fox asset and a fixed variant class', () => {
    expect(AVATAR_IDS).toContain(DEFAULT_AVATAR_ID);
    for (const avatarId of AVATAR_IDS) {
      const definition = getAvatarDefinition(avatarId);
      expect(definition).toEqual(expect.objectContaining({ id: avatarId, assetUrl: AVATAR_ASSET_URL }));
      expect(definition).toBeDefined();
      if (!definition) throw new Error('Expected an allowlisted avatar definition.');
      expect(definition.variantClass).toMatch(/^avatar-variant-/);
      expect(AVATAR_CATALOG[avatarId]).toBe(definition);
    }
  });

  it('rejects arbitrary URLs and unknown avatar ids', () => {
    expect(isAvatarId('https://example.com/avatar.png')).toBe(false);
    expect(isAvatarId('unknown-avatar')).toBe(false);
    expect(validateAvatarId('https://example.com/avatar.png').ok).toBe(false);
    expect(validateAvatarId('unknown-avatar').ok).toBe(false);
    expect(getAvatarDefinition('https://example.com/avatar.png' as never)).toBeUndefined();
  });

  it('accepts null and leap-day dates but rejects empty, impossible and future dates', () => {
    expect(validateBirthDate(null, '2026-09-14')).toEqual({ ok: true, value: null });
    expect(validateBirthDate('2000-02-29', '2026-09-14')).toEqual({ ok: true, value: '2000-02-29' });
    expect(validateBirthDate('', '2026-09-14').ok).toBe(false);
    expect(validateBirthDate('2023-02-29', '2026-09-14').ok).toBe(false);
    expect(validateBirthDate('2026-09-15', '2026-09-14').ok).toBe(false);
    expect(isCalendarDateOnOrBefore('2026-09-14', '2026-09-14')).toBe(true);
    expect(isCalendarDateOnOrBefore('2026-09-15', '2026-09-14')).toBe(false);
  });
});
