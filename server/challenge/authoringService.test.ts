import { describe, expect, it } from 'vitest';
import { VERIFIED_CHALLENGE_FACTS } from '../../shared/challenge-source';
import { MemoryAuthoringRepository } from './memoryAuthoringRepository';
import { createChallengeAuthoringService } from './authoringService';

const NOW = new Date('2026-09-17T08:00:00.000Z');

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    sourceFactId: 'map',
    prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
    correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
    distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'] as [string, string, string],
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    ...overrides,
  };
}

function serviceFor(repository: MemoryAuthoringRepository, options: { names?: readonly string[]; ids?: string[] } = {}) {
  let index = 0;
  return createChallengeAuthoringService({
    repository,
    sourceCatalog: VERIFIED_CHALLENGE_FACTS,
    activeStudentDisplayNames: async () => options.names ?? ['Lan', 'Minh', 'An'],
    clock: () => NOW,
    idFactory: () => options.ids?.[index++] ?? `question-${index++}`,
  });
}

describe('Challenge authoring service', () => {
  it('creates a pending question from the selected knowledge area and preserves the student-authored answer', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => NOW });
    const service = serviceFor(repository, { ids: ['q-created'] });

    const result = await service.createQuestion('student-a', createInput());

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      id: 'q-created',
      status: 'pending_parent_review',
      sourceFactId: 'map',
      correctOptionId: 'correct',
      quotaUsedOnCreatedDate: 1,
    }));
    if (!result.ok) throw new Error('expected create success');
    expect(result.options).toEqual(expect.arrayContaining([{ id: 'correct', text: 'Bản đồ giúp tìm và đọc thông tin về khu vực.' }]));
    expect(result).not.toHaveProperty('authorStudentId');
  });

  it('rejects forged fields, unknown source facts, disallowed names and a paused create preference', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => NOW });
    const service = serviceFor(repository, { names: ['Bình'] });

    const forged = await service.createQuestion('student-a', createInput({ correctOptionId: 'wrong-1' }));
    expect(forged).toMatchObject({ ok: false, code: 'invalid' });
    const unknownFact = await service.createQuestion('student-a', createInput({ sourceFactId: 'not-in-catalog' }));
    expect(unknownFact).toMatchObject({ ok: false, code: 'invalid' });
    const named = await service.createQuestion('student-a', createInput({ prompt: 'Bình ơi, theo con bản đồ giúp chúng ta học điều gì?' }));
    expect(named).toMatchObject({ ok: false, code: 'invalid' });

    await repository.updatePreferences('student-a', { canCreate: false });
    const paused = await service.createQuestion('student-a', createInput());
    expect(paused).toEqual({ ok: false, code: 'forbidden', message: 'Tính năng tạo câu hỏi đang được phụ huynh tạm dừng.' });
    expect(repository.questions).toHaveLength(0);
  });

  it('lists only the authenticated student questions and maps quota exhaustion to rate-limited', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => NOW });
    const service = serviceFor(repository);
    for (let index = 0; index < 3; index += 1) {
      const created = await service.createQuestion('student-a', createInput({ prompt: `Câu hỏi số ${index + 1}: bản đồ giúp chúng ta học điều gì?` }));
      expect(created.ok).toBe(true);
    }
    const fourth = await service.createQuestion('student-a', createInput({ prompt: 'Câu hỏi thứ tư: bản đồ giúp chúng ta học điều gì?' }));
    expect(fourth).toMatchObject({ ok: false, code: 'rate-limited', reason: 'quota_exceeded' });

    const list = await service.listMine('student-a');
    expect(list.ok).toBe(true);
    if (!list.ok) throw new Error('expected list success');
    expect(list.items).toHaveLength(3);
    expect(list.items.every((question) => question.authorId === 'student-a')).toBe(true);
  });

  it('revises only a requested draft, refreshes the verified answer snapshot and maps stale revisions', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => NOW });
    const service = serviceFor(repository, { ids: ['q-revise'] });
    const created = await service.createQuestion('student-a', createInput());
    if (!created.ok) throw new Error('expected create success');
    await repository.reviewQuestion('student-a', created.id, created.revision, { decision: 'request_revision', reason: 'Con hãy viết rõ hơn nhé.' });

    const revised = await service.reviseQuestion('student-a', created.id, {
      revision: 1,
      sourceFactId: 'festival',
      prompt: 'Theo sách, ngày Giỗ Tổ Hùng Vương diễn ra vào ngày nào?',
      correctAnswer: 'Mồng 10 tháng Ba âm lịch hằng năm.',
      distractors: ['Mồng một tháng Giêng.', 'Ngày Quốc khánh.', 'Ngày cuối năm.'],
      explanation: 'Theo sách, Giỗ Tổ Hùng Vương diễn ra vào mồng 10 tháng Ba âm lịch hằng năm.',
    });
    expect(revised).toEqual(expect.objectContaining({ ok: true, revision: 2, status: 'pending_parent_review', sourceFactId: 'festival' }));
    if (!revised.ok) throw new Error('expected revision success');
    expect(revised.options).toEqual(expect.arrayContaining([{ id: 'correct', text: 'Mồng 10 tháng Ba âm lịch hằng năm.' }]));
    expect(revised.quotaUsedOnCreatedDate).toBe(1);

    const stale = await service.reviseQuestion('student-a', created.id, {
      revision: 1,
      sourceFactId: 'map',
      prompt: 'Câu hỏi cũ: bản đồ giúp chúng ta học điều gì?',
      correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
      distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
      explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    });
    expect(stale).toMatchObject({ ok: false, code: 'conflict', reason: 'revision_conflict' });
  });
});
