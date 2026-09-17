import { describe, expect, it, vi } from 'vitest';
import { MemoryAuthRepository } from './memoryRepository';
import { createAuthService } from './service';
import { DEFAULT_ADMIN_PASSWORD, DEFAULT_STUDENT_PIN } from '../../src/auth/account';

describe('server auth service', () => {
  it('applies bounded student TTLs and preserves remembered full sessions across rotations', async () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    let now = new Date('2026-09-17T05:00:00.000Z');
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository, () => now);

    const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;
    expect(Date.parse(admin.session.expiresAt) - Date.parse(admin.session.createdAt)).toBe(8 * 60 * 60 * 1000);

    const created = await auth.createStudent(admin.token, 'ttl17', 'TTL');
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const provisional = await auth.loginStudent('ttl17', DEFAULT_STUDENT_PIN, true);
    expect(provisional.ok).toBe(true);
    if (!provisional.ok) return;
    expect(provisional.session.mode).toBe('change-only');
    expect(Date.parse(provisional.session.expiresAt) - Date.parse(provisional.session.createdAt)).toBe(7 * DAY_MS);

    const changedStudent = await auth.changePin(provisional.token, DEFAULT_STUDENT_PIN, '246810', 'student', true);
    expect(changedStudent.ok).toBe(true);
    if (!changedStudent.ok) return;
    expect(Date.parse(changedStudent.session.expiresAt) - Date.parse(changedStudent.session.createdAt)).toBe(30 * DAY_MS);

    const firstParent = await auth.unlockParent(changedStudent.token, DEFAULT_STUDENT_PIN);
    expect(firstParent.ok).toBe(true);
    if (!firstParent.ok) return;
    expect(firstParent.session.mode).toBe('change-only');
    expect(Date.parse(firstParent.session.expiresAt) - Date.parse(firstParent.session.createdAt)).toBe(7 * DAY_MS);

    const changedParent = await auth.changePin(firstParent.token, DEFAULT_STUDENT_PIN, '864208', 'parent');
    expect(changedParent.ok).toBe(true);
    if (!changedParent.ok) return;

    const rememberedLogin = await auth.loginStudent('ttl17', '246810', true);
    expect(rememberedLogin.ok).toBe(true);
    if (!rememberedLogin.ok) return;
    expect(Date.parse(rememberedLogin.session.expiresAt) - Date.parse(rememberedLogin.session.createdAt)).toBe(30 * DAY_MS);

    const parentReady = await auth.unlockParent(rememberedLogin.token, '864208');
    expect(parentReady.ok).toBe(true);
    if (!parentReady.ok) return;
    expect(Date.parse(parentReady.session.expiresAt) - Date.parse(parentReady.session.createdAt)).toBe(30 * DAY_MS);

    const parentRotated = await auth.changePin(parentReady.token, '864208', '864209', 'parent');
    expect(parentRotated.ok).toBe(true);
    if (!parentRotated.ok) return;
    expect(Date.parse(parentRotated.session.expiresAt) - Date.parse(parentRotated.session.createdAt)).toBe(30 * DAY_MS);

    now = new Date(now.getTime() + 1);
    const normalLogin = await auth.loginStudent('ttl17', '246810', false);
    expect(normalLogin.ok).toBe(true);
    if (!normalLogin.ok) return;
    expect(Date.parse(normalLogin.session.expiresAt) - Date.parse(normalLogin.session.createdAt)).toBe(7 * DAY_MS);
  });

  it('creates a student with independent default credentials and requires first-use PIN change', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository);
    const admin = await auth.loginAdmin('Admin', DEFAULT_ADMIN_PASSWORD);
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;
    const created = await auth.createStudent(admin.token, 'bao04', 'Bé Bảo');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const stored = await repository.findAccountById(created.account.id);
    expect(stored).toMatchObject({ avatarId: 'fox-scout', birthDate: null, birthdayWishesEnabled: false });
    const login = await auth.loginStudent('BAO04', DEFAULT_STUDENT_PIN);
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    expect(login.mustChange).toBe(true);
    const changed = await auth.changePin(login.token, DEFAULT_STUDENT_PIN, '246810', 'student');
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    const parent = await auth.unlockParent(changed.token, DEFAULT_STUDENT_PIN);
    expect(parent.ok).toBe(true);
    if (!parent.ok) return;
    expect(parent.mustChange).toBe(true);
    const parentChanged = await auth.changePin(parent.token, DEFAULT_STUDENT_PIN, '864208', 'parent');
    expect(parentChanged.ok).toBe(true);
    if (!parentChanged.ok) return;
    const parentReady = await auth.unlockParent(parentChanged.token, '864208');
    expect(parentReady.ok).toBe(true);
    if (!parentReady.ok) return;
    expect(parentReady.parentGrantUntil).toBeTruthy();
  });

  it('blocks a student from listing accounts or using an admin token', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository);
    const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;
    const created = await auth.createStudent(admin.token, 'lan09', 'Lan');
    expect(created.ok).toBe(true);
    const student = await auth.loginStudent('lan09', DEFAULT_STUDENT_PIN);
    expect(student.ok).toBe(true);
    if (!student.ok) return;
    expect((await auth.listStudents(student.token)).ok).toBe(false);
    expect((await auth.createStudent(student.token, 'minh10', 'Minh')).ok).toBe(false);
  });

  it('uses public student summaries for Admin listing without loading credentials', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository);
    const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
    if (!admin.ok) throw new Error('admin login');
    await auth.createStudent(admin.token, 'summary18', 'Summary');
    const summaries = vi.spyOn(repository, 'listStudentSummaries');

    const result = await auth.listStudents(admin.token);

    expect(result).toMatchObject({ ok: true, accounts: [expect.objectContaining({ username: 'summary18' })] });
    expect(summaries).toHaveBeenCalledOnce();
  });

  it('revokes a parent grant on logout and never accepts a client supplied student id', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository);
    const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
    if (!admin.ok) throw new Error('admin login');
    await auth.createStudent(admin.token, 'an11', 'An');
    const student = await auth.loginStudent('an11', DEFAULT_STUDENT_PIN);
    if (!student.ok) throw new Error('student login');
    const changed = await auth.changePin(student.token, DEFAULT_STUDENT_PIN, '111222', 'student');
    if (!changed.ok) throw new Error('student change');
    const parent = await auth.unlockParent(changed.token, DEFAULT_STUDENT_PIN);
    if (!parent.ok) throw new Error('parent first');
    const parentChanged = await auth.changePin(parent.token, DEFAULT_STUDENT_PIN, '333444', 'parent');
    if (!parentChanged.ok) throw new Error('parent change');
    const ready = await auth.unlockParent(parentChanged.token, '333444');
    if (!ready.ok) throw new Error('parent ready');
    expect(ready.parentGrantToken).toBeTruthy();
    expect((await auth.getParentDashboard(ready.token, ready.parentGrantToken, 'some-other-id')).ok).toBe(false);
    expect((await auth.getParentDashboard(ready.token, undefined)).ok).toBe(false);
    await auth.logout(ready.token);
    expect((await auth.getParentDashboard(ready.token, ready.parentGrantToken)).ok).toBe(false);
  });

  it('scopes profile reads and birthday preference updates to the active parent grant', async () => {
    const repository = new MemoryAuthRepository();
    let now = new Date('2026-09-14T05:00:00.000Z');
    const auth = createAuthService(repository, () => now);
    const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
    if (!admin.ok) throw new Error('admin login');
    const created = await auth.createStudent(admin.token, 'grant13', 'Grant');
    if (!created.ok) throw new Error('student create');

    const student = await auth.loginStudent('grant13', DEFAULT_STUDENT_PIN);
    if (!student.ok) throw new Error('student login');
    const changedStudent = await auth.changePin(student.token, DEFAULT_STUDENT_PIN, '246810', 'student');
    if (!changedStudent.ok) throw new Error('student change');

    expect(await auth.getParentProfile(changedStudent.token, undefined)).toMatchObject({ ok: false, code: 'forbidden' });
    expect(await auth.updateParentProfilePreferences(changedStudent.token, undefined, true)).toMatchObject({ ok: false, code: 'forbidden' });

    const firstParent = await auth.unlockParent(changedStudent.token, DEFAULT_STUDENT_PIN);
    if (!firstParent.ok) throw new Error('parent first unlock');
    const changedParent = await auth.changePin(firstParent.token, DEFAULT_STUDENT_PIN, '864208', 'parent');
    if (!changedParent.ok) throw new Error('parent change');
    const ready = await auth.unlockParent(changedParent.token, '864208');
    if (!ready.ok || !ready.parentGrantToken) throw new Error('parent ready');

    expect(await auth.getParentProfile(ready.token, 'wrong-grant')).toMatchObject({ ok: false, code: 'forbidden' });
    const currentProfile = await auth.getParentProfile(ready.token, ready.parentGrantToken);
    expect(currentProfile).toMatchObject({ ok: true, profile: { accountId: created.account.id, displayName: 'Grant', birthDate: null, birthdayWishesEnabled: false } });
    expect(JSON.stringify(currentProfile)).not.toContain('hash');
    expect(JSON.stringify(currentProfile)).not.toContain('salt');
    expect(JSON.stringify(currentProfile)).not.toContain('token');

    const updated = await auth.updateParentProfilePreferences(ready.token, ready.parentGrantToken, true);
    expect(updated).toMatchObject({ ok: true, profile: { accountId: created.account.id, birthdayWishesEnabled: true } });
    expect((await repository.findAccountById(created.account.id))?.birthdayWishesEnabled).toBe(true);

    now = new Date(now.getTime() + 15 * 60 * 1000 + 1);
    expect(await auth.getParentProfile(ready.token, ready.parentGrantToken)).toMatchObject({ ok: false, code: 'forbidden' });
    expect(await auth.updateParentProfilePreferences(ready.token, ready.parentGrantToken, false)).toMatchObject({ ok: false, code: 'forbidden' });
  });

  it('resets only the selected credential and invalidates sessions when a student is disabled', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository);
    const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
    if (!admin.ok) throw new Error('admin login');
    const created = await auth.createStudent(admin.token, 'reset12', 'Reset');
    if (!created.ok) throw new Error('student create');
    const first = await auth.loginStudent('reset12', DEFAULT_STUDENT_PIN);
    if (!first.ok) throw new Error('student login');
    const changedStudent = await auth.changePin(first.token, DEFAULT_STUDENT_PIN, '246810', 'student');
    if (!changedStudent.ok) throw new Error('student change');
    const parent = await auth.unlockParent(changedStudent.token, DEFAULT_STUDENT_PIN);
    if (!parent.ok) throw new Error('parent unlock');
    const changedParent = await auth.changePin(parent.token, DEFAULT_STUDENT_PIN, '864208', 'parent');
    if (!changedParent.ok) throw new Error('parent change');

    const reset = await auth.resetPin(admin.token, created.account.id, 'student');
    expect(reset.ok).toBe(true);
    expect(await auth.getSession(changedStudent.token)).toMatchObject({ ok: false });
    const resetLogin = await auth.loginStudent('reset12', DEFAULT_STUDENT_PIN);
    expect(resetLogin).toMatchObject({ ok: true, mustChange: true });
    if (!resetLogin.ok) return;
    const restored = await auth.changePin(resetLogin.token, DEFAULT_STUDENT_PIN, '012345', 'student');
    if (!restored.ok) throw new Error('student restore');
    expect((await auth.unlockParent(restored.token, '864208')).ok).toBe(true);

    expect((await auth.updateStudent(admin.token, created.account.id, { active: false })).ok).toBe(true);
    expect(await auth.getSession(restored.token)).toMatchObject({ ok: false });
  });
});
