import { describe, expect, it } from 'vitest';
import type { ChallengeOptionTuple } from '../../shared/challenge-contracts';
import { MemoryAuthoringRepository } from './memoryAuthoringRepository';
import { MemoryPlayRepository } from './memoryPlayRepository';
import type { ChallengeRoundItemRecord, ChallengeRoundRecord } from './playTypes';
import { createChallengeWeeklyService } from './weeklyService';

const NOW = new Date('2026-09-17T08:00:00.000Z');

function makeRound(roundDate: string, targetContributions: number): ChallengeRoundRecord {
  return {
    roundDate, timezone: 'Asia/Ho_Chi_Minh', status: 'closed', targetContributions,
    currentContributions: 0, selectedQuestionCount: 1, completed: false, closesAt: `${roundDate}T16:59:59.999Z`,
    rewardGranted: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), closedAt: `${roundDate}T17:00:00.000Z`, voidedAt: null,
    selectionSeedVersion: 'challenge-round-v1',
  };
}

function makeItem(id: string, roundDate: string, questionId: string, authorId: string, position = 1): ChallengeRoundItemRecord {
  return { id, roundDate, questionId, authorId, position, featuredAt: NOW.toISOString(), selectionSeedVersion: 'challenge-round-v1', selectionMetadata: {}, closedAt: `${roundDate}T17:00:00.000Z` };
}

async function addQuestion(authoring: MemoryAuthoringRepository, id: string, authorId: string, createdLocalDate: string, lessonId: 'lesson-01' | 'lesson-07') {
  const created = await authoring.insertPendingQuestion({
    id, authorId, sourceFactId: lessonId === 'lesson-01' ? 'map' : 'location', sourceVersion: 'challenge-facts-v1', lessonId,
    lessonTitle: lessonId === 'lesson-01' ? 'Địa phương em' : 'Đền Hùng và lễ Giỗ Tổ Hùng Vương', prompt: `Câu hỏi ${id} giúp lớp cùng khám phá kiến thức lịch sử và địa lí nhé.`,
    options: [
      { id: 'correct', text: 'Đáp án đã kiểm duyệt' }, { id: 'wrong-1', text: 'Phương án vui một' },
      { id: 'wrong-2', text: 'Phương án vui hai' }, { id: 'wrong-3', text: 'Phương án vui ba' },
    ] as ChallengeOptionTuple,
    correctOptionId: 'correct', explanation: 'Lời giải thích giúp con nhớ lại mảnh kiến thức đã được kiểm duyệt.', createdLocalDate,
    createdAt: `${createdLocalDate}T08:00:00.000Z`, updatedAt: `${createdLocalDate}T08:00:00.000Z`,
  });
  if (created === 'quota_exceeded') throw new Error('question quota unexpectedly exceeded');
  const approved = await authoring.reviewQuestion(authorId, id, created.revision, { decision: 'approve' });
  if (!approved || typeof approved === 'string') throw new Error('question approval failed');
  await authoring.markQuestionFeatured(id, `${createdLocalDate}T09:00:00.000Z`);
}

describe('Challenge weekly class map service', () => {
  it('aggregates local Monday-Sunday progress and emits nonexclusive positive recognitions only', async () => {
    const authoring = new MemoryAuthoringRepository({ now: () => NOW, authorViews: [
      { id: 'student-a', displayName: 'Bạn An', avatarId: 'fox-leaf' },
      { id: 'student-b', displayName: 'Bạn Bình', avatarId: 'fox-scout' },
      { id: 'student-c', displayName: 'Bạn Chi', avatarId: 'fox-night' },
    ] });
    await addQuestion(authoring, 'q-a', 'student-a', '2026-09-14', 'lesson-01');
    await addQuestion(authoring, 'q-b', 'student-b', '2026-09-15', 'lesson-07');
    await addQuestion(authoring, 'q-c', 'student-c', '2026-09-16', 'lesson-01');
    const play = new MemoryPlayRepository({ now: () => NOW, rounds: [makeRound('2026-09-14', 1), makeRound('2026-09-15', 2), makeRound('2026-09-16', 1)], items: [
      makeItem('item-a', '2026-09-14', 'q-a', 'student-a'), makeItem('item-b', '2026-09-15', 'q-b', 'student-b'), makeItem('item-c', '2026-09-16', 'q-c', 'student-c'),
    ] });
    await play.insertAttempt({ id: 'attempt-a', roundItemId: 'item-a', studentId: 'student-b', idempotencyKey: 'attempt-a', selectedOptionId: 'correct', isCorrect: true, isPractice: false, isVoided: false, contribution: 1, answeredAt: '2026-09-14T10:00:00.000Z' });
    await play.insertAttempt({ id: 'attempt-b', roundItemId: 'item-b', studentId: 'student-a', idempotencyKey: 'attempt-b', selectedOptionId: 'correct', isCorrect: true, isPractice: false, isVoided: false, contribution: 1, answeredAt: '2026-09-15T10:00:00.000Z' });
    await play.insertAttempt({ id: 'attempt-c', roundItemId: 'item-c', studentId: 'student-a', idempotencyKey: 'attempt-c', selectedOptionId: 'wrong-1', isCorrect: false, isPractice: false, isVoided: false, contribution: 0, answeredAt: '2026-09-16T10:00:00.000Z' });
    await play.insertAttempt({ id: 'attempt-d', roundItemId: 'item-c', studentId: 'student-b', idempotencyKey: 'attempt-d', selectedOptionId: 'correct', isCorrect: true, isPractice: false, isVoided: false, contribution: 1, answeredAt: '2026-09-16T11:00:00.000Z' });
    await play.upsertReaction({ roundItemId: 'item-a', actorId: 'student-a', reactionType: 'learned', createdAt: '2026-09-14T11:00:00.000Z' });
    await play.upsertReaction({ roundItemId: 'item-b', actorId: 'student-a', reactionType: 'thanks', createdAt: '2026-09-15T11:00:00.000Z' });

    const service = createChallengeWeeklyService({ play, authoring, now: () => NOW, activeStudentIds: async () => ['student-a', 'student-b', 'student-c'] });
    const result = await service.getWeekly('student-a', new Date('2026-09-17T08:00:00.000Z'));
    expect(result).toMatchObject({ ok: true, weekStart: '2026-09-14', weekEnd: '2026-09-20', classProgress: { current: 3, target: 4, completedDays: 2 }, mySummary: { questionsCreated: 1, correctAnswers: 1, revisits: 0 } });
    if (!result.ok) throw new Error('expected weekly response');
    expect(result.topics).toEqual(expect.arrayContaining([{ lessonId: 'lesson-01', title: 'Địa phương em', questionCount: 2 }, { lessonId: 'lesson-07', title: 'Đền Hùng và lễ Giỗ Tổ Hùng Vương', questionCount: 1 }]));
    expect(result.recognitions).toEqual(expect.arrayContaining([
      { type: 'question_creator', recipientIds: ['student-a', 'student-b', 'student-c'] },
      { type: 'kind_helper', recipientIds: ['student-a'] },
      { type: 'steady_learner', recipientIds: ['student-a', 'student-b'] },
      { type: 'class_builder', recipientIds: ['student-b'] },
    ]));
    expect(JSON.stringify(result)).not.toMatch(/rank|leaderboard|position|fastest|scoreByStudent|top five/i);
  });

  it('uses the Vietnam local boundary and returns a calm empty week without inventing data', async () => {
    const authoring = new MemoryAuthoringRepository({ now: () => NOW });
    const play = new MemoryPlayRepository({ now: () => NOW });
    const service = createChallengeWeeklyService({ play, authoring, now: () => NOW, activeStudentIds: async () => [] });
    const boundary = await service.getWeekly('student-a', new Date('2026-09-13T17:00:00.000Z'));
    expect(boundary).toMatchObject({ ok: true, weekStart: '2026-09-14', weekEnd: '2026-09-20', classProgress: { current: 0, target: 0, completedDays: 0 }, topics: [], recognitions: [] });
    if (boundary.ok) expect(boundary.mySummary).toEqual({ questionsCreated: 0, correctAnswers: 0, revisits: 0 });
  });
});
