import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AVATAR_ID } from '../../shared/account-contracts';
import { hashToken } from './crypto';
import { MemoryAuthRepository } from './memoryRepository';
import { PostgresAuthRepository } from './postgresRepository';
import { createAuthService } from './service';
import type { ServerAccountRecord, ServerSessionRecord, SessionContext } from './types';

function account(overrides: Partial<ServerAccountRecord> = {}): ServerAccountRecord {
  return {
    id: 'student-a',
    username: 'studenta',
    displayName: 'Synthetic Student',
    role: 'student',
    active: true,
    avatarId: DEFAULT_AVATAR_ID,
    birthDate: null,
    birthdayWishesEnabled: false,
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    credentialVersion: 3,
    failedAttempts: 0,
    lockedUntil: null,
    studentCredential: { hash: 'secret-hash', salt: 'secret-salt', algorithm: 'scrypt-v1', mustChange: false, version: 1 },
    parentCredential: { hash: 'parent-hash', salt: 'parent-salt', algorithm: 'scrypt-v1', mustChange: false, version: 1 },
    ...overrides,
  };
}

function session(overrides: Partial<ServerSessionRecord> = {}): ServerSessionRecord {
  return {
    id: 'session-a',
    tokenHash: hashToken('opaque-token'),
    accountId: 'student-a',
    mode: 'full',
    changeKind: null,
    createdAt: '2026-09-19T00:00:00.000Z',
    expiresAt: '2026-09-19T01:00:00.000Z',
    revokedAt: null,
    credentialVersion: 3,
    parentGrantUntil: null,
    parentGrantHash: null,
    ...overrides,
  };
}

function queryText(strings: TemplateStringsArray): string {
  return strings.join('¦').replace(/\s+/g, ' ').trim().toLowerCase();
}

function mockedDatabase(rows: unknown[]) {
  const queries: string[] = [];
  const db = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
    queries.push(queryText(strings));
    return Promise.resolve(rows);
  }) as unknown as { (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> };
  return { db, queries };
}

function projectionContext(): SessionContext {
  return {
    session: session(),
    account: {
      id: 'student-a',
      username: 'studenta',
      displayName: 'Synthetic Student',
      role: 'student',
      active: true,
      credentialVersion: 3,
    },
  };
}

describe('read-only session projection', () => {
  it('uses findSessionContext without loading credentials or full account records', async () => {
    const repository = new MemoryAuthRepository();
    const auth = createAuthService(repository, () => new Date('2026-09-19T00:30:00.000Z'));
    const admin = await auth.loginAdmin('admin', '123456@');
    if (!admin.ok) throw new Error('expected bootstrap admin login');

    const findSession = repository.findSession.bind(repository);
    const findAccountById = repository.findAccountById.bind(repository);
    const findSessionContext = vi.fn(async (tokenHash: string): Promise<SessionContext | null> => {
      const record = await findSession(tokenHash);
      if (!record) return null;
      const current = await findAccountById(record.accountId);
      return {
        session: record,
        account: current ? {
          id: current.id,
          username: current.username,
          displayName: current.displayName,
          role: current.role,
          active: current.active,
          credentialVersion: current.credentialVersion,
        } : null,
      };
    });
    Object.assign(repository, { findSessionContext });
    const findSessionSpy = vi.spyOn(repository, 'findSession');
    const findAccountByIdSpy = vi.spyOn(repository, 'findAccountById');

    const result = await auth.getSession(admin.token);

    expect(findSessionContext).toHaveBeenCalledOnce();
    expect(findSessionSpy).not.toHaveBeenCalled();
    expect(findAccountByIdSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ account: { role: 'admin' }, mode: 'full' });
    expect(JSON.stringify(result)).not.toContain('scrypt');
    expect(JSON.stringify(result)).not.toContain('secret-hash');
  });

  it.each([
    ['unknown token', 'missing', {}, null, 'expired'],
    ['revoked token', 'opaque-token', { revokedAt: '2026-09-19T00:20:00.000Z' }, account(), 'expired'],
    ['expires at current time', 'opaque-token', { expiresAt: '2026-09-19T00:30:00.000Z' }, account(), 'expired'],
    ['inactive account', 'opaque-token', {}, account({ active: false }), 'forbidden'],
    ['credential version mismatch', 'opaque-token', { credentialVersion: 4 }, account(), 'forbidden'],
    ['missing account', 'opaque-token', {}, null, 'forbidden'],
  ] as const)('preserves the authorization matrix for %s', async (_label, token, sessionPatch, storedAccount, code) => {
    const repository = new MemoryAuthRepository();
    const now = new Date('2026-09-19T00:30:00.000Z');
    if (storedAccount) repository.accounts.set(storedAccount.id, structuredClone(storedAccount));
    const storedSession = session(sessionPatch);
    repository.sessions.set(storedSession.tokenHash, storedSession);
    const auth = createAuthService(repository, () => now);

    const result = await auth.getSession(token);

    expect(result).toMatchObject({ ok: false, code });
  });

  it.each([
    { label: 'student full', account: account(), session: session() },
    { label: 'student change-only', account: account(), session: session({ mode: 'change-only', changeKind: 'student' }) },
    { label: 'student parent grant', account: account(), session: session({ parentGrantUntil: '2026-09-19T00:45:00.000Z', parentGrantHash: hashToken('grant') }) },
    { label: 'admin full', account: account({ id: 'admin-a', username: 'admina', role: 'admin' }), session: session({ accountId: 'admin-a' }) },
  ])('returns only the public session projection for $label', async ({ account: storedAccount, session: storedSession }) => {
    const repository = new MemoryAuthRepository();
    repository.accounts.set(storedAccount.id, structuredClone(storedAccount));
    repository.sessions.set(storedSession.tokenHash, structuredClone(storedSession));
    const auth = createAuthService(repository, () => new Date('2026-09-19T00:30:00.000Z'));

    const result = await auth.getSession('opaque-token');

    expect(result).toMatchObject({
      token: 'opaque-token',
      account: {
        id: storedAccount.id,
        username: storedAccount.username,
        displayName: storedAccount.displayName,
        role: storedAccount.role,
        active: true,
        credentialVersion: 3,
      },
      mode: storedSession.mode,
      changeKind: storedSession.changeKind,
    });
    expect(JSON.stringify(result)).not.toContain('hash');
    expect(JSON.stringify(result)).not.toContain('salt');
  });
});

describe('PostgresAuthRepository session projection', () => {
  it('maps one session left-join statement without selecting the credentials table', async () => {
    const mock = mockedDatabase([{
      session_id: 'session-a',
      token_hash: hashToken('opaque-token'),
      session_account_id: 'student-a',
      mode: 'full',
      change_kind: null,
      session_created_at: '2026-09-19T00:00:00.000Z',
      expires_at: '2026-09-19T01:00:00.000Z',
      revoked_at: null,
      session_credential_version: 3,
      parent_grant_until: null,
      parent_grant_hash: null,
      account_id: 'student-a',
      username: 'studenta',
      display_name: 'Synthetic Student',
      role: 'student',
      active: true,
      account_credential_version: 3,
    }]);
    const repository = new PostgresAuthRepository(mock.db as never);

    const result = await repository.findSessionContext(hashToken('opaque-token'));

    expect(result).toEqual(projectionContext());
    expect(mock.queries).toHaveLength(1);
    expect(mock.queries[0]).toContain('from hoc_vui_private.auth_sessions as sessions');
    expect(mock.queries[0]).toContain('left join hoc_vui_private.accounts as accounts');
    expect(mock.queries[0]).toContain('sessions.credential_version as session_credential_version');
    expect(mock.queries[0]).toContain('accounts.credential_version as account_credential_version');
    expect(mock.queries[0]).not.toContain('credentials');
  });

  it('reads active student ids and count without loading credentials', async () => {
    const idsMock = mockedDatabase([{ id: 'student-b' }, { id: 'student-a' }]);
    const idsRepository = new PostgresAuthRepository(idsMock.db as never);
    await expect(idsRepository.listActiveStudentIds()).resolves.toEqual(['student-b', 'student-a']);
    expect(idsMock.queries).toHaveLength(1);
    expect(idsMock.queries[0]).toContain("role = 'student'");
    expect(idsMock.queries[0]).toContain('active = true');
    expect(idsMock.queries[0]).not.toContain('credentials');

    const countMock = mockedDatabase([{ student_count: 7 }]);
    const countRepository = new PostgresAuthRepository(countMock.db as never);
    await expect(countRepository.countActiveStudents()).resolves.toBe(7);
    expect(countMock.queries).toHaveLength(1);
    expect(countMock.queries[0]).toContain('count(*)');
    expect(countMock.queries[0]).toContain("role = 'student'");
    expect(countMock.queries[0]).toContain('active = true');
  });
});
