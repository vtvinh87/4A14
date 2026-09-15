import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultProgress } from './storage';
import { createAccountProgressSnapshot, loadAccountProgressSnapshot, saveAccountProgressSnapshot } from './accountProgress';

describe('account progress cache', () => {
  beforeEach(() => window.localStorage.clear());

  it('stores server metadata under the account owner only', () => {
    const progress = createDefaultProgress();
    const snapshot = createAccountProgressSnapshot('student-a', progress, 4, 2);
    expect(saveAccountProgressSnapshot(snapshot)).toBe(true);
    expect(loadAccountProgressSnapshot('student-a')?.revision).toBe(4);
    expect(loadAccountProgressSnapshot('student-b')).toBeNull();
  });
});
