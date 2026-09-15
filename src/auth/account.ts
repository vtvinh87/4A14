export const DEFAULT_STUDENT_PIN = '123456';
export const DEFAULT_ADMIN_PASSWORD = '123456@';
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 16;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export type AccountRole = 'student' | 'admin' | 'parent';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export type AccountRecord = {
  id: string;
  username: string;
  displayName: string;
  role: AccountRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  studentId?: string;
  studentPinHash: string;
  studentPinSalt: string;
  studentPinMustChange: boolean;
  parentPinHash?: string;
  parentPinSalt?: string;
  parentPinMustChange?: boolean;
  adminPasswordHash?: string;
  adminPasswordSalt?: string;
  adminPasswordMustChange?: boolean;
  credentialVersion: number;
  failedAttempts?: number;
  lockedUntil?: string;
};

export type AuthenticatedAccount = Pick<AccountRecord, 'id' | 'username' | 'displayName' | 'role' | 'studentId' | 'credentialVersion' | 'active'>;

export type AuthSession = {
  token: string;
  account: AuthenticatedAccount;
  mustChange: boolean;
  createdAt: string;
  expiresAt: string;
  parentGrantUntil?: string;
};

export function normalizeUsername(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

export function validateUsername(value: string): ValidationResult<string> {
  const normalized = normalizeUsername(value);
  if (normalized.length < USERNAME_MIN_LENGTH || normalized.length > USERNAME_MAX_LENGTH) {
    return { ok: false, message: `Tên tài khoản dài ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} ký tự.` };
  }
  if (!/^[a-z0-9]+$/.test(normalized)) return { ok: false, message: 'Tên tài khoản dùng chữ không dấu và số.' };
  if (normalized === 'admin') return { ok: false, message: 'Tên này dành riêng cho quản trị.' };
  return { ok: true, value: normalized };
}

export function validatePin(value: string): ValidationResult<string> {
  if (!/^\d{6}$/.test(value)) return { ok: false, message: 'Mã PIN phải gồm đúng 6 chữ số.' };
  return { ok: true, value };
}

export function validateDisplayName(value: string): ValidationResult<string> {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return { ok: false, message: 'Tên hiển thị không được để trống.' };
  if (normalized.length > DISPLAY_NAME_MAX_LENGTH) return { ok: false, message: `Tên hiển thị tối đa ${DISPLAY_NAME_MAX_LENGTH} ký tự.` };
  return { ok: true, value: normalized };
}

export function isDefaultPin(value: string): boolean {
  return value === DEFAULT_STUDENT_PIN;
}

export function isParentGrantActive(grant: { expiresAt: string }, now = new Date()): boolean {
  const expiresAt = Date.parse(grant.expiresAt);
  return Number.isFinite(expiresAt) && now.getTime() < expiresAt;
}
