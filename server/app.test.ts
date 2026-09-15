import { describe, expect, it } from 'vitest';
import { createApp, type AppRequest, type AppResponse } from './app';
import { MemoryAuthRepository } from './auth/memoryRepository';
import { createAuthService } from './auth/service';

function cookieValue(response: AppResponse): string {
  const cookie = response.headers['Set-Cookie'] ?? '';
  return cookie.split(';', 1)[0] ?? '';
}

async function request(app: ReturnType<typeof createApp>, input: Omit<AppRequest, 'headers'> & { cookie?: string; parentGrant?: string }): Promise<AppResponse> {
  return app.handle({ ...input, headers: { host: 'localhost:8888', ...(input.cookie ? { cookie: input.cookie } : {}), ...(input.parentGrant ? { 'x-parent-grant': input.parentGrant } : {}) } });
}

describe('same-origin account API', () => {
  it('keeps credentials out of responses and enforces student/admin boundaries', async () => {
    const repository = new MemoryAuthRepository();
    const app = createApp({ auth: createAuthService(repository) });

    const adminLogin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'Admin', password: '123456@' } });
    expect(adminLogin.statusCode).toBe(200);
    expect(JSON.stringify(adminLogin.body)).not.toContain('scrypt');
    expect(JSON.stringify(adminLogin.body)).not.toContain('123456@');
    const adminCookie = cookieValue(adminLogin);

    const created = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'Bao04', displayName: 'Bé Bảo' } });
    expect(created.statusCode).toBe(200);
    const studentId = String((created.body.account as { id: string }).id);
    expect(repository.audits.some((audit) => audit.action === 'student_created' && audit.subjectId === studentId)).toBe(true);

    const duplicate = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username: 'bao04', displayName: 'Bé Bảo lần hai' } });
    expect(duplicate.statusCode).toBe(409);

    const studentLogin = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'BAO04', pin: '123456' } });
    expect(studentLogin.statusCode).toBe(200);
    expect(studentLogin.body.mustChange).toBe(true);
    const studentCookie = cookieValue(studentLogin);
    const blockedAdminCall = await request(app, { method: 'GET', path: '/api/admin/students', cookie: studentCookie });
    expect(blockedAdminCall.statusCode).toBe(403);

    const bypass = await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: studentCookie });
    expect(bypass.statusCode).toBe(403);
    expect(bypass.body).toMatchObject({ ok: false, code: 'forbidden', message: 'Cần nhập lại PIN phụ huynh để mở Dashboard.' });
    expect((await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: studentCookie, body: { currentPin: '123456', newPin: '012345' } })).statusCode).toBe(200);
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
    expect(firstParent.body.mustChange).toBe(true);
    const firstParentCookie = cookieValue(firstParent);
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: firstParentCookie })).statusCode).toBe(403);

    const parentChanged = await request(app, { method: 'POST', path: '/api/parent/change-pin', cookie: firstParentCookie, body: { currentPin: '123456', newPin: '864208' } });
    const parentChangedCookie = cookieValue(parentChanged);
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: parentChangedCookie })).statusCode).toBe(403);
    const unlocked = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: parentChangedCookie, body: { pin: '864208' } });
    const unlockedCookie = cookieValue(unlocked);
    const grant = String(unlocked.body.parentGrantToken ?? '');
    expect(grant).toBeTruthy();
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: unlockedCookie })).statusCode).toBe(403);
    expect((await request(app, { method: 'GET', path: `/api/parent/dashboard?studentId=${String((created.body.account as { id: string }).id)}`, cookie: unlockedCookie, parentGrant: grant })).statusCode).toBe(200);
    await request(app, { method: 'POST', path: '/api/parent/lock', cookie: unlockedCookie });
    expect((await request(app, { method: 'GET', path: '/api/parent/dashboard', cookie: unlockedCookie, parentGrant: grant })).statusCode).toBe(403);
  });

  it('exposes only scoped profile routes and never trusts a client student id', async () => {
    const repository = new MemoryAuthRepository();
    let now = new Date('2026-09-14T05:00:00.000Z');
    const app = createApp({ auth: createAuthService(repository, () => now) });
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
    expect(JSON.stringify(self.body)).not.toContain('scrypt');
    expect(JSON.stringify(self.body)).not.toContain('salt');
    expect(JSON.stringify(self.body)).not.toContain('token');

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
    expect(JSON.stringify(parentProfile.body)).not.toContain('hash');
    expect(JSON.stringify(parentProfile.body)).not.toContain('salt');
    expect(JSON.stringify(parentProfile.body)).not.toContain('token');
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
