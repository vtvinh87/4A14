import { describe, expect, it } from 'vitest';
import type { ChallengeOptionTuple } from '../../shared/challenge-contracts';
import { VERIFIED_CHALLENGE_FACTS } from '../../shared/challenge-source';
import { MemoryAuthoringRepository } from './memoryAuthoringRepository';
import { MemoryPlayRepository } from './memoryPlayRepository';
import type { ChallengeRoundItemRecord, ChallengeRoundRecord } from './playTypes';
import { createChallengeSocialService } from './socialService';

const NOW = new Date('2026-09-17T08:00:00.000Z');

function round(): ChallengeRoundRecord {
  return {
    roundDate: '2026-09-17', timezone: 'Asia/Ho_Chi_Minh', status: 'open', targetContributions: 10,
    currentContributions: 0, selectedQuestionCount: 1, completed: false, closesAt: '2026-09-17T16:59:59.999Z',
    rewardGranted: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), closedAt: null, voidedAt: null,
    selectionSeedVersion: 'challenge-round-v1',
  };
}

function item(): ChallengeRoundItemRecord {
  return {
    id: 'item-1', roundDate: '2026-09-17', questionId: 'q-1', authorId: 'student-a', position: 1,
    featuredAt: NOW.toISOString(), selectionSeedVersion: 'challenge-round-v1', selectionMetadata: {}, closedAt: null,
  };
}

async function fixture() {
  const fact = VERIFIED_CHALLENGE_FACTS[0];
  const authoring = new MemoryAuthoringRepository({ now: () => NOW, authorViews: [
    { id: 'student-a', displayName: 'Bạn An', avatarId: 'fox-leaf' },
    { id: 'student-b', displayName: 'Bạn Bình', avatarId: 'fox-scout' },
  ] });
  const created = await authoring.insertPendingQuestion({
    id: 'q-1', authorId: 'student-a', sourceFactId: fact.id, sourceVersion: 'challenge-facts-v1', lessonId: fact.lessonId,
    lessonTitle: fact.lessonTitle, prompt: 'Câu hỏi về bản đồ và mảnh kiến thức đã được kiểm duyệt.',
    options: [
      { id: 'correct', text: fact.canonicalAnswer },
      { id: 'wrong-1', text: 'Một bài hát về ngày hội.' },
      { id: 'wrong-2', text: 'Một loại bánh truyền thống.' },
      { id: 'wrong-3', text: 'Một câu chuyện kể về nhân vật.' },
    ] as ChallengeOptionTuple,
    correctOptionId: 'correct', explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực theo tỉ lệ.',
    createdLocalDate: '2026-09-17', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  });
  if (created === 'quota_exceeded') throw new Error('fixture quota unexpectedly exceeded');
  const approved = await authoring.reviewQuestion('student-a', 'q-1', 1, { decision: 'approve' });
  if (!approved || typeof approved === 'string') throw new Error('fixture approval failed');
  await authoring.markQuestionFeatured('q-1', NOW.toISOString());
  const play = new MemoryPlayRepository({ now: () => NOW, rounds: [round()], items: [item()] });
  const service = createChallengeSocialService({ authoring, play, clock: () => NOW });
  return { authoring, play, service };
}

describe('Challenge social service', () => {
  it('accepts only positive reactions and makes each actor/item/type idempotent', async () => {
    const { service, play } = await fixture();
    const first = await service.addReaction('student-b', 'item-1', { reactionType: 'learned', idempotencyKey: 'reaction-1' });
    expect(first).toEqual({ ok: true, roundItemId: 'item-1', actorId: 'student-b', reactionType: 'learned', createdAt: NOW.toISOString() });
    const retry = await service.addReaction('student-b', 'item-1', { reactionType: 'learned', idempotencyKey: 'reaction-1' });
    expect(retry).toEqual(first);
    const duplicateType = await service.addReaction('student-b', 'item-1', { reactionType: 'learned', idempotencyKey: 'reaction-2' });
    expect(duplicateType).toEqual(first);
    expect(await service.addReaction('student-b', 'item-1', { reactionType: 'downvote' as never, idempotencyKey: 'reaction-3' })).toMatchObject({ ok: false, code: 'invalid' });
    expect(play.reactions).toHaveLength(1);
  });

  it('sanitizes report details, blocks report spam and allows a single idempotent retry', async () => {
    const { service, play } = await fixture();
    const report = await service.reportItem('student-b', 'item-1', {
      reason: 'unclear', details: '  <b>Câu này</b> chưa rõ & cần xem lại.  ', idempotencyKey: 'report-1',
    });
    expect(report).toMatchObject({ ok: true, roundItemId: 'item-1', reason: 'unclear', status: 'open' });
    const privateReport = [...play.reports.values()][0];
    expect(privateReport.details).toBe('Câu này chưa rõ & cần xem lại.');
    expect(await service.reportItem('student-b', 'item-1', { reason: 'unclear', details: 'đổi nội dung', idempotencyKey: 'report-1' })).toEqual(report);
    expect(await service.reportItem('student-b', 'item-1', { reason: 'answer_or_source', idempotencyKey: 'report-2' })).toMatchObject({ ok: false, code: 'conflict' });
    expect(play.reports).toHaveLength(1);
    expect(await service.reportItem('student-b', 'item-1', { reason: 'inappropriate', details: 'x'.repeat(501), idempotencyKey: 'report-3' })).toMatchObject({ ok: false, code: 'invalid' });
    expect(await service.reportItem('student-b', 'missing-item', { reason: 'unclear', idempotencyKey: 'report-4' })).toMatchObject({ ok: false, code: 'not-found' });
  });

  it('dismisses a report without voiding the question and voids history without individual penalty', async () => {
    const { service, play, authoring } = await fixture();
    const dismissedReport = await service.reportItem('student-b', 'item-1', { reason: 'unclear', idempotencyKey: 'report-dismiss' });
    if (!dismissedReport.ok) throw new Error('dismiss fixture failed');
    await expect(service.resolveReport('admin-1', dismissedReport.id, { decision: 'dismissed', reason: 'Đã kiểm tra, câu hỏi rõ rồi.' })).resolves.toEqual({ ok: true });
    expect((await play.findReport(dismissedReport.id))?.status).toBe('dismissed');
    expect((await authoring.findForAuthor('student-a', 'q-1'))?.status).toBe('featured');

    const report = await service.reportItem('student-b', 'item-1', { reason: 'answer_or_source', idempotencyKey: 'report-void' });
    if (!report.ok) throw new Error('void fixture failed');
    await play.insertAttempt({ id: 'attempt-1', roundItemId: 'item-1', studentId: 'student-b', idempotencyKey: 'attempt-1', selectedOptionId: 'correct', isCorrect: true, isPractice: false, isVoided: false, contribution: 1, answeredAt: NOW.toISOString() });
    expect(await play.countCorrectContributions('2026-09-17')).toBe(1);
    await expect(service.resolveReport('admin-1', report.id, { decision: 'voided', reason: 'Nguồn cần được kiểm tra lại.' })).resolves.toEqual({ ok: true });
    expect((await play.findReport(report.id))?.status).toBe('voided');
    expect((await authoring.findForAuthor('student-a', 'q-1'))?.status).toBe('voided');
    expect(await play.countCorrectContributions('2026-09-17')).toBe(0);
    expect((await play.attempts.get('attempt-1'))?.isVoided).toBe(true);
    await expect(service.resolveReport('admin-1', report.id, { decision: 'voided', reason: 'Đã xử lý.' })).resolves.toEqual({ ok: true });
  });

  it('voids a question directly while preserving the attempt record', async () => {
    const { service, play, authoring } = await fixture();
    await play.insertAttempt({ id: 'attempt-direct', roundItemId: 'item-1', studentId: 'student-b', idempotencyKey: 'attempt-direct', selectedOptionId: 'wrong-1', isCorrect: false, isPractice: false, isVoided: false, contribution: 0, answeredAt: NOW.toISOString() });
    await expect(service.voidQuestion('admin-1', 'q-1', 'Câu hỏi cần kiểm tra nguồn.')).resolves.toEqual({ ok: true });
    expect(play.attempts.has('attempt-direct')).toBe(true);
    expect((await authoring.findForAuthor('student-a', 'q-1'))?.status).toBe('voided');
    await expect(service.voidQuestion('admin-1', 'q-1', 'Đã xác nhận.')).resolves.toEqual({ ok: true });
    await expect(service.voidQuestion('admin-1', 'unknown', 'Không tồn tại.')).resolves.toMatchObject({ ok: false, code: 'not-found' });
  });
});
