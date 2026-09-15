import type { Response } from '../src/content/types';

export const CONTENT_VERSION = 'lesson-content-v1';
export const ACCOUNT_BACKUP_KIND = 'hoc-vui-progress';

export type LearningEventType = 'run_started' | 'discovery_done' | 'hint_used' | 'answer_submitted' | 'next' | 'heartbeat';

export type LearningEventInput = {
  eventId: string;
  runId: string;
  sequence: number;
  type: LearningEventType;
  lessonId: string;
  lessonVersion: number;
  deviceId: string;
  activityId?: string;
  response?: Response;
  clientTime?: string;
  generation: number;
  visible?: boolean;
  interactive?: boolean;
};

export type LearningEventAcknowledgement = {
  eventId: string;
  sequence: number;
  status: 'accepted' | 'duplicate';
  revision: number;
};

export type LearningEventRecord = LearningEventInput & {
  studentId: string;
  receivedAt: string;
  hintUsed: boolean;
  correct: boolean | null;
  visible: boolean;
  interactive: boolean;
};

export type LearningFailureCode = 'invalid' | 'forbidden' | 'conflict' | 'stale' | 'unavailable';
export type LearningFailure = { ok: false; code: LearningFailureCode; message: string };

export type AccountProgressSnapshot = {
  studentId: string;
  schemaVersion: 1;
  revision: number;
  generation: number;
  contentVersion: string;
  progress: import('../src/content/types').Progress;
  updatedAt: string;
  legacyImported?: boolean;
};

export type AccountProgressBackup = {
  schemaVersion: 1;
  kind: typeof ACCOUNT_BACKUP_KIND;
  exportAt: string;
  ownerId: string;
  revision: number;
  generation: number;
  contentVersion: string;
  progress: import('../src/content/types').Progress;
  legacyImported?: boolean;
};

export type MigrationPreview = {
  fingerprint: string;
  studentId: string;
  source: 'legacy' | 'account';
  legacyImported: boolean;
  completedMissions: number;
  stamps: number;
  hasSession: boolean;
  currentRevision: number;
  alreadyImported: boolean;
};

export type CurrentLearningRun = {
  runId: string;
  lessonId: string;
  lessonVersion: number;
  deviceId: string;
  status: 'active' | 'completed' | 'abandoned';
  generation: number;
  lastSequence: number;
  startedAt: string;
  updatedAt: string;
};

export type LearningBatchResult = {
  ok: true;
  snapshot: AccountProgressSnapshot;
  acknowledgements: LearningEventAcknowledgement[];
};
