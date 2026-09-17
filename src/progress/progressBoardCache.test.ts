import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProgressBoardData } from '../../shared/progress-board-contracts';
import {
  PROGRESS_BOARD_CACHE_MAX_BYTES,
  clearProgressBoardCache,
  getProgressBoardCacheKey,
  loadProgressBoardCache,
  saveProgressBoardCache,
} from './progressBoardCache';

const identity = {
  accountId: 'student-a',
  generation: '2',
  contentVersion: 'lesson-content-v1',
  ruleVersion: 'progress-board-v1',
};

function data(overrides: Partial<ProgressBoardData> = {}): ProgressBoardData {
  return {
    schemaVersion: 1,
    ruleVersion: 'progress-board-v1',
    contentVersion: 'lesson-content-v1',
    generation: '2',
    generatedAt: '2026-09-17T10:00:00.000Z',
    lastSyncedAt: '2026-09-17T09:00:00.000Z',
    stale: false,
    summary: { exploredLessonCount: 0, completedLessonCount: 0, independentObjectiveCount: 0, nextLessonId: 'lesson-01' },
    topics: [],
    nextLessonId: 'lesson-01',
    ...overrides,
  };
}

describe('progress board session cache', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('uses a namespaced key and returns cache data as stale', () => {
    const value = data();
    expect(getProgressBoardCacheKey(identity.accountId, identity.generation, identity.contentVersion, identity.ruleVersion)).toContain('hoc-vui-progress-board-v1:');
    expect(saveProgressBoardCache(identity, value)).toBe(true);
    expect(loadProgressBoardCache(identity)).toEqual({ ...value, stale: true });
    expect(sessionStorage.getItem(getProgressBoardCacheKey(identity.accountId, identity.generation, identity.contentVersion, identity.ruleVersion))).not.toContain('student-a');
  });

  it('rejects account, generation, version and rule mismatches', () => {
    expect(saveProgressBoardCache(identity, data())).toBe(true);
    expect(loadProgressBoardCache({ ...identity, accountId: 'student-b' })).toBeNull();
    expect(loadProgressBoardCache({ ...identity, generation: '3' })).toBeNull();
    expect(loadProgressBoardCache({ ...identity, contentVersion: 'new-content' })).toBeNull();
    expect(loadProgressBoardCache({ ...identity, ruleVersion: 'progress-board-v2' })).toBeNull();
  });

  it('ignores malformed, private-field and oversized payloads without touching other storage', () => {
    const key = getProgressBoardCacheKey(identity.accountId, identity.generation, identity.contentVersion, identity.ruleVersion);
    sessionStorage.setItem(key, JSON.stringify({ schemaVersion: 1, studentId: 'private' }));
    expect(loadProgressBoardCache(identity)).toBeNull();

    expect(saveProgressBoardCache(identity, data({ topics: [{ topic: 'A'.repeat(PROGRESS_BOARD_CACHE_MAX_BYTES), lessons: [] }] }))).toBe(false);
    expect(sessionStorage.getItem(key)).toContain('private');
  });

  it('clears only the requested account namespace', () => {
    saveProgressBoardCache(identity, data());
    saveProgressBoardCache({ ...identity, accountId: 'student-b' }, data());
    clearProgressBoardCache('student-a');
    expect(loadProgressBoardCache(identity)).toBeNull();
    expect(loadProgressBoardCache({ ...identity, accountId: 'student-b' })).toMatchObject({ generation: '2', stale: true });
  });
});
