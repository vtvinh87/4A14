import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, type AppRequest, type AppResponse } from './app';
import { MemoryAuthRepository } from './auth/memoryRepository';
import { createAuthService } from './auth/service';
import { databaseUrlFromEnv } from './db/client';
import { MemoryLearningRepository } from './learning/memoryRepository';
import { createLearningService } from './learning/service';
import { MemoryClassroomRepository } from './classroom/memoryRepository';
import { createClassroomService, type ClassroomService } from './classroom/service';
import { VERIFIED_CHALLENGE_FACTS } from '../shared/challenge-source';
import { MemoryAuthoringRepository } from './challenge/memoryAuthoringRepository';
import { createChallengeAuthoringService } from './challenge/authoringService';
import { createChallengeReviewService } from './challenge/reviewService';
import { MemoryPlayRepository } from './challenge/memoryPlayRepository';
import { createChallengePlayService } from './challenge/playService';
import { createChallengeSocialService } from './challenge/socialService';
import { createChallengeWeeklyService } from './challenge/weeklyService';
import { createRequestTiming } from './performance/timing';

function cookieValue(response: AppResponse): string {
  const cookie = response.headers['Set-Cookie'] ?? '';
  return cookie.split(';', 1)[0] ?? '';
}

async function request(app: ReturnType<typeof createApp>, input: Omit<AppRequest, 'headers'> & { cookie?: string; parentGrant?: string; authorization?: string; origin?: string; host?: string }): Promise<AppResponse> {
  return app.handle({ ...input, headers: { host: input.host ?? 'localhost:8888', ...(input.cookie ? { cookie: input.cookie } : {}), ...(input.parentGrant ? { 'x-parent-grant': input.parentGrant } : {}), ...(input.authorization ? { authorization: input.authorization } : {}), ...(input.origin ? { origin: input.origin } : {}) } });
}

function expectPublicSession(response: AppResponse): void {
  const session = response.body.session as Record<string, unknown>;
  const account = session.account as Record<string, unknown>;
  expect(session).not.toHaveProperty('token');
  expect(session).not.toHaveProperty('tokenHash');
  expect(session).not.toHaveProperty('parentGrantHash');
  expect(account).not.toHaveProperty('studentCredential');
  expect(account).not.toHaveProperty('parentCredential');
  expect(account).not.toHaveProperty('adminCredential');
}

function expectNoAccessToken(response: AppResponse): void {
  expect(response.body).not.toHaveProperty('accessToken');
}

describe('same-origin account API', () => {
  it.each([true, false, 'true'])('roundtrips parent provisional remember intent with strict boolean validation (%s)', async (rememberDevice) => {
    const app = createApp({ auth: createAuthService(new MemoryAuthRepository(), () => new Date('2026-09-20T00:00:00Z')) });
    const admin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    await request(app, { method: 'POST', path: '/api/admin/students', cookie: cookieValue(admin), body: { username: 'parentremember', displayName: 'Parent' } });
    const initial = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'parentremember', pin: '123456', rememberDevice: true } });
    const full = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(initial), body: { currentPin: '123456', newPin: '246810', rememberDevice: true } });
    const provisional = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: cookieValue(full), body: { pin: '123456' } });
    expect(provisional.body.session).toMatchObject({ mode: 'change-only', expiresAt: '2026-09-27T00:00:00.000Z' });
    const changed = await request(app, { method: 'POST', path: '/api/parent/change-pin', cookie: cookieValue(provisional), body: { currentPin: '123456', newPin: '864208', rememberDevice } });
    expect(changed.statusCode).toBe(200);
    expect(changed.body.session).toMatchObject({ mode: 'full', expiresAt: rememberDevice === true ? '2026-10-20T00:00:00.000Z' : '2026-09-27T00:00:00.000Z' });
    expect(changed.body).not.toHaveProperty('parentGrantToken');
    expect(changed.body.session).not.toHaveProperty('parentGrantUntil');
    const dashboard = await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: cookieValue(changed) });
    expect(dashboard.statusCode).toBe(403);
    const me = await request(app, { method: 'GET', path: '/api/auth/me', cookie: cookieValue(changed) });
    expect(me.statusCode).toBe(200);
    expectPublicSession(me);
  });

  it('accepts only boolean rememberDevice and bounds the cookie by the server session', async () => {
    const app = createApp({ auth: createAuthService(new MemoryAuthRepository()) });
    const admin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@', rememberDevice: true } });
    expect(admin.headers['Set-Cookie']).toContain('Max-Age=28800');
    await request(app, { method: 'POST', path: '/api/admin/students', cookie: cookieValue(admin), body: { username: 'remember02', displayName: 'Remember' } });
    const provisional = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'remember02', pin: '123456', rememberDevice: true } });
    const full = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(provisional), body: { currentPin: '123456', newPin: '246810', rememberDevice: true } });
    expect(full.statusCode).toBe(200);
    expect(full.headers['Set-Cookie']).toContain('Max-Age=2592000');
    expectPublicSession(full);
    const legacy = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'remember02', pin: '246810', rememberDevice: 'true' } });
    const value = legacy.body.session as { createdAt: string; expiresAt: string };
    expect(Date.parse(value.expiresAt) - Date.parse(value.createdAt)).toBe(7 * 86400000);
  });

  it('emits request-local auth/data/total timing for protected roster reads and preserves no-store', async () => {
    const now = new Date('2026-09-19T08:00:00.000Z');
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository, () => now);
    const provisional = createApp({ auth });
    const admin = await request(provisional, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const created = await request(provisional, { method: 'POST', path: '/api/admin/students', cookie: cookieValue(admin), body: { username: 'timing01', displayName: 'Timing' } });
    const login = await request(provisional, { method: 'POST', path: '/api/auth/student/login', body: { username: 'timing01', pin: '123456' } });
    const changed = await request(provisional, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(login), body: { currentPin: '123456', newPin: '246810' } });
    const classroom: ClassroomService = {
      listFriends: vi.fn(async () => ({ friends: [], unreadCount: 0 })),
      heartbeat: vi.fn(),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
      markRead: vi.fn(),
      realtimeConfig: vi.fn(async () => null),
    };
    const app = createApp({ auth, classroom });
    let tick = 0;
    const timing = createRequestTiming(() => ++tick);
    const response = await request(app, { method: 'GET', path: '/api/me/friends', cookie: cookieValue(changed), timing });

    expect(response.statusCode).toBe(200);
    expect(response.headers['Cache-Control']).toBe('no-store');
    expect(response.headers['Server-Timing']).toMatch(/^auth;dur=\d+(?:\.\d+)?, data;dur=\d+(?:\.\d+)?, total;dur=\d+(?:\.\d+)?$/);
    expect(response.headers['Server-Timing']).not.toContain(String((created.body.account as { id: string }).id));
    expect(response.headers['Server-Timing']).not.toContain(String(changed.body.accessToken));
  });

  it('emits timing on protected auth failure without inventing data duration', async () => {
    const app = createApp({ auth: createAuthService(new MemoryAuthRepository()) });
    const timing = createRequestTiming(() => 1);
    const response = await request(app, { method: 'GET', path: '/api/me/progress-board', timing });
    expect(response.statusCode).toBe(401);
    expect(response.headers['Server-Timing']).toMatch(/^auth;dur=0(?:\.\d+)?, data;dur=0(?:\.\d+)?, total;dur=0(?:\.\d+)?$/);
    expect(response.headers['Server-Timing']).not.toContain('opaque-token');
  });

  it('returns controlled invalid failures for malformed message and read peer IDs before classroom operations', async () => {
    const authRepository = new MemoryAuthRepository();
    const auth = createAuthService(authRepository);
    const provisionalApp = createApp({ auth });
    const admin = await request(provisionalApp, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const created = await request(provisionalApp, { method: 'POST', path: '/api/admin/students', cookie: cookieValue(admin), body: { username: 'decode01', displayName: 'Decode' } });
    expect(created.statusCode).toBe(200);
    const changeOnly = await request(provisionalApp, { method: 'POST', path: '/api/auth/student/login', body: { username: 'decode01', pin: '123456' } });
    const changed = await request(provisionalApp, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(changeOnly), body: { currentPin: '123456', newPin: '246810' } });
    const studentCookie = cookieValue(changed);
    const classroom: ClassroomService = {
      listFriends: vi.fn(),
      heartbeat: vi.fn(),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
      markRead: vi.fn(),
      realtimeConfig: vi.fn(async () => null),
    };
    const app = createApp({ auth, classroom });

    const messageGet = await request(app, { method: 'GET', path: '/api/me/friends/%/messages', cookie: studentCookie });
    const messagePost = await request(app, { method: 'POST', path: '/api/me/friends/%/messages', cookie: studentCookie, body: { body: 'Không gửi' } });
    const read = await request(app, { method: 'POST', path: '/api/me/friends/%/read', cookie: studentCookie });

    expect(messageGet.statusCode).toBe(400);
    expect(messagePost.statusCode).toBe(400);
    expect(read.statusCode).toBe(400);
    expect(classroom.listMessages).not.toHaveBeenCalled();
    expect(classroom.sendMessage).not.toHaveBeenCalled();
    expect(classroom.markRead).not.toHaveBeenCalled();
  });

  it('scopes friends chat to a full student session and never trusts a client sender id', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const authRepository = new MemoryAuthRepository();
    const auth = createAuthService(authRepository, () => now);
    const provisionalApp = createApp({ auth });
    const admin = await request(provisionalApp, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const adminCookie = cookieValue(admin);
    const self = await request(provisionalApp, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'an01', displayName: 'An' } });
    const peer = await request(provisionalApp, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'binh02', displayName: 'Bình' } });
    const inactive = await request(provisionalApp, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'chi03', displayName: 'Chi' } });
    const selfId = String((self.body.account as { id: string }).id);
    const peerId = String((peer.body.account as { id: string }).id);
    const inactiveId = String((inactive.body.account as { id: string }).id);
    const classroomRepository = new MemoryClassroomRepository([
      { id: selfId, username: 'an01', displayName: 'An', avatarId: 'fox-scout', role: 'student', active: true },
      { id: peerId, username: 'binh02', displayName: 'Bình', avatarId: 'fox-leaf', role: 'student', active: true },
      { id: inactiveId, username: 'chi03', displayName: 'Chi', avatarId: 'fox-night', role: 'student', active: false },
      { id: 'admin', username: 'admin', displayName: 'Admin', avatarId: 'fox-scout', role: 'admin', active: true },
    ]);
    await classroomRepository.insertMessage({ senderId: peerId, recipientId: selfId, body: 'Chào An', createdAt: now.toISOString() });
    await classroomRepository.insertMessage({ senderId: selfId, recipientId: peerId, body: 'Chào Bình', createdAt: now.toISOString() });
    const app = createApp({
      auth,
      classroom: createClassroomService(classroomRepository, () => now, {
        configForStudent: async () => ({ supabaseUrl: 'https://example.supabase.co', publishableKey: 'publishable-key', topic: 'classroom:student:opaque' }),
        notifyMessage: async () => {},
      }),
    });

    const changeOnly = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'an01', pin: '123456' } });
    expect((await request(app, { method: 'GET', path: '/api/me/friends', cookie: cookieValue(changeOnly) })).statusCode).toBe(403);
    expect((await request(app, { method: 'GET', path: '/api/me/friends', cookie: adminCookie })).statusCode).toBe(403);
    const changed = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(changeOnly), body: { currentPin: '123456', newPin: '246810' } });
    const studentCookie = cookieValue(changed);

    const roster = await request(app, { method: 'GET', path: '/api/me/friends', cookie: studentCookie });
    expect(roster.statusCode).toBe(200);
    expect(roster.body.friends).toEqual([expect.objectContaining({ id: peerId, unreadCount: 1 })]);
    expect(JSON.stringify(roster.body)).not.toMatch(/admin|active|birthDate|token|credential|lastSeen/i);

    const realtime = await request(app, { method: 'GET', path: '/api/me/realtime', cookie: studentCookie });
    expect(realtime.statusCode).toBe(200);
    expect(realtime.body).toEqual({ ok: true, supabaseUrl: 'https://example.supabase.co', publishableKey: 'publishable-key', topic: 'classroom:student:opaque' });

    const rejectedSender = await request(app, { method: 'POST', path: `/api/me/friends/${encodeURIComponent(peerId)}/messages`, cookie: studentCookie, body: { senderId: inactiveId, body: 'Tin không hợp lệ' } });
    expect(rejectedSender.statusCode).toBe(400);
    const sent = await request(app, { method: 'POST', path: `/api/me/friends/${encodeURIComponent(peerId)}/messages`, cookie: studentCookie, body: { body: '  Tin của An  ' } });
    expect(sent.statusCode).toBe(200);
    expect(sent.body.message).toMatchObject({ senderId: selfId, recipientId: peerId, body: 'Tin của An' });
    expect(JSON.stringify(sent.body)).not.toMatch(/role|active|birthDate|token|credential/i);
    expect((await request(app, { method: 'POST', path: `/api/me/friends/${encodeURIComponent(inactiveId)}/messages`, cookie: studentCookie, body: { body: 'Không gửi' } })).statusCode).toBe(404);

    const read = await request(app, { method: 'POST', path: `/api/me/friends/${encodeURIComponent(peerId)}/read`, cookie: studentCookie, body: { senderId: inactiveId } });
    expect(read.body).toMatchObject({ ok: true, marked: 1 });
    const messages = await request(app, { method: 'GET', path: `/api/me/friends/${encodeURIComponent(peerId)}/messages?limit=999`, cookie: studentCookie });
    expect(messages.statusCode).toBe(200);
    expect(messages.body.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ senderId: peerId, recipientId: selfId, readAt: now.toISOString() }),
      expect.objectContaining({ senderId: selfId, recipientId: peerId, readAt: null }),
    ]));
  });

  it('keeps credentials out of responses and enforces student/admin boundaries', async () => {
    const repository = new MemoryAuthRepository();
    const app = createApp({ auth: createAuthService(repository) });

    const adminLogin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'Admin', password: '123456@' } });
    expect(adminLogin.statusCode).toBe(200);
    expect(adminLogin.body.accessToken).toEqual(expect.any(String));
    expectPublicSession(adminLogin);
    expect(JSON.stringify(adminLogin.body)).not.toContain('scrypt');
    expect(JSON.stringify(adminLogin.body)).not.toContain('123456@');
    const changedAdminPassword = await request(app, { method: 'POST', path: '/api/auth/admin/change-password', cookie: cookieValue(adminLogin), body: { currentPassword: '123456@', newPassword: '654321@' } });
    expect(changedAdminPassword.statusCode).toBe(200);
    expect(changedAdminPassword.body.accessToken).toEqual(expect.any(String));
    expectPublicSession(changedAdminPassword);
    const adminCookie = cookieValue(changedAdminPassword);

    const created = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'Bao04', displayName: 'Bé Bảo' } });
    expect(created.statusCode).toBe(200);
    const studentId = String((created.body.account as { id: string }).id);
    expect(repository.audits.some((audit) => audit.action === 'student_created' && audit.subjectId === studentId)).toBe(true);

    const duplicate = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'bao04', displayName: 'Bé Bảo lần hai' } });
    expect(duplicate.statusCode).toBe(409);

    const studentLogin = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'BAO04', pin: '123456' } });
    expect(studentLogin.statusCode).toBe(200);
    expect(studentLogin.body.accessToken).toEqual(expect.any(String));
    expectPublicSession(studentLogin);
    expect(studentLogin.body.mustChange).toBe(true);
    const studentCookie = cookieValue(studentLogin);
    const blockedAdminCall = await request(app, { method: 'GET', path: '/api/admin/students', cookie: studentCookie });
    expect(blockedAdminCall.statusCode).toBe(403);

    const bypass = await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: studentCookie });
    expect(bypass.statusCode).toBe(403);
    expect(bypass.body).toMatchObject({ ok: false, code: 'forbidden', message: 'Cần nhập lại PIN phụ huynh để mở Dashboard.' });
    const changed = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: studentCookie, body: { currentPin: '123456', newPin: '012345' } });
    expect(changed.statusCode).toBe(200);
    expect(changed.body.accessToken).toEqual(expect.any(String));
    expectPublicSession(changed);
  });

  it('requires an independent parent PIN and revokes the grant on lock', async () => {
    const repository = new MemoryAuthRepository();
    const app = createApp({ auth: createAuthService(repository) });
    const admin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const adminCookie = cookieValue(admin);
    const created = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'minh01', displayName: 'Minh' } });
    const studentLogin = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'minh01', pin: '123456' } });
    const studentCookie = cookieValue(studentLogin);
    const studentChanged = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: studentCookie, body: { currentPin: '123456', newPin: '246810' } });
    const changedCookie = cookieValue(studentChanged);

    const firstParent = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: changedCookie, body: { pin: '123456' } });
    expect(firstParent.statusCode).toBe(200);
    expect(firstParent.body.accessToken).toEqual(expect.any(String));
    expectPublicSession(firstParent);
    expect(firstParent.body.mustChange).toBe(true);
    const firstParentCookie = cookieValue(firstParent);
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: firstParentCookie })).statusCode).toBe(403);

    const parentChanged = await request(app, { method: 'POST', path: '/api/parent/change-pin', cookie: firstParentCookie, body: { currentPin: '123456', newPin: '864208' } });
    expect(parentChanged.body.accessToken).toEqual(expect.any(String));
    expectPublicSession(parentChanged);
    const parentChangedCookie = cookieValue(parentChanged);
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: parentChangedCookie })).statusCode).toBe(403);
    const unlocked = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: parentChangedCookie, body: { pin: '864208' } });
    expect(unlocked.body.accessToken).toEqual(expect.any(String));
    expectPublicSession(unlocked);
    const unlockedCookie = cookieValue(unlocked);
    const grant = String(unlocked.body.parentGrantToken ?? '');
    expect(grant).toBeTruthy();
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: unlockedCookie })).statusCode).toBe(403);
    expect((await request(app, { method: 'GET', path: `/api/parent/dashboard?studentId=${String((created.body.account as { id: string }).id)}`, cookie: unlockedCookie, parentGrant: grant })).statusCode).toBe(200);
    await request(app, { method: 'POST', path: '/api/parent/lock', cookie: unlockedCookie });
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: unlockedCookie, parentGrant: grant })).statusCode).toBe(403);
  });

  it('accepts bearer sessions and allows cross-origin writes only from the configured origin', async () => {
    const previousAllowlist = process.env.HOC_VUI_ALLOWED_ORIGINS;
    process.env.HOC_VUI_ALLOWED_ORIGINS = 'https://hoc-vui.example';
    try {
      const repository = new MemoryAuthRepository();
      const app = createApp({ auth: createAuthService(repository) });
      const adminLogin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
      const accessToken = String(adminLogin.body.accessToken);
      const bearerRead = await request(app, { method: 'GET', path: '/api/admin/students', authorization: `Bearer ${accessToken}` });
      expect(bearerRead.statusCode).toBe(200);

      const rejectedWrite = await request(app, { method: 'POST', path: '/api/admin/students', origin: 'https://evil.example', authorization: `Bearer ${accessToken}`, body: { username: 'evil01', displayName: 'Không được tạo' } });
      expect(rejectedWrite.statusCode).toBe(403);
      const allowedWrite = await request(app, { method: 'POST', path: '/api/admin/students', origin: 'https://hoc-vui.example', authorization: `Bearer ${accessToken}`, body: { username: 'allow01', displayName: 'Được tạo' } });
      expect(allowedWrite.statusCode).toBe(200);

      const malformedOrigin = await request(app, { method: 'POST', path: '/api/admin/students', origin: 'not a valid origin', authorization: `Bearer ${accessToken}`, body: { username: 'bad01', displayName: 'Không được tạo' } });
      expect(malformedOrigin.statusCode).toBe(403);

      const me = await request(app, { method: 'GET', path: '/api/auth/me', authorization: `Bearer ${accessToken}` });
      expect(me.statusCode).toBe(200);
      expectNoAccessToken(me);
      expectPublicSession(me);
    } finally {
      if (previousAllowlist === undefined) delete process.env.HOC_VUI_ALLOWED_ORIGINS;
      else process.env.HOC_VUI_ALLOWED_ORIGINS = previousAllowlist;
    }
  });

  it('resolves the least-specific database environment fallback without exposing it to callers', () => {
    const previous = {
      primary: process.env.HOC_VUI_DATABASE_URL,
      database: process.env.DATABASE_URL,
      legacy: process.env.DB_URL,
      supabase: process.env.SUPABASE_DB_URL,
    };
    try {
      process.env.HOC_VUI_DATABASE_URL = '';
      process.env.DATABASE_URL = '';
      process.env.DB_URL = '';
      process.env.SUPABASE_DB_URL = 'postgresql://supabase-runtime.example/postgres';
      expect(databaseUrlFromEnv()).toBe('postgresql://supabase-runtime.example/postgres');
    } finally {
      if (previous.primary === undefined) delete process.env.HOC_VUI_DATABASE_URL; else process.env.HOC_VUI_DATABASE_URL = previous.primary;
      if (previous.database === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous.database;
      if (previous.legacy === undefined) delete process.env.DB_URL; else process.env.DB_URL = previous.legacy;
      if (previous.supabase === undefined) delete process.env.SUPABASE_DB_URL; else process.env.SUPABASE_DB_URL = previous.supabase;
    }
  });

  it('exposes only scoped profile routes and never trusts a client student id', async () => {
    const repository = new MemoryAuthRepository();
    let now = new Date('2026-09-14T05:00:00.000Z');
    const app = createApp({ auth: createAuthService(repository, () => now), learning: createLearningService(new MemoryLearningRepository(), () => now) });
    const admin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const adminCookie = cookieValue(admin);
    const first = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'profile01', displayName: 'Hồ Sơ A' } });
    const second = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'profile02', displayName: 'Hồ Sơ B' } });
    const firstLogin = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'profile01', pin: '123456' } });
    const changeOnlyCookie = cookieValue(firstLogin);
    expect((await request(app, { method: 'GET', path: '/api/me/profile', cookie: changeOnlyCookie })).statusCode).toBe(403);
    const firstChanged = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: changeOnlyCookie, body: { currentPin: '123456', newPin: '246810' } });
    const firstCookie = cookieValue(firstChanged);
    const self = await request(app, { method: 'PATCH', path: '/api/me/profile', cookie: firstCookie, body: { displayName: 'Hồ Sơ A mới', avatarId: 'fox-sunny', birthDate: '2000-02-29' } });
    expect(self.statusCode).toBe(200);
    expect(self.body.profile).toEqual(expect.objectContaining({ displayName: 'Hồ Sơ A mới', avatarId: 'fox-sunny', birthDate: '2000-02-29' }));
    expectNoAccessToken(self);
    expect(JSON.stringify(self.body)).not.toContain('scrypt');
    expect(JSON.stringify(self.body)).not.toContain('salt');
    expect(JSON.stringify(self.body)).not.toContain('token');

    const progress = await request(app, { method: 'GET', path: '/api/me/progress', cookie: firstCookie });
    expect(progress.statusCode).toBe(200);
    expectNoAccessToken(progress);

    const studentSessionParentProfile = await request(app, { method: 'GET', path: '/api/parent/profile', cookie: firstCookie });
    expect(studentSessionParentProfile.statusCode).toBe(403);
    const unknownSelfPatch = await request(app, { method: 'PATCH', path: '/api/me/profile', cookie: firstCookie, body: { credentialVersion: 999 } });
    expect(unknownSelfPatch.statusCode).toBe(400);
    expect(unknownSelfPatch.body).toMatchObject({ ok: false, code: 'invalid' });

    const parentFirst = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: firstCookie, body: { pin: '123456' } });
    const parentChangeOnlyCookie = cookieValue(parentFirst);
    const parentChanged = await request(app, { method: 'POST', path: '/api/parent/change-pin', cookie: parentChangeOnlyCookie, body: { currentPin: '123456', newPin: '864208' } });
    const parentReady = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: cookieValue(parentChanged), body: { pin: '864208' } });
    const parentCookie = cookieValue(parentReady);
    const grant = String(parentReady.body.parentGrantToken ?? '');
    const blockedParentProfile = await request(app, { method: 'GET', path: '/api/parent/profile', cookie: parentCookie });
    expect(blockedParentProfile.statusCode).toBe(403);
    expect(blockedParentProfile.body).toMatchObject({ ok: false, code: 'forbidden', message: 'Cần nhập lại PIN phụ huynh để mở hồ sơ.' });
    const wrongGrantProfile = await request(app, { method: 'GET', path: '/api/parent/profile', cookie: parentCookie, parentGrant: 'wrong-grant' });
    expect(wrongGrantProfile.statusCode).toBe(403);
    const parentProfile = await request(app, { method: 'GET', path: '/api/parent/profile', cookie: parentCookie, parentGrant: grant });
    expect(parentProfile.statusCode).toBe(200);
    expectNoAccessToken(parentProfile);
    expect(JSON.stringify(parentProfile.body)).not.toContain('hash');
    expect(JSON.stringify(parentProfile.body)).not.toContain('salt');
    expect(JSON.stringify(parentProfile.body)).not.toContain('token');
    const dashboard = await request(app, { method: 'GET', path: '/api/parent/dashboard?range=all', cookie: parentCookie, parentGrant: grant });
    expect(dashboard.statusCode).toBe(200);
    expectNoAccessToken(dashboard);
    expectPublicSession(dashboard);
    const exported = await request(app, { method: 'GET', path: '/api/parent/export', cookie: parentCookie, parentGrant: grant });
    expect(exported.statusCode).toBe(200);
    expectNoAccessToken(exported);
    const reset = await request(app, { method: 'POST', path: '/api/parent/reset', cookie: parentCookie, parentGrant: grant, body: {} });
    expect(reset.statusCode).toBe(200);
    expectNoAccessToken(reset);
    const firstId = String((first.body.account as { id: string }).id);
    const secondId = String((second.body.account as { id: string }).id);
    const preference = await request(app, { method: 'PATCH', path: '/api/parent/profile-preferences', cookie: parentCookie, parentGrant: grant, body: { birthdayWishesEnabled: true } });
    expect(preference.statusCode).toBe(200);
    expect((preference.body.profile as { accountId: string }).accountId).toBe(firstId);
    expect((repository.accounts.get(firstId) as { birthdayWishesEnabled: boolean }).birthdayWishesEnabled).toBe(true);
    expect((repository.accounts.get(secondId) as { birthdayWishesEnabled: boolean }).birthdayWishesEnabled).toBe(false);

    now = new Date(now.getTime() + 15 * 60 * 1000 + 1);
    const expiredDashboard = await request(app, { method: 'GET', path: '/api/parent/dashboard?range=30d', cookie: parentCookie, parentGrant: grant });
    expect(expiredDashboard.statusCode).toBe(403);
    const expiredProfile = await request(app, { method: 'GET', path: '/api/parent/profile', cookie: parentCookie, parentGrant: grant });
    expect(expiredProfile.statusCode).toBe(403);
    const expiredPreference = await request(app, { method: 'PATCH', path: '/api/parent/profile-preferences', cookie: parentCookie, parentGrant: grant, body: { birthdayWishesEnabled: false } });
    expect(expiredPreference.statusCode).toBe(403);
  });
});

describe('student challenge authoring API', () => {
  beforeEach(() => vi.stubEnv('HOC_VUI_CHALLENGE_MODE', 'pilot'));
  afterEach(() => vi.unstubAllEnvs());

  async function readyStudent() {
    const now = new Date('2026-09-17T08:00:00.000Z');
    const authRepository = new MemoryAuthRepository();
    const auth = createAuthService(authRepository, () => now);
    const setup = createApp({ auth });
    const admin = await request(setup, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const created = await request(setup, { method: 'POST', path: '/api/admin/students', cookie: cookieValue(admin), body: { username: 'challenge01', displayName: 'Challenge Student' } });
    const login = await request(setup, { method: 'POST', path: '/api/auth/student/login', body: { username: 'challenge01', pin: '123456' } });
    const changed = await request(setup, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(login), body: { currentPin: '123456', newPin: '246810' } });
    const repository = new MemoryAuthoringRepository({ now: () => now });
    const challengeAuthoring = createChallengeAuthoringService({
      repository,
      sourceCatalog: VERIFIED_CHALLENGE_FACTS,
      activeStudentDisplayNames: async () => ['Challenge Student'],
      clock: () => now,
      idFactory: () => 'challenge-question-1',
    });
    return { now, authRepository, auth, adminCookie: cookieValue(admin), studentCookie: cookieValue(changed), studentId: String((created.body.account as { id: string }).id), repository, challengeAuthoring };
  }

  const validBody = {
    sourceFactId: 'map',
    prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
    correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
    distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
  };

  it('requires a full student session, ignores no forged actor field, and returns only that student mine data', async () => {
    const ready = await readyStudent();
    const app = createApp({ auth: ready.auth, challengeAuthoring: ready.challengeAuthoring });
    const forged = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: ready.studentCookie, body: { ...validBody, authorId: 'other-student', correctOptionId: 'wrong-1' } });
    expect(forged.statusCode).toBe(400);
    expect(ready.repository.questions).toHaveLength(0);

    const created = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: ready.studentCookie, body: validBody });
    expect(created.statusCode).toBe(200);
    expect(created.body.question).toEqual(expect.objectContaining({ authorId: ready.studentId, status: 'pending_parent_review', sourceFactId: 'map' }));
    expect(JSON.stringify(created.body)).not.toContain('other-student');

    const list = await request(app, { method: 'GET', path: '/api/me/challenge/questions/mine', cookie: ready.studentCookie });
    expect(list.statusCode).toBe(200);
    expect(list.body.questions).toEqual([expect.objectContaining({ id: created.body.question && (created.body.question as { id: string }).id, authorId: ready.studentId })]);
    expect(JSON.stringify(list.body)).not.toContain('studentCredential');
    expect((await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: ready.adminCookie, body: validBody })).statusCode).toBe(403);
    await request(app, { method: 'POST', path: '/api/admin/students', cookie: ready.adminCookie, body: { username: 'challenge02', displayName: 'Challenge Student Two' } });
    const changeOnly = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'challenge02', pin: '123456' } });
    expect((await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: cookieValue(changeOnly), body: validBody })).statusCode).toBe(403);
    expect((await request(app, { method: 'GET', path: '/api/me/challenge/questions/mine' })).statusCode).toBe(401);
  });

  it('supports a requested revision and reports quota and unavailable dependency failures', async () => {
    const ready = await readyStudent();
    const app = createApp({ auth: ready.auth, challengeAuthoring: ready.challengeAuthoring });
    const created = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: ready.studentCookie, body: validBody });
    const questionId = String((created.body.question as { id: string }).id);
    const record = await ready.repository.findForAuthor(ready.studentId, questionId);
    if (!record) throw new Error('expected question fixture');
    await ready.repository.reviewQuestion(ready.studentId, questionId, record.revision, { decision: 'request_revision', reason: 'Con hãy viết rõ hơn nhé.' });

    const revised = await request(app, { method: 'PATCH', path: `/api/me/challenge/questions/${questionId}`, cookie: ready.studentCookie, body: {
      revision: 1,
      sourceFactId: 'festival',
      prompt: 'Theo sách, ngày Giỗ Tổ Hùng Vương diễn ra vào ngày nào?',
      correctAnswer: 'Mồng 10 tháng Ba âm lịch hằng năm.',
      distractors: ['Mồng một tháng Giêng.', 'Ngày Quốc khánh.', 'Ngày cuối năm.'],
      explanation: 'Theo sách, Giỗ Tổ Hùng Vương diễn ra vào mồng 10 tháng Ba âm lịch hằng năm.',
    } });
    expect(revised.statusCode).toBe(200);
    expect(revised.body.question).toEqual(expect.objectContaining({ revision: 2, status: 'pending_parent_review', sourceFactId: 'festival' }));

    const stale = await request(app, { method: 'PATCH', path: `/api/me/challenge/questions/${questionId}`, cookie: ready.studentCookie, body: { ...validBody, revision: 1 } });
    expect(stale.statusCode).toBe(409);
    expect(stale.body).toMatchObject({ ok: false, code: 'conflict', reason: 'revision_conflict' });

    const unavailable = createApp({ auth: ready.auth });
    expect((await request(unavailable, { method: 'GET', path: '/api/me/challenge/questions/mine', cookie: ready.studentCookie })).statusCode).toBe(503);
  });
});

describe('parent challenge review API', () => {
  beforeEach(() => vi.stubEnv('HOC_VUI_CHALLENGE_MODE', 'pilot'));
  afterEach(() => vi.unstubAllEnvs());

  it('keeps review scope behind the page grant, approves the child question, and pauses creation through settings', async () => {
    const validBody = {
      sourceFactId: 'map',
      prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
      correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
      distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
      explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    };
    const now = new Date('2026-09-17T08:00:00.000Z');
    const authRepository = new MemoryAuthRepository();
    const auth = createAuthService(authRepository, () => now);
    const setup = createApp({ auth });
    const admin = await request(setup, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const adminCookie = cookieValue(admin);
    const createdStudent = await request(setup, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'review01', displayName: 'Bạn Review' } });
    const studentId = String((createdStudent.body.account as { id: string }).id);
    const studentLogin = await request(setup, { method: 'POST', path: '/api/auth/student/login', body: { username: 'review01', pin: '123456' } });
    const changed = await request(setup, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(studentLogin), body: { currentPin: '123456', newPin: '246810' } });
    const studentCookie = cookieValue(changed);
    const repository = new MemoryAuthoringRepository({ now: () => now });
    const challengeAuthoring = createChallengeAuthoringService({
      repository,
      sourceCatalog: VERIFIED_CHALLENGE_FACTS,
      activeStudentDisplayNames: async () => ['Bạn Review'],
      clock: () => now,
      idFactory: () => 'review-question-1',
    });
    const challengeReview = createChallengeReviewService({ repository, clock: () => now });
    const app = createApp({ auth, challengeAuthoring, challengeReview });
    const created = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: studentCookie, body: validBody });
    const questionId = String((created.body.question as { id: string }).id);

    expect((await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: studentCookie })).statusCode).toBe(403);
    const firstUnlock = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: studentCookie, body: { pin: '123456' } });
    const parentChanged = await request(app, { method: 'POST', path: '/api/parent/change-pin', cookie: cookieValue(firstUnlock), body: { currentPin: '123456', newPin: '864208' } });
    const unlocked = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: cookieValue(parentChanged), body: { pin: '864208' } });
    const parentCookie = cookieValue(unlocked);
    const grant = String(unlocked.body.parentGrantToken ?? '');
    const pending = await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: parentCookie, parentGrant: grant });
    expect(pending.statusCode).toBe(200);
    expect(pending.body.questions).toEqual([expect.objectContaining({ id: questionId, authorId: studentId, status: 'pending_parent_review' })]);
    expect(JSON.stringify(pending.body)).not.toContain('parentGrantToken');

    const approved = await request(app, { method: 'POST', path: `/api/parent/challenge/questions/${questionId}/review`, cookie: parentCookie, parentGrant: grant, body: { revision: 1, decision: 'approve', studentId: 'other-student' } });
    expect(approved.statusCode).toBe(200);
    expect(approved.body.question).toEqual(expect.objectContaining({ id: questionId, status: 'approved' }));
    expect((await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: parentCookie, parentGrant: grant })).body.questions).toEqual([]);

    const initialSettings = await request(app, { method: 'GET', path: '/api/parent/challenge/settings', cookie: parentCookie, parentGrant: grant });
    expect(initialSettings.statusCode).toBe(200);
    expect(initialSettings.body.settings).toEqual(expect.objectContaining({ studentId, canCreate: true, canParticipate: true }));

    const settings = await request(app, { method: 'PATCH', path: '/api/parent/challenge/settings', cookie: parentCookie, parentGrant: grant, body: { canCreate: false, canParticipate: true, studentId: 'other-student' } });
    expect(settings.statusCode).toBe(200);
    expect(settings.body.settings).toEqual(expect.objectContaining({ studentId, canCreate: false, canParticipate: true }));
    const studentAfterParentChange = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'review01', pin: '246810' } });
    const paused = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: cookieValue(studentAfterParentChange), body: validBody });
    expect(paused.statusCode).toBe(403);

    expect((await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: parentCookie, parentGrant: 'wrong-grant' })).statusCode).toBe(403);
    expect((await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: adminCookie, parentGrant: grant })).statusCode).toBe(403);
    expect((await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending' })).statusCode).toBe(401);
  });
});

describe('daily challenge play API', () => {
  beforeEach(() => vi.stubEnv('HOC_VUI_CHALLENGE_MODE', 'pilot'));
  afterEach(() => vi.unstubAllEnvs());

  const validBody = {
    sourceFactId: 'map',
    prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
    correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
    distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
  };

  async function readyDaily() {
    const now = new Date('2026-09-17T08:00:00.000Z');
    const authRepository = new MemoryAuthRepository();
    const auth = createAuthService(authRepository, () => now);
    const setup = createApp({ auth });
    const admin = await request(setup, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    const adminCookie = cookieValue(admin);
    const author = await request(setup, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'daily01', displayName: 'Bạn Tạo Câu' } });
    const player = await request(setup, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'daily02', displayName: 'Bạn Trả Lời' } });
    const authorId = String((author.body.account as { id: string }).id);
    const playerId = String((player.body.account as { id: string }).id);
    const playerLogin = await request(setup, { method: 'POST', path: '/api/auth/student/login', body: { username: 'daily02', pin: '123456' } });
    const playerChanged = await request(setup, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(playerLogin), body: { currentPin: '123456', newPin: '246810' } });
    const authoringRepository = new MemoryAuthoringRepository({ now: () => now });
    const challengeAuthoring = createChallengeAuthoringService({
      repository: authoringRepository,
      sourceCatalog: VERIFIED_CHALLENGE_FACTS,
      activeStudentDisplayNames: async () => ['Bạn Tạo Câu', 'Bạn Trả Lời'],
      clock: () => now,
      idFactory: () => 'daily-question-1',
    });
    const created = await challengeAuthoring.createQuestion(authorId, { ...validBody, distractors: [...validBody.distractors] as [string, string, string] });
    if (!created.ok) throw new Error('fixture question create failed');
    const approved = await authoringRepository.reviewQuestion(authorId, created.id, created.revision, { decision: 'approve' });
    if (typeof approved === 'string' || !approved) throw new Error('fixture question approval failed');
    let nextId = 0;
    const playRepository = new MemoryPlayRepository({ now: () => now, idFactory: () => `daily-item-${++nextId}` });
    const challengePlay = createChallengePlayService({ authoring: authoringRepository, play: playRepository, clock: () => now, activeStudentCount: async () => 2, idFactory: () => `daily-generated-${++nextId}` });
    const challengeSocial = createChallengeSocialService({ authoring: authoringRepository, play: playRepository, clock: () => now });
    const challengeWeekly = createChallengeWeeklyService({ authoring: authoringRepository, play: playRepository, now: () => now, activeStudentIds: async () => [authorId, playerId] });
    const app = createApp({ auth, challengeAuthoring, challengePlay, challengeSocial, challengeWeekly });
    return { app, auth, adminCookie, studentCookie: cookieValue(playerChanged), parentGrant: 'parent-grant-should-not-be-used', playerId, playRepository, challengeAuthoring, challengePlay, challengeSocial, challengeWeekly };
  }

  it('returns a private-answer-safe today round and accepts idempotent server-checked attempts', async () => {
    const ready = await readyDaily();
    const today = await request(ready.app, { method: 'GET', path: '/api/me/challenge/today', cookie: ready.studentCookie });
    expect(today.statusCode).toBe(200);
    expect(today.body.questions).toHaveLength(1);
    expect(JSON.stringify(today.body)).not.toContain('correctOptionId');
    expect(JSON.stringify(today.body)).not.toContain('explanation');
    expect(JSON.stringify(today.body)).not.toContain('sourceText');
    const itemId = String((today.body.questions as Array<{ roundItemId: string }>)[0].roundItemId);
    const weekly = await request(ready.app, { method: 'GET', path: '/api/me/challenge/week', cookie: ready.studentCookie });
    expect(weekly.statusCode).toBe(200);
    expect(weekly.body.days).toHaveLength(7);
    expect(JSON.stringify(weekly.body)).not.toMatch(/leaderboard|rank|scoreByStudent|fastest/i);

    const attempt = await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/attempt`, cookie: ready.studentCookie, body: { selectedOptionId: 'correct', idempotencyKey: 'api-attempt-1', correct: false, contribution: 99, studentId: 'other-student' } });
    expect(attempt.statusCode).toBe(200);
    expect(attempt.body).toMatchObject({ ok: true, correct: true, classContributionAdded: true, duplicate: false });
    const retry = await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/attempt`, cookie: ready.studentCookie, body: { selectedOptionId: 'correct', idempotencyKey: 'api-attempt-1' } });
    expect(retry.statusCode).toBe(200);
    expect(retry.body).toMatchObject({ ok: true, correct: true, duplicate: true, classContributionAdded: false });
    expect((await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/attempt`, cookie: ready.studentCookie, body: { selectedOptionId: 'not-an-option', idempotencyKey: 'api-attempt-2' } })).statusCode).toBe(400);
  });

  it('rejects anonymous/admin/parent-grant contexts and reports an unavailable play dependency', async () => {
    const ready = await readyDaily();
    expect((await request(ready.app, { method: 'GET', path: '/api/me/challenge/today' })).statusCode).toBe(401);
    expect((await request(ready.app, { method: 'GET', path: '/api/me/challenge/today', cookie: ready.adminCookie })).statusCode).toBe(403);
    expect((await request(ready.app, { method: 'GET', path: '/api/me/challenge/today', cookie: ready.studentCookie, parentGrant: ready.parentGrant })).statusCode).toBe(403);
    expect((await request(ready.app, { method: 'GET', path: '/api/me/challenge/week', cookie: ready.adminCookie })).statusCode).toBe(403);
    const unavailable = createApp({ auth: ready.auth });
    expect((await request(unavailable, { method: 'GET', path: '/api/me/challenge/today', cookie: ready.studentCookie })).statusCode).toBe(503);
    expect((await request(unavailable, { method: 'GET', path: '/api/me/challenge/week', cookie: ready.studentCookie })).statusCode).toBe(503);
  });

  it('accepts positive reactions and private reports, then keeps moderation routes admin-only', async () => {
    const ready = await readyDaily();
    const today = await request(ready.app, { method: 'GET', path: '/api/me/challenge/today', cookie: ready.studentCookie });
    const itemId = String((today.body.questions as Array<{ roundItemId: string }>)[0].roundItemId);

    const reaction = await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/reactions`, cookie: ready.studentCookie, body: { reactionType: 'learned', idempotencyKey: 'api-reaction-1' } });
    expect(reaction.statusCode).toBe(200);
    expect(reaction.body).toMatchObject({ ok: true, roundItemId: itemId, reactionType: 'learned' });
    const reactionRetry = await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/reactions`, cookie: ready.studentCookie, body: { reactionType: 'learned', idempotencyKey: 'api-reaction-1' } });
    expect(reactionRetry.body).toEqual(reaction.body);
    expect((await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/reactions`, cookie: ready.studentCookie, body: { reactionType: 'downvote', idempotencyKey: 'api-reaction-2' } })).statusCode).toBe(400);

    const report = await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/report`, cookie: ready.studentCookie, body: { reason: 'unclear', details: '<b>Chưa rõ</b>', idempotencyKey: 'api-report-1' } });
    expect(report.statusCode).toBe(200);
    expect(report.body).toMatchObject({ ok: true, roundItemId: itemId, status: 'open' });
    expect(JSON.stringify(report.body)).not.toMatch(/reporter|details|admin|token/i);
    expect((await request(ready.app, { method: 'POST', path: `/api/me/challenge/items/${itemId}/report`, cookie: ready.studentCookie, body: { reason: 'inappropriate', idempotencyKey: 'api-report-2' } })).statusCode).toBe(409);

    const reportId = String((report.body as { id: string }).id);
    expect((await request(ready.app, { method: 'POST', path: `/api/admin/challenge/reports/${reportId}/resolve`, cookie: ready.studentCookie, body: { decision: 'dismissed', reason: 'Đã kiểm tra.' } })).statusCode).toBe(403);
    const dismissed = await request(ready.app, { method: 'POST', path: `/api/admin/challenge/reports/${reportId}/resolve`, cookie: ready.adminCookie, body: { decision: 'dismissed', reason: 'Đã kiểm tra.' } });
    expect(dismissed.statusCode).toBe(200);
    expect((await request(ready.app, { method: 'POST', path: `/api/admin/challenge/reports/${reportId}/resolve`, cookie: ready.adminCookie, body: { decision: 'voided', reason: 'Không thể đổi quyết định.' } })).statusCode).toBe(409);
    expect((await request(ready.app, { method: 'POST', path: `/api/admin/challenge/questions/${String((today.body.questions as Array<{ id: string }>)[0].id)}/void`, cookie: ready.adminCookie, body: { reason: 'Đã xác nhận cần tạm dừng.' } })).statusCode).toBe(200);
    expect((await request(ready.app, { method: 'GET', path: '/api/me/challenge/today', cookie: ready.studentCookie })).body.questions).toEqual([]);
  });
});
