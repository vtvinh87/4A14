import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STUDENT_PIN,
  normalizeUsername,
  validateDisplayName,
  validatePin,
  validateUsername,
  isParentGrantActive,
  type AccountRole,
} from './account';

describe('account contracts', () => {
  it('normalizes simple learner usernames without accepting ambiguous characters', () => {
    expect(normalizeUsername('  Bao04 ')).toBe('bao04');
    expect(validateUsername('bao04')).toEqual({ ok: true, value: 'bao04' });
    expect(validateUsername('ba o04').ok).toBe(false);
    expect(validateUsername('bé').ok).toBe(false);
    expect(validateUsername('admin')).toEqual({ ok: false, message: 'Tên này dành riêng cho quản trị.' });
  });

  it('requires a six digit PIN and preserves leading zeroes', () => {
    expect(validatePin('012345')).toEqual({ ok: true, value: '012345' });
    expect(validatePin(DEFAULT_STUDENT_PIN)).toEqual({ ok: true, value: DEFAULT_STUDENT_PIN });
    expect(validatePin('12345').ok).toBe(false);
    expect(validatePin('1234567').ok).toBe(false);
    expect(validatePin('12a456').ok).toBe(false);
  });

  it('keeps display names friendly while rejecting empty or oversized values', () => {
    expect(validateDisplayName(' Bé Sóc ')).toEqual({ ok: true, value: 'Bé Sóc' });
    expect(validateDisplayName('')).toEqual({ ok: false, message: 'Tên hiển thị không được để trống.' });
    expect(validateDisplayName('x'.repeat(41)).ok).toBe(false);
  });

  it('exposes only the three supported account roles', () => {
    const roles: AccountRole[] = ['student', 'admin', 'parent'];
    expect(roles).toHaveLength(3);
  });

  it('expires parent access at the stored deadline', () => {
    expect(isParentGrantActive({ expiresAt: '2026-09-13T10:00:00.000Z' }, new Date('2026-09-13T09:59:59.000Z'))).toBe(true);
    expect(isParentGrantActive({ expiresAt: '2026-09-13T10:00:00.000Z' }, new Date('2026-09-13T10:00:00.000Z'))).toBe(false);
  });
});
