export const BIRTHDAY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const BIRTH_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const BIRTHDAY_MARKER_PREFIX = 'hoc-vui:birthday-celebrated:v1';
const calendarFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BIRTHDAY_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((part) => part.type === type)?.value;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error(`Missing calendar ${type} part.`);
  return number;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseBirthDate(value: unknown): CalendarDate | null {
  if (typeof value !== 'string') return null;
  const match = BIRTH_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function getBirthdayStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidMarkerInput(accountId: unknown, year: unknown): accountId is string {
  return typeof accountId === 'string'
    && accountId.length > 0
    && accountId.length <= 256
    && accountId.trim() === accountId
    && Number.isInteger(year)
    && Number(year) >= 1
    && Number(year) <= 9999;
}

export function getCalendarDateInTimeZone(now: Date = new Date()): CalendarDate {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('A valid Date is required.');
  const parts = calendarFormatter.formatToParts(now);
  return {
    year: partValue(parts, 'year'),
    month: partValue(parts, 'month'),
    day: partValue(parts, 'day'),
  };
}

export function isBirthdayToday(birthDate: string | null | undefined, now: Date = new Date()): boolean {
  const parsedBirthDate = parseBirthDate(birthDate);
  if (!parsedBirthDate) return false;

  const today = getCalendarDateInTimeZone(now);
  const birthDateIsFuture = parsedBirthDate.year > today.year
    || (parsedBirthDate.year === today.year && (
      parsedBirthDate.month > today.month
      || (parsedBirthDate.month === today.month && parsedBirthDate.day > today.day)
    ));
  if (birthDateIsFuture) return false;

  const celebratedDay = parsedBirthDate.month === 2
    && parsedBirthDate.day === 29
    && !isLeapYear(today.year)
    ? 28
    : parsedBirthDate.day;

  return parsedBirthDate.month === today.month && celebratedDay === today.day;
}

export function birthdayCelebrationKey(accountId: string, year: number): string {
  if (!isValidMarkerInput(accountId, year)) return '';
  return `${BIRTHDAY_MARKER_PREFIX}:${encodeURIComponent(accountId)}:${year}`;
}

export function hasCelebratedBirthday(accountId: string, year: number, storage?: Storage | null): boolean {
  const key = birthdayCelebrationKey(accountId, year);
  const target = getBirthdayStorage(storage);
  if (!key || !target) return false;
  try {
    return target.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function markBirthdayCelebrated(accountId: string, year: number, storage?: Storage | null): void {
  const key = birthdayCelebrationKey(accountId, year);
  const target = getBirthdayStorage(storage);
  if (!key || !target) return;
  try {
    target.setItem(key, '1');
  } catch {
    // Marker persistence is best-effort and must not block learning.
  }
}
