import { describe, expect, it } from 'vitest';
import { getLessonPackage } from '../../src/content/packages';
import type { LearningEventInput } from '../../shared/learning-contracts';
import { DEFAULT_STUDENT_PIN } from '../../shared/account-contracts';
import { createDbClient } from '../db/client';
import { PostgresAuthRepository } from '../auth/postgresRepository';
import { createAuthService } from '../auth/service';
import { PostgresLearningRepository } from './postgresRepository';
import { createLearningService } from './service';

const databaseUrl = process.env.HOC_VUI_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.DB_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const uniqueTail = Date.now().toString(16).padStart(12, '0').slice(-12);
const runId = `44444444-4444-4444-8444-${uniqueTail}`;

function event(sequence: number, type: LearningEventInput['type'], extra: Partial<LearningEventInput> = {}): LearningEventInput {
  const eventTail = (Number.parseInt(uniqueTail, 16) + sequence).toString(16).padStart(12, '0').slice(-12);
  return { eventId: `55555555-5555-4555-8555-${eventTail}`, runId, sequence, type, lessonId: 'lesson-01', lessonVersion: 1, deviceId: 'db-tablet', generation: 0, ...extra };
}

describeDatabase('Postgres learning repository', () => {
  it('commits replay state atomically and keeps duplicate events idempotent', async () => {
    const db = createDbClient(databaseUrl!);
    try {
      const auth = createAuthService(new PostgresAuthRepository(db));
      const admin = await auth.loginAdmin('admin', '123456@');
      if (!admin.ok) throw new Error('admin login');
      const username = `lr${Date.now().toString(36).slice(-8)}`;
      const created = await auth.createStudent(admin.token, username, 'Learning Repo');
      if (!created.ok) throw new Error('student create');
      const studentId = created.account.id;
      const learning = createLearningService(new PostgresLearningRepository(db), () => new Date('2026-09-13T02:30:00.000Z'));
      const runStarted = event(1, 'run_started');
      const started = await learning.appendEvents(studentId, [runStarted]);
      if (!started.ok) throw new Error(`${started.code}: ${started.message}`);
      expect(started.ok).toBe(true);
      const duplicate = await learning.appendEvents(studentId, [runStarted]);
      expect(duplicate.ok).toBe(true);
      if (!duplicate.ok || !started.ok) return;
      expect(duplicate.acknowledgements[0]?.status).toBe('duplicate');
      expect(duplicate.snapshot.revision).toBe(started.snapshot.revision);

      const lesson = getLessonPackage('lesson-01');
      const activity = lesson.missions[0].activities[0];
      if (activity.type !== 'choice') throw new Error('fixture activity type changed');
      const batch = await learning.appendEvents(studentId, [
        event(2, 'discovery_done'),
        event(3, 'answer_submitted', { activityId: activity.id, response: { type: 'choice', optionId: activity.correctId } }),
      ]);
      if (!batch.ok) throw new Error(`${batch.code}: ${batch.message}`);
      expect(batch.ok).toBe(true);
      if (!batch.ok) return;
      expect(batch.snapshot.revision).toBe(3);
      expect(batch.snapshot.progress.session?.attempts).toHaveLength(1);

      const rows = await db<{ count: string }[]>`select count(*)::text as count from hoc_vui_private.learning_events where student_id = ${studentId}::uuid and run_id = ${runId}::uuid`;
      expect(Number(rows[0]?.count)).toBe(3);
      const reset = await learning.resetProgress(studentId);
      expect(reset.snapshot.generation).toBe(1);
      const stale = await learning.appendEvents(studentId, [event(4, 'next')]);
      expect(stale).toMatchObject({ ok: false, code: 'stale' });
      const exported = await learning.exportBackup(studentId);
      const preview = await learning.previewImport(studentId, exported.backup);
      expect(preview.ok).toBe(true);
      if (!preview.ok) return;
      const imported = await learning.importProgress(studentId, exported.backup, preview.preview.fingerprint, preview.preview.currentRevision);
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;
      expect(imported.duplicate).toBe(false);
      const repeated = await learning.importProgress(studentId, exported.backup, preview.preview.fingerprint, 0);
      expect(repeated).toMatchObject({ ok: true, duplicate: true });
      const receipts = await db<{ count: string }[]>`select count(*)::text as count from hoc_vui_private.migration_receipts where student_id = ${studentId}::uuid and fingerprint = ${preview.preview.fingerprint}`;
      expect(Number(receipts[0]?.count)).toBe(1);
      expect(DEFAULT_STUDENT_PIN).toBe('123456');
    } finally {
      await db.end({ timeout: 5 });
    }
  });
});
