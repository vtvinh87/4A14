/** Shared, non-secret account contracts used by the browser and the server. */
export const DEFAULT_STUDENT_PIN = '123456';
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 16;
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const AVATAR_IDS = ['fox-scout', 'fox-sunny', 'fox-leaf', 'fox-night'] as const;
export const DEFAULT_AVATAR_ID = 'fox-scout' as const;

export type AccountRole = 'student' | 'admin';
export type SessionMode = 'full' | 'change-only';
export type CredentialKind = 'student' | 'parent' | 'admin';
export type AvatarId = typeof AVATAR_IDS[number];

export type StudentProfile = {
  avatarId: AvatarId;
  birthDate: string | null;
  birthdayWishesEnabled: boolean;
};

export type StudentProfileView = StudentProfile & {
  accountId: string;
  username: string;
  displayName: string;
};

export type StudentProfilePatch = {
  displayName?: string;
  avatarId?: AvatarId;
  birthDate?: string | null;
};

export type ParentProfilePreferences = {
  birthdayWishesEnabled: boolean;
};

export type StudentProfilePreferencePatch = ParentProfilePreferences;

export type AccountView = {
  id: string;
  username: string;
  displayName: string;
  role: AccountRole;
  active: boolean;
  credentialVersion: number;
};

export type ClientAuthSession = {
  account: AccountView;
  mode: SessionMode;
  changeKind: 'student' | 'parent' | null;
  createdAt: string;
  expiresAt: string;
  parentGrantUntil?: string;
};

export type AccountApiFailureCode = 'invalid' | 'locked' | 'inactive' | 'conflict' | 'forbidden' | 'change-required' | 'expired' | 'unavailable' | 'stale';
export type AccountApiFailure = { ok: false; code: AccountApiFailureCode; message: string };

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}

export function validateAvatarId(value: unknown): ValidationResult<AvatarId> {
  return isAvatarId(value)
    ? { ok: true, value }
    : { ok: false, message: 'Avatar không hợp lệ.' };
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= daysInMonth;
}

export function calendarDateInTimeZone(now: Date = new Date(), timeZone = 'Asia/Ho_Chi_Minh'): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isCalendarDateOnOrBefore(value: string, suppliedDate: string): boolean {
  return isValidCalendarDate(value) && isValidCalendarDate(suppliedDate) && value <= suppliedDate;
}

export function validateBirthDate(value: string | null, suppliedDate = calendarDateInTimeZone()): ValidationResult<string | null> {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== 'string' || value.length === 0) return { ok: false, message: 'Ngày sinh phải là ngày lịch hợp lệ hoặc để trống.' };
  if (!isValidCalendarDate(value)) return { ok: false, message: 'Ngày sinh không tồn tại.' };
  if (!isCalendarDateOnOrBefore(value, suppliedDate)) return { ok: false, message: 'Ngày sinh không được ở tương lai.' };
  return { ok: true, value };
}

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
  return /^\d{6}$/.test(value)
    ? { ok: true, value }
    : { ok: false, message: 'Mã PIN phải gồm đúng 6 chữ số.' };
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
