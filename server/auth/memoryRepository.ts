import { DEFAULT_AVATAR_ID } from '../../shared/account-contracts';
import type { AdminAuditRecord, AuthRepository, ServerAccountRecord, ServerSessionRecord } from './types';

function cloneAccount(account: ServerAccountRecord): ServerAccountRecord {
  return structuredClone({
    ...account,
    avatarId: account.avatarId ?? DEFAULT_AVATAR_ID,
    birthDate: account.birthDate ?? null,
    birthdayWishesEnabled: account.birthdayWishesEnabled ?? false,
  });
}

export class MemoryAuthRepository implements AuthRepository {
  readonly accounts = new Map<string, ServerAccountRecord>();
  readonly sessions = new Map<string, ServerSessionRecord>();
  readonly audits: AdminAuditRecord[] = [];

  async findAccountByUsername(username: string): Promise<ServerAccountRecord | null> {
    const account = [...this.accounts.values()].find((item) => item.username === username);
    return account ? cloneAccount(account) : null;
  }

  async findAccountById(id: string): Promise<ServerAccountRecord | null> {
    const account = this.accounts.get(id);
    return account ? cloneAccount(account) : null;
  }

  async listStudents(): Promise<ServerAccountRecord[]> {
    return [...this.accounts.values()].filter((account) => account.role === 'student').map(cloneAccount);
  }

  async insertAccount(account: ServerAccountRecord): Promise<void> {
    if ([...this.accounts.values()].some((item) => item.username === account.username)) throw new Error('username_conflict');
    this.accounts.set(account.id, cloneAccount(account));
  }

  async updateAccount(account: ServerAccountRecord): Promise<void> {
    this.accounts.set(account.id, cloneAccount(account));
  }

  async insertSession(session: ServerSessionRecord): Promise<void> {
    this.sessions.set(session.tokenHash, structuredClone(session));
  }

  async findSession(tokenHash: string): Promise<ServerSessionRecord | null> {
    const session = this.sessions.get(tokenHash);
    return session ? structuredClone(session) : null;
  }

  async updateSession(session: ServerSessionRecord): Promise<void> {
    this.sessions.set(session.tokenHash, structuredClone(session));
  }

  async revokeSessions(accountId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.accountId === accountId && !session.revokedAt) {
        this.sessions.set(session.tokenHash, { ...session, revokedAt: new Date().toISOString(), parentGrantUntil: null, parentGrantHash: null });
      }
    }
  }

  async insertAdminAudit(audit: AdminAuditRecord): Promise<void> {
    this.audits.push(structuredClone(audit));
  }
}
