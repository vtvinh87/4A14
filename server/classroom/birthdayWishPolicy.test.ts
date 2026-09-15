import { describe, expect, it } from 'vitest';
import { BIRTHDAY_EMOJI_IDS, BIRTHDAY_STICKER_IDS, BIRTHDAY_WISH_TEMPLATE_IDS, type BirthdayWishInput } from '../../shared/birthday-wish-contracts';
import {
  birthdayWishKey,
  submitBirthdayWish,
  type BirthdayWishInsertIfAbsentResult,
  type BirthdayWishPolicyContext,
  type BirthdayWishRecord,
  type BirthdayWishRepository,
} from './birthdayWishPolicy';

const input: BirthdayWishInput = {
  birthdayCardId: 'card_srv_123',
  templateId: BIRTHDAY_WISH_TEMPLATE_IDS[0],
  emojiId: BIRTHDAY_EMOJI_IDS[0],
  stickerId: BIRTHDAY_STICKER_IDS[0],
};

function context(overrides: Partial<BirthdayWishPolicyContext> = {}): BirthdayWishPolicyContext {
  return {
    senderId: 'student-sender',
    recipientId: 'student-recipient',
    senderActive: true,
    recipientActive: true,
    sameClass: true,
    recipientWishesEnabled: true,
    currentBirthdayYear: 2026,
    existingWishKeys: new Set(),
    rateLimit: { allowed: true },
    birthdayCard: {
      birthdayCardId: 'card_srv_123',
      displayName: 'Bạn Nhỏ',
      avatarId: 'fox-sunny',
      birthdayLabel: 'Hôm nay là sinh nhật',
    },
    ...overrides,
  };
}

function countingRepository(seed: BirthdayWishRecord[] = [], beforeCommit?: () => Promise<void>) {
  const records = new Map(seed.map((record) => [record.key, record]));
  const repo = {
    primitiveCalls: 0,
    inserts: 0,
    records,
    insertIfAbsent: async (record: BirthdayWishRecord): Promise<BirthdayWishInsertIfAbsentResult> => {
      repo.primitiveCalls += 1;
      if (beforeCommit) await beforeCommit();
      const existing = records.get(record.key);
      if (existing) return { inserted: false, record: existing };
      repo.inserts += 1;
      records.set(record.key, record);
      return { inserted: true, record };
    },
  } satisfies BirthdayWishRepository & { inserts: number; primitiveCalls: number; records: Map<string, BirthdayWishRecord> };
  return repo;
}

function createBarrier(expectedArrivals: number) {
  let resolveArrived!: () => void;
  const arrived = new Promise<void>((resolve) => {
    resolveArrived = resolve;
  });
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrivals = 0;
  return {
    arrived,
    get arrivals() {
      return arrivals;
    },
    wait: async () => {
      arrivals += 1;
      if (arrivals === expectedArrivals) resolveArrived();
      await released;
    },
    release,
  };
}

describe('birthday wish policy', () => {
  it('accepts an active same-class recipient who opted in', async () => {
    const repo = countingRepository();
    const result = await submitBirthdayWish(context(), input, repo);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.key).toBe(birthdayWishKey('student-sender', 'student-recipient', 2026));
      expect(result.record.displayName).toBe('Bạn Nhỏ');
      expect(result.record).not.toHaveProperty('birthDate');
      expect(result.record).not.toHaveProperty('age');
    }
    expect(repo.inserts).toBe(1);
    expect(repo.primitiveCalls).toBe(1);
  });

  it.each([
    ['parent opt-in is false', { recipientWishesEnabled: false }],
    ['cross-class recipient', { sameClass: false }],
    ['inactive sender', { senderActive: false }],
    ['inactive recipient', { recipientActive: false }],
    ['rate limited', { rateLimit: { allowed: false } }],
  ])('rejects when %s', async (_name, overrides) => {
    const repo = countingRepository();
    const result = await submitBirthdayWish(context(overrides), input, repo);

    expect(result.ok).toBe(false);
    expect(repo.inserts).toBe(0);
  });

  it('rejects a card that was not resolved for the recipient context', async () => {
    const result = await submitBirthdayWish(context({ birthdayCard: { ...context().birthdayCard, birthdayCardId: 'other-card' } }), input, countingRepository());
    expect(result).toEqual({ ok: false, code: 'invalid-card' });
  });

  it('returns the existing result without a second insert for a duplicate year key', async () => {
    const repo = countingRepository();
    const first = await submitBirthdayWish(context(), input, repo);
    const second = await submitBirthdayWish(context({ existingWishKeys: new Set([birthdayWishKey('student-sender', 'student-recipient', 2026)]) }), input, repo);

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(repo.inserts).toBe(1);
    expect(repo.primitiveCalls).toBe(2);
  });

  it('does not duplicate when the existing-key snapshot is stale', async () => {
    const repo = countingRepository();
    const first = await submitBirthdayWish(context(), input, repo);
    const second = await submitBirthdayWish(context({ existingWishKeys: new Set() }), input, repo);

    expect(second).toEqual(first);
    expect(repo.inserts).toBe(1);
    expect(repo.primitiveCalls).toBe(2);
  });

  it('uses the repository atomic primitive for two concurrent requests', async () => {
    const barrier = createBarrier(2);
    const repo = countingRepository([], barrier.wait);
    const firstPromise = submitBirthdayWish(context({ existingWishKeys: new Set() }), input, repo);
    const secondPromise = submitBirthdayWish(context({ existingWishKeys: new Set() }), input, repo);

    await Promise.race([barrier.arrived, new Promise<void>((resolve) => setTimeout(resolve, 100))]);
    expect(barrier.arrivals).toBe(2);
    barrier.release();

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first).toEqual(second);
    expect(repo.inserts).toBe(1);
    expect(repo.primitiveCalls).toBe(2);
  });

  it('redacts extra fields from a repository-returned record before peer exposure', async () => {
    const unsafeRecord = {
      key: birthdayWishKey('student-sender', 'student-recipient', 2026),
      birthdayCardId: 'card_srv_123',
      displayName: '  Bạn   Nhỏ  ',
      avatarId: 'fox-sunny',
      birthdayLabel: 'private label',
      templateId: BIRTHDAY_WISH_TEMPLATE_IDS[0],
      emojiId: BIRTHDAY_EMOJI_IDS[0],
      stickerId: BIRTHDAY_STICKER_IDS[0],
      createdAt: '2026-09-14T00:00:00.000Z',
      birthDate: '2017-09-14',
      age: 9,
      credentialHash: 'hash',
      salt: 'salt',
      username: 'student-sender',
      classroomId: 'class-secret',
      accountMetadata: { role: 'student' },
    } as unknown as BirthdayWishRecord & Record<string, unknown>;
    const repository: BirthdayWishRepository = {
      insertIfAbsent: async () => ({ inserted: true, record: unsafeRecord }),
    };

    const result = await submitBirthdayWish(context(), input, repository);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record).toEqual({
        key: unsafeRecord.key,
        birthdayCardId: 'card_srv_123',
        displayName: 'Bạn Nhỏ',
        avatarId: 'fox-sunny',
        birthdayLabel: 'Hôm nay là sinh nhật',
        templateId: BIRTHDAY_WISH_TEMPLATE_IDS[0],
        emojiId: BIRTHDAY_EMOJI_IDS[0],
        stickerId: BIRTHDAY_STICKER_IDS[0],
        createdAt: unsafeRecord.createdAt,
      });
      expect(result.record).not.toHaveProperty('birthDate');
      expect(result.record).not.toHaveProperty('age');
      expect(result.record).not.toHaveProperty('credentialHash');
      expect(result.record).not.toHaveProperty('salt');
      expect(result.record).not.toHaveProperty('username');
      expect(result.record).not.toHaveProperty('classroomId');
      expect(result.record).not.toHaveProperty('accountMetadata');
    }
  });

  it.each(['not-a-timestamp', 42])('rejects repository records with invalid createdAt %s', async (createdAt) => {
    const repository: BirthdayWishRepository = {
      insertIfAbsent: async () => ({
        inserted: true,
        record: {
          key: birthdayWishKey('student-sender', 'student-recipient', 2026),
          birthdayCardId: 'card_srv_123',
          displayName: 'Bạn Nhỏ',
          avatarId: 'fox-sunny',
          birthdayLabel: 'Hôm nay là sinh nhật',
          templateId: BIRTHDAY_WISH_TEMPLATE_IDS[0],
          createdAt,
        } as unknown as BirthdayWishRecord,
      }),
    };

    const result = await submitBirthdayWish(context(), input, repository);

    expect(result).toEqual({ ok: false, code: 'invalid-repository-record' });
  });

  it('accepts a distinct birthday year', async () => {
    const repo = countingRepository();
    const result = await submitBirthdayWish(context({ currentBirthdayYear: 2027 }), input, repo);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.key).toBe(birthdayWishKey('student-sender', 'student-recipient', 2027));
    expect(repo.inserts).toBe(1);
  });
});
