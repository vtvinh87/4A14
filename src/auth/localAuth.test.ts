import { beforeEach, describe, expect, it } from 'vitest';
import {
  createStudentAccount,
  getCurrentAuthSession,
  listStudentAccounts,
  loginAdmin,
  loginStudent,
  logout,
  resetLocalAuth,
  updatePin,
  unlockParent,
} from './localAuth';
import { DEFAULT_STUDENT_PIN } from './account';

describe('local account gateway', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetLocalAuth();
  });

  it('bootstraps Admin without a first-login change requirement', async () => {
    const result = await loginAdmin('Admin', '123456@');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.mustChange).toBe(false);
  });

  it('lets Admin create a student with independent default credentials', async () => {
    const admin = await loginAdmin('Admin', '123456@');
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;
    const created = await createStudentAccount(admin.session.token, ' Bao04 ', 'Bé Bảo');
    expect(created.ok).toBe(true);
    expect(listStudentAccounts(admin.session.token)).toHaveLength(1);
    const student = await loginStudent('BAO04', DEFAULT_STUDENT_PIN);
    expect(student.ok).toBe(true);
    if (student.ok) expect(student.session.mustChange).toBe(true);
  });

  it('changes the learner PIN before allowing access and keeps parent PIN separate', async () => {
    const admin = await loginAdmin('Admin', '123456@');
    if (!admin.ok) throw new Error('admin login');
    const created = await createStudentAccount(admin.session.token, 'minhan', 'Minh An');
    if (!created.ok) throw new Error('student creation');
    const student = await loginStudent('minhan', DEFAULT_STUDENT_PIN);
    if (!student.ok) throw new Error('student login');
    const changed = await updatePin(student.session.token, 'student', DEFAULT_STUDENT_PIN, '246810');
    expect(changed.ok).toBe(true);
    const normal = await loginStudent('minhan', '246810');
    expect(normal.ok).toBe(true);
    if (!normal.ok) return;
    const wrongParent = await unlockParent(normal.session.token, '246810');
    expect(wrongParent.ok).toBe(false);
    const parent = await unlockParent(normal.session.token, DEFAULT_STUDENT_PIN);
    expect(parent.ok).toBe(true);
    if (!parent.ok) return;
    expect(parent.mustChange).toBe(true);
    const parentChanged = await updatePin(parent.token, 'parent', DEFAULT_STUDENT_PIN, '135790');
    expect(parentChanged.ok).toBe(true);
    if (!parentChanged.ok) return;
    expect((await unlockParent(parentChanged.session.token, '135790')).ok).toBe(true);
  });

  it('clears the current session on logout', async () => {
    const admin = await loginAdmin('Admin', '123456@');
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;
    expect(getCurrentAuthSession()?.account.role).toBe('admin');
    logout(admin.session.token);
    expect(getCurrentAuthSession()).toBeNull();
  });
});
