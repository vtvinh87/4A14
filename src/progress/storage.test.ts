import { afterEach, describe, expect, it } from 'vitest';
import {
  BACKUP_MAX_BYTES,
  createDefaultProgress,
  exportProgress,
  importProgressFile,
  importProgressBackup,
  loadProgress,
  saveProgress,
  PROGRESS_KEY,
  readRawProgress,
} from './storage';
import type { Progress, Session } from '../content/types';
import type { Activity, Response } from '../content/types';
import { getLessonPackage } from '../content/packages';
import { grantReward } from '../game/rewards';
import { transition } from '../game/session';

const progress: Progress = {
  schemaVersion: 1,
  completedMissions: ['b1-m1'],
  stamps: [],
  settings: { sound: false, reducedMotion: true },
  session: {
    id: 'resume-me', lessonId: 'lesson-01', lessonVersion: 1, missionIndex: 0, activityIndex: 0, stage: 'answer',
    attempts: [], hintUsed: false, lastEvaluation: null,
  },
  updatedAt: '2026-09-10T00:00:00.000Z',
};

function correctResponse(activity: Activity): Response {
  if (activity.type === 'choice') return { type: 'choice', optionId: activity.correctId };
  if (activity.type === 'match') return { type: 'match', pairs: activity.pairs.map((pair) => [pair.leftId, pair.rightId]) };
  if (activity.type === 'order') return { type: 'order', ids: [...activity.correctOrder] };
  return { type: 'select', optionIds: [...activity.correctIds] };
}

function completeLesson(lessonId: 'lesson-01' | 'lesson-07', startingProgress: Progress): Progress {
  const lesson = getLessonPackage(lessonId);
  let session = transition(null, { type: 'START', sessionId: `${lessonId}-roundtrip` }, lesson);
  for (const mission of lesson.missions) {
    session = transition(session, { type: 'DISCOVERY_DONE' }, lesson);
    for (const activity of mission.activities) {
      session = transition(session, { type: 'ANSWER', response: correctResponse(activity) }, lesson);
      session = transition(session, { type: 'NEXT' }, lesson);
    }
    expect(session.stage).toBe('missionComplete');
    startingProgress = grantReward(startingProgress, mission.id);
    session = transition(session, { type: 'NEXT' }, lesson);
  }
  expect(session.stage).toBe('lessonComplete');
  return { ...startingProgress, session };
}

function makeLegacyProgress(lessonId: 'lesson-01' | 'lesson-07', session: Session | null = null): Progress {
  const prefix = lessonId === 'lesson-01' ? 'b1' : 'b7';
  return {
    ...createDefaultProgress({ sound: false, reducedMotion: true }),
    completedMissions: [`${prefix}-m1`, `${prefix}-m2`, `${prefix}-m3`],
    stamps: [`stamp-${lessonId}`],
    session,
    updatedAt: '2026-09-10T00:00:00.000Z',
  };
}

function completeLegacySession(lessonId: 'lesson-01' | 'lesson-07'): Session {
  const currentLesson = getLessonPackage(lessonId);
  const legacyLesson = { ...currentLesson, missions: currentLesson.missions.slice(0, 3) };
  let session = transition(null, { type: 'START', sessionId: `${lessonId}-legacy-roundtrip` }, legacyLesson);
  for (const mission of legacyLesson.missions) {
    session = transition(session, { type: 'DISCOVERY_DONE' }, legacyLesson);
    for (const activity of mission.activities) {
      session = transition(session, { type: 'ANSWER', response: correctResponse(activity) }, legacyLesson);
      session = transition(session, { type: 'NEXT' }, legacyLesson);
    }
    expect(session.stage).toBe('missionComplete');
    session = transition(session, { type: 'NEXT' }, legacyLesson);
  }
  expect(session.stage).toBe('lessonComplete');
  return session;
}

afterEach(() => {
  window.localStorage.clear();
});

describe('progress storage', () => {
  it('keeps account progress in separate storage namespaces while preserving the legacy key', () => {
    const first = { ...createDefaultProgress(), updatedAt: '2026-09-13T01:00:00.000Z' };
    const second = { ...createDefaultProgress(), updatedAt: '2026-09-13T02:00:00.000Z' };
    expect(saveProgress(first, 'student-a')).toBe(true);
    expect(saveProgress(second, 'student-b')).toBe(true);
    expect(loadProgress('student-a').progress.updatedAt).toBe(first.updatedAt);
    expect(loadProgress('student-b').progress.updatedAt).toBe(second.updatedAt);
    expect(window.localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('saves and reloads a session snapshot', () => {
    expect(saveProgress(progress)).toBe(true);
    expect(loadProgress()).toEqual({ progress, error: null });
  });

  it('round-trips a bounded backup and validates before replacing', () => {
    const backup = exportProgress(progress);
    expect(new TextEncoder().encode(backup).byteLength).toBeLessThanOrEqual(BACKUP_MAX_BYTES);
    expect(importProgressBackup(backup)).toMatchObject({ ok: true });
    expect(loadProgress().progress).toEqual(progress);
  });

  it.each(['lesson-01', 'lesson-07'] as const)('loads a verified three-mission legacy stamp without backfilling new missions (%s)', (lessonId) => {
    const legacy = makeLegacyProgress(lessonId);
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(legacy));

    const loaded = loadProgress();
    expect(loaded).toEqual({ progress: legacy, error: null });
    expect(loaded.progress.completedMissions).toHaveLength(3);
    expect(loaded.progress.stamps).toEqual([`stamp-${lessonId}`]);

    const prefix = lessonId === 'lesson-01' ? 'b1' : 'b7';
    const afterFourth = grantReward(loaded.progress, `${prefix}-m4`);
    expect(afterFourth.completedMissions).toEqual([...legacy.completedMissions, `${prefix}-m4`]);
    expect(afterFourth.stamps).toEqual(legacy.stamps);
    const afterFifth = grantReward(afterFourth, `${prefix}-m5`);
    expect(afterFifth.completedMissions).toEqual([...legacy.completedMissions, `${prefix}-m4`, `${prefix}-m5`]);
    expect(afterFifth.stamps).toEqual(legacy.stamps);
  });

  it.each(['lesson-01', 'lesson-07'] as const)('imports a verified three-mission legacy backup (%s)', (lessonId) => {
    const legacy = makeLegacyProgress(lessonId);
    const backup = JSON.stringify({ schemaVersion: 1, exportAt: '2026-09-10T00:00:00.000Z', progress: legacy });

    expect(importProgressBackup(backup)).toMatchObject({ ok: true, progress: legacy });
    expect(loadProgress().progress).toEqual(legacy);
  });

  it('drops only a replay-validated terminal legacy session', () => {
    const legacy = makeLegacyProgress('lesson-01', completeLegacySession('lesson-01'));
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(legacy));

    const loaded = loadProgress();
    expect(loaded.error).toBeNull();
    expect(loaded.progress.completedMissions).toEqual(legacy.completedMissions);
    expect(loaded.progress.stamps).toEqual(legacy.stamps);
    expect(loaded.progress.session).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '{}').session).toBeNull();
  });

  it('keeps arbitrary invalid legacy sessions in recovery instead of clearing them', () => {
    const invalidSession: Session = {
      id: 'legacy-invalid', lessonId: 'lesson-01', lessonVersion: 1, missionIndex: 2, activityIndex: 0, stage: 'lessonComplete',
      attempts: [], hintUsed: false, lastEvaluation: null,
    };
    const legacy = makeLegacyProgress('lesson-01', invalidSession);
    const raw = JSON.stringify(legacy);
    window.localStorage.setItem(PROGRESS_KEY, raw);

    const loaded = loadProgress();
    expect(loaded.progress).toMatchObject({ completedMissions: [], stamps: [], session: null });
    expect(loaded.error).toBeTruthy();
    expect(window.localStorage.getItem(PROGRESS_KEY)).toBe(raw);
  });

  it('keeps the previous progress when imported JSON is corrupt or oversized', () => {
    saveProgress(progress);
    expect(importProgressBackup('{not json')).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(progress);
    const oversized = `${JSON.stringify({ schemaVersion: 1, exportAt: new Date().toISOString(), progress })}${'x'.repeat(BACKUP_MAX_BYTES)}`;
    expect(importProgressBackup(oversized)).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(progress);
  });

  it('rejects semantically invalid snapshots without replacing the previous one', () => {
    saveProgress(progress);
    const invalid = JSON.parse(exportProgress(progress)) as { progress: Progress };
    invalid.progress.session!.missionIndex = 99;
    expect(importProgressBackup(JSON.stringify(invalid))).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(progress);

    const wrongVersion = JSON.parse(exportProgress(progress)) as { progress: Progress };
    wrongVersion.progress.session!.lessonVersion = 999;
    expect(importProgressBackup(JSON.stringify(wrongVersion))).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(progress);
  });

  it('checks file size before reading and handles file read errors', async () => {
    let oversizedRead = false;
    const oversized = { size: BACKUP_MAX_BYTES + 1, text: async () => { oversizedRead = true; return ''; } };
    await expect(importProgressFile(oversized)).resolves.toMatchObject({ ok: false });
    expect(oversizedRead).toBe(false);

    const unreadable = { size: 10, text: async () => { throw new Error('read failed'); } };
    await expect(importProgressFile(unreadable)).resolves.toMatchObject({ ok: false });
    expect(loadProgress().progress).toMatchObject({ schemaVersion: 1, completedMissions: [], stamps: [], session: null });
  });

  it('rejects forged attempt ids, correctness and inconsistent stamps while preserving old progress', () => {
    saveProgress(progress);
    const forged = JSON.parse(exportProgress(progress)) as { progress: Progress };
    forged.progress.session = {
      id: 'forged', lessonId: 'lesson-01', lessonVersion: 1, missionIndex: 0, activityIndex: 0, stage: 'feedback', hintUsed: false,
      attempts: [{ id: 'attempt-1', activityId: 'b1-m1-a1', response: { type: 'choice', optionId: 'missing' }, hintUsed: false, correct: true, time: '2026-09-10T00:00:00.000Z' }],
      lastEvaluation: { correct: true, explanation: 'fake', invalid: false },
    };
    expect(importProgressBackup(JSON.stringify(forged))).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(progress);

    const forgedStamp = JSON.parse(exportProgress(progress)) as { progress: Progress };
    forgedStamp.progress.stamps = ['stamp-lesson-01'];
    expect(importProgressBackup(JSON.stringify(forgedStamp))).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(progress);
  });

  it.each([
    { completedMissions: ['b1-m1'] },
    { completedMissions: ['b1-m1', 'b1-m2'] },
  ] as const)('rejects a stamp forged before all three legacy missions (%s)', ({ completedMissions }) => {
    const previous = progress;
    saveProgress(previous);
    const forged = {
      ...makeLegacyProgress('lesson-01'),
      completedMissions: [...completedMissions],
      stamps: ['stamp-lesson-01'],
    } satisfies Progress;
    const backup = JSON.stringify({ schemaVersion: 1, exportAt: '2026-09-10T00:00:00.000Z', progress: forged });

    expect(importProgressBackup(backup)).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(previous);
  });

  it('rejects repeated valid answers for an earlier activity and preserves the old snapshot', () => {
    saveProgress(progress);
    const repeated = JSON.parse(exportProgress(progress)) as { progress: Progress };
    repeated.progress.session = {
      id: 'repeated', lessonId: 'lesson-01', lessonVersion: 1, missionIndex: 0, activityIndex: 1, stage: 'feedback', hintUsed: false,
      attempts: Array.from({ length: 6 }, (_, index) => ({
        id: `attempt-${index + 1}`,
        activityId: 'b1-m1-a1',
        response: { type: 'choice' as const, optionId: 'map' },
        hintUsed: false,
        correct: true,
        time: `2026-09-10T00:00:0${index}.000Z`,
      })),
      lastEvaluation: { correct: true, explanation: 'Bản đồ thu nhỏ theo tỉ lệ.', invalid: false },
    };
    expect(importProgressBackup(JSON.stringify(repeated))).toMatchObject({ ok: false });
    expect(loadProgress().progress).toEqual(progress);
  });

  it('round-trips valid full sessions for both reviewed lessons', () => {
    let fullProgress: Progress = {
      ...createDefaultProgress({ sound: false, reducedMotion: true }),
      updatedAt: '2026-09-10T00:00:00.000Z',
    };

    for (const lessonId of ['lesson-01', 'lesson-07'] as const) {
      fullProgress = completeLesson(lessonId, fullProgress);
      expect(saveProgress(fullProgress)).toBe(true);
      expect(loadProgress()).toEqual({ progress: fullProgress, error: null });
    }
    expect(fullProgress.completedMissions).toHaveLength(10);
    expect(fullProgress.stamps).toEqual(['stamp-lesson-01', 'stamp-lesson-07']);
    expect(fullProgress.session?.lessonId).toBe('lesson-07');
    expect(fullProgress.session?.stage).toBe('lessonComplete');
  });

  it('reports corrupt stored data without overwriting the raw value', () => {
    window.localStorage.setItem(PROGRESS_KEY, '{broken');
    const loaded = loadProgress();
    expect(loaded.progress).toMatchObject({ schemaVersion: 1, completedMissions: [], stamps: [], session: null, settings: createDefaultProgress().settings });
    expect(loaded.progress.updatedAt).toBeTruthy();
    expect(loaded.error).toBeTruthy();
    expect(window.localStorage.getItem(PROGRESS_KEY)).toBe('{broken');
    expect(readRawProgress()).toBe('{broken');
  });
});
