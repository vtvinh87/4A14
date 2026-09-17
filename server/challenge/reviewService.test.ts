import { describe, expect, it } from 'vitest';
import type { ChallengeOptionTuple } from '../../shared/challenge-contracts';
import { VERIFIED_CHALLENGE_FACTS } from '../../shared/challenge-source';
import { MemoryAuthoringRepository } from './memoryAuthoringRepository';
import { createChallengeReviewService } from './reviewService';

const NOW = new Date('2026-09-17T08:00:00.000Z');

function reviewService(repository: MemoryAuthoringRepository) {
  return createChallengeReviewService({ repository, clock: () => NOW });
}

function questionInput(id: string) {
  const fact = VERIFIED_CHALLENGE_FACTS[0];
  return {
    id,
    authorId: 'student-a',
    sourceFactId: fact.id,
    sourceVersion: 'challenge-facts-v1',
    lessonId: fact.lessonId,
    lessonTitle: fact.lessonTitle,
    prompt: `Câu hỏi ${id}: Bản đồ dùng để làm gì trong học tập?`,
    options: [
      { id: 'correct', text: fact.canonicalAnswer },
      { id: 'wrong-1', text: 'Một bài hát về ngày hội.' },
      { id: 'wrong-2', text: 'Một loại bánh truyền thống.' },
      { id: 'wrong-3', text: 'Một câu chuyện kể về nhân vật.' },
    ] as ChallengeOptionTuple,
    correctOptionId: 'correct',
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    createdLocalDate: '2026-09-17',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  } as const;
}

describe('Challenge review service', () => {
  it('lists pending child questions and approves only the current revision', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => NOW });
    const created = await repository.insertPendingQuestion(questionInput('q-review'));
    if (created === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');
    const service = reviewService(repository);

    const pending = await service.listPending('student-a');
    expect(pending).toEqual({ ok: true, items: [expect.objectContaining({ id: 'q-review', status: 'pending_parent_review' })] });
    const stale = await service.review('student-a', 'q-review', { decision: 'approve', revision: 99 });
    expect(stale).toMatchObject({ ok: false, code: 'conflict', reason: 'revision_conflict' });
    const approved = await service.review('student-a', 'q-review', { decision: 'approve', revision: created.revision });
    expect(approved).toEqual(expect.objectContaining({ ok: true, id: 'q-review', status: 'approved' }));
    await expect(service.listPending('student-a')).resolves.toEqual({ ok: true, items: [] });
  });

  it('requires a useful revision reason and keeps a rejected question as a draft', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => NOW });
    const created = await repository.insertPendingQuestion(questionInput('q-revision'));
    if (created === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');
    const service = reviewService(repository);

    const invalid = await service.review('student-a', created.id, { decision: 'request_revision', revision: 1, reason: ' ' });
    expect(invalid).toMatchObject({ ok: false, code: 'invalid' });
    const requested = await service.review('student-a', created.id, { decision: 'request_revision', revision: 1, reason: 'Con hãy viết câu hỏi rõ hơn nhé.' });
    expect(requested).toEqual(expect.objectContaining({ ok: true, status: 'draft', reviewReason: 'Con hãy viết câu hỏi rõ hơn nhé.' }));
  });

  it('withdraws in-scope pre-feature questions without deleting the record and controls preferences', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => NOW });
    const created = await repository.insertPendingQuestion(questionInput('q-withdraw'));
    if (created === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');
    const service = reviewService(repository);

    await expect(service.withdraw('student-a', created.id)).resolves.toEqual({ ok: true });
    await expect(repository.findForAuthor('student-a', created.id)).resolves.toEqual(expect.objectContaining({ status: 'withdrawn' }));
    await expect(service.getSettings('student-a')).resolves.toEqual(expect.objectContaining({ ok: true, canCreate: true, canParticipate: true }));
    await expect(service.updateSettings('student-a', { canCreate: false, canParticipate: false })).resolves.toEqual(expect.objectContaining({ ok: true, canCreate: false, canParticipate: false }));
    await expect(service.updateSettings('student-a', { canCreate: 'no' } as never)).resolves.toMatchObject({ ok: false, code: 'invalid' });
  });
});
