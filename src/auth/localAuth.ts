import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_STUDENT_PIN,
  isDefaultPin,
  normalizeUsername,
  validateDisplayName,
  validatePin,
  validateUsername,
  type AccountRecord,
  type AuthSession,
  type AuthenticatedAccount,
} from './account';

const AUTH_STATE_KEY = 'hoc-vui-auth-v1';
const SESSION_KEY = 'hoc-vui-auth-session-v1';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PARENT_GRANT_TTL_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

type LocalAuthState = {
  schemaVersion: 1;
  accounts: AccountRecord[];
};

export type AuthErrorCode = 'invalid' | 'locked' | 'inactive' | 'conflict' | 'forbidden' | 'change-required';
export type AuthFailure = { ok: false; code: AuthErrorCode; message: string };
export type AuthSuccess = { ok: true; session: AuthSession; mustChange?: boolean; parentGrantUntil?: string };
export type AuthResult = AuthSuccess | AuthFailure;

function getStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Local fallback only. Production credential hashing is implemented in the server adapter. */
function hashSecret(secret: string, salt: string): string {
  let hash = 2166136261;
  const input = `${salt}:${secret}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function createCredential(secret: string): { hash: string; salt: string } {
  const salt = randomId('salt');
  return { salt, hash: hashSecret(secret, salt) };
}

function accountView(account: AccountRecord): AuthenticatedAccount {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    studentId: account.studentId,
    active: account.active,
    credentialVersion: account.credentialVersion,
  };
}

function createAdminAccount(): AccountRecord {
  const credential = createCredential(DEFAULT_ADMIN_PASSWORD);
  const now = nowIso();
  return {
    id: 'account-admin',
    username: 'admin',
    displayName: 'Quản trị viên',
    role: 'admin',
    active: true,
    createdAt: now,
    updatedAt: now,
    studentPinHash: '',
    studentPinSalt: '',
    studentPinMustChange: false,
    adminPasswordHash: credential.hash,
    adminPasswordSalt: credential.salt,
    adminPasswordMustChange: false,
    credentialVersion: 1,
  };
}

function readState(): LocalAuthState {
  const storage = getStorage('local');
  if (!storage) return { schemaVersion: 1, accounts: [createAdminAccount()] };
  try {
    const raw = storage.getItem(AUTH_STATE_KEY);
    if (!raw) return writeState({ schemaVersion: 1, accounts: [createAdminAccount()] });
    const value = JSON.parse(raw) as LocalAuthState;
    if (value?.schemaVersion !== 1 || !Array.isArray(value.accounts)) throw new Error('schema');
    return value;
  } catch {
    return writeState({ schemaVersion: 1, accounts: [createAdminAccount()] });
  }
}

function writeState(state: LocalAuthState): LocalAuthState {
  try { getStorage('local')?.setItem(AUTH_STATE_KEY, JSON.stringify(state)); } catch { /* best effort in local mode */ }
  return state;
}

function saveSession(session: AuthSession | null): void {
  const storage = getStorage('session');
  if (!storage) return;
  try {
    if (session) storage.setItem(SESSION_KEY, JSON.stringify(session));
    else storage.removeItem(SESSION_KEY);
  } catch { /* best effort */ }
}

function readSession(): AuthSession | null {
  const storage = getStorage('session');
  if (!storage) return null;
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.token || !session.account?.id || Date.parse(session.expiresAt) <= Date.now()) {
      storage.removeItem(SESSION_KEY);
      return null;
    }
    // Parent unlock is intentionally page-scoped and must not survive a refresh.
    if (session.parentGrantUntil) {
      delete session.parentGrantUntil;
      storage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

function sessionFor(account: AccountRecord, mustChange = false, parentGrantUntil?: string): AuthSession {
  const createdAt = nowIso();
  return {
    token: randomId('session'),
    account: accountView(account),
    mustChange,
    createdAt,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    ...(parentGrantUntil ? { parentGrantUntil } : {}),
  };
}

function currentAccount(state: LocalAuthState): { account: AccountRecord; session: AuthSession } | null {
  const session = readSession();
  if (!session) return null;
  const account = state.accounts.find((item) => item.id === session.account.id);
  if (!account || !account.active || account.credentialVersion !== session.account.credentialVersion) {
    saveSession(null);
    return null;
  }
  return { account, session };
}

function verify(account: AccountRecord, secret: string, kind: 'student' | 'parent' | 'admin'): boolean {
  const hash = kind === 'student' ? account.studentPinHash : kind === 'parent' ? account.parentPinHash : account.adminPasswordHash;
  const salt = kind === 'student' ? account.studentPinSalt : kind === 'parent' ? account.parentPinSalt : account.adminPasswordSalt;
  return Boolean(hash && salt && hashSecret(secret, salt) === hash);
}

function registerFailure(state: LocalAuthState, account: AccountRecord): void {
  const current = account.failedAttempts ?? 0;
  account.failedAttempts = current + 1;
  if (account.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    account.lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
    account.failedAttempts = 0;
  }
  account.updatedAt = nowIso();
  writeState(state);
}

function rejectIfLocked(account: AccountRecord): AuthFailure | null {
  if (!account.lockedUntil) return null;
  if (Date.parse(account.lockedUntil) > Date.now()) return { ok: false, code: 'locked', message: 'Tài khoản đang tạm nghỉ 30 giây sau nhiều lần nhập sai.' };
  account.lockedUntil = undefined;
  return null;
}

export async function loginStudent(username: string, pin: string): Promise<AuthResult> {
  const state = readState();
  const normalized = normalizeUsername(username);
  const account = state.accounts.find((item) => item.role === 'student' && item.username === normalized);
  if (!account) return { ok: false, code: 'invalid', message: 'Tên tài khoản hoặc mã PIN chưa đúng.' };
  if (!account.active) return { ok: false, code: 'inactive', message: 'Tài khoản này đang tạm khóa; hãy nhờ Admin mở lại.' };
  const lock = rejectIfLocked(account);
  if (lock) return lock;
  if (!verify(account, pin, 'student')) {
    registerFailure(state, account);
    return { ok: false, code: 'invalid', message: 'Tên tài khoản hoặc mã PIN chưa đúng.' };
  }
  account.failedAttempts = 0;
  writeState(state);
  const session = sessionFor(account, account.studentPinMustChange);
  saveSession(session);
  return { ok: true, session, mustChange: session.mustChange };
}

export async function loginAdmin(username: string, password: string): Promise<AuthResult> {
  const state = readState();
  const account = state.accounts.find((item) => item.role === 'admin' && item.username === normalizeUsername(username));
  if (!account) return { ok: false, code: 'invalid', message: 'Thông tin quản trị chưa đúng.' };
  const lock = rejectIfLocked(account);
  if (lock) return lock;
  if (!verify(account, password, 'admin')) {
    registerFailure(state, account);
    return { ok: false, code: 'invalid', message: 'Thông tin quản trị chưa đúng.' };
  }
  account.failedAttempts = 0;
  writeState(state);
  const session = sessionFor(account, false);
  saveSession(session);
  return { ok: true, session };
}

export async function createStudentAccount(adminToken: string, username: string, displayName: string): Promise<{ ok: true; account: AuthenticatedAccount } | AuthFailure> {
  const state = readState();
  const current = currentAccount(state);
  if (!current || current.session.token !== adminToken || current.account.role !== 'admin') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới tạo được tài khoản học sinh.' };
  const validUsername = validateUsername(username);
  if (!validUsername.ok) return { ok: false, code: 'invalid', message: validUsername.message };
  const validName = validateDisplayName(displayName);
  if (!validName.ok) return { ok: false, code: 'invalid', message: validName.message };
  if (state.accounts.some((item) => item.username === validUsername.value)) return { ok: false, code: 'conflict', message: 'Tên tài khoản này đã được dùng.' };
  const studentPin = createCredential(DEFAULT_STUDENT_PIN);
  const parentPin = createCredential(DEFAULT_STUDENT_PIN);
  const now = nowIso();
  const account: AccountRecord = {
    id: randomId('student'),
    username: validUsername.value,
    displayName: validName.value,
    role: 'student',
    active: true,
    createdAt: now,
    updatedAt: now,
    studentId: undefined,
    studentPinHash: studentPin.hash,
    studentPinSalt: studentPin.salt,
    studentPinMustChange: true,
    parentPinHash: parentPin.hash,
    parentPinSalt: parentPin.salt,
    parentPinMustChange: true,
    credentialVersion: 1,
  };
  account.studentId = account.id;
  state.accounts.push(account);
  writeState(state);
  return { ok: true, account: accountView(account) };
}

export function listStudentAccounts(adminToken: string): AuthenticatedAccount[] {
  const state = readState();
  const current = currentAccount(state);
  if (!current || current.session.token !== adminToken || current.account.role !== 'admin') return [];
  return state.accounts.filter((item) => item.role === 'student').map(accountView);
}

export function resetStudentPin(adminToken: string, studentId: string): AuthResult | { ok: true } {
  const state = readState();
  const current = currentAccount(state);
  if (!current || current.session.token !== adminToken || current.account.role !== 'admin') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới đặt lại được PIN.' };
  const account = state.accounts.find((item) => item.id === studentId && item.role === 'student');
  if (!account) return { ok: false, code: 'invalid', message: 'Không tìm thấy tài khoản học sinh.' };
  const credential = createCredential(DEFAULT_STUDENT_PIN);
  account.studentPinHash = credential.hash;
  account.studentPinSalt = credential.salt;
  account.studentPinMustChange = true;
  account.credentialVersion += 1;
  account.updatedAt = nowIso();
  writeState(state);
  return { ok: true };
}

export function resetParentPin(adminToken: string, studentId: string): AuthResult | { ok: true } {
  const state = readState();
  const current = currentAccount(state);
  if (!current || current.session.token !== adminToken || current.account.role !== 'admin') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới đặt lại được PIN.' };
  const account = state.accounts.find((item) => item.id === studentId && item.role === 'student');
  if (!account) return { ok: false, code: 'invalid', message: 'Không tìm thấy tài khoản học sinh.' };
  const credential = createCredential(DEFAULT_STUDENT_PIN);
  account.parentPinHash = credential.hash;
  account.parentPinSalt = credential.salt;
  account.parentPinMustChange = true;
  account.credentialVersion += 1;
  account.updatedAt = nowIso();
  writeState(state);
  return { ok: true };
}

export function toggleStudentActive(adminToken: string, studentId: string): { ok: true; active: boolean } | AuthFailure {
  const state = readState();
  const current = currentAccount(state);
  if (!current || current.session.token !== adminToken || current.account.role !== 'admin') return { ok: false, code: 'forbidden', message: 'Chỉ Admin mới đổi trạng thái tài khoản.' };
  const account = state.accounts.find((item) => item.id === studentId && item.role === 'student');
  if (!account) return { ok: false, code: 'invalid', message: 'Không tìm thấy tài khoản học sinh.' };
  account.active = !account.active;
  account.credentialVersion += 1;
  account.updatedAt = nowIso();
  writeState(state);
  return { ok: true, active: account.active };
}

export async function updatePin(token: string, kind: 'student' | 'parent', currentPin: string, newPin: string): Promise<AuthResult> {
  const state = readState();
  const current = currentAccount(state);
  if (!current || current.session.token !== token || current.account.role !== 'student') return { ok: false, code: 'forbidden', message: 'Phiên đăng nhập đã hết; hãy đăng nhập lại.' };
  const valid = validatePin(newPin);
  if (!valid.ok) return { ok: false, code: 'invalid', message: valid.message };
  if (isDefaultPin(newPin)) return { ok: false, code: 'invalid', message: 'Hãy chọn một mã PIN khác mã mặc định.' };
  if (kind === 'student' && !verify(current.account, currentPin, 'student')) return { ok: false, code: 'invalid', message: 'Mã PIN hiện tại chưa đúng.' };
  if (kind === 'parent' && !verify(current.account, currentPin, 'parent')) return { ok: false, code: 'invalid', message: 'Mã PIN phụ huynh hiện tại chưa đúng.' };
  const credential = createCredential(newPin);
  if (kind === 'student') {
    current.account.studentPinHash = credential.hash;
    current.account.studentPinSalt = credential.salt;
    current.account.studentPinMustChange = false;
  } else {
    current.account.parentPinHash = credential.hash;
    current.account.parentPinSalt = credential.salt;
    current.account.parentPinMustChange = false;
  }
  current.account.credentialVersion += 1;
  current.account.updatedAt = nowIso();
  writeState(state);
  const parentGrantUntil = kind === 'parent' ? new Date(Date.now() + PARENT_GRANT_TTL_MS).toISOString() : undefined;
  const session = sessionFor(current.account, false, parentGrantUntil);
  saveSession(session);
  return { ok: true, session, parentGrantUntil };
}

export async function unlockParent(token: string, pin: string): Promise<{ ok: true; token: string; mustChange: boolean; parentGrantUntil?: string } | AuthFailure> {
  const state = readState();
  const current = currentAccount(state);
  if (!current || current.session.token !== token || current.account.role !== 'student') return { ok: false, code: 'forbidden', message: 'Hãy đăng nhập tài khoản học sinh trước.' };
  if (!verify(current.account, pin, 'parent')) return { ok: false, code: 'invalid', message: 'Mã PIN phụ huynh chưa đúng.' };
  const mustChange = Boolean(current.account.parentPinMustChange);
  const parentGrantUntil = mustChange ? undefined : new Date(Date.now() + PARENT_GRANT_TTL_MS).toISOString();
  const session = sessionFor(current.account, false, parentGrantUntil);
  saveSession(session);
  return { ok: true, token: session.token, mustChange, parentGrantUntil };
}

export function lockParent(token: string): void {
  const session = readSession();
  if (session?.token !== token) return;
  delete session.parentGrantUntil;
  saveSession(session);
}

export function getCurrentAuthSession(): AuthSession | null {
  const state = readState();
  const current = currentAccount(state);
  return current?.session ?? null;
}

export function hasParentGrant(session: AuthSession | null, now = new Date()): boolean {
  if (!session?.parentGrantUntil) return false;
  return Date.parse(session.parentGrantUntil) > now.getTime();
}

export function logout(token?: string): void {
  if (!token || readSession()?.token === token) saveSession(null);
}

export function resetLocalAuth(): void {
  getStorage('local')?.removeItem(AUTH_STATE_KEY);
  getStorage('session')?.removeItem(SESSION_KEY);
  readState();
}
