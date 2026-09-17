import type { LearningEventInput } from '../../shared/learning-contracts';
import type { Progress, Session } from '../../src/content/types';

export type LearningSnapshotRecord = {
  studentId: string;
  schemaVersion: 1;
  revision: number;
  generation: number;
  contentVersion: string;
  progress: Progress;
  updatedAt: string;
  legacyImported?: boolean;
};

export type MigrationReceiptRecord = {
  fingerprint: string;
  studentId: string;
  status: 'previewed' | 'imported' | 'rejected';
  result: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LearningRunRecord = {
  runId: string;
  studentId: string;
  lessonId: string;
  lessonVersion: number;
  deviceId: string;
  status: 'active' | 'completed' | 'abandoned';
  state: Session;
  generation: number;
  lastSequence: number;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
};

export type LearningEventRecord = LearningEventInput & {
  studentId: string;
  receivedAt: string;
  hintUsed: boolean;
  correct: boolean | null;
  visible: boolean;
  interactive: boolean;
};

export type LearningBoardSource = {
  snapshot: LearningSnapshotRecord;
  events: LearningEventRecord[];
};

export type LearningStore = {
  snapshot: LearningSnapshotRecord;
  run: LearningRunRecord | null;
};

export type LearningEventProcessorResult =
  | { ok: true; snapshot: LearningSnapshotRecord; run: LearningRunRecord | null; event: LearningEventRecord }
  | { ok: false; code: 'invalid' | 'forbidden' | 'conflict' | 'stale'; message: string };

export type LearningRepository = {
  processBatch(studentId: string, events: LearningEventInput[], processor: (store: LearningStore, event: LearningEventInput) => LearningEventProcessorResult): Promise<{ snapshot: LearningSnapshotRecord; acknowledgements: { eventId: string; sequence: number; status: 'accepted' | 'duplicate'; revision: number }[] }>;
  getSnapshot(studentId: string): Promise<LearningSnapshotRecord>;
  getLatestRun(studentId: string): Promise<LearningRunRecord | null>;
  listEvents(studentId: string, from?: string, to?: string): Promise<LearningEventRecord[]>;
  getProgressBoardSource(studentId: string): Promise<LearningBoardSource>;
  resetProgress(studentId: string, now: string): Promise<LearningSnapshotRecord>;
  findMigrationReceipt(studentId: string, fingerprint: string): Promise<MigrationReceiptRecord | null>;
  importSnapshot(studentId: string, progress: Progress, legacyImported: boolean, expectedRevision: number, receipt: MigrationReceiptRecord, now: string): Promise<LearningSnapshotRecord>;
  saveMigrationReceipt(receipt: MigrationReceiptRecord): Promise<void>;
};

export class LearningBatchError extends Error {
  constructor(public readonly code: 'invalid' | 'forbidden' | 'conflict' | 'stale', message: string) {
    super(message);
    this.name = 'LearningBatchError';
  }
}
