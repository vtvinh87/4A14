import type postgres from 'postgres';
import { DEFAULT_AVATAR_ID, isAvatarId, type AvatarId } from '../../shared/account-contracts';
import { withTransaction, type DatabaseClient, type DatabaseTransaction } from '../db/client';
import type { AdminAuditRecord, AuthRepository, CredentialKind, CredentialRecord, ServerAccountRecord, ServerSessionRecord } from './types';

type AccountRow = {
  id: string;
  username: string;
  display_name: string;
  role: 'student' | 'admin';
  active: boolean;
  avatar_id: string;
  birth_date: string | Date | null;
  birthday_wishes_enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  credential_version: number;
  failed_attempts: number;
  locked_until: Date | string | null;
};

type CredentialRow = {
  owner_id: string;
  kind: 'student' | 'parent' | 'admin';
  hash: string;
  salt: string;
  algorithm: string;
  must_change: boolean;
  version: number;
};

type SessionRow = {
  id: string;
  token_hash: string;
  account_id: string;
  mode: 'full' | 'change-only';
  change_kind: 'student' | 'parent' | null;
  created_at: Date | string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  credential_version: number;
  parent_grant_until: Date | string | null;
  parent_grant_hash: string | null;
};

type QueryClient = DatabaseClient | DatabaseTransaction;

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function calendarDate(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function mapCredential(row: CredentialRow): CredentialRecord {
  return { hash: row.hash, salt: row.salt, algorithm: row.algorithm, mustChange: row.must_change, version: row.version };
}

async function loadCredentials(db: QueryClient, ownerId: string): Promise<CredentialRow[]> {
  return await db<CredentialRow[]>`
    select owner_id, kind, hash, salt, algorithm, must_change, version
    from hoc_vui_private.credentials
    where owner_id = ${ownerId}
  ` as CredentialRow[];
}

function mapAccount(row: AccountRow, credentials: CredentialRow[]): ServerAccountRecord {
  const byKind = new Map(credentials.map((credential) => [credential.kind, credential]));
  const avatarId: AvatarId = isAvatarId(row.avatar_id) ? row.avatar_id : DEFAULT_AVATAR_ID;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    avatarId,
    birthDate: calendarDate(row.birth_date),
    birthdayWishesEnabled: row.birthday_wishes_enabled,
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    studentCredential: byKind.get('student') ? mapCredential(byKind.get('student')!) : undefined,
    parentCredential: byKind.get('parent') ? mapCredential(byKind.get('parent')!) : undefined,
    adminCredential: byKind.get('admin') ? mapCredential(byKind.get('admin')!) : undefined,
    credentialVersion: row.credential_version,
    failedAttempts: row.failed_attempts,
    lockedUntil: iso(row.locked_until),
  };
}

async function loadAccount(db: QueryClient, where: postgres.PendingQuery<AccountRow[]>) {
  const rows = await where as unknown as AccountRow[];
  const row = rows[0];
  return row ? mapAccount(row, await loadCredentials(db, row.id)) : null;
}

function credentialEntries(account: ServerAccountRecord): Array<[CredentialKind, CredentialRecord]> {
  return ([
    ['student', account.studentCredential],
    ['parent', account.parentCredential],
    ['admin', account.adminCredential],
  ] as const).filter((entry): entry is [CredentialKind, CredentialRecord] => Boolean(entry[1]));
}

async function writeCredentials(db: QueryClient, account: ServerAccountRecord): Promise<void> {
  for (const [kind, credential] of credentialEntries(account)) {
    await db`
      insert into hoc_vui_private.credentials (owner_id, kind, hash, salt, algorithm, must_change, version, updated_at)
      values (${account.id}, ${kind}, ${credential.hash}, ${credential.salt}, ${credential.algorithm}, ${credential.mustChange}, ${credential.version}, ${account.updatedAt})
      on conflict (owner_id, kind) do update set
        hash = excluded.hash,
        salt = excluded.salt,
        algorithm = excluded.algorithm,
        must_change = excluded.must_change,
        version = excluded.version,
        updated_at = excluded.updated_at
    `;
  }
}

function mapSession(row: SessionRow): ServerSessionRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    accountId: row.account_id,
    mode: row.mode,
    changeKind: row.change_kind,
    createdAt: iso(row.created_at)!,
    expiresAt: iso(row.expires_at)!,
    revokedAt: iso(row.revoked_at),
    credentialVersion: row.credential_version,
    parentGrantUntil: iso(row.parent_grant_until),
    parentGrantHash: row.parent_grant_hash,
  };
}

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findAccountByUsername(username: string): Promise<ServerAccountRecord | null> {
    return loadAccount(this.db, this.db`
      select id, username, display_name, role, active, avatar_id, birth_date, birthday_wishes_enabled, created_at, updated_at, credential_version, failed_attempts, locked_until
      from hoc_vui_private.accounts
      where username = ${username}
      limit 1
    ` as postgres.PendingQuery<AccountRow[]>);
  }

  async findAccountById(id: string): Promise<ServerAccountRecord | null> {
    return loadAccount(this.db, this.db`
      select id, username, display_name, role, active, avatar_id, birth_date, birthday_wishes_enabled, created_at, updated_at, credential_version, failed_attempts, locked_until
      from hoc_vui_private.accounts
      where id = ${id}::uuid
      limit 1
    ` as postgres.PendingQuery<AccountRow[]>);
  }

  async listStudents(): Promise<ServerAccountRecord[]> {
    const rows = await this.db<AccountRow[]>`
      select id, username, display_name, role, active, avatar_id, birth_date, birthday_wishes_enabled, created_at, updated_at, credential_version, failed_attempts, locked_until
      from hoc_vui_private.accounts
      where role = 'student'
      order by lower(display_name), username
    ` as AccountRow[];
    return Promise.all(rows.map(async (row) => mapAccount(row, await loadCredentials(this.db, row.id))));
  }

  async insertAccount(account: ServerAccountRecord): Promise<void> {
    try {
      await withTransaction(this.db, async (tx) => {
        await tx`
          insert into hoc_vui_private.accounts (id, username, display_name, role, active, avatar_id, birth_date, birthday_wishes_enabled, created_at, updated_at, credential_version, failed_attempts, locked_until)
          values (${account.id}::uuid, ${account.username}, ${account.displayName}, ${account.role}, ${account.active}, ${account.avatarId}, ${account.birthDate}, ${account.birthdayWishesEnabled}, ${account.createdAt}, ${account.updatedAt}, ${account.credentialVersion}, ${account.failedAttempts}, ${account.lockedUntil})
        `;
        await writeCredentials(tx, account);
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505') {
        throw new Error('username_conflict');
      }
      throw error;
    }
  }

  async insertAdminAudit(audit: AdminAuditRecord): Promise<void> {
    await this.db`
      insert into hoc_vui_private.admin_audits (id, actor_id, action, subject_id, result, metadata, created_at)
      values (${audit.id}::uuid, ${audit.actorId}::uuid, ${audit.action}, ${audit.subjectId}, ${audit.result}, ${this.db.json(audit.metadata as never)}::jsonb, ${audit.createdAt})
    `;
  }

  async updateAccount(account: ServerAccountRecord): Promise<void> {
    await withTransaction(this.db, async (tx) => {
      await tx`
        update hoc_vui_private.accounts
        set username = ${account.username}, display_name = ${account.displayName}, active = ${account.active}, avatar_id = ${account.avatarId}, birth_date = ${account.birthDate}, birthday_wishes_enabled = ${account.birthdayWishesEnabled}, updated_at = ${account.updatedAt}, credential_version = ${account.credentialVersion}, failed_attempts = ${account.failedAttempts}, locked_until = ${account.lockedUntil}
        where id = ${account.id}::uuid
      `;
      await writeCredentials(tx, account);
    });
  }

  async insertSession(session: ServerSessionRecord): Promise<void> {
    await this.db`
      insert into hoc_vui_private.auth_sessions (id, token_hash, account_id, mode, change_kind, created_at, expires_at, revoked_at, credential_version, parent_grant_until, parent_grant_hash)
      values (${session.id}::uuid, ${session.tokenHash}, ${session.accountId}::uuid, ${session.mode}, ${session.changeKind}, ${session.createdAt}, ${session.expiresAt}, ${session.revokedAt}, ${session.credentialVersion}, ${session.parentGrantUntil}, ${session.parentGrantHash})
    `;
  }

  async findSession(tokenHash: string): Promise<ServerSessionRecord | null> {
    const rows = await this.db<SessionRow[]>`
      select id, token_hash, account_id, mode, change_kind, created_at, expires_at, revoked_at, credential_version, parent_grant_until, parent_grant_hash
      from hoc_vui_private.auth_sessions
      where token_hash = ${tokenHash}
      limit 1
    ` as SessionRow[];
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async updateSession(session: ServerSessionRecord): Promise<void> {
    await this.db`
      update hoc_vui_private.auth_sessions
      set revoked_at = ${session.revokedAt}, expires_at = ${session.expiresAt}, credential_version = ${session.credentialVersion}, parent_grant_until = ${session.parentGrantUntil}, parent_grant_hash = ${session.parentGrantHash}, mode = ${session.mode}, change_kind = ${session.changeKind}
      where token_hash = ${session.tokenHash}
    `;
  }

  async revokeSessions(accountId: string): Promise<void> {
    await this.db`
      update hoc_vui_private.auth_sessions
      set revoked_at = now(), parent_grant_until = null, parent_grant_hash = null
      where account_id = ${accountId}::uuid and revoked_at is null
    `;
  }
}
