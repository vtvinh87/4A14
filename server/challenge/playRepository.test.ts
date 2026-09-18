import { describe, expect, it, vi } from 'vitest';
import { MemoryPlayRepository } from './memoryPlayRepository';
import { PostgresPlayRepository } from './postgresPlayRepository';
import type { CreateRoundInput, CreateRoundItemInput, InsertAttemptInput } from './playTypes';

const round: CreateRoundInput = {
  roundDate: '2026-09-17',
  timezone: 'Asia/Ho_Chi_Minh',
  status: 'open',
  targetContributions: 20,
  closesAt: '2026-09-17T16:59:59.999Z',
  createdAt: '2026-09-16T17:00:00.000Z',
};

const item = (overrides: Partial<CreateRoundItemInput> = {}): CreateRoundItemInput => ({
  id: 'item-1',
  roundDate: round.roundDate,
  questionId: 'question-1',
  authorId: 'student-a',
  position: 1,
  featuredAt: '2026-09-16T17:00:01.000Z',
  selectionSeedVersion: 'challenge-round-v1',
  selectionMetadata: { seed: 'seed-1', fallback: false },
  ...overrides,
});

const attempt = (overrides: Partial<InsertAttemptInput> = {}): InsertAttemptInput => ({
  id: 'attempt-1',
  roundItemId: 'item-1',
  studentId: 'student-b',
  idempotencyKey: 'attempt-key-1',
  selectedOptionId: 'wrong-1',
  isCorrect: false,
  isPractice: false,
  isVoided: false,
  contribution: 0,
  answeredAt: '2026-09-17T08:00:00.000Z',
  ...overrides,
});

function mockedDatabase(rows: unknown[]) {
  const queries: string[] = [];
  const db = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
    queries.push(strings.join('¦').replace(/\s+/g, ' ').trim().toLowerCase());
    return Promise.resolve(rows);
  }) as unknown as { (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>; unsafe: (value: string) => string };
  db.unsafe = (value: string) => value;
  return { db, queries };
}

function itemRow(id: string, roundDate: string) {
  return {
    id,
    round_date: roundDate,
    question_id: `question-${id}`,
    author_id: `author-${id}`,
    position: 1,
    featured_at: '2026-09-17T08:00:00.000Z',
    selection_seed_version: 'challenge-round-v1',
    selection_metadata: {},
    closed_at: null,
  };
}

describe('MemoryPlayRepository', () => {
  it('creates one round per local date and keeps the first canonical record', async () => {
    const repository = new MemoryPlayRepository({ idFactory: (() => {
      let index = 0;
      return () => `generated-${++index}`;
    })() });

    const first = await repository.insertRoundIfAbsent(round);
    const second = await repository.insertRoundIfAbsent({ ...round, targetContributions: 60, status: 'empty' });

    expect(second).toEqual(first);
    expect(await repository.getRound(round.roundDate)).toEqual(first);
  });

  it('enforces unique question and ordinal within a round while keeping item insertion idempotent', async () => {
    const repository = new MemoryPlayRepository();
    await repository.insertRoundIfAbsent(round);
    const first = await repository.insertRoundItem(item());

    expect(await repository.insertRoundItem(item({ selectionMetadata: { changed: true } }))).toEqual(first);
    await expect(repository.insertRoundItem(item({ id: 'item-2', questionId: 'question-2' }))).rejects.toThrow('duplicate_round_item_ordinal');
    await expect(repository.insertRoundItem(item({ id: 'item-3', position: 2, questionId: 'question-1' }))).rejects.toThrow('duplicate_round_item_question');
    expect(await repository.listRoundItems(round.roundDate)).toEqual([first]);
  });

  it('enforces one attempt per student/item and returns duplicate for repeated idempotency keys', async () => {
    const repository = new MemoryPlayRepository();
    await repository.insertRoundIfAbsent(round);
    await repository.insertRoundItem(item());
    const first = await repository.insertAttempt(attempt());

    expect(first).toMatchObject({ id: 'attempt-1', contribution: 0 });
    expect(await repository.insertAttempt(attempt({ id: 'attempt-retry', selectedOptionId: 'correct', isCorrect: true, contribution: 1 }))).toBe('duplicate');
    expect(await repository.insertAttempt(attempt({ id: 'attempt-other', idempotencyKey: 'attempt-key-2' }))).toBe('duplicate');
    expect(await repository.insertAttempt(attempt({ id: 'attempt-other-item', roundItemId: 'item-2', idempotencyKey: 'attempt-key-1' }))).toBe('duplicate');
    expect(await repository.findAttempt('item-1', 'student-b')).toEqual(first);
    expect(await repository.findAttemptByIdempotency('student-b', 'attempt-key-1')).toEqual(first);
  });

  it('counts only non-practice, non-voided contributions for the round', async () => {
    const repository = new MemoryPlayRepository();
    await repository.insertRoundIfAbsent(round);
    await repository.insertRoundItem(item());
    await repository.insertRoundItem(item({ id: 'item-2', questionId: 'question-2', position: 2 }));
    await repository.insertAttempt(attempt({ id: 'attempt-correct', roundItemId: 'item-1', studentId: 'student-c', idempotencyKey: 'key-correct', isCorrect: true, selectedOptionId: 'correct', contribution: 1 }));
    await repository.insertAttempt(attempt({ id: 'attempt-practice', roundItemId: 'item-2', studentId: 'student-c', idempotencyKey: 'key-practice', isCorrect: true, selectedOptionId: 'correct', isPractice: true, contribution: 0 }));

    expect(await repository.countCorrectContributions(round.roundDate)).toBe(1);
    await repository.voidAttemptsForQuestion('question-1', '2026-09-17T09:00:00.000Z');
    expect(await repository.countCorrectContributions(round.roundDate)).toBe(0);
  });

  it('reads item ranges and contribution aggregates without changing contribution semantics', async () => {
    const repository = new MemoryPlayRepository({
      items: [
        { ...item({ id: 'item-mon', roundDate: '2026-09-14', questionId: 'question-item-mon', authorId: 'author-item-mon' }) } as never,
        { ...item({ id: 'item-sun', roundDate: '2026-09-20', questionId: 'question-item-sun', authorId: 'author-item-sun' }) } as never,
      ],
      attempts: [
        { ...attempt({ id: 'attempt-mon', roundItemId: 'item-mon', isCorrect: true, selectedOptionId: 'correct', contribution: 1 }), roundDate: '2026-09-14', questionId: 'question-item-mon' } as never,
        { ...attempt({ id: 'attempt-practice', roundItemId: 'item-mon', isCorrect: true, selectedOptionId: 'correct', isPractice: true, contribution: 0 }), roundDate: '2026-09-14', questionId: 'question-item-mon' } as never,
        { ...attempt({ id: 'attempt-void', roundItemId: 'item-sun', isCorrect: true, selectedOptionId: 'correct', isVoided: true, contribution: 0 }), roundDate: '2026-09-20', questionId: 'question-item-sun' } as never,
      ],
    });

    await expect(repository.listRoundItemsBetween('2026-09-14', '2026-09-20')).resolves.toHaveLength(2);
    await expect(repository.countCorrectContributionsBetween('2026-09-14', '2026-09-20')).resolves.toEqual(new Map([['2026-09-14', 1], ['2026-09-20', 0]]));
  });

  it('uses one range query and one grouped contribution query', async () => {
    const itemMock = mockedDatabase([itemRow('item-1', '2026-09-14')]);
    const itemRepository = new PostgresPlayRepository(itemMock.db as never);
    await expect(itemRepository.listRoundItemsBetween('2026-09-14', '2026-09-20')).resolves.toEqual([
      expect.objectContaining({ id: 'item-1', roundDate: '2026-09-14' }),
    ]);
    expect(itemMock.queries).toHaveLength(1);
    expect(itemMock.queries[0]).toContain('round_date between');
    expect(itemMock.queries[0]).toContain('challenge_round_items');

    const countMock = mockedDatabase([{ round_date: '2026-09-14', contribution_count: 3 }]);
    const countRepository = new PostgresPlayRepository(countMock.db as never);
    await expect(countRepository.countCorrectContributionsBetween('2026-09-14', '2026-09-20')).resolves.toEqual(new Map([['2026-09-14', 3]]));
    expect(countMock.queries).toHaveLength(1);
    expect(countMock.queries[0]).toContain('group by round_date');
    expect(countMock.queries[0]).toContain('is_voided = false');
    expect(countMock.queries[0]).toContain('sum(contribution)');
  });

  it('deduplicates reactions, open reports and namespaced events', async () => {
    const repository = new MemoryPlayRepository();
    await repository.insertRoundIfAbsent(round);
    await repository.insertRoundItem(item());

    const reaction = await repository.upsertReaction({ roundItemId: 'item-1', actorId: 'student-b', reactionType: 'learned', createdAt: '2026-09-17T08:01:00.000Z' });
    expect(await repository.upsertReaction({ ...reaction, createdAt: '2026-09-17T08:02:00.000Z' })).toEqual(reaction);

    const report = await repository.createReport({ id: 'report-1', roundItemId: 'item-1', reporterId: 'student-c', reason: 'unclear', details: 'Câu này cần nói rõ hơn.', idempotencyKey: 'report-key-1', createdAt: '2026-09-17T08:03:00.000Z' });
    expect(await repository.createReport({ ...report, details: 'Nội dung gửi lại.' })).toEqual(report);
    expect(await repository.hasOpenReport('item-1')).toBe(true);
    expect(await repository.findReport('report-1')).toEqual(report);

    const event = { eventId: 'event-1', studentId: 'student-b', eventType: 'challenge.attempt_recorded' as const, payload: { questionId: 'question-1' }, occurredAt: '2026-09-17T08:03:00.000Z', localDate: '2026-09-17', source: 'challenge', sourceVersion: 'challenge-events-v1' };
    await repository.appendEvent(event);
    await repository.appendEvent({ ...event, payload: { questionId: 'tampered-retry' } });
    expect(repository.events.size).toBe(1);
    expect(repository.events.get('event-1')).toMatchObject(event);
  });

  it('closes rounds and makes shared reward plus report resolution idempotent', async () => {
    const repository = new MemoryPlayRepository();
    await repository.insertRoundIfAbsent(round);
    const closedAt = '2026-09-17T16:59:59.999Z';
    await repository.closeRound(round.roundDate, closedAt);
    expect((await repository.getRound(round.roundDate))?.status).toBe('closed');
    await repository.closeRound(round.roundDate, closedAt);
    const rewarded = await repository.grantRoundReward(round.roundDate);
    expect(rewarded.rewardGranted).toBe(true);
    expect(await repository.grantRoundReward(round.roundDate)).toEqual(rewarded);

    await repository.insertRoundItem(item());
    const report = await repository.createReport({ roundItemId: 'item-1', reporterId: 'student-c', reason: 'unclear', createdAt: '2026-09-17T08:03:00.000Z' });
    const resolved = await repository.resolveReport(report.id, 'dismissed', '2026-09-17T10:00:00.000Z');
    expect(resolved.status).toBe('dismissed');
    expect(await repository.hasOpenReport('item-1')).toBe(false);
    expect(await repository.resolveReport(report.id, 'dismissed', '2026-09-17T11:00:00.000Z')).toEqual(resolved);
  });
});
