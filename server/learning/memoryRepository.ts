import { createEmptySnapshot, processLearningEvent } from './engine';
import { LearningBatchError, type LearningEventRecord, type LearningRepository, type LearningRunRecord, type LearningSnapshotRecord, type LearningStore, type MigrationReceiptRecord } from './types';
import type { LearningEventInput } from '../../shared/learning-contracts';

export class MemoryLearningRepository implements LearningRepository {
  readonly snapshots = new Map<string, LearningSnapshotRecord>();
  readonly runs = new Map<string, LearningRunRecord>();
  readonly events = new Map<string, LearningEventRecord>();
  readonly migrationReceipts = new Map<string, MigrationReceiptRecord>();

  async processBatch(studentId: string, events: LearningEventInput[], processor: (store: LearningStore, event: LearningEventInput) => ReturnType<typeof processLearningEvent>): Promise<{ snapshot: LearningSnapshotRecord; acknowledgements: { eventId: string; sequence: number; status: 'accepted' | 'duplicate'; revision: number }[] }> {
    const now = new Date().toISOString();
    const initialSnapshot = structuredClone(this.snapshots.get(studentId) ?? createEmptySnapshot(studentId, now));
    let snapshot = initialSnapshot;
    const pendingRuns = new Map(this.runs);
    const pendingEvents = new Map(this.events);
    const acknowledgements: { eventId: string; sequence: number; status: 'accepted' | 'duplicate'; revision: number }[] = [];

    for (const event of events) {
      const duplicate = pendingEvents.get(event.eventId);
      if (duplicate) {
        if (duplicate.studentId !== studentId) throw new LearningBatchError('forbidden', 'Event không thuộc tài khoản hiện tại.');
        acknowledgements.push({ eventId: event.eventId, sequence: duplicate.sequence, status: 'duplicate', revision: snapshot.revision });
        continue;
      }
      const store: LearningStore = { snapshot, run: pendingRuns.get(event.runId) ? structuredClone(pendingRuns.get(event.runId)!) : null };
      const result = processor(store, event);
      if (!result.ok) throw new LearningBatchError(result.code, result.message);
      snapshot = structuredClone(result.snapshot);
      if (result.run) pendingRuns.set(result.run.runId, structuredClone(result.run));
      pendingEvents.set(event.eventId, structuredClone(result.event));
      acknowledgements.push({ eventId: event.eventId, sequence: event.sequence, status: 'accepted', revision: snapshot.revision });
    }

    this.snapshots.set(studentId, snapshot);
    for (const [key, run] of pendingRuns) if (run.studentId === studentId) this.runs.set(key, run);
    for (const [key, event] of pendingEvents) if (event.studentId === studentId) this.events.set(key, event);
    return { snapshot: structuredClone(snapshot), acknowledgements };
  }

  async getSnapshot(studentId: string): Promise<LearningSnapshotRecord> {
    return structuredClone(this.snapshots.get(studentId) ?? createEmptySnapshot(studentId, new Date().toISOString()));
  }

  async getLatestRun(studentId: string): Promise<LearningRunRecord | null> {
    const runs = [...this.runs.values()].filter((run) => run.studentId === studentId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return runs[0] ? structuredClone(runs[0]) : null;
  }

  async listEvents(studentId: string, from?: string, to?: string): Promise<LearningEventRecord[]> {
    const start = from ? Date.parse(from) : -Infinity;
    const end = to ? Date.parse(to) : Infinity;
    return [...this.events.values()].filter((event) => event.studentId === studentId).filter((event) => {
      const time = Date.parse(event.receivedAt);
      return time >= start && time <= end;
    }).sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt)).map((event) => structuredClone(event));
  }

  async getProgressBoardSource(studentId: string) {
    const snapshot = await this.getSnapshot(studentId);
    const events = await this.listEvents(studentId);
    return { snapshot, events };
  }

  async resetProgress(studentId: string, now: string): Promise<LearningSnapshotRecord> {
    const previous = this.snapshots.get(studentId) ?? createEmptySnapshot(studentId, now);
    const snapshot: LearningSnapshotRecord = { ...createEmptySnapshot(studentId, now), revision: previous.revision + 1, generation: previous.generation + 1 };
    this.snapshots.set(studentId, snapshot);
    for (const [key, run] of this.runs) if (run.studentId === studentId && run.status === 'active') this.runs.set(key, { ...run, status: 'abandoned', endedAt: now, generation: snapshot.generation, updatedAt: now });
    return structuredClone(snapshot);
  }

  async findMigrationReceipt(studentId: string, fingerprint: string): Promise<MigrationReceiptRecord | null> {
    const receipt = this.migrationReceipts.get(`${studentId}:${fingerprint}`);
    return receipt ? structuredClone(receipt) : null;
  }

  async saveMigrationReceipt(receipt: MigrationReceiptRecord): Promise<void> {
    this.migrationReceipts.set(`${receipt.studentId}:${receipt.fingerprint}`, structuredClone(receipt));
  }

  async importSnapshot(studentId: string, progress: LearningSnapshotRecord['progress'], legacyImported: boolean, expectedRevision: number, receipt: MigrationReceiptRecord, now: string): Promise<LearningSnapshotRecord> {
    const previous = this.snapshots.get(studentId) ?? createEmptySnapshot(studentId, now);
    if (previous.revision !== expectedRevision) throw new LearningBatchError('conflict', 'Tiến độ đã thay đổi sau lần xem trước; hãy xem trước lại tệp.');
    const next: LearningSnapshotRecord = { ...createEmptySnapshot(studentId, now), revision: previous.revision + 1, generation: previous.generation + 1, progress: { ...structuredClone(progress), updatedAt: now }, updatedAt: now, ...(legacyImported ? { legacyImported: true } : {}) };
    this.snapshots.set(studentId, next);
    for (const [key, run] of this.runs) if (run.studentId === studentId && run.status === 'active') this.runs.set(key, { ...run, status: 'abandoned', endedAt: now, generation: next.generation, updatedAt: now });
    this.migrationReceipts.set(`${receipt.studentId}:${receipt.fingerprint}`, structuredClone(receipt));
    return structuredClone(next);
  }
}
