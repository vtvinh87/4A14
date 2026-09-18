import type postgres from 'postgres';
import { withTransaction, type DatabaseClient, type DatabaseTransaction } from '../db/client.ts';
import { createEmptySnapshot } from './engine.ts';
import { LearningBatchError, type LearningEventProcessorResult, type LearningEventRecord, type LearningRepository, type LearningRunRecord, type LearningSnapshotRecord, type LearningStore, type MigrationReceiptRecord } from './types.ts';
import type { LearningEventInput } from '../../shared/learning-contracts.ts';
import type { Progress, Session } from '../../src/content/types.ts';

type QueryClient = DatabaseClient | DatabaseTransaction;

type SnapshotRow = {
  student_id: string;
  schema_version: number;
  revision: number;
  generation: number;
  content_version: string;
  snapshot: Progress;
  legacy_imported: boolean;
  updated_at: Date | string;
};

type RunRow = {
  run_id: string;
  student_id: string;
  lesson_id: string;
  lesson_version: number;
  device_id: string;
  status: 'active' | 'completed' | 'abandoned';
  state: Session;
  generation: number;
  last_sequence: number;
  started_at: Date | string;
  ended_at: Date | string | null;
  updated_at: Date | string;
};

type EventRow = {
  event_id: string;
  run_id: string;
  student_id: string;
  sequence: number;
  event_type: LearningEventInput['type'];
  lesson_id: string;
  lesson_version: number;
  device_id: string;
  activity_id: string | null;
  response: LearningEventInput['response'] | null;
  client_time: Date | string | null;
  received_at: Date | string;
  generation: number;
  hint_used: boolean;
  correct: boolean | null;
  visible: boolean;
  interactive: boolean;
};

type ProgressBoardSourceRow = {
  snapshot_student_id: string | null;
  snapshot_schema_version: number | null;
  snapshot_revision: number | null;
  snapshot_generation: number | null;
  snapshot_content_version: string | null;
  snapshot_progress: Progress | null;
  snapshot_legacy_imported: boolean | null;
  snapshot_updated_at: Date | string | null;
  events: EventRow[] | null;
};

type MigrationReceiptRow = {
  fingerprint: string;
  student_id: string;
  status: MigrationReceiptRecord['status'];
  result: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
};

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapSnapshot(row: SnapshotRow): LearningSnapshotRecord {
  return { studentId: row.student_id, schemaVersion: 1, revision: Number(row.revision), generation: Number(row.generation), contentVersion: row.content_version, progress: row.snapshot, updatedAt: iso(row.updated_at)!, ...(row.legacy_imported ? { legacyImported: true } : {}) };
}

function mapRun(row: RunRow): LearningRunRecord {
  return { runId: row.run_id, studentId: row.student_id, lessonId: row.lesson_id, lessonVersion: Number(row.lesson_version), deviceId: row.device_id, status: row.status, state: row.state, generation: Number(row.generation), lastSequence: Number(row.last_sequence), startedAt: iso(row.started_at)!, endedAt: iso(row.ended_at), updatedAt: iso(row.updated_at)! };
}

function mapEvent(row: EventRow): LearningEventRecord {
  return { eventId: row.event_id, runId: row.run_id, studentId: row.student_id, sequence: Number(row.sequence), type: row.event_type, lessonId: row.lesson_id, lessonVersion: Number(row.lesson_version), deviceId: row.device_id, ...(row.activity_id ? { activityId: row.activity_id } : {}), ...(row.response ? { response: row.response } : {}), ...(iso(row.client_time) ? { clientTime: iso(row.client_time)! } : {}), generation: Number(row.generation), receivedAt: iso(row.received_at)!, hintUsed: row.hint_used, correct: row.correct, visible: row.visible, interactive: row.interactive };
}

async function selectSnapshot(db: QueryClient, studentId: string, lock = false): Promise<LearningSnapshotRecord> {
  const rows = await db<SnapshotRow[]>`
    select student_id, schema_version, revision, generation, content_version, snapshot, legacy_imported, updated_at
    from hoc_vui_private.progress_snapshots
    where student_id = ${studentId}::uuid
    ${lock ? db`for update` : db``}
  ` as SnapshotRow[];
  return rows[0] ? mapSnapshot(rows[0]) : createEmptySnapshot(studentId, new Date().toISOString());
}

async function selectRun(db: QueryClient, runId: string, lock = false): Promise<LearningRunRecord | null> {
  const rows = await db<RunRow[]>`
    select run_id, student_id, lesson_id, lesson_version, device_id, status, state, generation, last_sequence, started_at, ended_at, updated_at
    from hoc_vui_private.learning_runs
    where run_id = ${runId}::uuid
    ${lock ? db`for update` : db``}
  ` as RunRow[];
  return rows[0] ? mapRun(rows[0]) : null;
}

export class PostgresLearningRepository implements LearningRepository {
  constructor(private readonly db: DatabaseClient) {}

  async processBatch(studentId: string, events: LearningEventInput[], processor: (store: LearningStore, event: LearningEventInput) => LearningEventProcessorResult): Promise<{ snapshot: LearningSnapshotRecord; acknowledgements: { eventId: string; sequence: number; status: 'accepted' | 'duplicate'; revision: number }[] }> {
    return withTransaction(this.db, async (tx) => {
      let snapshot = await selectSnapshot(tx, studentId, true);
      const acknowledgements: { eventId: string; sequence: number; status: 'accepted' | 'duplicate'; revision: number }[] = [];
      for (const event of events) {
        const duplicateRows = await tx<{ event_id: string; student_id: string; sequence: number }[]>`
          select event_id, student_id, sequence
          from hoc_vui_private.learning_events
          where event_id = ${event.eventId}::uuid
          limit 1
        `;
        const duplicate = duplicateRows[0];
        if (duplicate) {
          if (duplicate.student_id !== studentId) throw new LearningBatchError('forbidden', 'Event không thuộc tài khoản hiện tại.');
          acknowledgements.push({ eventId: event.eventId, sequence: Number(duplicate.sequence), status: 'duplicate', revision: snapshot.revision });
          continue;
        }

        const run = await selectRun(tx, event.runId, true);
        const result = processor({ snapshot, run }, event);
        if (!result.ok) throw new LearningBatchError(result.code, result.message);

        if (result.run) {
          if (run) {
            await tx`
              update hoc_vui_private.learning_runs
              set lesson_id = ${result.run.lessonId}, lesson_version = ${result.run.lessonVersion}, device_id = ${result.run.deviceId}, status = ${result.run.status}, state = ${tx.json(result.run.state as never)}::jsonb, generation = ${result.run.generation}, last_sequence = ${result.run.lastSequence}, ended_at = ${result.run.endedAt}, updated_at = ${result.run.updatedAt}
              where run_id = ${result.run.runId}::uuid and student_id = ${studentId}::uuid
            `;
          } else {
            await tx`
              insert into hoc_vui_private.learning_runs
                (run_id, student_id, lesson_id, lesson_version, device_id, status, state, generation, last_sequence, started_at, ended_at, updated_at)
              values
                (${result.run.runId}::uuid, ${studentId}::uuid, ${result.run.lessonId}, ${result.run.lessonVersion}, ${result.run.deviceId}, ${result.run.status}, ${tx.json(result.run.state as never)}::jsonb, ${result.run.generation}, ${result.run.lastSequence}, ${result.run.startedAt}, ${result.run.endedAt}, ${result.run.updatedAt})
            `;
          }
        }
        const responseJson = result.event.response === undefined ? null : tx.json(result.event.response as never);
        await tx`
          insert into hoc_vui_private.learning_events
            (event_id, run_id, student_id, sequence, event_type, lesson_id, lesson_version, device_id, activity_id, response, hint_used, correct, client_time, received_at, generation, visible, interactive)
          values
            (${result.event.eventId}::uuid, ${result.event.runId}::uuid, ${studentId}::uuid, ${result.event.sequence}, ${result.event.type}, ${result.event.lessonId}, ${result.event.lessonVersion}, ${result.event.deviceId}, ${result.event.activityId ?? null}, ${responseJson}::jsonb, ${result.event.hintUsed}, ${result.event.correct}, ${result.event.clientTime ?? null}, ${result.event.receivedAt}, ${result.event.generation}, ${result.event.visible}, ${result.event.interactive})
        `;
        snapshot = result.snapshot;
        await tx`
          insert into hoc_vui_private.progress_snapshots (student_id, schema_version, revision, generation, content_version, snapshot, legacy_imported, updated_at)
          values (${studentId}::uuid, ${snapshot.schemaVersion}, ${snapshot.revision}, ${snapshot.generation}, ${snapshot.contentVersion}, ${tx.json(snapshot.progress as never)}::jsonb, ${Boolean(snapshot.legacyImported)}, ${snapshot.updatedAt})
          on conflict (student_id) do update set
            schema_version = excluded.schema_version,
            revision = excluded.revision,
            generation = excluded.generation,
            content_version = excluded.content_version,
            snapshot = excluded.snapshot,
            legacy_imported = excluded.legacy_imported,
            updated_at = excluded.updated_at
        `;
        acknowledgements.push({ eventId: event.eventId, sequence: event.sequence, status: 'accepted', revision: snapshot.revision });
      }
      return { snapshot, acknowledgements };
    });
  }

  async getSnapshot(studentId: string): Promise<LearningSnapshotRecord> {
    return selectSnapshot(this.db, studentId);
  }

  async getLatestRun(studentId: string): Promise<LearningRunRecord | null> {
    const rows = await this.db<RunRow[]>`
      select run_id, student_id, lesson_id, lesson_version, device_id, status, state, generation, last_sequence, started_at, ended_at, updated_at
      from hoc_vui_private.learning_runs
      where student_id = ${studentId}::uuid
      order by updated_at desc
      limit 1
    ` as RunRow[];
    return rows[0] ? mapRun(rows[0]) : null;
  }

  async listEvents(studentId: string, from?: string, to?: string): Promise<LearningEventRecord[]> {
    const rows = await this.db<EventRow[]>`
      select event_id, run_id, student_id, sequence, event_type, lesson_id, lesson_version, device_id, activity_id, response, client_time, received_at, generation, hint_used, correct, visible, interactive
      from hoc_vui_private.learning_events
      where student_id = ${studentId}::uuid
        and (${from ?? null}::timestamptz is null or received_at >= ${from ?? null}::timestamptz)
        and (${to ?? null}::timestamptz is null or received_at <= ${to ?? null}::timestamptz)
      order by received_at asc, sequence asc
    ` as EventRow[];
    return rows.map(mapEvent);
  }

  async getProgressBoardSource(studentId: string) {
    const emptySnapshot = createEmptySnapshot(studentId, new Date().toISOString());
    const rows = await this.db.unsafe<ProgressBoardSourceRow[]>(`
      with actor as (
        select $1::uuid as student_id
      ), anchor as (
        select
          actor.student_id,
          snapshots.student_id as snapshot_student_id,
          snapshots.schema_version as snapshot_schema_version,
          snapshots.revision as snapshot_revision,
          snapshots.generation as snapshot_generation,
          snapshots.content_version as snapshot_content_version,
          snapshots.snapshot as snapshot_progress,
          snapshots.legacy_imported as snapshot_legacy_imported,
          snapshots.updated_at as snapshot_updated_at,
          coalesce(snapshots.generation, $2::int) as effective_generation
        from actor
        left join hoc_vui_private.progress_snapshots as snapshots on snapshots.student_id = actor.student_id
      )
      select
        anchor.snapshot_student_id,
        anchor.snapshot_schema_version,
        anchor.snapshot_revision,
        anchor.snapshot_generation,
        anchor.snapshot_content_version,
        anchor.snapshot_progress,
        anchor.snapshot_legacy_imported,
        anchor.snapshot_updated_at,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'event_id', events.event_id,
              'run_id', events.run_id,
              'student_id', events.student_id,
              'sequence', events.sequence,
              'event_type', events.event_type,
              'lesson_id', events.lesson_id,
              'lesson_version', events.lesson_version,
              'device_id', events.device_id,
              'activity_id', events.activity_id,
              'response', events.response,
              'client_time', events.client_time,
              'received_at', events.received_at,
              'generation', events.generation,
              'hint_used', events.hint_used,
              'correct', events.correct,
              'visible', events.visible,
              'interactive', events.interactive
            ) order by events.received_at, events.sequence, events.event_id
          ) filter (where events.event_id is not null),
          '[]'::jsonb
        ) as events
      from anchor
      left join hoc_vui_private.learning_events as events
        on events.student_id = anchor.student_id
        and events.generation = anchor.effective_generation
      group by
        anchor.student_id,
        anchor.snapshot_student_id,
        anchor.snapshot_schema_version,
        anchor.snapshot_revision,
        anchor.snapshot_generation,
        anchor.snapshot_content_version,
        anchor.snapshot_progress,
        anchor.snapshot_legacy_imported,
        anchor.snapshot_updated_at
    `, [studentId, emptySnapshot.generation]) as ProgressBoardSourceRow[];
    const row = rows[0];
    if (!row || row.snapshot_revision === null || row.snapshot_progress === null) {
      return { snapshot: emptySnapshot, events: (row?.events ?? []).map(mapEvent) };
    }
    const snapshot = mapSnapshot({
      student_id: row.snapshot_student_id ?? studentId,
      schema_version: row.snapshot_schema_version ?? 1,
      revision: row.snapshot_revision,
      generation: row.snapshot_generation ?? emptySnapshot.generation,
      content_version: row.snapshot_content_version ?? emptySnapshot.contentVersion,
      snapshot: row.snapshot_progress,
      legacy_imported: Boolean(row.snapshot_legacy_imported),
      updated_at: row.snapshot_updated_at ?? emptySnapshot.updatedAt,
    });
    return { snapshot, events: (row.events ?? []).map(mapEvent) };
  }

  async resetProgress(studentId: string, now: string): Promise<LearningSnapshotRecord> {
    return withTransaction(this.db, async (tx) => {
      const previous = await selectSnapshot(tx, studentId, true);
      const next: LearningSnapshotRecord = { ...createEmptySnapshot(studentId, now), revision: previous.revision + 1, generation: previous.generation + 1 };
      await tx`
        insert into hoc_vui_private.progress_snapshots (student_id, schema_version, revision, generation, content_version, snapshot, legacy_imported, updated_at)
        values (${studentId}::uuid, 1, ${next.revision}, ${next.generation}, ${next.contentVersion}, ${tx.json(next.progress as never)}::jsonb, false, ${next.updatedAt})
        on conflict (student_id) do update set revision = excluded.revision, generation = excluded.generation, content_version = excluded.content_version, snapshot = excluded.snapshot, legacy_imported = excluded.legacy_imported, updated_at = excluded.updated_at
      `;
      await tx`
        update hoc_vui_private.learning_runs
        set status = 'abandoned', generation = ${next.generation}, ended_at = ${now}, updated_at = ${now}
        where student_id = ${studentId}::uuid and status = 'active'
      `;
      return next;
    });
  }

  async findMigrationReceipt(studentId: string, fingerprint: string): Promise<MigrationReceiptRecord | null> {
    const rows = await this.db<MigrationReceiptRow[]>`
      select fingerprint, student_id, status, result, created_at, updated_at
      from hoc_vui_private.migration_receipts
      where student_id = ${studentId}::uuid and fingerprint = ${fingerprint}
      limit 1
    ` as MigrationReceiptRow[];
    const row = rows[0];
    return row ? { fingerprint: row.fingerprint, studentId: row.student_id, status: row.status, result: row.result, createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)! } : null;
  }

  async saveMigrationReceipt(receipt: MigrationReceiptRecord): Promise<void> {
    await this.db`
      insert into hoc_vui_private.migration_receipts (fingerprint, student_id, status, result, created_at, updated_at)
      values (${receipt.fingerprint}, ${receipt.studentId}::uuid, ${receipt.status}, ${this.db.json(receipt.result as never)}::jsonb, ${receipt.createdAt}, ${receipt.updatedAt})
      on conflict (fingerprint, student_id) do update set status = excluded.status, result = excluded.result, updated_at = excluded.updated_at
    `;
  }

  async importSnapshot(studentId: string, progress: LearningSnapshotRecord['progress'], legacyImported: boolean, expectedRevision: number, receipt: MigrationReceiptRecord, now: string): Promise<LearningSnapshotRecord> {
    return withTransaction(this.db, async (tx) => {
      const previous = await selectSnapshot(tx, studentId, true);
      if (previous.revision !== expectedRevision) throw new LearningBatchError('conflict', 'Tiến độ đã thay đổi sau lần xem trước; hãy xem trước lại tệp.');
      const next: LearningSnapshotRecord = { ...createEmptySnapshot(studentId, now), revision: previous.revision + 1, generation: previous.generation + 1, progress: { ...progress, updatedAt: now }, updatedAt: now, ...(legacyImported ? { legacyImported: true } : {}) };
      await tx`
        insert into hoc_vui_private.progress_snapshots (student_id, schema_version, revision, generation, content_version, snapshot, legacy_imported, updated_at)
        values (${studentId}::uuid, 1, ${next.revision}, ${next.generation}, ${next.contentVersion}, ${tx.json(next.progress as never)}::jsonb, ${legacyImported}, ${next.updatedAt})
        on conflict (student_id) do update set revision = excluded.revision, generation = excluded.generation, content_version = excluded.content_version, snapshot = excluded.snapshot, legacy_imported = excluded.legacy_imported, updated_at = excluded.updated_at
      `;
      await tx`
        update hoc_vui_private.learning_runs
        set status = 'abandoned', generation = ${next.generation}, ended_at = ${now}, updated_at = ${now}
        where student_id = ${studentId}::uuid and status = 'active'
      `;
      await tx`
        insert into hoc_vui_private.migration_receipts (fingerprint, student_id, status, result, created_at, updated_at)
        values (${receipt.fingerprint}, ${studentId}::uuid, ${receipt.status}, ${tx.json(receipt.result as never)}::jsonb, ${receipt.createdAt}, ${receipt.updatedAt})
        on conflict (fingerprint, student_id) do update set status = excluded.status, result = excluded.result, updated_at = excluded.updated_at
      `;
      return next;
    });
  }
}
