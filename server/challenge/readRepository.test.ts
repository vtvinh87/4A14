import { describe, expect, it } from 'vitest';
import { PostgresChallengeReadRepository } from './readRepository';

function mockedDatabase(rows: unknown[]) {
  const queries: string[] = [];
  const db = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
    queries.push(Array.from(strings).join(' ').replace(/\s+/g, ' ').trim().toLowerCase());
    return Promise.resolve(rows);
  }) as unknown as { (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> };
  Object.assign(db, { unsafe: (value: string) => value });
  return { db, queries };
}

const round = {
  roundDate: '2026-09-19', timezone: 'Asia/Ho_Chi_Minh', status: 'open', targetContributions: 10,
  currentContributions: 2, selectedQuestionCount: 1, completed: false,
  closesAt: '2026-09-19T16:59:59.999Z', rewardGranted: false,
};
const item = {
  id: 'item-1', roundDate: '2026-09-19', questionId: 'question-1', authorId: 'student-a', position: 1,
  featuredAt: '2026-09-19T08:00:00.000Z', selectionSeedVersion: 'challenge-round-v1', selectionMetadata: {}, closedAt: null,
};
const question = {
  id: 'question-1', authorId: 'student-a', sourceFactId: 'map', sourceVersion: 'challenge-facts-v1',
  lessonId: 'lesson-01', lessonTitle: 'Bản đồ', prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
  options: [{ id: 'correct', text: 'Khu vực' }, { id: 'wrong-1', text: 'Bài hát' }, { id: 'wrong-2', text: 'Món ăn' }, { id: 'wrong-3', text: 'Trò chơi' }],
  correctOptionId: 'correct', explanation: 'Bản đồ thể hiện một khu vực theo tỉ lệ.', status: 'featured', revision: 1,
  createdLocalDate: '2026-09-19', createdAt: '2026-09-19T07:00:00.000Z', updatedAt: '2026-09-19T07:00:00.000Z',
  submittedAt: '2026-09-19T07:00:00.000Z', reviewedAt: '2026-09-19T07:30:00.000Z', featuredAt: '2026-09-19T08:00:00.000Z',
  closedAt: null, reviewReason: null, withdrawnAt: null, voidedAt: null,
};

describe('PostgresChallengeReadRepository', () => {
  it('loads the complete today snapshot with one SQL statement', async () => {
    const mock = mockedDatabase([{
      round,
      items: [item],
      attempts: [],
      questions: [question],
      authors: [{ id: 'student-a', displayName: 'Bạn A', avatarId: 'fox-leaf' }],
      contributionCount: 2,
      mine: [{ ...question, quotaUsedOnCreatedDate: 1 }],
      preferences: { studentId: 'student-reader', canCreate: true, canParticipate: true, updatedAt: '2026-09-19T07:00:00.000Z' },
    }]);
    const repository = new PostgresChallengeReadRepository(mock.db as never);

    await expect(repository.loadToday('student-reader', '2026-09-19')).resolves.toMatchObject({
      round: expect.objectContaining({ roundDate: '2026-09-19' }),
      items: [expect.objectContaining({ id: 'item-1' })],
      questions: [expect.objectContaining({ id: 'question-1', options: expect.any(Array) })],
      authors: [{ id: 'student-a', displayName: 'Bạn A', avatarId: 'fox-leaf' }],
      currentContributions: 2,
      mine: [expect.objectContaining({ quotaUsedOnCreatedDate: 1 })],
      preferences: { studentId: 'student-reader', canCreate: true, canParticipate: true, updatedAt: '2026-09-19T07:00:00.000Z' },
      hasOpenRoundsBefore: false,
    });
    expect(mock.queries).toHaveLength(1);
    expect(mock.queries[0]).toContain('jsonb_build_object');
    expect(mock.queries[0]).toContain('challenge_round_items');
    expect(mock.queries[0]).toContain('challenge_questions');
    expect(mock.queries[0]).toContain('previous_rounds');
  });

  it('loads weekly arrays and contribution map with one SQL statement', async () => {
    const mock = mockedDatabase([{
      rounds: [round], items: [item], contributions: [{ roundDate: '2026-09-19', contributionCount: 2 }],
      questions: [question], attempts: [], reactions: [], roster: ['student-a'],
      itemQuestions: [question], mine: [{ ...question, quotaUsedOnCreatedDate: 1 }],
    }]);
    const repository = new PostgresChallengeReadRepository(mock.db as never);

    await expect(repository.loadWeekly('student-reader', '2026-09-14', '2026-09-20')).resolves.toMatchObject({
      rounds: [expect.objectContaining({ roundDate: '2026-09-19' })],
      items: [expect.objectContaining({ id: 'item-1' })],
      contributionByDate: new Map([['2026-09-19', 2]]),
      roster: ['student-a'],
      itemQuestions: [expect.objectContaining({ id: 'question-1' })],
    });
    expect(mock.queries).toHaveLength(1);
    expect(mock.queries[0]).toContain('challenge_reactions');
    expect(mock.queries[0]).toContain('challenge_attempts');
  });
});
