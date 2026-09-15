import type { Evaluation, Lesson, Progress, Response, Session } from '../content/types.ts';
import { MVP_LESSON_PACKAGES } from '../content/packages.ts';
import { LESSON_MISSION_IDS, STAMP_IDS } from '../game/rewards.ts';
import { evaluate } from '../game/evaluate.ts';
import { getVerifiedLegacyLesson, hasLegacyMissionCompletion } from './legacy.ts';

export type AppSettings = {
  sound: boolean;
  reducedMotion: boolean;
};

export const PROGRESS_KEY = 'hoc-vui-progress-v1';
const SETTINGS_KEY = 'hoc-vui-p1-settings';
export const BACKUP_MAX_BYTES = 1_000_000;

export const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  reducedMotion: false,
};

const LEGACY_LESSON_PACKAGES = MVP_LESSON_PACKAGES.flatMap((lesson) => {
  const legacyLesson = getVerifiedLegacyLesson(lesson);
  return legacyLesson ? [legacyLesson] : [];
});

export type LoadProgressResult = {
  progress: Progress;
  error: string | null;
};

export type BackupImportResult = {
  ok: boolean;
  progress?: Progress;
  error?: string;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getProgressStorageKey(ownerId?: string | null): string {
  return ownerId ? `${PROGRESS_KEY}:${ownerId}` : PROGRESS_KEY;
}

export function loadSettings(): AppSettings {
  const storage = getStorage();
  if (!storage) return DEFAULT_SETTINGS;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const value: unknown = JSON.parse(raw);
    return isAppSettings(value) ? value : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): boolean {
  const storage = getStorage();
  if (!storage || !isAppSettings(settings)) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function createDefaultProgress(settings: AppSettings = loadSettings()): Progress {
  return {
    schemaVersion: 1,
    completedMissions: [],
    stamps: [],
    settings: { ...settings },
    session: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadProgress(ownerId?: string | null): LoadProgressResult {
  const storage = getStorage();
  if (!storage) return { progress: createDefaultProgress(), error: 'Thiết bị chưa cho phép lưu dữ liệu.' };
  let raw: string | null;
  try {
    raw = storage.getItem(getProgressStorageKey(ownerId));
  } catch {
    return { progress: createDefaultProgress(), error: 'Không thể đọc tiến độ trên thiết bị này.' };
  }
  if (!raw) return { progress: createDefaultProgress(), error: null };

  try {
    const value: unknown = JSON.parse(raw);
    const progress = migrateProgress(value);
    if (!progress) throw new Error('schema');
    if (progress !== value) {
      try {
        storage.setItem(getProgressStorageKey(ownerId), JSON.stringify(progress));
      } catch {
        // Keep the validated migration in memory even when the one-time rewrite cannot be persisted.
      }
    }
    return { progress, error: null };
  } catch {
    // Deliberately leave the raw value untouched so a parent can still export or inspect it.
    return { progress: createDefaultProgress(), error: 'Dữ liệu tiến độ bị lỗi; dữ liệu cũ chưa bị ghi đè.' };
  }
}

export function readRawProgress(ownerId?: string | null): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(getProgressStorageKey(ownerId));
  } catch {
    return null;
  }
}

export function saveProgress(progress: Progress, ownerId?: string | null): boolean {
  const storage = getStorage();
  if (!storage || !isProgress(progress)) return false;
  try {
    storage.setItem(getProgressStorageKey(ownerId), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function exportProgress(progress: Progress): string {
  if (!isProgress(progress)) throw new Error('Không thể xuất tiến độ không hợp lệ.');
  const backup = JSON.stringify({ schemaVersion: 1, exportAt: new Date().toISOString(), progress });
  if (byteLength(backup) > BACKUP_MAX_BYTES) throw new Error('Bản sao lưu vượt quá giới hạn 1 MB.');
  return backup;
}

export function importProgressBackup(raw: string, ownerId?: string | null): BackupImportResult {
  if (typeof raw !== 'string' || byteLength(raw) > BACKUP_MAX_BYTES) return { ok: false, error: 'Tệp sao lưu phải nhỏ hơn hoặc bằng 1 MB.' };
  let progress: Progress;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isBackup(value)) throw new Error('schema');
    const migrated = migrateProgress(value.progress);
    if (!migrated) throw new Error('schema');
    progress = migrated;
  } catch {
    return { ok: false, error: 'Tệp sao lưu không hợp lệ; tiến độ cũ vẫn được giữ nguyên.' };
  }

  if (!saveProgress(progress, ownerId)) return { ok: false, error: 'Không thể lưu bản sao lưu trên thiết bị này.' };
  return { ok: true, progress };
}

export async function importProgressFile(file: Pick<File, 'size' | 'text'>, ownerId?: string | null): Promise<BackupImportResult> {
  if (file.size > BACKUP_MAX_BYTES) return { ok: false, error: 'Tệp sao lưu phải nhỏ hơn hoặc bằng 1 MB.' };
  try {
    return importProgressBackup(await file.text(), ownerId);
  } catch {
    return { ok: false, error: 'Không thể đọc tệp sao lưu; dữ liệu cũ vẫn được giữ nguyên.' };
  }
}

export function resetProgress(ownerId?: string | null): boolean {
  return saveProgress(createDefaultProgress(loadSettings()), ownerId);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.sound === 'boolean' && typeof candidate.reducedMotion === 'boolean';
}

function isResponse(value: unknown): value is Response {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'choice') return typeof candidate.optionId === 'string';
  if (candidate.type === 'order') return Array.isArray(candidate.ids) && candidate.ids.every((id) => typeof id === 'string');
  if (candidate.type === 'match') return Array.isArray(candidate.pairs) && candidate.pairs.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((id) => typeof id === 'string'));
  if (candidate.type === 'select') return Array.isArray(candidate.optionIds) && candidate.optionIds.every((id) => typeof id === 'string');
  return false;
}

type ReplayState = Pick<Session, 'missionIndex' | 'activityIndex' | 'stage'> & { lastEvaluation: Evaluation | null };

function advanceFeedbackState(state: ReplayState, lesson: Lesson): ReplayState {
  if (!state.lastEvaluation?.correct || state.lastEvaluation.invalid) return { ...state, stage: 'answer', lastEvaluation: null };
  const mission = lesson.missions[state.missionIndex];
  if (state.activityIndex < mission.activities.length - 1) {
    return { ...state, stage: 'answer', activityIndex: state.activityIndex + 1, lastEvaluation: null };
  }
  return { ...state, stage: 'missionComplete', lastEvaluation: null };
}

function advanceMissionCompleteState(state: ReplayState, lesson: Lesson): ReplayState {
  if (state.missionIndex < lesson.missions.length - 1) {
    return { ...state, stage: 'discover', missionIndex: state.missionIndex + 1, activityIndex: 0, lastEvaluation: null };
  }
  return { ...state, stage: 'lessonComplete', lastEvaluation: null };
}

function sameReplayState(candidate: Record<string, unknown>, state: ReplayState): boolean {
  return candidate.missionIndex === state.missionIndex && candidate.activityIndex === state.activityIndex && candidate.stage === state.stage;
}

function replaySessionAttempts(attempts: Record<string, unknown>[], lesson: Lesson): { feedback: ReplayState; lastAttemptHintUsed: boolean } | null {
  let state: ReplayState = { missionIndex: 0, activityIndex: 0, stage: 'discover', lastEvaluation: null };
  let lastAttemptHintUsed = false;
  const knownActivities = new Map(lesson.missions.flatMap((mission) => mission.activities.map((activity) => [activity.id, activity] as const)));

  for (const [index, attempt] of attempts.entries()) {
    if (state.stage === 'discover') state = { ...state, stage: 'answer' };
    if (state.stage !== 'answer') return null;
    const activityId = attempt.activityId;
    const activity = typeof activityId === 'string' ? knownActivities.get(activityId) : undefined;
    const currentActivity = lesson.missions[state.missionIndex]?.activities[state.activityIndex];
    if (!activity || !currentActivity || activity.id !== currentActivity.id || !isResponse(attempt.response) || attempt.response.type !== currentActivity.type) return null;
    const actualEvaluation = evaluate(currentActivity, attempt.response);
    // A persisted attempt must carry real option/card ids; invalid responses stay in transient feedback only.
    if (actualEvaluation.invalid || attempt.correct !== actualEvaluation.correct) return null;
    lastAttemptHintUsed = attempt.hintUsed as boolean;
    state = { ...state, stage: 'feedback', lastEvaluation: actualEvaluation };

    if (index < attempts.length - 1) {
      state = advanceFeedbackState(state, lesson);
      if (state.stage === 'missionComplete') state = advanceMissionCompleteState(state, lesson);
      if (state.stage === 'lessonComplete') return null;
    }
  }
  return { feedback: state, lastAttemptHintUsed };
}

function isSession(value: unknown, lessons: Lesson[] = MVP_LESSON_PACKAGES): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const stages: Session['stage'][] = ['discover', 'answer', 'feedback', 'missionComplete', 'lessonComplete'];
  const lessonId = typeof candidate.lessonId === 'string' && lessons.some((item) => item.id === candidate.lessonId)
    ? candidate.lessonId as Session['lessonId']
    : null;
  const lesson = lessonId ? lessons.find((item) => item.id === lessonId) : undefined;
  if (!lesson || typeof candidate.id !== 'string' || !candidate.id || candidate.lessonVersion !== lesson.version
    || !Number.isInteger(candidate.missionIndex) || (candidate.missionIndex as number) < 0 || (candidate.missionIndex as number) >= lesson.missions.length
    || !Number.isInteger(candidate.activityIndex) || (candidate.activityIndex as number) < 0
    || typeof candidate.stage !== 'string' || !stages.includes(candidate.stage as Session['stage'])
    || !Array.isArray(candidate.attempts) || typeof candidate.hintUsed !== 'boolean') return false;

  const mission = lesson.missions[candidate.missionIndex as number];
  if (!mission || (candidate.activityIndex as number) >= mission.activities.length) return false;
  const attemptIds = new Set<string>();
  const attemptsValid = candidate.attempts.every((attempt) => {
    if (!attempt || typeof attempt !== 'object') return false;
    const item = attempt as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id || attemptIds.has(item.id) || typeof item.activityId !== 'string'
      || !isResponse(item.response) || typeof item.hintUsed !== 'boolean' || typeof item.correct !== 'boolean' || typeof item.time !== 'string') return false;
    attemptIds.add(item.id);
    return true;
  });
  if (!attemptsValid) return false;

  const hasLastEvaluation = candidate.lastEvaluation === null || (
    !!candidate.lastEvaluation && typeof candidate.lastEvaluation === 'object'
    && typeof (candidate.lastEvaluation as Record<string, unknown>).correct === 'boolean'
    && typeof (candidate.lastEvaluation as Record<string, unknown>).explanation === 'string'
    && typeof (candidate.lastEvaluation as Record<string, unknown>).invalid === 'boolean'
  );
  if (!hasLastEvaluation) return false;

  if (candidate.attempts.length === 0) {
    if (candidate.missionIndex !== 0 || candidate.activityIndex !== 0 || (candidate.stage !== 'discover' && candidate.stage !== 'answer') || candidate.lastEvaluation !== null) return false;
    return candidate.stage === 'discover' ? candidate.hintUsed === false : true;
  }

  const replay = replaySessionAttempts(candidate.attempts as Record<string, unknown>[], lesson);
  if (!replay) return false;
  const expectedStates: ReplayState[] = [replay.feedback];
  const afterFeedback = advanceFeedbackState(replay.feedback, lesson);
  expectedStates.push(afterFeedback);
  if (afterFeedback.stage === 'missionComplete') {
    const afterMission = advanceMissionCompleteState(afterFeedback, lesson);
    expectedStates.push(afterMission);
    if (afterMission.stage === 'discover') expectedStates.push({ ...afterMission, stage: 'answer' });
  }
  const expectedState = expectedStates.find((state) => sameReplayState(candidate, state));
  if (!expectedState) return false;
  if (candidate.stage === 'feedback') {
    if (candidate.lastEvaluation === null || JSON.stringify(candidate.lastEvaluation) !== JSON.stringify(replay.feedback.lastEvaluation)) return false;
    if (candidate.hintUsed !== replay.lastAttemptHintUsed) return false;
  } else {
    if (candidate.lastEvaluation !== null) return false;
    if ((candidate.stage === 'discover' || candidate.stage === 'missionComplete' || candidate.stage === 'lessonComplete') && candidate.hintUsed !== false) return false;
  }
  return true;
}

function hasProgressFields(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.schemaVersion === 1
    && Array.isArray(candidate.completedMissions)
    && candidate.completedMissions.every((id) => typeof id === 'string' && Object.values(LESSON_MISSION_IDS).flat().includes(id))
    && new Set(candidate.completedMissions).size === candidate.completedMissions.length
    && Array.isArray(candidate.stamps)
    && candidate.stamps.every((id) => typeof id === 'string' && Object.values(STAMP_IDS).includes(id))
    && new Set(candidate.stamps).size === candidate.stamps.length
    && isAppSettings(candidate.settings)
    && (candidate.session === null || (!!candidate.session && typeof candidate.session === 'object'))
    && typeof candidate.updatedAt === 'string';
}

function isStampSetValid(candidate: Record<string, unknown>): boolean {
  const completedMissions = candidate.completedMissions as string[];
  const stamps = candidate.stamps as string[];
  return Object.entries(LESSON_MISSION_IDS).every(([lessonId, missionIds]) => {
    const complete = missionIds.every((id) => completedMissions.includes(id));
    const stamped = stamps.includes(STAMP_IDS[lessonId as keyof typeof STAMP_IDS]);
    const legacyComplete = hasLegacyMissionCompletion(completedMissions, lessonId as keyof typeof LESSON_MISSION_IDS);
    return complete === stamped || (stamped && legacyComplete);
  });
}

function hasVerifiedLegacyStamp(candidate: Record<string, unknown>): boolean {
  const completedMissions = candidate.completedMissions as string[];
  const stamps = candidate.stamps as string[];
  return Object.keys(LESSON_MISSION_IDS).some((lessonId) => (
    stamps.includes(STAMP_IDS[lessonId as keyof typeof STAMP_IDS])
    && hasLegacyMissionCompletion(completedMissions, lessonId as keyof typeof LESSON_MISSION_IDS)
  ));
}

function isLegacyTerminalSession(value: unknown, completedMissions: readonly string[]): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.stage !== 'lessonComplete' || typeof candidate.lessonId !== 'string') return false;
  const lesson = LEGACY_LESSON_PACKAGES.find((item) => item.id === candidate.lessonId);
  if (!lesson || !hasLegacyMissionCompletion(completedMissions, lesson.id)) return false;
  return isSession(value, [lesson]);
}

function migrateProgress(value: unknown): Progress | null {
  if (isProgress(value)) return value;
  if (!hasProgressFields(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!isStampSetValid(candidate) || !hasVerifiedLegacyStamp(candidate)) return null;

  if (candidate.session === null || isSession(candidate.session)) return candidate as Progress;
  if (!isLegacyTerminalSession(candidate.session, candidate.completedMissions as string[])) return null;
  return { ...candidate, session: null } as Progress;
}

export function isProgress(value: unknown): value is Progress {
  if (!hasProgressFields(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isStampSetValid(candidate)
    && (candidate.session === null || isSession(candidate.session));
}

function isBackup(value: unknown): value is { schemaVersion: 1; exportAt: string; progress: unknown } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.schemaVersion === 1 && typeof candidate.exportAt === 'string' && !!candidate.progress && typeof candidate.progress === 'object';
}
