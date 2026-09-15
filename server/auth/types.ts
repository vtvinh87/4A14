import type { AvatarId, StudentProfilePatch, StudentProfileView } from '../../shared/account-contracts';

export type ServerRole = 'student' | 'admin';
export type CredentialKind = 'student' | 'parent' | 'admin';
export type SessionMode = 'full' | 'change-only';

export type CredentialRecord = {
  hash: string;
  salt: string;
  algorithm: string;
  mustChange: boolean;
  version: number;
};

export type ServerAccountRecord = {
  id: string;
  username: string;
  displayName: string;
  role: ServerRole;
  active: boolean;
  avatarId: AvatarId;
  birthDate: string | null;
  birthdayWishesEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  studentCredential?: CredentialRecord;
  parentCredential?: CredentialRecord;
  adminCredential?: CredentialRecord;
  credentialVersion: number;
  failedAttempts: number;
  lockedUntil: string | null;
};

export type ServerSessionRecord = {
  id: string;
  tokenHash: string;
  accountId: string;
  mode: SessionMode;
  changeKind: 'student' | 'parent' | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  credentialVersion: number;
  parentGrantUntil: string | null;
  parentGrantHash: string | null;
};

export type AdminAuditRecord = {
  id: string;
  actorId: string;
  action: string;
  subjectId: string | null;
  result: 'success' | 'failure';
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AccountView = Pick<ServerAccountRecord, 'id' | 'username' | 'displayName' | 'role' | 'active' | 'credentialVersion'>;

export type AuthSessionView = {
  token: string;
  account: AccountView;
  mode: SessionMode;
  changeKind: 'student' | 'parent' | null;
  createdAt: string;
  expiresAt: string;
  parentGrantUntil?: string;
};

export type AuthFailureCode = 'invalid' | 'locked' | 'inactive' | 'conflict' | 'forbidden' | 'change-required' | 'expired';
export type AuthFailure = { ok: false; code: AuthFailureCode; message: string };

export type AuthSuccess = { ok: true; token: string; session: AuthSessionView; mustChange?: boolean; parentGrantUntil?: string; parentGrantToken?: string };
export type AuthResult = AuthSuccess | AuthFailure;

export type StudentProfileResult = { ok: true; profile: StudentProfileView } | AuthFailure;
export type StudentProfileUpdate = StudentProfilePatch;

export type AuthRepository = {
  findAccountByUsername(username: string): Promise<ServerAccountRecord | null>;
  findAccountById(id: string): Promise<ServerAccountRecord | null>;
  listStudents(): Promise<ServerAccountRecord[]>;
  insertAccount(account: ServerAccountRecord): Promise<void>;
  updateAccount(account: ServerAccountRecord): Promise<void>;
  insertSession(session: ServerSessionRecord): Promise<void>;
  findSession(tokenHash: string): Promise<ServerSessionRecord | null>;
  updateSession(session: ServerSessionRecord): Promise<void>;
  revokeSessions(accountId: string): Promise<void>;
  insertAdminAudit(audit: AdminAuditRecord): Promise<void>;
};
