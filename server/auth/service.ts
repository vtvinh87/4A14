import {
  DEFAULT_AVATAR_ID,
  DEFAULT_STUDENT_PIN,
  calendarDateInTimeZone,
  normalizeUsername,
  validateAvatarId,
  validateBirthDate,
  validateDisplayName,
  validatePin,
  validateUsername,
  type StudentProfilePatch,
  type StudentProfileView,
} from '../../shared/account-contracts.ts';
import { credentialAlgorithm, hashSecret, hashToken, randomToken, randomUuid, verifySecret } from './crypto.ts';
import type { AccountView, AdminAuditRecord, AuthFailure, AuthRepository, AuthResult, AuthSessionView, CredentialKind, CredentialRecord, ServerAccountRecord, ServerSessionRecord, SessionAccountView } from './types.ts';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PARENT_GRANT_TTL_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const DEFAULT_ADMIN_PASSWORD = '123456@';

function nowIso(): string { return new Date().toISOString(); }
function id(): string { return randomUuid(); }
function accountView(account: ServerAccountRecord | SessionAccountView): AccountView {
  return { id: account.id, username: account.username, displayName: account.displayName, role: account.role, active: account.active, credentialVersion: account.credentialVersion };
}
function profileView(account: ServerAccountRecord): StudentProfileView {
  return {
    accountId: account.id,
    username: account.username,
    displayName: account.displayName,
    avatarId: account.avatarId ?? DEFAULT_AVATAR_ID,
    birthDate: account.birthDate ?? null,
    birthdayWishesEnabled: account.birthdayWishesEnabled ?? false,
  };
}
function credentialFrom(hash: Awaited<ReturnType<typeof hashSecret>>, mustChange: boolean, version = 1): CredentialRecord {
  return { ...hash, mustChange, version };
}
function credentialFor(account: ServerAccountRecord, kind: CredentialKind): CredentialRecord | undefined {
  return kind === 'student' ? account.studentCredential : kind === 'parent' ? account.parentCredential : account.adminCredential;
}
function isGrantActive(value: string | null, clock: () => Date): boolean { return Boolean(value && Date.parse(value) > clock().getTime()); }

function invalidProfile(message: string): AuthFailure {
  return { ok: false, code: 'invalid', message };
}

function validateProfilePatch(patch: unknown, suppliedDate: string): { ok: true; value: StudentProfilePatch } | { ok: false; message: string } {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, message: 'Dữ liệu hồ sơ không hợp lệ.' };
  const candidate = patch as Record<string, unknown>;
  const allowed = new Set(['displayName', 'avatarId', 'birthDate']);
  if (Object.keys(candidate).some((key) => !allowed.has(key))) return { ok: false, message: 'Hồ sơ chỉ cho phép tên hiển thị, avatar và ngày sinh.' };

  const normalized: StudentProfilePatch = {};
  if (Object.prototype.hasOwnProperty.call(candidate, 'displayName')) {
    if (typeof candidate.displayName !== 'string') return { ok: false, message: 'Tên hiển thị không hợp lệ.' };
    const validName = validateDisplayName(candidate.displayName);
    if (!validName.ok) return validName;
    normalized.displayName = validName.value;
  }
  if (Object.prototype.hasOwnProperty.call(candidate, 'avatarId')) {
    const validAvatar = validateAvatarId(candidate.avatarId);
    if (!validAvatar.ok) return validAvatar;
    normalized.avatarId = validAvatar.value;
  }
  if (Object.prototype.hasOwnProperty.call(candidate, 'birthDate')) {
    const validBirthDate = validateBirthDate(candidate.birthDate as string | null, suppliedDate);
    if (!validBirthDate.ok) return validBirthDate;
    normalized.birthDate = validBirthDate.value;
  }
  return { ok: true, value: normalized };
}

function auditRecord(actorId: string, action: string, subjectId: string | null, metadata: Record<string, unknown>, clock: () => Date): AdminAuditRecord {
  return { id: randomUuid(), actorId, action, subjectId, result: 'success', metadata, createdAt: clock().toISOString() };
}

function viewSession(token: string, account: ServerAccountRecord | SessionAccountView, record: ServerSessionRecord): AuthSessionView {
  return {
    token,
    account: accountView(account),
    mode: record.mode,
    changeKind: record.changeKind,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    ...(record.parentGrantUntil ? { parentGrantUntil: record.parentGrantUntil } : {}),
  };
}

export function createAuthService(repository: AuthRepository, clock: () => Date = () => new Date()) {
  const ready = bootstrap(repository);

  async function currentSession(token: string): Promise<{ account: ServerAccountRecord; session: ServerSessionRecord } | AuthFailure> {
    await ready;
    const session = await repository.findSession(hashToken(token));
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= clock().getTime()) return { ok: false, code: 'expired', message: 'Phiên đăng nhập đã hết; hãy đăng nhập lại.' };
    const account = await repository.findAccountById(session.accountId);
    if (!account || !account.active || account.credentialVersion !== session.credentialVersion) return { ok: false, code: 'forbidden', message: 'Tài khoản không còn hoạt động trong phiên này.' };
    return { account, session };
  }

  async function currentFullStudent(token: string): Promise<{ account: ServerAccountRecord; session: ServerSessionRecord } | AuthFailure> {
    const current = await currentSession(token);
    if ('ok' in current) return current;
    if (current.account.role !== 'student' || current.session.mode !== 'full') return { ok: false, code: 'forbidden', message: 'Hãy hoàn tất bước đổi PIN trước khi mở hồ sơ.' };
    return current;
  }

  async function currentParentGrant(token: string, parentGrantToken: string | undefined, invalidGrantMessage = 'Cần nhập lại PIN phụ huynh để mở hồ sơ.'): Promise<{ account: ServerAccountRecord; session: ServerSessionRecord } | AuthFailure> {
    const current = await currentSession(token);
    if ('ok' in current) return current;
    const { account, session } = current;
    if (account.role !== 'student' || session.mode !== 'full' || !parentGrantToken || !session.parentGrantHash || session.parentGrantHash !== hashToken(parentGrantToken) || !isGrantActive(session.parentGrantUntil, clock)) {
      return { ok: false, code: 'forbidden', message: invalidGrantMessage };
    }
    return current;
  }

  async function createSession(account: ServerAccountRecord, mode: ServerSessionRecord['mode'], changeKind: ServerSessionRecord['changeKind'], parentGrantUntil: string | null = null): Promise<AuthResult> {
    const token = randomToken();
    const parentGrantToken = parentGrantUntil ? randomToken() : undefined;
    const createdAt = clock().toISOString();
    const ttl = account.role === 'admin' ? ADMIN_SESSION_TTL_MS : SESSION_TTL_MS;
    const record: ServerSessionRecord = { id: id(), tokenHash: hashToken(token), accountId: account.id, mode, changeKind, createdAt, expiresAt: new Date(clock().getTime() + ttl).toISOString(), revokedAt: null, credentialVersion: account.credentialVersion, parentGrantUntil, parentGrantHash: parentGrantToken ? hashToken(parentGrantToken) : null };
    await repository.insertSession(record);
    return { ok: true, token, session: viewSession(token, account, record), ...(mode === 'change-only' ? { mustChange: true } : {}), ...(parentGrantUntil ? { parentGrantUntil, parentGrantToken } : {}) };
  }

  async function checkLogin(account: ServerAccountRecord | null): Promise<AuthFailure | null> {
    if (!account) return { ok: false, code: 'invalid', message: 'Thông tin đăng nhập chưa đúng.' };
    if (!account.active) return { ok: false, code: 'inactive', message: 'Tài khoản này đang tạm khóa; hãy nhờ Admin mở lại.' };
    if (account.lockedUntil && Date.parse(account.lockedUntil) > clock().getTime()) return { ok: false, code: 'locked', message: 'Tài khoản đang tạm nghỉ 30 giây sau nhiều lần nhập sai.' };
    if (account.lockedUntil) { account.lockedUntil = null; account.failedAttempts = 0; await repository.updateAccount(account); }
    return null;
  }

  async function loginWithCredential(username: string, secret: string, kind: 'student' | 'admin'): Promise<AuthResult> {
    await ready;
    const account = await repository.findAccountByUsername(normalizeUsername(username));
    const failure = await checkLogin(account);
    if (failure) return failure;
    const credential = account && credentialFor(account, kind);
    if (!account || !credential || !(await verifySecret(secret, credential))) {
      if (account) {
        account.failedAttempts += 1;
        if (account.failedAttempts >= MAX_FAILED_ATTEMPTS) { account.lockedUntil = new Date(clock().getTime() + LOCKOUT_MS).toISOString(); account.failedAttempts = 0; }
        account.updatedAt = clock().toISOString();
        await repository.updateAccount(account);
      }
      return { ok: false, code: 'invalid', message: kind === 'admin' ? 'Thông tin quản trị chưa đúng.' : 'Tên tài khoản hoặc mã PIN chưa đúng.' };
    }
    account.failedAttempts = 0;
    account.updatedAt = clock().toISOString();
    await repository.updateAccount(account);
    return createSession(account, credential.mustChange ? 'change-only' : 'full', credential.mustChange && kind === 'student' ? kind : null);
  }

  return {
    loginStudent: (username: string, pin: string) => loginWithCredential(username, pin, 'student'),
    loginAdmin: (username: string, password: string) => loginWithCredential(username, password, 'admin'),
    async getSession(token: string): Promise<AuthSessionView | AuthFailure> {
      await ready;
      const current = await repository.findSessionContext(hashToken(token));
      if (!current || current.session.revokedAt || Date.parse(current.session.expiresAt) <= clock().getTime()) {
        return { ok: false, code: 'expired', message: 'Phiên đăng nhập đã hết; hãy đăng nhập lại.' };
      }
      if (!current.account || !current.account.active || current.account.credentialVersion !== current.session.credentialVersion) {
        return { ok: false, code: 'forbidden', message: 'Tài khoản không còn hoạt động trong phiên này.' };
      }
      return viewSession(token, current.account, current.session);
    },
    async clearParentGrant(token: string): Promise<void> {
      const session = await repository.findSession(hashToken(token));
      if (!session || session.revokedAt) return;
      session.parentGrantUntil = null;
      session.parentGrantHash = null;
      await repository.updateSession(session);
    },
    async changeAdminPassword(token: string, currentPassword: string, nextPassword: string): Promise<AuthResult> {
      const current = await currentSession(token);
      if ('ok' in current) return current;
      if (current.account.role !== 'admin' || current.session.mode !== 'full') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới đổi được mật khẩu quản trị.' };
      if (nextPassword.length < 7 || nextPassword.length > 128) return { ok: false, code: 'invalid', message: 'Mật khẩu quản trị phải dài từ 7 đến 128 ký tự.' };
      const existing = current.account.adminCredential;
      if (!existing || !(await verifySecret(currentPassword, existing))) return { ok: false, code: 'invalid', message: 'Mật khẩu hiện tại chưa đúng.' };
      current.account.adminCredential = credentialFrom(await hashSecret(nextPassword), false, (existing.version ?? 0) + 1);
      current.account.credentialVersion += 1;
      current.account.updatedAt = clock().toISOString();
      await repository.updateAccount(current.account);
      await repository.revokeSessions(current.account.id);
      await repository.insertAdminAudit(auditRecord(current.account.id, 'admin_password_changed', current.account.id, {}, clock));
      return createSession(current.account, 'full', null);
    },
    async changePin(token: string, currentSecret: string, nextPin: string, kind: 'student' | 'parent'): Promise<AuthResult> {
      const current = await currentSession(token);
      if ('ok' in current) return current;
      const { account, session } = current;
      if (account.role !== 'student') return { ok: false, code: 'forbidden', message: 'Chỉ tài khoản học sinh mới có PIN phụ huynh.' };
      if (session.mode === 'change-only' && session.changeKind !== kind) return { ok: false, code: 'forbidden', message: 'Phiên này chỉ cho phép hoàn tất bước đổi mã được yêu cầu.' };
      if (kind === 'parent' && session.mode === 'full' && !isGrantActive(session.parentGrantUntil, clock)) return { ok: false, code: 'forbidden', message: 'Hãy mở Góc phụ huynh bằng PIN trước.' };
      const valid = validatePin(nextPin);
      if (!valid.ok || valid.value === DEFAULT_STUDENT_PIN) return { ok: false, code: 'invalid', message: valid.ok ? 'Hãy chọn một mã PIN khác mã mặc định.' : valid.message };
      const existing = credentialFor(account, kind);
      if (!existing || !(await verifySecret(currentSecret, existing))) return { ok: false, code: 'invalid', message: 'Mã PIN hiện tại chưa đúng.' };
      const next = credentialFrom(await hashSecret(valid.value), false, existing.version + 1);
      if (kind === 'student') account.studentCredential = next;
      else account.parentCredential = next;
      account.credentialVersion += 1;
      account.updatedAt = clock().toISOString();
      await repository.updateAccount(account);
      await repository.revokeSessions(account.id);
      // Completing a first-use PIN change is not itself a parent unlock. The
      // user must explicitly pass through the parent PIN gate afterwards.
      return createSession(account, 'full', null);
    },
    async unlockParent(token: string, pin: string): Promise<AuthResult> {
      const current = await currentSession(token);
      if ('ok' in current) return current;
      const { account, session } = current;
      if (account.role !== 'student' || session.mode !== 'full') return { ok: false, code: 'forbidden', message: 'Hãy hoàn tất đăng nhập tài khoản học sinh trước.' };
      const credential = account.parentCredential;
      if (!credential || !(await verifySecret(pin, credential))) return { ok: false, code: 'invalid', message: 'Mã PIN phụ huynh chưa đúng.' };
      if (credential.mustChange) return createSession(account, 'change-only', 'parent');
      return createSession(account, 'full', null, new Date(clock().getTime() + PARENT_GRANT_TTL_MS).toISOString());
    },
    async getParentDashboard(token: string, parentGrantToken: string | undefined, requestedStudentId?: string): Promise<{ ok: true; studentId: string; session: AuthSessionView } | AuthFailure> {
      const current = await currentParentGrant(token, parentGrantToken, 'Cần nhập lại PIN phụ huynh để mở Dashboard.');
      if ('ok' in current) return current;
      const { account, session } = current;
      if (requestedStudentId && requestedStudentId !== account.id) return { ok: false, code: 'forbidden', message: 'Dashboard chỉ hiển thị dữ liệu của con đang đăng nhập.' };
      return { ok: true, studentId: account.id, session: viewSession(token, account, session) };
    },
    async getStudentProfile(token: string): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure> {
      const current = await currentFullStudent(token);
      if ('ok' in current) return current;
      return { ok: true, profile: profileView(current.account) };
    },
    async updateStudentProfile(token: string, patch: StudentProfilePatch): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure> {
      const current = await currentFullStudent(token);
      if ('ok' in current) return current;
      const validPatch = validateProfilePatch(patch, calendarDateInTimeZone(clock()));
      if (!validPatch.ok) return invalidProfile(validPatch.message);
      const { account } = current;
      if (validPatch.value.displayName !== undefined) account.displayName = validPatch.value.displayName;
      if (validPatch.value.avatarId !== undefined) account.avatarId = validPatch.value.avatarId;
      if (validPatch.value.birthDate !== undefined) account.birthDate = validPatch.value.birthDate;
      account.updatedAt = clock().toISOString();
      await repository.updateAccount(account);
      return { ok: true, profile: profileView(account) };
    },
    async getParentProfile(token: string, parentGrantToken: string | undefined): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure> {
      const current = await currentParentGrant(token, parentGrantToken);
      if ('ok' in current) return current;
      return { ok: true, profile: profileView(current.account) };
    },
    async updateParentProfilePreferences(token: string, parentGrantToken: string | undefined, enabled: boolean): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure> {
      const current = await currentParentGrant(token, parentGrantToken);
      if ('ok' in current) return current;
      if (typeof enabled !== 'boolean') return invalidProfile('Tùy chọn lời chúc sinh nhật không hợp lệ.');
      current.account.birthdayWishesEnabled = enabled;
      current.account.updatedAt = clock().toISOString();
      await repository.updateAccount(current.account);
      return { ok: true, profile: profileView(current.account) };
    },
    async logout(token: string): Promise<void> {
      const session = await repository.findSession(hashToken(token));
      if (!session) return;
      session.revokedAt = clock().toISOString();
      session.parentGrantUntil = null;
      session.parentGrantHash = null;
      await repository.updateSession(session);
    },
    async listStudents(token: string): Promise<{ ok: true; accounts: AccountView[] } | AuthFailure> {
      const current = await currentSession(token);
      if ('ok' in current) return current;
      if (current.account.role !== 'admin' || current.session.mode !== 'full') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới xem được danh sách.' };
      return { ok: true, accounts: (await repository.listStudents()).map(accountView) };
    },
    async createStudent(token: string, username: string, displayName: string): Promise<{ ok: true; account: AccountView } | AuthFailure> {
      const current = await currentSession(token);
      if ('ok' in current) return current;
      if (current.account.role !== 'admin' || current.session.mode !== 'full') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới tạo được tài khoản học sinh.' };
      const validUsername = validateUsername(username);
      if (!validUsername.ok) return { ok: false, code: 'invalid', message: validUsername.message };
      const validName = validateDisplayName(displayName);
      if (!validName.ok) return { ok: false, code: 'invalid', message: validName.message };
      const studentCredential = credentialFrom(await hashSecret(DEFAULT_STUDENT_PIN), true);
      const parentCredential = credentialFrom(await hashSecret(DEFAULT_STUDENT_PIN), true);
      const timestamp = clock().toISOString();
      const account: ServerAccountRecord = { id: id(), username: validUsername.value, displayName: validName.value, role: 'student', active: true, avatarId: DEFAULT_AVATAR_ID, birthDate: null, birthdayWishesEnabled: false, createdAt: timestamp, updatedAt: timestamp, studentCredential, parentCredential, credentialVersion: 1, failedAttempts: 0, lockedUntil: null };
      try { await repository.insertAccount(account); } catch (error) { if (error instanceof Error && error.message === 'username_conflict') return { ok: false, code: 'conflict', message: 'Tên tài khoản này đã được dùng.' }; throw error; }
      await repository.insertAdminAudit(auditRecord(current.account.id, 'student_created', account.id, { username: account.username }, clock));
      return { ok: true, account: accountView(account) };
    },
    async updateStudent(token: string, studentId: string, patch: { displayName?: string; active?: boolean }): Promise<{ ok: true; account: AccountView } | AuthFailure> {
      const current = await currentSession(token);
      if ('ok' in current) return current;
      if (current.account.role !== 'admin' || current.session.mode !== 'full') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới sửa được tài khoản học sinh.' };
      const account = await repository.findAccountById(studentId);
      if (!account || account.role !== 'student') return { ok: false, code: 'invalid', message: 'Không tìm thấy tài khoản học sinh.' };
      if (patch.displayName !== undefined) {
        const validName = validateDisplayName(patch.displayName);
        if (!validName.ok) return { ok: false, code: 'invalid', message: validName.message };
        account.displayName = validName.value;
      }
      if (patch.active !== undefined && patch.active !== account.active) {
        account.active = patch.active;
        account.credentialVersion += 1;
        await repository.revokeSessions(account.id);
      }
      account.updatedAt = clock().toISOString();
      await repository.updateAccount(account);
      await repository.insertAdminAudit(auditRecord(current.account.id, 'student_updated', account.id, { fields: Object.keys(patch) }, clock));
      return { ok: true, account: accountView(account) };
    },
    async resetPin(token: string, studentId: string, kind: 'student' | 'parent'): Promise<{ ok: true } | AuthFailure> {
      const current = await currentSession(token);
      if ('ok' in current) return current;
      if (current.account.role !== 'admin' || current.session.mode !== 'full') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới đặt lại được PIN.' };
      const account = await repository.findAccountById(studentId);
      if (!account || account.role !== 'student') return { ok: false, code: 'invalid', message: 'Không tìm thấy tài khoản học sinh.' };
      const field = kind === 'student' ? 'studentCredential' : 'parentCredential';
      account[field] = credentialFrom(await hashSecret(DEFAULT_STUDENT_PIN), true, (account[field]?.version ?? 0) + 1);
      account.credentialVersion += 1;
      account.updatedAt = clock().toISOString();
      await repository.updateAccount(account);
      await repository.revokeSessions(account.id);
      await repository.insertAdminAudit(auditRecord(current.account.id, `${kind}_pin_reset`, account.id, {}, clock));
      return { ok: true };
    },
  };
}

async function bootstrap(repository: AuthRepository): Promise<void> {
  const existing = await repository.findAccountByUsername('admin');
  if (existing) return;
  const timestamp = new Date().toISOString();
  const credential = credentialFrom(await hashSecret(DEFAULT_ADMIN_PASSWORD), false);
  try {
    await repository.insertAccount({ id: id(), username: 'admin', displayName: 'Quản trị viên', role: 'admin', active: true, avatarId: DEFAULT_AVATAR_ID, birthDate: null, birthdayWishesEnabled: false, createdAt: timestamp, updatedAt: timestamp, adminCredential: credential, credentialVersion: 1, failedAttempts: 0, lockedUntil: null });
  } catch (error) {
    // Two cold-starting function instances may both observe an empty database.
    // The unique username constraint makes the second insert harmless.
    if (error instanceof Error && error.message === 'username_conflict') return;
    throw error;
  }
}
