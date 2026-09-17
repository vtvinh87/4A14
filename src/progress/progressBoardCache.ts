import {
  PROGRESS_BOARD_RULE_VERSION,
  PROGRESS_BOARD_SCHEMA_VERSION,
  type ProgressBoardData,
  type ProgressBoardLesson,
  type ProgressBoardNextAction,
  type ProgressBoardObjective,
  type ProgressBoardTopic,
  type ProgressState,
} from '../../shared/progress-board-contracts';

export const PROGRESS_BOARD_CACHE_PREFIX = 'hoc-vui-progress-board-v1:';
export const PROGRESS_BOARD_CACHE_MAX_BYTES = 256 * 1024;

export type ProgressBoardCacheIdentity = {
  accountId: string;
  generation: string | number;
  contentVersion: string;
  ruleVersion: string;
};

type UnknownRecord = Record<string, unknown>;

const DATA_KEYS = ['schemaVersion', 'ruleVersion', 'contentVersion', 'generation', 'generatedAt', 'lastSyncedAt', 'stale', 'summary', 'topics', 'nextLessonId'];
const SUMMARY_KEYS = ['exploredLessonCount', 'completedLessonCount', 'independentObjectiveCount', 'nextLessonId'];
const TOPIC_KEYS = ['topic', 'lessons'];
const LESSON_KEYS = ['lessonId', 'title', 'topic', 'completed', 'state', 'completedMissionCount', 'missionCount', 'objectives', 'nextAction'];
const OBJECTIVE_KEYS = ['objectiveId', 'label', 'state', 'practicedActivityCount', 'independentActivityCount', 'nextAction'];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isProgressState(value: unknown): value is ProgressState {
  return value === 'not_started' || value === 'explored' || value === 'practicing' || value === 'independent';
}

function isNextAction(value: unknown): value is ProgressBoardNextAction {
  return value === 'explore' || value === 'practice' || value === 'review' || value === 'celebrate';
}

function isProgressBoardObjective(value: unknown): value is ProgressBoardObjective {
  if (!isRecord(value) || !hasOnlyKeys(value, OBJECTIVE_KEYS)) return false;
  return isString(value.objectiveId)
    && isString(value.label)
    && isProgressState(value.state)
    && isNonNegativeInteger(value.practicedActivityCount)
    && isNonNegativeInteger(value.independentActivityCount)
    && isNextAction(value.nextAction);
}

function isProgressBoardLesson(value: unknown): value is ProgressBoardLesson {
  if (!isRecord(value) || !hasOnlyKeys(value, LESSON_KEYS)) return false;
  return isString(value.lessonId)
    && isString(value.title)
    && isString(value.topic)
    && typeof value.completed === 'boolean'
    && isProgressState(value.state)
    && isNonNegativeInteger(value.completedMissionCount)
    && isNonNegativeInteger(value.missionCount)
    && Array.isArray(value.objectives)
    && value.objectives.every(isProgressBoardObjective)
    && isNextAction(value.nextAction);
}

function isProgressBoardTopic(value: unknown): value is ProgressBoardTopic {
  if (!isRecord(value) || !hasOnlyKeys(value, TOPIC_KEYS)) return false;
  return isString(value.topic)
    && Array.isArray(value.lessons)
    && value.lessons.every(isProgressBoardLesson);
}

function isProgressBoardSummary(value: unknown): value is ProgressBoardData['summary'] {
  if (!isRecord(value) || !hasOnlyKeys(value, SUMMARY_KEYS)) return false;
  return isNonNegativeInteger(value.exploredLessonCount)
    && isNonNegativeInteger(value.completedLessonCount)
    && isNonNegativeInteger(value.independentObjectiveCount)
    && isStringOrNull(value.nextLessonId);
}

function isValidIdentity(identity: ProgressBoardCacheIdentity): boolean {
  return isString(identity.accountId)
    && identity.accountId.length > 0
    && (isString(identity.generation) || (typeof identity.generation === 'number' && Number.isFinite(identity.generation)))
    && isString(identity.contentVersion)
    && identity.contentVersion.length > 0
    && isString(identity.ruleVersion)
    && identity.ruleVersion.length > 0;
}

export function isProgressBoardData(value: unknown, identity?: ProgressBoardCacheIdentity): value is ProgressBoardData {
  if (!isRecord(value) || !hasOnlyKeys(value, DATA_KEYS)) return false;
  if (value.schemaVersion !== PROGRESS_BOARD_SCHEMA_VERSION || value.ruleVersion !== PROGRESS_BOARD_RULE_VERSION) return false;
  if (!isString(value.contentVersion) || !isString(value.generation) || !isString(value.generatedAt) || !isString(value.lastSyncedAt)) return false;
  if (typeof value.stale !== 'boolean' || !isProgressBoardSummary(value.summary) || !isStringOrNull(value.nextLessonId)) return false;
  if (!Array.isArray(value.topics) || !value.topics.every(isProgressBoardTopic)) return false;
  if (!identity) return true;
  return value.generation === String(identity.generation)
    && value.contentVersion === identity.contentVersion
    && value.ruleVersion === identity.ruleVersion;
}

function sessionStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function encodePart(value: string | number): string {
  return encodeURIComponent(String(value));
}

export function getProgressBoardCacheKey(accountId: string, generation: string | number, contentVersion: string, ruleVersion: string): string {
  return PROGRESS_BOARD_CACHE_PREFIX
    + encodePart(accountId)
    + ':'
    + encodePart(generation)
    + ':'
    + encodePart(contentVersion)
    + ':'
    + encodePart(ruleVersion);
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).byteLength;
  return value.length;
}

export function loadProgressBoardCache(identity: ProgressBoardCacheIdentity): ProgressBoardData | null {
  if (!isValidIdentity(identity)) return null;
  const storage = sessionStorageOrNull();
  if (!storage) return null;
  try {
    const raw = storage.getItem(getProgressBoardCacheKey(identity.accountId, identity.generation, identity.contentVersion, identity.ruleVersion));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isProgressBoardData(value, identity)) return null;
    return { ...value, stale: true };
  } catch {
    return null;
  }
}

export function saveProgressBoardCache(identity: ProgressBoardCacheIdentity, value: ProgressBoardData): boolean {
  if (!isValidIdentity(identity) || !isProgressBoardData(value, identity)) return false;
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }
  if (byteLength(serialized) > PROGRESS_BOARD_CACHE_MAX_BYTES) return false;
  const storage = sessionStorageOrNull();
  if (!storage) return false;
  try {
    storage.setItem(getProgressBoardCacheKey(identity.accountId, identity.generation, identity.contentVersion, identity.ruleVersion), serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearProgressBoardCache(accountId?: string): void {
  const storage = sessionStorageOrNull();
  if (!storage) return;
  const namespace = accountId === undefined
    ? PROGRESS_BOARD_CACHE_PREFIX
    : PROGRESS_BOARD_CACHE_PREFIX + encodePart(accountId) + ':';
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(namespace)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Cache cleanup is best effort; it must never block the learning flow.
  }
}
