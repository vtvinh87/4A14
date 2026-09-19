import { describe, expect, it, vi } from 'vitest';
import type { ChallengeOptionTuple } from '../../shared/challenge-contracts';
import { MemoryAuthoringRepository } from './memoryAuthoringRepository';
import { PostgresAuthoringRepository } from './postgresAuthoringRepository';

const NOW = '2026-09-17T08:00:00.000Z';
const LOCAL_DATE = '2026-09-17';

function input(id: string, authorId = 'student-a', createdLocalDate = LOCAL_DATE) {
  return {
    id,
    authorId,
    sourceFactId: 'map',
    sourceVersion: 'challenge-facts-v1',
    lessonId: 'lesson-01' as const,
    lessonTitle: 'Làm quen với phương tiện học tập môn Lịch sử và Địa lí',
    prompt: `Câu hỏi ${id}: Bản đồ dùng để làm gì trong học tập?`,
    options: [
      { id: 'correct', text: 'Bản đồ thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.' },
      { id: 'wrong-a', text: 'Một bài hát về ngày hội.' },
      { id: 'wrong-b', text: 'Một loại bánh truyền thống.' },
      { id: 'wrong-c', text: 'Một câu chuyện kể về nhân vật.' },
    ] as ChallengeOptionTuple,
    correctOptionId: 'correct',
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    createdLocalDate,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function questionRow(id: string, authorId: string) {
  return {
    id,
    author_id: authorId,
    source_fact_id: 'map',
    source_version: 'challenge-facts-v1',
    lesson_id: 'lesson-01',
    lesson_title: 'Làm quen với phương tiện học tập môn Lịch sử và Địa lí',
    prompt: `Câu hỏi ${id}: Bản đồ dùng để làm gì trong học tập?`,
    options: [
      { id: 'correct', text: 'Bản đồ thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.' },
      { id: 'wrong-a', text: 'Một bài hát về ngày hội.' },
      { id: 'wrong-b', text: 'Một loại bánh truyền thống.' },
      { id: 'wrong-c', text: 'Một câu chuyện kể về nhân vật.' },
    ],
    correct_option_id: 'correct',
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    status: 'approved',
    revision: 1,
    created_local_date: LOCAL_DATE,
    created_at: NOW,
    updated_at: NOW,
    submitted_at: NOW,
    reviewed_at: NOW,
    featured_at: null,
    closed_at: null,
    review_reason: null,
    withdrawn_at: null,
    voided_at: null,
  };
}

function mockedDatabase(rows: unknown[]) {
  const callable = vi.fn(async (..._args: unknown[]) => rows);
  const array = vi.fn((values: readonly string[]) => values);
  const db = Object.assign(callable, { array });
  return { db: db as never, callable, array };
}

function mockedDatabaseSequence(rowSets: unknown[][]) {
  const queries: string[] = [];
  let index = 0;
  const callable = vi.fn(async (strings: TemplateStringsArray, ..._args: unknown[]) => {
    queries.push(String(strings).replace(/\s+/g, ' ').trim().toLowerCase());
    return rowSets[index++] ?? [];
  });
  const array = vi.fn((values: readonly string[]) => values);
  const db = Object.assign(callable, { array });
  return { db: db as never, callable, queries };
}

describe('MemoryAuthoringRepository', () => {
  it('enforces the three-new-question quota atomically and keeps source snapshots', async () => {
    let sequence = 0;
    const repository = new MemoryAuthoringRepository({
      now: () => new Date(NOW),
      idFactory: () => `generated-${++sequence}`,
    });

    const results = await Promise.all([
      repository.insertPendingQuestion(input('q-1')),
      repository.insertPendingQuestion(input('q-2')),
      repository.insertPendingQuestion(input('q-3')),
      repository.insertPendingQuestion(input('q-4')),
    ]);

    expect(results.filter((result) => result === 'quota_exceeded')).toHaveLength(1);
    expect(results.filter((result) => result !== 'quota_exceeded')).toHaveLength(3);
    await expect(repository.countNewQuestionsForDay('student-a', LOCAL_DATE)).resolves.toBe(3);
    await expect(repository.findForAuthor('student-a', 'q-1')).resolves.toEqual(expect.objectContaining({
      sourceFactId: 'map',
      sourceVersion: 'challenge-facts-v1',
      status: 'pending_parent_review',
      correctOptionId: 'correct',
    }));
  });

  it('supports the approved, featured and closed lifecycle without exposing mutable references', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => new Date(NOW) });
    const created = await repository.insertPendingQuestion(input('q-life'));
    if (created === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');

    const approved = await repository.reviewQuestion('student-a', created.id, created.revision, { decision: 'approve' });
    expect(approved).toEqual(expect.objectContaining({ status: 'approved', reviewedAt: NOW }));

    await repository.markQuestionFeatured(created.id, '2026-09-17T09:00:00.000Z');
    await expect(repository.findForAuthor('student-a', created.id)).resolves.toEqual(expect.objectContaining({
      status: 'featured',
      featuredAt: '2026-09-17T09:00:00.000Z',
    }));
    await repository.markQuestionClosed(created.id, '2026-09-17T17:00:00.000Z');
    await expect(repository.findForAuthor('student-a', created.id)).resolves.toEqual(expect.objectContaining({
      status: 'closed',
      closedAt: '2026-09-17T17:00:00.000Z',
    }));

    const mine = await repository.listMine('student-a', 10);
    mine[0].prompt = 'mutated';
    await expect(repository.findForAuthor('student-a', created.id)).resolves.toEqual(expect.objectContaining({
      prompt: expect.stringContaining('Bản đồ dùng để làm gì'),
    }));
  });

  it('returns revision conflicts without writing and resubmits a requested revision', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => new Date(NOW) });
    const created = await repository.insertPendingQuestion(input('q-revise'));
    if (created === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');

    const requested = await repository.reviewQuestion('student-a', created.id, 1, {
      decision: 'request_revision',
      reason: 'Con hãy viết câu hỏi rõ hơn một chút nhé.',
    });
    expect(requested).toEqual(expect.objectContaining({ status: 'draft', reviewReason: 'Con hãy viết câu hỏi rõ hơn một chút nhé.' }));

    const revision = await repository.updateDraftRevision('student-a', created.id, 1, {
      revision: 1,
      sourceFactId: 'sketch',
      prompt: 'Câu hỏi q-revise mới: Khi đọc bản đồ, con cần xem gì để hiểu kí hiệu?',
      correctAnswer: 'Chú giải giúp hiểu ý nghĩa các kí hiệu.',
      distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
      explanation: 'Chú giải giúp chúng ta hiểu các kí hiệu được dùng trên bản đồ hoặc lược đồ.',
    });
    expect(revision).toEqual(expect.objectContaining({
      revision: 2,
      status: 'pending_parent_review',
      reviewReason: null,
      prompt: 'Câu hỏi q-revise mới: Khi đọc bản đồ, con cần xem gì để hiểu kí hiệu?',
    }));

    const beforeConflict = structuredClone(revision);
    expect(await repository.updateDraftRevision('student-a', created.id, 1, {
      revision: 1,
      sourceFactId: 'map',
      prompt: 'Câu hỏi q-revise khác: Bản đồ dùng để làm gì trong học tập?',
      correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
      distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
      explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    })).toBe('revision_conflict');
    await expect(repository.findForAuthor('student-a', created.id)).resolves.toEqual(beforeConflict);
  });

  it('keeps featured and closed questions immutable and withdraws without deleting history', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => new Date(NOW) });
    const created = await repository.insertPendingQuestion(input('q-immutable'));
    if (created === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');
    await repository.reviewQuestion('student-a', created.id, 1, { decision: 'approve' });
    await repository.markQuestionFeatured(created.id, '2026-09-17T09:00:00.000Z');

    expect(await repository.updateDraftRevision('student-a', created.id, 1, {
      revision: 1,
      sourceFactId: 'map',
      prompt: 'Câu hỏi q-immutable khác: Bản đồ dùng để làm gì trong học tập?',
      correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
      distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
      explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    })).toBe('revision_conflict');
    expect(await repository.withdrawQuestion('student-a', created.id)).toBe('invalid_state');
    await repository.markQuestionClosed(created.id, '2026-09-17T17:00:00.000Z');
    expect(await repository.updateDraftRevision('student-a', created.id, 1, {
      revision: 1,
      sourceFactId: 'map',
      prompt: 'Câu hỏi q-immutable khác: Bản đồ dùng để làm gì trong học tập?',
      correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
      distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
      explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    })).toBe('revision_conflict');

    const withdrawn = await repository.insertPendingQuestion(input('q-withdrawn', 'student-a', '2026-09-18'));
    if (withdrawn === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');
    expect(await repository.withdrawQuestion('student-a', withdrawn.id)).toBe('ok');
    await expect(repository.findForAuthor('student-a', withdrawn.id)).resolves.toEqual(expect.objectContaining({ status: 'withdrawn', withdrawnAt: NOW }));
  });

  it('lists only approved candidates and returns default then updated preferences', async () => {
    const repository = new MemoryAuthoringRepository({ now: () => new Date(NOW) });
    const pending = await repository.insertPendingQuestion(input('q-pending'));
    if (pending === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');
    const approved = await repository.insertPendingQuestion(input('q-approved', 'student-b', LOCAL_DATE));
    if (approved === 'quota_exceeded') throw new Error('fixture unexpectedly exceeded quota');
    await repository.reviewQuestion('student-b', approved.id, approved.revision, { decision: 'approve' });

    await expect(repository.listApprovedCandidates(LOCAL_DATE)).resolves.toEqual([
      expect.objectContaining({ questionId: approved.id, authorId: 'student-b', recentRoundDates: [] }),
    ]);
    await expect(repository.listPendingForStudent('student-a')).resolves.toEqual([
      expect.objectContaining({ id: pending.id, status: 'pending_parent_review', preview: null, reviewHistory: [] }),
    ]);

    await expect(repository.getPreferences('student-a')).resolves.toEqual({
      studentId: 'student-a',
      canCreate: true,
      canParticipate: true,
      updatedAt: NOW,
    });
    await expect(repository.updatePreferences('student-a', { canCreate: false })).resolves.toEqual({
      studentId: 'student-a',
      canCreate: false,
      canParticipate: true,
      updatedAt: NOW,
    });
  });

  it('reads unique questions and author views in stable batch order', async () => {
    const repository = new MemoryAuthoringRepository({
      now: () => new Date(NOW),
      authorViews: [{ id: 'student-a', displayName: 'Bạn A', avatarId: 'fox-leaf' }],
    });
    const first = await repository.insertPendingQuestion(input('q-batch-1', 'student-a'));
    const second = await repository.insertPendingQuestion(input('q-batch-2', 'student-b'));
    expect(first).not.toBe('quota_exceeded');
    expect(second).not.toBe('quota_exceeded');

    await expect(repository.findQuestionsByIds(['q-batch-2', 'q-batch-1', 'q-batch-2'])).resolves.toEqual([
      expect.objectContaining({ id: 'q-batch-2' }),
      expect.objectContaining({ id: 'q-batch-1' }),
    ]);
    await expect(repository.getAuthorViewsByIds(['student-a', 'student-b', 'student-a'])).resolves.toEqual([
      { id: 'student-a', displayName: 'Bạn A', avatarId: 'fox-leaf' },
      { id: 'student-b', displayName: 'Bạn trong lớp', avatarId: 'fox-leaf' },
    ]);
  });

  it('uses one SQL statement per non-empty batch and no SQL for empty input', async () => {
    const questionMock = mockedDatabase([questionRow('q-batch-2', 'student-b'), questionRow('q-batch-1', 'student-a')]);
    const questionRepository = new PostgresAuthoringRepository(questionMock.db);
    await expect(questionRepository.findQuestionsByIds(['q-batch-1', 'q-batch-1', 'q-batch-2'])).resolves.toEqual([
      expect.objectContaining({ id: 'q-batch-2' }),
      expect.objectContaining({ id: 'q-batch-1' }),
    ]);
    expect(questionMock.callable).toHaveBeenCalledOnce();
    expect(questionMock.callable.mock.calls[0]?.[1]).toEqual(['q-batch-1', 'q-batch-2']);
    expect(String(questionMock.callable.mock.calls[0]?.[0])).toContain('any');

    const authorMock = mockedDatabase([
      { id: 'student-a', display_name: 'Bạn A', avatar_id: 'fox-leaf' },
      { id: 'student-b', display_name: 'Bạn B', avatar_id: 'fox-sun' },
    ]);
    const authorRepository = new PostgresAuthoringRepository(authorMock.db);
    await expect(authorRepository.getAuthorViewsByIds(['student-b', 'student-a', 'student-b'])).resolves.toEqual([
      { id: 'student-a', displayName: 'Bạn A', avatarId: 'fox-leaf' },
      { id: 'student-b', displayName: 'Bạn B', avatarId: 'fox-sun' },
    ]);
    expect(authorMock.callable).toHaveBeenCalledOnce();
    expect(authorMock.callable.mock.calls[0]?.[1]).toEqual(['student-b', 'student-a']);

    const emptyMock = mockedDatabase([]);
    const emptyRepository = new PostgresAuthoringRepository(emptyMock.db);
    await expect(emptyRepository.findQuestionsByIds([])).resolves.toEqual([]);
    await expect(emptyRepository.getAuthorViewsByIds([])).resolves.toEqual([]);
    expect(emptyMock.callable).not.toHaveBeenCalled();
  });

  it('reads existing preferences first and re-reads after a missing-row insert', async () => {
    const existing = { student_id: 'student-a', can_create: false, can_participate: true, updated_at: NOW };
    const existingMock = mockedDatabaseSequence([[existing]]);
    const existingRepository = new PostgresAuthoringRepository(existingMock.db);
    await expect(existingRepository.getPreferences('student-a')).resolves.toEqual({ studentId: 'student-a', canCreate: false, canParticipate: true, updatedAt: NOW });
    expect(existingMock.callable).toHaveBeenCalledOnce();
    expect(existingMock.queries[0]).toContain('select');

    const inserted = { student_id: 'student-b', can_create: true, can_participate: false, updated_at: NOW };
    const missingMock = mockedDatabaseSequence([[], [], [inserted]]);
    const missingRepository = new PostgresAuthoringRepository(missingMock.db);
    await expect(missingRepository.getPreferences('student-b')).resolves.toEqual({ studentId: 'student-b', canCreate: true, canParticipate: false, updatedAt: NOW });
    expect(missingMock.callable).toHaveBeenCalledTimes(3);
    expect(missingMock.queries[1]).toContain('insert');
    expect(missingMock.queries[2]).toContain('select');
  });
});
