import { describe, expect, it } from 'vitest';
import type { ChallengeOptionTuple } from '../../shared/challenge-contracts';
import type { DatabaseClient } from '../db/client';
import { PostgresAuthoringRepository } from './postgresAuthoringRepository';
import type { InsertPendingQuestion } from './authoringTypes';

type QueryRecord = { text: string; values: readonly unknown[] };

function createDatabaseDouble(input: InsertPendingQuestion) {
  const queries: QueryRecord[] = [];
  const jsonValues: unknown[] = [];
  const jsonMarker = (value: unknown) => {
    const marker = { kind: 'json', value };
    jsonValues.push(value);
    return marker;
  };
  const questionRow = {
    id: input.id,
    author_id: input.authorId,
    source_fact_id: input.sourceFactId,
    source_version: input.sourceVersion,
    lesson_id: input.lessonId,
    lesson_title: input.lessonTitle,
    prompt: input.prompt,
    options: input.options,
    correct_option_id: input.correctOptionId,
    explanation: input.explanation,
    status: 'pending_parent_review' as const,
    revision: 1,
    created_local_date: input.createdLocalDate,
    created_at: input.createdAt ?? '2026-09-17T08:00:00.000Z',
    updated_at: input.updatedAt ?? '2026-09-17T08:00:00.000Z',
    submitted_at: input.createdAt ?? '2026-09-17T08:00:00.000Z',
    reviewed_at: null,
    featured_at: null,
    closed_at: null,
    review_reason: null,
    withdrawn_at: null,
    voided_at: null,
  };

  const query = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('');
    queries.push({ text, values });
    if (text.includes('select pg_advisory_xact_lock')) return Promise.resolve([]);
    if (text.includes('select count(*)::int as question_count')) return Promise.resolve([{ question_count: 0 }]);
    if (text.includes('insert into hoc_vui_private.challenge_questions')) return Promise.resolve([questionRow]);
    throw new Error(`Unexpected query: ${text}`);
  }) as unknown as DatabaseClient;

  const transaction = query as unknown as DatabaseClient;
  Object.assign(transaction, {
    begin: (callback: (tx: DatabaseClient) => Promise<unknown>) => callback(transaction),
    json: jsonMarker,
    unsafe: (text: string) => text,
  });

  return { db: transaction, queries, jsonValues };
}

const options: ChallengeOptionTuple = [
  { id: 'correct', text: 'Bản đồ giúp tìm và đọc thông tin về khu vực.' },
  { id: 'wrong-1', text: 'Một bài hát về ngày hội.' },
  { id: 'wrong-2', text: 'Một loại bánh truyền thống.' },
  { id: 'wrong-3', text: 'Một câu chuyện kể về nhân vật.' },
];

const input: InsertPendingQuestion = {
  id: '11111111-1111-4111-8111-111111111111',
  authorId: '22222222-2222-4222-8222-222222222222',
  sourceFactId: 'map',
  sourceVersion: 'challenge-facts-v1',
  lessonId: 'lesson-01',
  lessonTitle: 'Lịch sử và Địa lí',
  prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
  options,
  correctOptionId: 'correct',
  explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
  createdLocalDate: '2026-09-17',
  createdAt: '2026-09-17T08:00:00.000Z',
  updatedAt: '2026-09-17T08:00:00.000Z',
};

describe('PostgresAuthoringRepository', () => {
  it('binds question options as JSONB instead of a JSON-encoded string', async () => {
    const { db, queries, jsonValues } = createDatabaseDouble(input);
    const repository = new PostgresAuthoringRepository(db);

    await expect(repository.insertPendingQuestion(input)).resolves.toEqual(expect.objectContaining({ id: input.id }));

    const insert = queries.find((query) => query.text.includes('insert into hoc_vui_private.challenge_questions'));
    expect(insert).toBeDefined();
    expect(jsonValues).toEqual([input.options]);
    expect(insert?.values).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'json', value: input.options }),
    ]));
    expect(insert?.values).not.toContain(JSON.stringify(input.options));
  });
});
