import { describe, expect, it } from 'vitest';
import { createDbClient } from '../db/client';
import { PostgresAuthRepository } from './postgresRepository';
import { createAuthService } from './service';
import { DEFAULT_ADMIN_PASSWORD, DEFAULT_STUDENT_PIN } from '../../src/auth/account';

const databaseUrl = process.env.HOC_VUI_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.DB_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Postgres auth repository', () => {
  it('persists idempotent bootstrap, credentials, sessions and credential isolation', async () => {
    const sql = createDbClient(databaseUrl!);
    try {
      const repository = new PostgresAuthRepository(sql);
      const first = createAuthService(repository);
      const second = createAuthService(repository);
      const [admin, adminAgain] = await Promise.all([
        first.loginAdmin('Admin', DEFAULT_ADMIN_PASSWORD),
        second.loginAdmin('admin', DEFAULT_ADMIN_PASSWORD),
      ]);
      expect(admin.ok).toBe(true);
      expect(adminAgain.ok).toBe(true);
      if (!admin.ok) return;

      const username = `bao${Date.now().toString(36).slice(-8)}`;
      const created = await first.createStudent(admin.token, username, 'Bé Bảo DB');
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const student = await first.loginStudent(username.toUpperCase(), DEFAULT_STUDENT_PIN);
      expect(student.ok).toBe(true);
      if (!student.ok) return;
      expect(student.session.mode).toBe('change-only');
      expect(JSON.stringify(student)).not.toContain('scrypt');

      const studentChanged = await first.changePin(student.token, DEFAULT_STUDENT_PIN, '246810', 'student');
      expect(studentChanged.ok).toBe(true);
      if (!studentChanged.ok) return;

      const parent = await first.unlockParent(studentChanged.token, DEFAULT_STUDENT_PIN);
      expect(parent.ok).toBe(true);
      if (!parent.ok) return;
      expect(parent.session.mode).toBe('change-only');

      const parentChanged = await first.changePin(parent.token, DEFAULT_STUDENT_PIN, '864208', 'parent');
      expect(parentChanged.ok).toBe(true);
      if (!parentChanged.ok) return;
      expect((await first.getParentDashboard(parentChanged.token, undefined)).ok).toBe(false);

      const parentReady = await first.unlockParent(parentChanged.token, '864208');
      expect(parentReady.ok).toBe(true);
      if (!parentReady.ok) return;
      expect(parentReady.parentGrantToken).toBeTruthy();
      expect((await first.getParentDashboard(parentReady.token, parentReady.parentGrantToken, created.account.id)).ok).toBe(true);
      expect((await first.getParentDashboard(parentReady.token, parentReady.parentGrantToken, '00000000-0000-0000-0000-000000000000')).ok).toBe(false);

      const profile = await first.updateStudentProfile(parentReady.token, { displayName: 'Bé Bảo DB cập nhật', avatarId: 'fox-sunny', birthDate: '2000-02-29' });
      expect(profile).toMatchObject({ ok: true, profile: { accountId: created.account.id, displayName: 'Bé Bảo DB cập nhật', avatarId: 'fox-sunny', birthDate: '2000-02-29' } });
      const reloaded = new PostgresAuthRepository(sql);
      expect(await reloaded.findAccountById(created.account.id)).toMatchObject({ displayName: 'Bé Bảo DB cập nhật', avatarId: 'fox-sunny', birthDate: '2000-02-29' });
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});
