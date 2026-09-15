import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDENT_PIN } from '../../shared/account-contracts';
import { DEFAULT_ADMIN_PASSWORD } from '../../src/auth/account';
import { MemoryAuthRepository } from './memoryRepository';
import { createAuthService } from './service';

const fixedClock = () => new Date('2026-09-14T05:00:00.000Z');

async function readyStudent(auth: ReturnType<typeof createAuthService>, username: string, displayName: string) {
  const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
  if (!admin.ok) throw new Error('admin login');
  const created = await auth.createStudent(admin.token, username, displayName);
  if (!created.ok) throw new Error('student create');
  const login = await auth.loginStudent(username, DEFAULT_STUDENT_PIN);
  if (!login.ok) throw new Error('student login');
  const changed = await auth.changePin(login.token, DEFAULT_STUDENT_PIN, '246810', 'student');
  if (!changed.ok) throw new Error('student change');
  return { accountId: created.account.id, token: changed.token };
}

async function parentGrant(auth: ReturnType<typeof createAuthService>, studentToken: string) {
  const first = await auth.unlockParent(studentToken, DEFAULT_STUDENT_PIN);
  if (!first.ok) throw new Error('parent first unlock');
  const changed = await auth.changePin(first.token, DEFAULT_STUDENT_PIN, '864208', 'parent');
  if (!changed.ok) throw new Error('parent change');
  const ready = await auth.unlockParent(changed.token, '864208');
  if (!ready.ok || !ready.parentGrantToken) throw new Error('parent grant');
  return ready;
}

type ProfileResult = Awaited<ReturnType<ReturnType<typeof createAuthService>['getStudentProfile']>>;

function expectProfileFailure(result: ProfileResult): Extract<ProfileResult, { ok: false }> {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected a profile failure result.');
  return result;
}

describe('student profile service', () => {
  it('initializes safe defaults and rejects change-only or invalid self profile writes', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository, fixedClock);
    const admin = await auth.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD);
    if (!admin.ok) throw new Error('admin login');
    const storedAdmin = await repository.findAccountByUsername('admin');
    expect(storedAdmin).toMatchObject({ avatarId: 'fox-scout', birthDate: null, birthdayWishesEnabled: false });

    const created = await auth.createStudent(admin.token, 'profile03', 'Bé Ba');
    if (!created.ok) throw new Error('student create');
    const storedStudent = await repository.findAccountById(created.account.id);
    expect(storedStudent).toMatchObject({ avatarId: 'fox-scout', birthDate: null, birthdayWishesEnabled: false });
    const changeOnly = await auth.loginStudent('profile03', DEFAULT_STUDENT_PIN);
    if (!changeOnly.ok) throw new Error('student login');
    expect(expectProfileFailure(await auth.getStudentProfile(changeOnly.token)).code).toBe('forbidden');
    expect(expectProfileFailure(await auth.updateStudentProfile(changeOnly.token, { displayName: 'Không được' })).code).toBe('forbidden');

    const full = await auth.changePin(changeOnly.token, DEFAULT_STUDENT_PIN, '135790', 'student');
    if (!full.ok) throw new Error('student change');
    const updated = await auth.updateStudentProfile(full.token, { displayName: 'Bé Ba mới', avatarId: 'fox-sunny', birthDate: '2000-02-29' });
    expect(updated).toMatchObject({ ok: true, profile: { accountId: created.account.id, displayName: 'Bé Ba mới', avatarId: 'fox-sunny', birthDate: '2000-02-29', birthdayWishesEnabled: false } });
    expect(expectProfileFailure(await auth.updateStudentProfile(full.token, { birthDate: '' })).code).toBe('invalid');
    expect(expectProfileFailure(await auth.updateStudentProfile(full.token, { birthDate: '2026-09-15' })).code).toBe('invalid');
    expect(expectProfileFailure(await auth.updateStudentProfile(full.token, { extra: 'nope' } as never)).code).toBe('invalid');
  });

  it('derives parent profile scope from the active grant and never accepts a child id', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository, fixedClock);
    const first = await readyStudent(auth, 'profile04', 'Bé Bốn');
    const second = await readyStudent(auth, 'profile05', 'Bé Năm');
    const grant = await parentGrant(auth, first.token);

    expect(expectProfileFailure(await auth.getParentProfile(grant.token, undefined)).code).toBe('forbidden');
    expect(expectProfileFailure(await auth.getParentProfile(grant.token, 'wrong-grant')).code).toBe('forbidden');
    const profile = await auth.getParentProfile(grant.token, grant.parentGrantToken);
    expect(profile).toMatchObject({ ok: true, profile: { accountId: first.accountId, displayName: 'Bé Bốn', birthDate: null } });
    const preference = await auth.updateParentProfilePreferences(grant.token, grant.parentGrantToken, true);
    expect(preference).toMatchObject({ ok: true, profile: { accountId: first.accountId, birthdayWishesEnabled: true } });
    const secondProfile = await auth.getStudentProfile(second.token);
    expect(secondProfile).toMatchObject({ ok: true, profile: { accountId: second.accountId } });
    expect((await repository.findAccountById(first.accountId))?.birthdayWishesEnabled).toBe(true);
    expect((await repository.findAccountById(second.accountId))?.birthdayWishesEnabled).toBe(false);
  });
});
