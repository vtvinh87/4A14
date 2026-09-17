import { describe, expect, it } from 'vitest';
import { PostgresAuthRepository } from './postgresRepository';

function queryText(strings: TemplateStringsArray): string {
  return strings.join('¦').replace(/\s+/g, ' ').trim().toLowerCase();
}

function mockedDatabase(onQuery: (query: string) => unknown[] = () => []) {
  const queries: string[] = [];
  const query = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
    const text = queryText(strings);
    queries.push(text);
    return Promise.resolve(onQuery(text));
  }) as unknown as {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
    array: (values: unknown[]) => unknown;
  };
  query.array = (values) => values;
  return { db: query, queries };
}

const accountRow = {
  id: 'student-a',
  username: 'an01',
  display_name: 'An',
  role: 'student' as const,
  active: true,
  avatar_id: 'fox-scout',
  birth_date: null,
  birthday_wishes_enabled: false,
  created_at: '2026-09-16T08:00:00.000Z',
  updated_at: '2026-09-16T08:00:00.000Z',
  credential_version: 1,
  failed_attempts: 0,
  locked_until: null,
};

describe('PostgresAuthRepository optimized reads', () => {
  it('lists public student summaries with one account query and no credential fan-out', async () => {
    const rows = [accountRow, { ...accountRow, id: 'student-b', username: 'binh02', display_name: 'Bình' }];
    const mock = mockedDatabase((query) => query.includes('from hoc_vui_private.accounts') ? rows : []);
    const repository = new PostgresAuthRepository(mock.db as never);

    await expect(repository.listStudentSummaries()).resolves.toEqual([
      { id: 'student-a', username: 'an01', displayName: 'An', role: 'student', active: true, credentialVersion: 1 },
      { id: 'student-b', username: 'binh02', displayName: 'Bình', role: 'student', active: true, credentialVersion: 1 },
    ]);
    expect(mock.queries).toHaveLength(1);
    expect(mock.queries[0]).toContain("where role = 'student'");
    expect(mock.queries[0]).not.toContain('from hoc_vui_private.credentials');
  });

  it('loads session, account, and all credentials through one joined query', async () => {
    const mock = mockedDatabase((query) => query.includes('from hoc_vui_private.auth_sessions') ? [{
      session_id: 'session-a',
      session_token_hash: 'hash-a',
      session_account_id: 'student-a',
      session_mode: 'full',
      session_change_kind: null,
      session_created_at: '2026-09-16T08:00:00.000Z',
      session_expires_at: '2026-09-23T08:00:00.000Z',
      session_revoked_at: null,
      session_credential_version: 1,
      session_parent_grant_until: null,
      session_parent_grant_hash: null,
      account_id: 'student-a',
      ...accountRow,
      credentials: [{ owner_id: 'student-a', kind: 'student', hash: 'hash', salt: 'salt', algorithm: 'scrypt-v1', must_change: false, version: 1 }],
    }] : []);
    const repository = new PostgresAuthRepository(mock.db as never);

    await expect(repository.findSessionWithAccount('hash-a')).resolves.toMatchObject({
      session: { id: 'session-a', tokenHash: 'hash-a', accountId: 'student-a', mode: 'full' },
      account: { id: 'student-a', username: 'an01', studentCredential: { hash: 'hash', mustChange: false } },
    });
    expect(mock.queries).toHaveLength(1);
    expect(mock.queries[0]).toContain('join hoc_vui_private.accounts');
    expect(mock.queries[0]).toContain('left join hoc_vui_private.credentials');
  });
});
