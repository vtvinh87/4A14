import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApp, type AppRequest, type AppResponse } from '../../server/app';
import { MemoryAuthRepository } from '../../server/auth/memoryRepository';
import { createAuthService } from '../../server/auth/service';
import { MemoryLearningRepository } from '../../server/learning/memoryRepository';
import { createLearningService } from '../../server/learning/service';
import type { LearningEventInput } from '../../shared/learning-contracts';

function cookieValue(response: AppResponse): string {
  return (response.headers['Set-Cookie'] ?? '').split(';', 1)[0] ?? '';
}

async function request(app: ReturnType<typeof createApp>, input: Omit<AppRequest, 'headers'> & { cookie?: string; parentGrant?: string; origin?: string }): Promise<AppResponse> {
  const headers: Record<string, string> = { host: 'localhost:8888' };
  if (input.cookie) headers.cookie = input.cookie;
  if (input.parentGrant) headers['x-parent-grant'] = input.parentGrant;
  if (input.origin) headers.origin = input.origin;
  return app.handle({ ...input, headers });
}

function startEvent(studentId: string, generation = 0): LearningEventInput {
  return { eventId: randomUUID(), runId: randomUUID(), sequence: 1, type: 'run_started', lessonId: 'lesson-01', lessonVersion: 1, deviceId: `device-${studentId.slice(0, 6)}`, generation };
}

describe('accounts and parent dashboard localhost E2E contract', () => {
  it('keeps A, B, Admin and parent/change-only boundaries intact through the API', async () => {
    const authRepository = new MemoryAuthRepository();
    const learningRepository = new MemoryLearningRepository();
    const app = createApp({ auth: createAuthService(authRepository), learning: createLearningService(learningRepository) });
    const suffix = Date.now().toString(36).slice(-7);

    const adminLogin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'Admin', password: '123456@' } });
    expect(adminLogin.statusCode).toBe(200);
    expect((adminLogin.body.session as { mode: string }).mode).toBe('full');
    expect(adminLogin.body.mustChange).toBeUndefined();
    expect(JSON.stringify(adminLogin.body)).not.toContain('123456@');
    const adminCookie = cookieValue(adminLogin);

    const createdA = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: `a${suffix}`, displayName: 'Bé A' } });
    const createdB = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: `b${suffix}`, displayName: 'Bé B' } });
    expect(createdA.statusCode).toBe(200);
    expect(createdB.statusCode).toBe(200);
    const studentA = String((createdA.body.account as { id: string }).id);
    const studentB = String((createdB.body.account as { id: string }).id);

    const firstLoginA = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: `A${suffix}`, pin: '123456' } });
    expect(firstLoginA.statusCode).toBe(200);
    expect(firstLoginA.body.mustChange).toBe(true);
    const firstCookieA = cookieValue(firstLoginA);
    expect((await request(app, { method: 'GET', path: '/api/me/progress', cookie: firstCookieA })).statusCode).toBe(403);
    expect((await request(app, { method: 'GET', path: '/api/admin/students', cookie: firstCookieA })).statusCode).toBe(403);
    expect((await request(app, { method: 'POST', path: '/api/admin/students', cookie: firstCookieA, origin: 'http://evil.example', body: { username: `x${suffix}`, displayName: 'Không được' } })).statusCode).toBe(403);

    const changedA = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: firstCookieA, body: { currentPin: '123456', newPin: '012345' } });
    expect(changedA.statusCode).toBe(200);
    const studentCookieA = cookieValue(changedA);
    const changedB = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: `b${suffix}`, pin: '123456' } })), body: { currentPin: '123456', newPin: '654321' } });
    expect(changedB.statusCode).toBe(200);
    const studentCookieB = cookieValue(changedB);

    const startA = startEvent(studentA);
    const synced = await request(app, { method: 'POST', path: '/api/me/events', cookie: studentCookieA, body: { events: [startA] } });
    expect(synced.statusCode).toBe(200);
    const duplicate = await request(app, { method: 'POST', path: '/api/me/events', cookie: studentCookieA, body: { events: [startA] } });
    expect(duplicate.statusCode).toBe(200);
    expect((duplicate.body.acknowledgements as Array<{ status: string }>)[0]?.status).toBe('duplicate');
    expect((await request(app, { method: 'GET', path: '/api/me/progress', cookie: studentCookieB })).body).toMatchObject({ ok: true, snapshot: { studentId: studentB } });
    expect(JSON.stringify((await request(app, { method: 'GET', path: '/api/me/progress', cookie: studentCookieB })).body)).not.toContain(startA.runId);

    const firstParent = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: studentCookieA, body: { pin: '123456' } });
    expect(firstParent.statusCode).toBe(200);
    expect(firstParent.body.mustChange).toBe(true);
    const firstParentCookie = cookieValue(firstParent);
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: firstParentCookie })).statusCode).toBe(403);
    const changedParent = await request(app, { method: 'POST', path: '/api/parent/change-pin', cookie: firstParentCookie, body: { currentPin: '123456', newPin: '864208' } });
    expect(changedParent.statusCode).toBe(200);
    const readyCookie = cookieValue(changedParent);
    const unlocked = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: readyCookie, body: { pin: '864208' } });
    expect(unlocked.statusCode).toBe(200);
    const parentCookie = cookieValue(unlocked);
    const grant = String(unlocked.body.parentGrantToken ?? '');
    expect(grant).toBeTruthy();
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: parentCookie })).statusCode).toBe(403);
    const dashboard = await request(app, { method: 'GET', path: '/api/parent/dashboard?range=all', cookie: parentCookie, parentGrant: grant });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.body).toMatchObject({ ok: true, studentId: studentA, dashboard: { studentId: studentA, ruleVersion: 'dashboard-rules-v1', metrics: { totalAttempts: 0 } } });
    expect(JSON.stringify(dashboard.body)).not.toContain('scrypt');
    expect((await request(app, { method: 'GET', path: `/api/parent/dashboard?studentId=${studentB}`, cookie: parentCookie, parentGrant: grant })).statusCode).toBe(403);

    const meOnReload = await request(app, { method: 'GET', path: '/api/auth/me', cookie: parentCookie });
    expect(meOnReload.statusCode).toBe(200);
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: parentCookie, parentGrant: grant })).statusCode).toBe(403);
    expect((await request(app, { method: 'POST', path: '/api/auth/logout', cookie: studentCookieB, body: {} })).statusCode).toBe(200);
    expect((await request(app, { method: 'GET', path: '/api/me/progress', cookie: studentCookieB })).statusCode).toBe(401);

    const freshUnlock = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: parentCookie, body: { pin: '864208' } });
    const freshCookie = cookieValue(freshUnlock);
    const freshGrant = String(freshUnlock.body.parentGrantToken ?? '');
    const reset = await request(app, { method: 'POST', path: '/api/parent/reset', cookie: freshCookie, parentGrant: freshGrant, body: {} });
    expect(reset.statusCode).toBe(200);
    expect((reset.body.snapshot as { generation: number }).generation).toBe(1);
    const stale = await request(app, { method: 'POST', path: '/api/me/events', cookie: freshCookie, body: { events: [{ ...startA, eventId: randomUUID() }] } });
    expect(stale.statusCode).toBe(409);
    await request(app, { method: 'POST', path: '/api/parent/lock', cookie: freshCookie, parentGrant: freshGrant, body: {} });
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: freshCookie, parentGrant: freshGrant })).statusCode).toBe(403);
  });

  it('handles thirty synthetic students concurrently without cross-owner events', async () => {
    const authRepository = new MemoryAuthRepository();
    const auth = createAuthService(authRepository);
    const admin = await auth.loginAdmin('admin', '123456@');
    if (!admin.ok) throw new Error('admin bootstrap failed');
    const suffix = Date.now().toString(36).slice(-7);
    const created = await Promise.all(Array.from({ length: 30 }, (_, index) => auth.createStudent(admin.token, `pilot${index}${suffix}`, `Pilot ${index + 1}`)));
    expect(created.every((result) => result.ok)).toBe(true);
    const accounts = created.flatMap((result) => result.ok ? [result.account] : []);
    expect(accounts).toHaveLength(30);

    const learningRepository = new MemoryLearningRepository();
    const learning = createLearningService(learningRepository);
    const startedAt = performance.now();
    const batches = await Promise.all(accounts.map((account, index) => learning.appendEvents(account.id, [{ eventId: randomUUID(), runId: randomUUID(), sequence: 1, type: 'run_started', lessonId: 'lesson-01', lessonVersion: 1, deviceId: `pilot-device-${index}`, generation: 0 }])));
    const elapsedMs = performance.now() - startedAt;
    expect(elapsedMs).toBeLessThan(3000);
    expect(batches.every((result) => result.ok)).toBe(true);
    const eventCounts = await Promise.all(accounts.map((account) => learning.listEvents(account.id)));
    expect(eventCounts.every((events) => events.length === 1)).toBe(true);
    expect(new Set(eventCounts.flat().map((event) => event.studentId)).size).toBe(30);
  });
});
