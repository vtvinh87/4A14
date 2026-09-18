import { describe, expect, it, vi } from 'vitest';
import { createEmptySnapshot } from './engine';
import { PostgresLearningRepository } from './postgresRepository';

const studentId = '11111111-1111-4111-8111-111111111111';

function mockedDatabase(rows: unknown[]) {
  const queries: string[] = [];
  const parameters: unknown[][] = [];
  const unsafe = vi.fn(async (query: string, values: unknown[]) => {
    queries.push(query);
    parameters.push(values);
    return rows;
  });
  return { db: { unsafe } as never, queries, parameters, unsafe };
}

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    event_id: '00000001-1111-4111-8111-111111111111',
    run_id: '00000002-1111-4111-8111-111111111111',
    student_id: studentId,
    sequence: 2,
    event_type: 'discovery_done',
    lesson_id: 'lesson-01',
    lesson_version: 1,
    device_id: 'tablet-a',
    activity_id: null,
    response: null,
    client_time: null,
    received_at: '2026-09-19T00:02:00.000Z',
    generation: 4,
    hint_used: false,
    correct: null,
    visible: true,
    interactive: true,
    ...overrides,
  };
}

describe('Postgres progress-board source read', () => {
  it('returns the contract empty snapshot and no events when the snapshot is absent', async () => {
    const mock = mockedDatabase([{
      snapshot_student_id: studentId,
      snapshot_schema_version: null,
      snapshot_revision: null,
      snapshot_generation: null,
      snapshot_content_version: null,
      snapshot_progress: null,
      snapshot_legacy_imported: null,
      snapshot_updated_at: null,
      events: [],
    }]);
    const repository = new PostgresLearningRepository(mock.db);

    const result = await repository.getProgressBoardSource(studentId);

    expect(result.snapshot).toMatchObject({ studentId, generation: 0, revision: 0 });
    expect(result.events).toEqual([]);
    expect(mock.unsafe).toHaveBeenCalledOnce();
    expect(mock.parameters[0]).toHaveLength(2);
  });

  it('preserves same-generation events when a legacy snapshot is absent', async () => {
    const mock = mockedDatabase([{
      snapshot_student_id: studentId,
      snapshot_schema_version: null,
      snapshot_revision: null,
      snapshot_generation: null,
      snapshot_content_version: null,
      snapshot_progress: null,
      snapshot_legacy_imported: null,
      snapshot_updated_at: null,
      events: [eventRow({ generation: 0 })],
    }]);
    const repository = new PostgresLearningRepository(mock.db);

    const result = await repository.getProgressBoardSource(studentId);

    expect(result.snapshot).toMatchObject({ studentId, generation: 0, revision: 0 });
    expect(result.events).toEqual([expect.objectContaining({ eventId: '00000001-1111-4111-8111-111111111111', generation: 0 })]);
  });

  it('maps the current snapshot and preserves current-generation events without a transaction', async () => {
    const empty = createEmptySnapshot(studentId, '2026-09-19T00:00:00.000Z');
    const mock = mockedDatabase([{
      snapshot_student_id: studentId,
      snapshot_schema_version: 1,
      snapshot_revision: 8,
      snapshot_generation: 4,
      snapshot_content_version: empty.contentVersion,
      snapshot_progress: empty.progress,
      snapshot_legacy_imported: false,
      snapshot_updated_at: '2026-09-19T00:01:00.000Z',
      events: [eventRow()],
    }]);
    const repository = new PostgresLearningRepository(mock.db);

    const result = await repository.getProgressBoardSource(studentId);

    expect(result.snapshot).toMatchObject({ studentId, revision: 8, generation: 4, updatedAt: '2026-09-19T00:01:00.000Z' });
    expect(result.events).toEqual([expect.objectContaining({ eventId: '00000001-1111-4111-8111-111111111111', sequence: 2, generation: 4 })]);
    const query = mock.queries[0] ?? '';
    expect(query).toContain('with actor as');
    expect(query).toContain('left join hoc_vui_private.learning_events as events');
    expect(query).toContain('events.generation = anchor.effective_generation');
    expect(query).toContain('order by events.received_at, events.sequence, events.event_id');
    expect(query).toContain("'[]'::jsonb");
    expect(query).not.toContain('begin');
  });
});
