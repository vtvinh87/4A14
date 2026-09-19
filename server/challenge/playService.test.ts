import { describe, expect, it, vi } from 'vitest';
import { MemoryAuthoringRepository } from './memoryAuthoringRepository';
import { MemoryPlayRepository } from './memoryPlayRepository';
import { createChallengePlayService } from './playService';
import type { InsertPendingQuestion } from './authoringTypes';

const START = new Date('2026-09-17T08:00:00.000Z');

function question(id: string, authorId: string, answer = 'Bản đồ'): InsertPendingQuestion {
  return {
    id,
    authorId,
    sourceFactId: 'map',
    sourceVersion: 'challenge-facts-v1',
    lessonId: 'lesson-01',
    lessonTitle: 'Làm quen với phương tiện học tập môn Lịch sử và Địa lí',
    prompt: `Theo con, ${id} giúp chúng ta học điều gì?`,
    options: [
      { id: 'correct', text: answer },
      { id: 'wrong-1', text: 'Một bài hát về ngày hội.' },
      { id: 'wrong-2', text: 'Một loại bánh truyền thống.' },
      { id: 'wrong-3', text: 'Một câu chuyện kể về nhân vật.' },
    ],
    correctOptionId: 'correct',
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    createdLocalDate: '2026-09-17',
    createdAt: '2026-09-17T07:00:00.000Z',
    updatedAt: '2026-09-17T07:00:00.000Z',
  };
}

async function approved(authoring: MemoryAuthoringRepository, input: InsertPendingQuestion) {
  const created = await authoring.insertPendingQuestion(input);
  if (created === 'quota_exceeded') throw new Error('fixture quota');
  const reviewed = await authoring.reviewQuestion(input.authorId, input.id!, created.revision, { decision: 'approve' });
  if (typeof reviewed === 'string' || !reviewed) throw new Error('fixture review');
  return reviewed;
}

function serviceFixture(activeStudentCount = 3) {
  let now = new Date(START);
  let nextId = 0;
  const authoring = new MemoryAuthoringRepository({ now: () => now });
  const play = new MemoryPlayRepository({ now: () => now, idFactory: () => `generated-${++nextId}` });
  const service = createChallengePlayService({
    authoring,
    play,
    clock: () => now,
    activeStudentCount: async () => activeStudentCount,
    idFactory: () => `event-${++nextId}`,
  });
  return { authoring, play, service, setNow: (value: Date) => { now = value; } };
}

async function seedCompleteRound(authoring: MemoryAuthoringRepository, play: MemoryPlayRepository) {
  const roundDate = '2026-09-17';
  await play.insertRoundIfAbsent({
    roundDate,
    timezone: 'Asia/Ho_Chi_Minh',
    status: 'open',
    targetContributions: 10,
    closesAt: '2026-09-17T16:59:59.999Z',
    selectionSeedVersion: 'challenge-round-v1',
  });
  for (let index = 1; index <= 5; index += 1) {
    const authorId = `student-${index}`;
    await approved(authoring, question(`question-batch-${index}`, authorId));
    await play.insertRoundItem({
      id: `round-item-${index}`,
      roundDate,
      questionId: `question-batch-${index}`,
      authorId,
      position: index,
      featuredAt: '2026-09-17T08:00:00.000Z',
      selectionSeedVersion: 'challenge-round-v1',
    });
  }
}

describe('Challenge play service', () => {
  it('creates an idempotent approved-only daily round and never leaks private answer fields', async () => {
    const { authoring, service } = serviceFixture();
    await approved(authoring, question('question-approved', 'student-a'));
    const pending = await authoring.insertPendingQuestion(question('question-pending', 'student-b'));
    expect(pending).not.toBe('quota_exceeded');

    const first = await service.getToday('student-c');
    const second = await service.getToday('student-c');

    expect(first.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error('expected today response');
    expect(first.questions).toHaveLength(1);
    expect(first.questions[0].id).toBe('question-approved');
    expect(JSON.stringify(first)).not.toContain('correctOptionId');
    expect(JSON.stringify(first)).not.toContain('explanation');
    expect(JSON.stringify(first)).not.toContain('sourceText');
    expect(second).toEqual(first);
    expect(first.roundStatus).toBe('open');
    expect(first.classProgress).toMatchObject({ current: 0, target: 10 });
  });

  it('allows multiple classmates to answer the same item, blocks only its author, and gives wrong answers no penalty', async () => {
    const { authoring, service } = serviceFixture();
    await approved(authoring, question('question-a', 'student-a'));
    const today = await service.getToday('student-b');
    if (!today.ok) throw new Error('expected today response');
    const item = today.questions.find((candidate) => candidate.author.id === 'student-a');
    if (!item) throw new Error('missing student-a question');

    const authorAttempt = await service.submitAttempt('student-a', item.roundItemId, { selectedOptionId: 'wrong-1', attemptId: 'key-author' });
    expect(authorAttempt).toMatchObject({ ok: false, code: 'forbidden', reason: 'self_question' });
    const first = await service.submitAttempt('student-b', item.roundItemId, { selectedOptionId: 'wrong-1', attemptId: 'key-b' });
    const second = await service.submitAttempt('student-c', item.roundItemId, { selectedOptionId: 'correct', attemptId: 'key-c' });
    expect(first).toMatchObject({ ok: true, correct: false, classContributionAdded: false, duplicate: false });
    expect(second).toMatchObject({ ok: true, correct: true, classContributionAdded: true, duplicate: false });
  });

  it('computes correctness server-side, makes practice contribution zero, and makes retries idempotent', async () => {
    const { authoring, service } = serviceFixture();
    await approved(authoring, question('question-practice', 'student-a'));
    const today = await service.getToday('student-b');
    if (!today.ok) throw new Error('expected today response');
    const item = today.questions[0];
    const first = await service.submitAttempt('student-b', item.roundItemId, { selectedOptionId: 'correct', attemptId: 'practice-key', isPractice: true, ...({ correct: false, contribution: 99 } as unknown as object) });
    const retry = await service.submitAttempt('student-b', item.roundItemId, { selectedOptionId: 'correct', attemptId: 'practice-key', isPractice: true });
    expect(first).toMatchObject({ ok: true, correct: true, classContributionAdded: false, practiceOnly: true, duplicate: false });
    expect(retry).toEqual(first.ok ? { ...first, duplicate: true } : retry);
  });

  it('closes the previous local round at the Vietnam date boundary and grants shared reward idempotently', async () => {
    const { authoring, play, service, setNow } = serviceFixture(1);
    await approved(authoring, question('question-boundary', 'student-a'));
    const today = await service.getToday('student-b');
    if (!today.ok) throw new Error('expected today response');
    const firstRound = await play.getRound('2026-09-17');
    if (!firstRound) throw new Error('missing first round');
    play.rounds.set(firstRound.roundDate, { ...firstRound, targetContributions: 1 });
    const answered = await service.submitAttempt('student-b', today.questions[0].roundItemId, { selectedOptionId: 'correct', attemptId: 'boundary-key' });
    expect(answered).toMatchObject({ ok: true, classContributionAdded: true });
    expect((await play.getRound('2026-09-17'))?.rewardGranted).toBe(true);
    expect(await play.grantRoundReward('2026-09-17')).toEqual(await play.getRound('2026-09-17'));

    setNow(new Date('2026-09-17T17:00:00.000Z'));
    const next = await service.getToday('student-b');
    expect(next.ok).toBe(true);
    expect((await play.getRound('2026-09-17'))?.status).toBe('closed');
    expect((await play.getRound('2026-09-18'))?.roundDate).toBe('2026-09-18');
  });

  it('keeps voided attempt history but recalculates the round contribution to zero', async () => {
    const { authoring, play, service } = serviceFixture();
    const created = await approved(authoring, question('question-void', 'student-a'));
    const today = await service.getToday('student-b');
    if (!today.ok) throw new Error('expected today response');
    await service.submitAttempt('student-b', today.questions[0].roundItemId, { selectedOptionId: 'correct', attemptId: 'void-key' });
    expect(await play.countCorrectContributions('2026-09-17')).toBe(1);
    await play.voidAttemptsForQuestion(created.id, '2026-09-17T09:00:00.000Z');
    expect(await play.countCorrectContributions('2026-09-17')).toBe(0);
    expect((await play.findAttempt(today.questions[0].roundItemId, 'student-b'))?.isVoided).toBe(true);
  });

  it('loads a complete round with fixed batch reads, keeps item order, and omits unsafe question fields', async () => {
    const { authoring, play, service } = serviceFixture();
    await seedCompleteRound(authoring, play);
    const batchQuestions = vi.spyOn(authoring, 'findQuestionsByIds');
    const batchAuthors = vi.spyOn(authoring, 'getAuthorViewsByIds');
    const legacyQuestions = vi.spyOn(authoring, 'findForAuthor');
    const legacyAuthors = vi.spyOn(authoring, 'getAuthorView');

    const result = await service.getToday('student-reader');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected today response');
    expect(result.questions.map((item) => item.id)).toEqual([
      'question-batch-1',
      'question-batch-2',
      'question-batch-3',
      'question-batch-4',
      'question-batch-5',
    ]);
    expect(batchQuestions).toHaveBeenCalledOnce();
    expect(batchQuestions.mock.calls[0]?.[0]).toEqual([
      'question-batch-1',
      'question-batch-2',
      'question-batch-3',
      'question-batch-4',
      'question-batch-5',
    ]);
    expect(batchAuthors).toHaveBeenCalledOnce();
    expect(batchAuthors.mock.calls[0]?.[0]).toEqual([
      'student-1',
      'student-2',
      'student-3',
      'student-4',
      'student-5',
    ]);
    expect(legacyQuestions).not.toHaveBeenCalled();
    expect(legacyAuthors).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('correctOptionId');
    expect(JSON.stringify(result)).not.toContain('explanation');
  });

  it('reuses the round items loaded while preparing today instead of issuing a duplicate read', async () => {
    const { authoring, play, service } = serviceFixture();
    await seedCompleteRound(authoring, play);
    const listRoundItems = vi.spyOn(play, 'listRoundItems');

    const result = await service.getToday('student-reader');

    expect(result.ok).toBe(true);
    expect(listRoundItems).toHaveBeenCalledOnce();
  });

  it('reports fixed protected-read stages without exposing data values', async () => {
    const { authoring, play, service } = serviceFixture();
    await seedCompleteRound(authoring, play);
    const stages: string[] = [];
    const timing = { measureStage: async (stage: string, work: () => Promise<unknown>) => { stages.push(stage); return work(); } };

    await service.getToday('student-reader', timing as never);

    expect(new Set(stages)).toEqual(new Set([
      'challenge_preferences',
      'challenge_close_previous',
      'challenge_prepare',
      'challenge_items',
      'challenge_attempts',
      'challenge_questions',
      'challenge_authors',
      'challenge_contributions',
      'challenge_mine',
    ]));
  });

  it('uses the bounded today snapshot when the production read repository is available', async () => {
    const { authoring, play } = serviceFixture();
    await seedCompleteRound(authoring, play);
    const round = await play.getRound('2026-09-17');
    const items = await play.listRoundItems('2026-09-17');
    if (!round) throw new Error('missing round');
    const getPreferences = vi.spyOn(authoring, 'getPreferences');
    const read = {
      loadToday: vi.fn(async () => ({ round, items, attempts: [], questions: await authoring.findQuestionsByIds(items.map((item) => item.questionId)), authors: await authoring.getAuthorViewsByIds(items.map((item) => item.authorId)), currentContributions: 0, mine: [], preferences: { studentId: 'student-reader', canCreate: true, canParticipate: true, updatedAt: '2026-09-17T08:00:00.000Z' } })),
      loadWeekly: vi.fn(),
    };
    const listRoundItems = vi.spyOn(play, 'listRoundItems');
    const service = createChallengePlayService({ authoring, play, clock: () => START, activeStudentCount: async () => 3, idFactory: () => 'snapshot-id', read: read as never } as never);

    const result = await service.getToday('student-reader');

    expect(result.ok).toBe(true);
    expect(read.loadToday).toHaveBeenCalledOnce();
    expect(getPreferences).not.toHaveBeenCalled();
    expect(listRoundItems).not.toHaveBeenCalled();
  });

  it('keeps the authoritative preference fallback when the today snapshot has no preference row', async () => {
    const { authoring, play } = serviceFixture();
    await seedCompleteRound(authoring, play);
    const round = await play.getRound('2026-09-17');
    const items = await play.listRoundItems('2026-09-17');
    if (!round) throw new Error('missing round');
    const getPreferences = vi.spyOn(authoring, 'getPreferences');
    const read = {
      loadToday: vi.fn(async () => ({ round, items, attempts: [], questions: await authoring.findQuestionsByIds(items.map((item) => item.questionId)), authors: await authoring.getAuthorViewsByIds(items.map((item) => item.authorId)), currentContributions: 0, mine: [], preferences: null })),
      loadWeekly: vi.fn(),
    };
    const service = createChallengePlayService({ authoring, play, clock: () => START, activeStudentCount: async () => 3, idFactory: () => 'snapshot-id', read: read as never } as never);

    const result = await service.getToday('student-reader');

    expect(result.ok).toBe(true);
    expect(getPreferences).toHaveBeenCalledOnce();
  });

  it('drops withdrawn, voided, and author-mismatched batch rows before public mapping', async () => {
    const { authoring, play, service } = serviceFixture();
    await seedCompleteRound(authoring, play);
    const withdrawn = authoring.questions.get('question-batch-2');
    const voided = authoring.questions.get('question-batch-3');
    const mismatched = authoring.questions.get('question-batch-4');
    if (!withdrawn || !voided || !mismatched) throw new Error('missing fixture question');
    authoring.questions.set(withdrawn.id, { ...withdrawn, status: 'withdrawn' });
    authoring.questions.set(voided.id, { ...voided, status: 'voided' });
    authoring.questions.set(mismatched.id, { ...mismatched, authorId: 'student-other' });

    const result = await service.getToday('student-reader');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected today response');
    expect(result.questions.map((item) => item.id)).toEqual(['question-batch-1', 'question-batch-5']);
  });
});
