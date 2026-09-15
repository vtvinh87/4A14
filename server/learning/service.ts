import type { LearningBatchResult, LearningEventInput, LearningFailure } from '../../shared/learning-contracts';
import { CONTENT_VERSION } from '../../shared/learning-contracts';
import { LearningBatchError, type LearningRepository } from './types';
import { processLearningEvent } from './engine';
import { createProgressBackup, migrationPreview, parseProgressBackup } from './migration';
import { buildDashboardData } from '../analytics/metrics';
import type { DashboardRange } from '../../shared/dashboard-contracts';

function errorResult(error: LearningBatchError): LearningFailure {
  return { ok: false, code: error.code, message: error.message };
}

export function createLearningService(repository: LearningRepository, clock: () => Date = () => new Date()) {
  return {
    async getProgress(studentId: string) {
      const snapshot = await repository.getSnapshot(studentId);
      const run = await repository.getLatestRun(studentId);
      const currentRun = run ? { runId: run.runId, lessonId: run.lessonId, lessonVersion: run.lessonVersion, deviceId: run.deviceId, status: run.status, generation: run.generation, lastSequence: run.lastSequence, startedAt: run.startedAt, updatedAt: run.updatedAt } : undefined;
      return { ok: true as const, snapshot: { ...snapshot, contentVersion: snapshot.contentVersion || CONTENT_VERSION }, currentRun };
    },
    async appendEvents(studentId: string, events: LearningEventInput[]): Promise<LearningBatchResult | LearningFailure> {
      if (!Array.isArray(events) || events.length < 1 || events.length > 50) return { ok: false, code: 'invalid', message: 'Mỗi lần đồng bộ cần từ 1 đến 50 event.' };
      const ids = new Set<string>();
      if (events.some((event) => ids.has(event.eventId) || (ids.add(event.eventId), false))) return { ok: false, code: 'conflict', message: 'Batch chứa eventId trùng nhau.' };
      try {
        const result = await repository.processBatch(studentId, events, (store, event) => processLearningEvent(studentId, store, event, clock().toISOString()));
        return { ok: true, snapshot: result.snapshot, acknowledgements: result.acknowledgements };
      } catch (error) {
        if (error instanceof LearningBatchError) return errorResult(error);
        throw error;
      }
    },
    async exportBackup(studentId: string) {
      const snapshot = await repository.getSnapshot(studentId);
      return { ok: true as const, studentId, snapshot, backup: createProgressBackup(snapshot, clock().toISOString()) };
    },
    async getDashboard(studentId: string, range: DashboardRange, generatedAt = clock().toISOString()) {
      const progress = await this.getProgress(studentId);
      const events = await repository.listEvents(studentId);
      return buildDashboardData(progress.snapshot, events, range, generatedAt);
    },
    async previewImport(studentId: string, raw: string) {
      const parsed = parseProgressBackup(raw, studentId);
      if (!parsed.ok) return parsed;
      const snapshot = await repository.getSnapshot(studentId);
      const existing = await repository.findMigrationReceipt(studentId, parsed.fingerprint);
      const preview = migrationPreview(parsed, studentId, snapshot.revision, existing?.status === 'imported');
      if (existing?.status !== 'imported') {
        const now = clock().toISOString();
        await repository.saveMigrationReceipt({ fingerprint: parsed.fingerprint, studentId, status: 'previewed', result: preview, createdAt: existing?.createdAt ?? now, updatedAt: now });
      }
      return { ok: true as const, preview };
    },
    async importProgress(studentId: string, raw: string, fingerprint: string, expectedRevision: number) {
      const parsed = parseProgressBackup(raw, studentId);
      if (!parsed.ok) return parsed;
      if (parsed.fingerprint !== fingerprint || !Number.isInteger(expectedRevision) || expectedRevision < 0) return { ok: false as const, code: 'invalid' as const, message: 'Tệp đã thay đổi hoặc thiếu xác nhận xem trước.' };
      const existing = await repository.findMigrationReceipt(studentId, fingerprint);
      if (existing?.status === 'imported') return { ok: true as const, duplicate: true as const, snapshot: await repository.getSnapshot(studentId) };
      if (!existing || existing.status !== 'previewed' || Number(existing.result.currentRevision) !== expectedRevision) return { ok: false as const, code: 'conflict' as const, message: 'Cần xem trước lại tệp trước khi ghi tiến độ.' };
      const now = clock().toISOString();
      const receipt = { ...existing, status: 'imported' as const, result: { ...existing.result, importedAt: now, importedRevision: expectedRevision + 1 }, updatedAt: now };
      try {
        const snapshot = await repository.importSnapshot(studentId, parsed.progress, parsed.legacyImported, expectedRevision, receipt, now);
        return { ok: true as const, duplicate: false as const, snapshot };
      } catch (error) {
        if (error instanceof LearningBatchError) return errorResult(error);
        throw error;
      }
    },
    async resetProgress(studentId: string) {
      return { ok: true as const, snapshot: await repository.resetProgress(studentId, clock().toISOString()) };
    },
    listEvents: (studentId: string, from?: string, to?: string) => repository.listEvents(studentId, from, to),
  };
}
