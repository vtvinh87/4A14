import { describe, expect, it } from 'vitest';
import {
  birthdayCelebrationKey,
  getCalendarDateInTimeZone,
  hasCelebratedBirthday,
  isBirthdayToday,
  markBirthdayCelebrated,
} from './birthday';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('local birthday date engine', () => {
  it('uses the Vietnam calendar date on both sides of midnight', () => {
    expect(getCalendarDateInTimeZone(new Date('2026-09-13T16:59:59.999Z'))).toEqual({ year: 2026, month: 9, day: 13 });
    expect(getCalendarDateInTimeZone(new Date('2026-09-13T17:00:00.000Z'))).toEqual({ year: 2026, month: 9, day: 14 });
    expect(isBirthdayToday('2014-09-14', new Date('2026-09-13T17:00:00.000Z'))).toBe(true);
  });

  it('matches a normal birthday only on the matching Vietnam month and day', () => {
    expect(isBirthdayToday('2014-09-14', new Date('2026-09-14T04:00:00Z'))).toBe(true);
    expect(isBirthdayToday('2014-09-14', new Date('2026-09-13T16:00:00Z'))).toBe(false);
  });

  it('maps a February 29 birthday to February 28 only in a non-leap year', () => {
    expect(isBirthdayToday('2016-02-29', new Date('2028-02-29T05:00:00Z'))).toBe(true);
    expect(isBirthdayToday('2016-02-29', new Date('2027-02-28T05:00:00Z'))).toBe(true);
    expect(isBirthdayToday('2016-02-29', new Date('2027-02-27T05:00:00Z'))).toBe(false);
    expect(isBirthdayToday('2016-02-29', new Date('2027-03-01T05:00:00Z'))).toBe(false);
  });

  it('rejects null, malformed, impossible and future birth dates', () => {
    const today = new Date('2026-09-14T05:00:00Z');
    for (const birthDate of [null, undefined, '', '2014-9-14', '2014-09-1', '2014/09/14', '2015-02-29', '2014-04-31', '2014-13-01', '2014-00-01', '2027-09-14', '2026-12-01']) {
      expect(isBirthdayToday(birthDate, today), birthDate ?? 'null').toBe(false);
    }
  });
});

describe('birthday celebration marker', () => {
  it('isolates account and year keys and suppresses a second celebration', () => {
    const storage = new MemoryStorage();
    const firstKey = birthdayCelebrationKey('student/a', 2026);
    const secondKey = birthdayCelebrationKey('student/b', 2026);
    const nextYearKey = birthdayCelebrationKey('student/a', 2027);

    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).not.toBe(nextYearKey);
    expect(firstKey).toContain('student%2Fa');
    expect(firstKey).toContain('2026');
    expect(hasCelebratedBirthday('student/a', 2026, storage)).toBe(false);

    markBirthdayCelebrated('student/a', 2026, storage);

    expect(hasCelebratedBirthday('student/a', 2026, storage)).toBe(true);
    expect(hasCelebratedBirthday('student/b', 2026, storage)).toBe(false);
    expect(hasCelebratedBirthday('student/a', 2027, storage)).toBe(false);
  });

  it('treats throwing storage as a best-effort failure', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('read blocked'); },
      setItem: () => { throw new Error('write blocked'); },
    } as unknown as Storage;

    expect(() => hasCelebratedBirthday('student-a', 2026, throwingStorage)).not.toThrow();
    expect(hasCelebratedBirthday('student-a', 2026, throwingStorage)).toBe(false);
    expect(() => markBirthdayCelebrated('student-a', 2026, throwingStorage)).not.toThrow();
  });
});
