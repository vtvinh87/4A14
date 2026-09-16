import { describe, expect, it, vi } from 'vitest';
import { createApp, type AppRequest, type AppResponse } from './app';
import { MemoryAuthRepository } from './auth/memoryRepository';
import { createAuthService } from './auth/service';
import { databaseUrlFromEnv } from './db/client';
import { MemoryLearningRepository } from './learning/memoryRepository';
import { createLearningService } from './learning/service';
import { MemoryClassroomRepository } from './classroom/memoryRepository';
import { createClassroomService, type ClassroomService } from './classroom/service';

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
