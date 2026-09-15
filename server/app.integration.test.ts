import { describe, expect, it } from 'vitest';
import { createApp, type AppRequest, type AppResponse } from './app';
import { PostgresAuthRepository } from './auth/postgresRepository';
import { createAuthService } from './auth/service';
import { createDbClient } from './db/client';
import { PostgresLearningRepository } from './learning/postgresRepository';
import { createLearningService } from './learning/service';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.HOC_VUI_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.DB_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

function cookieValue(response: AppResponse): string {
  return (response.headers['Set-Cookie'] ?? '').split(';', 1)[0] ?? '';
}

async function send(app: ReturnType<typeof createApp>, input: Omit<AppRequest, 'headers'> & { cookie?: string; parentGrant?: string }): Promise<AppResponse> {
  return app.handle({ ...input, headers: { host: '127.0.0.1:55422', ...(input.cookie ? { cookie: input.cookie } : {}), ...(input.parentGrant ? { 'x-parent-grant': input.parentGrant } : {}) } });
}

describeDatabase('same-origin account API on PostgreSQL', () => {
  it('persists the full Admin-to-student flow without exposing credentials', async () => {
    const db = createDbClient(databaseUrl!);
    try {
      const app = createApp({ auth: createAuthService(new PostgresAuthRepository(db)), learning: createLearningService(new PostgresLearningRepository(db)) });
      const admin = await send(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
      expect(admin.statusCode).toBe(200);
      expect(JSON.stringify(admin.body)).not.toContain('123456@');
      expect(JSON.stringify(admin.body)).not.toContain('scrypt');
      const adminCookie = cookieValue(admin);
      const username = `api${Date.now().toString(36).slice(-7)}`;
      const created = await send(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username, displayName: 'API Test' } });
      expect(created.statusCode).toBe(200);
      const studentId = String((created.body.account as { id: string }).id);
      const list = await send(app, { method: 'GET', path: '/api/admin/students', cookie: adminCookie });
      expect(list.statusCode).toBe(200);
      expect(JSON.stringify(list.body)).toContain(studentId);

      const student = await send(app, { method: 'POST', path: '/api/auth/student/login', body: { username: username.toUpperCase(), pin: '123456' } });
      expect(student.statusCode).toBe(200);
      const studentCookie = cookieValue(student);
      expect((await send(app, { method: 'GET', path: '/api/admin/students', cookie: studentCookie })).statusCode).toBe(403);
      expect((await send(app, { method: 'GET', path: '/api/parent/dashboard', cookie: studentCookie })).statusCode).toBe(403);
      const changed = await send(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: studentCookie, body: { currentPin: '123456', newPin: '012345' } });
      expect(changed.statusCode).toBe(200);
      const changedCookie = cookieValue(changed);
      const progress = await send(app, { method: 'GET', path: '/api/me/progress', cookie: changedCookie });
      expect(progress.statusCode).toBe(200);
      const runId = randomUUID();
      const start = { eventId: randomUUID(), runId, sequence: 1, type: 'run_started', lessonId: 'lesson-01', lessonVersion: 1, deviceId: 'api-device', generation: 0 };
      const synced = await send(app, { method: 'POST', path: '/api/me/events', cookie: changedCookie, body: { studentId: '00000000-0000-0000-0000-000000000000', events: [start] } });
      expect(synced.statusCode).toBe(200);
      const duplicate = await send(app, { method: 'POST', path: '/api/me/events', cookie: changedCookie, body: { events: [start] } });
      expect(duplicate.statusCode).toBe(200);
      expect((duplicate.body.acknowledgements as Array<{ status: string }>)[0]?.status).toBe('duplicate');

      const parentFirst = await send(app, { method: 'POST', path: '/api/parent/unlock', cookie: changedCookie, body: { pin: '123456' } });
      expect(parentFirst.statusCode).toBe(200);
      const parentFirstCookie = cookieValue(parentFirst);
      const parentChanged = await send(app, { method: 'POST', path: '/api/parent/change-pin', cookie: parentFirstCookie, body: { currentPin: '123456', newPin: '864208' } });
      expect(parentChanged.statusCode).toBe(200);
      const parentChangedCookie = cookieValue(parentChanged);
      const parentReady = await send(app, { method: 'POST', path: '/api/parent/unlock', cookie: parentChangedCookie, body: { pin: '864208' } });
      expect(parentReady.statusCode).toBe(200);
      const parentGrant = String(parentReady.body.parentGrantToken ?? '');
      expect(parentGrant).toBeTruthy();
      expect((await send(app, { method: 'GET', path: '/api/parent/dashboard', cookie: cookieValue(parentReady) })).statusCode).toBe(403);
      const parentCookie = cookieValue(parentReady);
      expect((await send(app, { method: 'GET', path: '/api/parent/dashboard', cookie: parentCookie, parentGrant })).statusCode).toBe(200);
      const exported = await send(app, { method: 'GET', path: '/api/parent/export', cookie: parentCookie, parentGrant });
      expect(exported.statusCode).toBe(200);
      const backup = String(exported.body.backup ?? '');
      expect(backup).toContain('hoc-vui-progress');
      const preview = await send(app, { method: 'POST', path: '/api/parent/import/preview', cookie: parentCookie, parentGrant, body: { backup } });
      expect(preview.statusCode).toBe(200);
      const previewData = preview.body.preview as { fingerprint: string; currentRevision: number };
      const imported = await send(app, { method: 'POST', path: '/api/parent/import', cookie: parentCookie, parentGrant, body: { backup, fingerprint: previewData.fingerprint, expectedRevision: previewData.currentRevision } });
      expect(imported.statusCode).toBe(200);
      expect(imported.body.duplicate).toBe(false);
      expect((imported.body.snapshot as { generation: number }).generation).toBe(1);
      const repeatedImport = await send(app, { method: 'POST', path: '/api/parent/import', cookie: parentCookie, parentGrant, body: { backup, fingerprint: previewData.fingerprint, expectedRevision: 0 } });
      expect(repeatedImport.statusCode).toBe(200);
      expect(repeatedImport.body.duplicate).toBe(true);
      const reset = await send(app, { method: 'POST', path: '/api/parent/reset', cookie: parentCookie, parentGrant, body: {} });
      expect(reset.statusCode).toBe(200);
      expect((reset.body.snapshot as { generation: number }).generation).toBe(2);
      const staleAfterReset = await send(app, { method: 'POST', path: '/api/me/events', cookie: parentCookie, body: { events: [{ ...start, eventId: randomUUID() }] } });
      expect(staleAfterReset.statusCode).toBe(409);

      const auditRows = await db<{ count: string }[]>`select count(*)::text as count from hoc_vui_private.admin_audits where subject_id = ${studentId}::uuid and action = 'student_created'`;
      expect(Number(auditRows[0]?.count)).toBeGreaterThanOrEqual(1);
    } finally {
      await db.end({ timeout: 5 });
    }
  });
});
