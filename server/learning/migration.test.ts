import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '../../src/progress/storage';
import { CONTENT_VERSION, type LearningEventInput } from '../../shared/learning-contracts';
import { MemoryLearningRepository } from './memoryRepository';
import { createLearningService } from './service';

const studentId = '11111111-1111-4111-8111-111111111111';
const otherStudentId = '99999999-9999-4999-8999-999999999999';

function legacyBackup(): string {
  return JSON.stringify(createDefaultProgress());
}

function accountBackup(ownerId: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    kind: 'hoc-vui-progress',
    exportAt: '2026-09-13T03:00:00.000Z',
    ownerId,
    revision: 0,
    generation: 0,
    contentVersion: CONTENT_VERSION,
    progress: createDefaultProgress(),
  });
}

describe('server progress migration', () => {
  it('previews legacy data, imports once, and rejects stale events after import', async () => {
    const service = createLearningService(new MemoryLearningRepository());
    const raw = legacyBackup();
    const preview = await service.previewImport(studentId, raw);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.preview.legacyImported).toBe(true);
    expect(preview.preview.currentRevision).toBe(0);

    const imported = await service.importProgress(studentId, raw, preview.preview.fingerprint, preview.preview.currentRevision);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.duplicate).toBe(false);
    expect(imported.snapshot.generation).toBe(1);
    expect(imported.snapshot.legacyImported).toBe(true);
    const stale = await service.appendEvents(studentId, [{ eventId: '88888888-8888-4888-8888-888888888888', runId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sequence: 1, type: 'run_started', lessonId: 'lesson-01', lessonVersion: 1, deviceId: 'tablet-a', generation: 0 } satisfies LearningEventInput]);
    expect(stale).toMatchObject({ ok: false, code: 'stale' });

    const repeated = await service.importProgress(studentId, raw, preview.preview.fingerprint, 0);
    expect(repeated).toMatchObject({ ok: true, duplicate: true });
    expect((await service.getProgress(studentId)).snapshot.revision).toBe(1);
  });

  it('never previews or writes an account-owned backup for another student', async () => {
    const service = createLearningService(new MemoryLearningRepository());
    const preview = await service.previewImport(studentId, accountBackup(otherStudentId));
    expect(preview).toMatchObject({ ok: false, code: 'forbidden' });
    expect((await service.getProgress(studentId)).snapshot.revision).toBe(0);
  });
});
