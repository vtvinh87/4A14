import { withTransaction, type DatabaseClient, type DatabaseTransaction } from '../db/client.ts';
import { classContribution } from './roundRules.ts';
import type {
  AppendChallengeEventInput,
  ChallengeAttemptRecord,
  ChallengeEventRecord,
  ChallengeReactionRecord,
  ChallengeReportPrivateRecord,
  ChallengeRoundItemRecord,
  ChallengeRoundRecord,
  CreateChallengeReportInput,
  CreateRoundInput,
  CreateRoundItemInput,
  InsertAttemptInput,
  PlayRepository,
  UpsertReactionInput,
} from './playTypes.ts';
import type { ChallengeReactionType, ChallengeReportReason, ChallengeReportStatus, ChallengeRoundStatus } from '../../shared/challenge-contracts.ts';

type QueryClient = DatabaseClient | DatabaseTransaction;
type TimestampValue = Date | string | null;

type RoundRow = {
  round_date: Date | string;
  timezone: 'Asia/Ho_Chi_Minh';
  status: ChallengeRoundStatus;
  target_contributions: number;
  current_contributions: number;
  selected_question_count: number;
  completed: boolean;
  closes_at: TimestampValue;
  reward_granted: boolean;
  created_at: TimestampValue;
  updated_at: TimestampValue;
  closed_at: TimestampValue;
  voided_at: TimestampValue;
  selection_seed_version: string;
};

type ItemRow = {
  id: string;
  round_date: Date | string;
  question_id: string;
  author_id: string;
  position: number;
  featured_at: TimestampValue;
  selection_seed_version: string;
  selection_metadata: unknown;
  closed_at: TimestampValue;
};

type AttemptRow = {
  id: string;
  round_item_id: string;
  round_date: Date | string;
  question_id: string;
  student_id: string;
  idempotency_key: string;
  selected_option_id: string;
  is_correct: boolean;
  is_practice: boolean;
  is_voided: boolean;
  contribution: number;
  answered_at: TimestampValue;
};

type ReactionRow = {
  round_item_id: string;
  actor_id: string;
  reaction_type: ChallengeReactionType;
  created_at: TimestampValue;
  idempotency_key: string | null;
};

type ReportRow = {
  id: string;
  round_item_id: string;
  reporter_id: string;
  reason: ChallengeReportReason;
  details: string | null;
  status: ChallengeReportStatus;
  idempotency_key: string | null;
  created_at: TimestampValue;
  resolved_at: TimestampValue;
  resolution_reason: string | null;
};

type EventRow = ChallengeEventRecord;

function iso(value: TimestampValue): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function localDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function objectMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapRound(row: RoundRow): ChallengeRoundRecord {
  return {
    roundDate: localDate(row.round_date),
    timezone: row.timezone,
    status: row.status,
    targetContributions: Number(row.target_contributions),
    currentContributions: Number(row.current_contributions),
    selectedQuestionCount: Number(row.selected_question_count),
    completed: Boolean(row.completed),
    closesAt: iso(row.closes_at)!,
    rewardGranted: Boolean(row.reward_granted),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    closedAt: iso(row.closed_at),
    voidedAt: iso(row.voided_at),
    selectionSeedVersion: row.selection_seed_version,
  };
}

function mapItem(row: ItemRow): ChallengeRoundItemRecord {
  return {
    id: row.id,
    roundDate: localDate(row.round_date),
    questionId: row.question_id,
    position: Number(row.position),
    featuredAt: iso(row.featured_at)!,
    authorId: row.author_id,
    selectionSeedVersion: row.selection_seed_version,
    selectionMetadata: objectMetadata(row.selection_metadata),
    closedAt: iso(row.closed_at),
  };
}

function mapAttempt(row: AttemptRow): ChallengeAttemptRecord {
  return {
    id: row.id,
    roundItemId: row.round_item_id,
    roundDate: localDate(row.round_date),
    questionId: row.question_id,
    studentId: row.student_id,
    idempotencyKey: row.idempotency_key,
    selectedOptionId: row.selected_option_id,
    isCorrect: Boolean(row.is_correct),
    isPractice: Boolean(row.is_practice),
    isVoided: Boolean(row.is_voided),
    contribution: Number(row.contribution) === 1 ? 1 : 0,
    answeredAt: iso(row.answered_at)!,
  };
}

function mapReaction(row: ReactionRow): ChallengeReactionRecord {
  return {
    roundItemId: row.round_item_id,
    actorId: row.actor_id,
    reactionType: row.reaction_type,
    createdAt: iso(row.created_at)!,
    idempotencyKey: row.idempotency_key,
  };
}

function mapReport(row: ReportRow): ChallengeReportPrivateRecord {
  return {
    id: row.id,
    roundItemId: row.round_item_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    createdAt: iso(row.created_at)!,
    resolvedAt: iso(row.resolved_at),
    resolutionReason: row.resolution_reason,
  };
}

const roundColumns = `round_date, timezone, status, target_contributions, current_contributions,
  selected_question_count, completed, closes_at, reward_granted, created_at, updated_at, closed_at, voided_at,
  selection_seed_version`;

const itemColumns = `id, round_date, question_id, author_id, position, featured_at,
  selection_seed_version, selection_metadata, closed_at`;

const attemptColumns = `id, round_item_id, round_date, question_id, student_id, idempotency_key,
  selected_option_id, is_correct, is_practice, is_voided, contribution, answered_at`;

const reactionColumns = `round_item_id, actor_id, reaction_type, created_at, idempotency_key`;

const reportColumns = `id, round_item_id, reporter_id, reason, details, status, idempotency_key,
  created_at, resolved_at, resolution_reason`;

async function roundByDate(db: QueryClient, roundDate: string): Promise<RoundRow | null> {
  const rows = await db<RoundRow[]>`
    select ${db.unsafe(roundColumns)}
    from hoc_vui_private.challenge_rounds
    where round_date = ${roundDate}::date
    limit 1
  `;
  return rows[0] ?? null;
}

async function itemById(db: QueryClient, itemId: string): Promise<ItemRow | null> {
  const rows = await db<ItemRow[]>`
    select ${db.unsafe(itemColumns)}
    from hoc_vui_private.challenge_round_items
    where id = ${itemId}::uuid
    limit 1
  `;
  return rows[0] ?? null;
}

async function refreshRoundProgress(db: QueryClient, roundDate: string): Promise<void> {
  await db`
    update hoc_vui_private.challenge_rounds as rounds
    set current_contributions = coalesce((
      select sum(attempts.contribution)::int
      from hoc_vui_private.challenge_attempts as attempts
      where attempts.round_date = rounds.round_date and attempts.is_voided = false
    ), 0),
    completed = coalesce((
      select sum(attempts.contribution)::int
      from hoc_vui_private.challenge_attempts as attempts
      where attempts.round_date = rounds.round_date and attempts.is_voided = false
    ), 0) >= rounds.target_contributions,
    updated_at = now()
    where rounds.round_date = ${roundDate}::date
  `;
}

export class PostgresPlayRepository implements PlayRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getRound(roundDate: string): Promise<ChallengeRoundRecord | null> {
    const row = await roundByDate(this.db, roundDate);
    return row ? mapRound(row) : null;
  }

  async listRoundsBetween(startDate: string, endDate: string): Promise<readonly ChallengeRoundRecord[]> {
    const rows = await this.db<RoundRow[]>`
      select ${this.db.unsafe(roundColumns)}
      from hoc_vui_private.challenge_rounds
      where round_date between ${startDate}::date and ${endDate}::date
      order by round_date asc
    `;
    return rows.map(mapRound);
  }

  async listOpenRoundsBefore(roundDate: string): Promise<readonly ChallengeRoundRecord[]> {
    const rows = await this.db<RoundRow[]>`
      select ${this.db.unsafe(roundColumns)}
      from hoc_vui_private.challenge_rounds
      where round_date < ${roundDate}::date and status <> 'closed'
      order by round_date asc
    `;
    return rows.map(mapRound);
  }

  async insertRoundIfAbsent(input: CreateRoundInput): Promise<ChallengeRoundRecord> {
    const createdAt = input.createdAt ?? new Date().toISOString();
    const rows = await this.db<RoundRow[]>`
      insert into hoc_vui_private.challenge_rounds (
        round_date, timezone, status, target_contributions, closes_at,
        selection_seed_version, created_at, updated_at
      ) values (
        ${input.roundDate}::date, ${input.timezone}, ${input.status ?? 'open'}, ${input.targetContributions}, ${input.closesAt},
        ${input.selectionSeedVersion ?? 'challenge-round-v1'}, ${createdAt}, ${input.updatedAt ?? createdAt}
      )
      on conflict (round_date) do nothing
      returning ${this.db.unsafe(roundColumns)}
    `;
    const row = rows[0] ?? await roundByDate(this.db, input.roundDate);
    if (!row) throw new Error('round_insert_failed');
    return mapRound(row);
  }

  async closeRound(roundDate: string, closedAt: string): Promise<void> {
    await withTransaction(this.db, async (tx) => {
      await tx`
        update hoc_vui_private.challenge_rounds
        set status = 'closed', closed_at = ${closedAt}, updated_at = ${closedAt}
        where round_date = ${roundDate}::date and status <> 'closed'
      `;
      await tx`
        update hoc_vui_private.challenge_round_items
        set closed_at = ${closedAt}
        where round_date = ${roundDate}::date and closed_at is null
      `;
    });
  }

  async listRoundItems(roundDate: string): Promise<readonly ChallengeRoundItemRecord[]> {
    const rows = await this.db<ItemRow[]>`
      select ${this.db.unsafe(itemColumns)}
      from hoc_vui_private.challenge_round_items
      where round_date = ${roundDate}::date
      order by position asc, id asc
    `;
    return rows.map(mapItem);
  }

  async listRoundItemsBetween(startDate: string, endDate: string): Promise<readonly ChallengeRoundItemRecord[]> {
    const rows = await this.db<ItemRow[]>`
      select ${this.db.unsafe(itemColumns)}
      from hoc_vui_private.challenge_round_items
      where round_date between ${startDate}::date and ${endDate}::date
      order by round_date asc, position asc, id asc
    `;
    return rows.map(mapItem);
  }

  async insertRoundItem(input: CreateRoundItemInput): Promise<ChallengeRoundItemRecord> {
    return withTransaction(this.db, async (tx) => {
      const existingQuestionRows = await tx<ItemRow[]>`
        select ${tx.unsafe(itemColumns)}
        from hoc_vui_private.challenge_round_items
        where round_date = ${input.roundDate}::date and question_id = ${input.questionId}::uuid
        limit 1
      `;
      const existingQuestion = existingQuestionRows[0];
      if (existingQuestion) {
        if (Number(existingQuestion.position) === input.position) return mapItem(existingQuestion);
        throw new Error('duplicate_round_item_question');
      }
      const existingPositionRows = await tx<ItemRow[]>`
        select ${tx.unsafe(itemColumns)}
        from hoc_vui_private.challenge_round_items
        where round_date = ${input.roundDate}::date and position = ${input.position}
        limit 1
      `;
      if (existingPositionRows[0]) throw new Error('duplicate_round_item_ordinal');

      const rows = await tx<ItemRow[]>`
        insert into hoc_vui_private.challenge_round_items (
          id, round_date, question_id, author_id, position, featured_at,
          selection_seed_version, selection_metadata
        ) values (
          coalesce(${input.id ?? null}::uuid, gen_random_uuid()), ${input.roundDate}::date, ${input.questionId}::uuid, ${input.authorId}::uuid,
          ${input.position}, ${input.featuredAt}, ${input.selectionSeedVersion}, ${tx.json((input.selectionMetadata ?? {}) as never)}::jsonb
        )
        on conflict do nothing
        returning ${tx.unsafe(itemColumns)}
      `;
      if (!rows[0]) {
        const retryQuestionRows = await tx<ItemRow[]>`
          select ${tx.unsafe(itemColumns)} from hoc_vui_private.challenge_round_items
          where round_date = ${input.roundDate}::date and question_id = ${input.questionId}::uuid limit 1
        `;
        if (retryQuestionRows[0]) return mapItem(retryQuestionRows[0]);
        throw new Error('duplicate_round_item_ordinal');
      }
      await tx`
        update hoc_vui_private.challenge_rounds
        set selected_question_count = greatest(selected_question_count, (
          select count(*)::int from hoc_vui_private.challenge_round_items where round_date = ${input.roundDate}::date
        )), status = case when status = 'empty' then 'open' else status end, updated_at = now()
        where round_date = ${input.roundDate}::date
      `;
      return mapItem(rows[0]);
    });
  }

  async findRoundItem(itemId: string): Promise<ChallengeRoundItemRecord | null> {
    const row = await itemById(this.db, itemId);
    return row ? mapItem(row) : null;
  }

  async findAttempt(itemId: string, studentId: string): Promise<ChallengeAttemptRecord | null> {
    const rows = await this.db<AttemptRow[]>`
      select ${this.db.unsafe(attemptColumns)}
      from hoc_vui_private.challenge_attempts
      where round_item_id = ${itemId}::uuid and student_id = ${studentId}::uuid
      limit 1
    `;
    return rows[0] ? mapAttempt(rows[0]) : null;
  }

  async findAttemptByIdempotency(studentId: string, idempotencyKey: string): Promise<ChallengeAttemptRecord | null> {
    const rows = await this.db<AttemptRow[]>`
      select ${this.db.unsafe(attemptColumns)}
      from hoc_vui_private.challenge_attempts
      where student_id = ${studentId}::uuid and idempotency_key = ${idempotencyKey}
      limit 1
    `;
    return rows[0] ? mapAttempt(rows[0]) : null;
  }

  async insertAttempt(input: InsertAttemptInput): Promise<ChallengeAttemptRecord | 'duplicate'> {
    return withTransaction(this.db, async (tx) => {
      const duplicateByKey = await tx<AttemptRow[]>`
        select ${tx.unsafe(attemptColumns)} from hoc_vui_private.challenge_attempts
        where student_id = ${input.studentId}::uuid and idempotency_key = ${input.idempotencyKey} limit 1
      `;
      if (duplicateByKey[0]) return 'duplicate';
      const duplicateByItem = await tx<AttemptRow[]>`
        select ${tx.unsafe(attemptColumns)} from hoc_vui_private.challenge_attempts
        where round_item_id = ${input.roundItemId}::uuid and student_id = ${input.studentId}::uuid limit 1
      `;
      if (duplicateByItem[0]) return 'duplicate';
      const item = await itemById(tx, input.roundItemId);
      if (!item) throw new Error('round_item_not_found');
      const isVoided = Boolean(input.isVoided);
      const contribution = classContribution({ isCorrect: input.isCorrect, isPractice: input.isPractice, isVoided });
      const rows = await tx<AttemptRow[]>`
        insert into hoc_vui_private.challenge_attempts (
          id, round_item_id, round_date, question_id, student_id, idempotency_key, selected_option_id,
          is_correct, is_practice, is_voided, contribution, answered_at
        ) values (
          coalesce(${input.id ?? null}::uuid, gen_random_uuid()), ${item.id}::uuid, ${item.round_date}::date, ${item.question_id}::uuid,
          ${input.studentId}::uuid, ${input.idempotencyKey}, ${input.selectedOptionId}, ${input.isCorrect}, ${input.isPractice}, ${isVoided}, ${contribution}, ${input.answeredAt}
        )
        on conflict do nothing
        returning ${tx.unsafe(attemptColumns)}
      `;
      if (!rows[0]) return 'duplicate';
      await refreshRoundProgress(tx, localDate(item.round_date));
      return mapAttempt(rows[0]);
    });
  }

  async countCorrectContributions(roundDate: string): Promise<number> {
    const rows = await this.db<{ contribution_count: number }[]>`
      select coalesce(sum(contribution), 0)::int as contribution_count
      from hoc_vui_private.challenge_attempts
      where round_date = ${roundDate}::date and is_voided = false
    `;
    return Number(rows[0]?.contribution_count ?? 0);
  }

  async countCorrectContributionsBetween(startDate: string, endDate: string): Promise<ReadonlyMap<string, number>> {
    const rows = await this.db<{ round_date: Date | string; contribution_count: number }[]>`
      select round_date, coalesce(sum(contribution), 0)::int as contribution_count
      from hoc_vui_private.challenge_attempts
      where round_date between ${startDate}::date and ${endDate}::date and is_voided = false
      group by round_date
      order by round_date asc
    `;
    return new Map(rows.map((row) => [localDate(row.round_date), Number(row.contribution_count ?? 0)]));
  }

  async listAttemptsForStudent(studentId: string, startDate: string, endDate: string): Promise<readonly ChallengeAttemptRecord[]> {
    const rows = await this.db<AttemptRow[]>`
      select ${this.db.unsafe(attemptColumns)}
      from hoc_vui_private.challenge_attempts
      where student_id = ${studentId}::uuid and round_date between ${startDate}::date and ${endDate}::date
      order by answered_at asc, id asc
    `;
    return rows.map(mapAttempt);
  }

  async listAttemptsBetween(startDate: string, endDate: string): Promise<readonly ChallengeAttemptRecord[]> {
    const rows = await this.db<AttemptRow[]>`
      select ${this.db.unsafe(attemptColumns)}
      from hoc_vui_private.challenge_attempts
      where round_date between ${startDate}::date and ${endDate}::date
      order by answered_at asc, id asc
    `;
    return rows.map(mapAttempt);
  }

  async listReactionsBetween(startDate: string, endDate: string): Promise<readonly ChallengeReactionRecord[]> {
    const rows = await this.db<ReactionRow[]>`
      select ${this.db.unsafe(reactionColumns)}
      from hoc_vui_private.challenge_reactions as reactions
      join hoc_vui_private.challenge_round_items as items on items.id = reactions.round_item_id
      where items.round_date between ${startDate}::date and ${endDate}::date
      order by reactions.created_at asc, reactions.round_item_id asc, reactions.actor_id asc
    `;
    return rows.map(mapReaction);
  }

  async appendEvent(input: AppendChallengeEventInput): Promise<void> {
    await this.db`
      insert into hoc_vui_private.challenge_events
        (event_id, student_id, event_type, payload, occurred_at, local_date, source, source_version, created_at)
      values (
        ${input.eventId}::uuid, ${input.studentId}::uuid, ${input.eventType}, ${this.db.json(input.payload as never)}::jsonb,
        ${input.occurredAt}, ${input.localDate}::date, ${input.source}, ${input.sourceVersion}, ${input.createdAt ?? new Date().toISOString()}
      )
      on conflict (event_id) do nothing
    `;
  }

  async upsertReaction(input: UpsertReactionInput): Promise<ChallengeReactionRecord> {
    if (input.idempotencyKey) {
      const byKey = await this.db<ReactionRow[]>`
        select ${this.db.unsafe(reactionColumns)} from hoc_vui_private.challenge_reactions
        where actor_id = ${input.actorId}::uuid and idempotency_key = ${input.idempotencyKey} limit 1
      `;
      if (byKey[0]) return mapReaction(byKey[0]);
    }
    const rows = await this.db<ReactionRow[]>`
      insert into hoc_vui_private.challenge_reactions
        (round_item_id, actor_id, reaction_type, created_at, idempotency_key)
      values (${input.roundItemId}::uuid, ${input.actorId}::uuid, ${input.reactionType}, ${input.createdAt ?? new Date().toISOString()}, ${input.idempotencyKey ?? null})
      on conflict (round_item_id, actor_id, reaction_type) do nothing
      returning ${this.db.unsafe(reactionColumns)}
    `;
    if (rows[0]) return mapReaction(rows[0]);
    const existing = await this.db<ReactionRow[]>`
      select ${this.db.unsafe(reactionColumns)} from hoc_vui_private.challenge_reactions
      where round_item_id = ${input.roundItemId}::uuid and actor_id = ${input.actorId}::uuid and reaction_type = ${input.reactionType}
      limit 1
    `;
    if (!existing[0]) throw new Error('reaction_upsert_failed');
    return mapReaction(existing[0]);
  }

  async createReport(input: CreateChallengeReportInput): Promise<ChallengeReportPrivateRecord> {
    if (input.idempotencyKey) {
      const byKey = await this.db<ReportRow[]>`
        select ${this.db.unsafe(reportColumns)} from hoc_vui_private.challenge_reports
        where reporter_id = ${input.reporterId}::uuid and idempotency_key = ${input.idempotencyKey} limit 1
      `;
      if (byKey[0]) return mapReport(byKey[0]);
    }
    const rows = await this.db<ReportRow[]>`
      insert into hoc_vui_private.challenge_reports
        (id, round_item_id, reporter_id, reason, details, status, idempotency_key, created_at)
      values (
        coalesce(${input.id ?? null}::uuid, gen_random_uuid()), ${input.roundItemId}::uuid, ${input.reporterId}::uuid,
        ${input.reason}, ${input.details ?? null}, 'open', ${input.idempotencyKey ?? null}, ${input.createdAt ?? new Date().toISOString()}
      )
      on conflict do nothing
      returning ${this.db.unsafe(reportColumns)}
    `;
    if (rows[0]) return mapReport(rows[0]);
    const existing = await this.db<ReportRow[]>`
      select ${this.db.unsafe(reportColumns)} from hoc_vui_private.challenge_reports
      where round_item_id = ${input.roundItemId}::uuid and reporter_id = ${input.reporterId}::uuid and reason = ${input.reason}
      limit 1
    `;
    if (!existing[0]) throw new Error('report_upsert_failed');
    return mapReport(existing[0]);
  }

  async findReportByIdempotency(reporterId: string, idempotencyKey: string): Promise<ChallengeReportPrivateRecord | null> {
    const rows = await this.db<ReportRow[]>`
      select ${this.db.unsafe(reportColumns)} from hoc_vui_private.challenge_reports
      where reporter_id = ${reporterId}::uuid and idempotency_key = ${idempotencyKey}
      limit 1
    `;
    return rows[0] ? mapReport(rows[0]) : null;
  }

  async hasOpenReport(itemId: string): Promise<boolean> {
    const rows = await this.db<{ exists: boolean }[]>`
      select exists(
        select 1 from hoc_vui_private.challenge_reports
        where round_item_id = ${itemId}::uuid and status = 'open'
      ) as exists
    `;
    return Boolean(rows[0]?.exists);
  }

  async hasOpenReportByReporter(itemId: string, reporterId: string): Promise<boolean> {
    const rows = await this.db<{ exists: boolean }[]>`
      select exists(
        select 1 from hoc_vui_private.challenge_reports
        where round_item_id = ${itemId}::uuid and reporter_id = ${reporterId}::uuid and status = 'open'
      ) as exists
    `;
    return Boolean(rows[0]?.exists);
  }

  async hasOpenReportForQuestion(questionId: string): Promise<boolean> {
    const rows = await this.db<{ exists: boolean }[]>`
      select exists(
        select 1
        from hoc_vui_private.challenge_reports as reports
        join hoc_vui_private.challenge_round_items as items on items.id = reports.round_item_id
        where items.question_id = ${questionId}::uuid and reports.status = 'open'
      ) as exists
    `;
    return Boolean(rows[0]?.exists);
  }

  async grantRoundReward(roundDate: string): Promise<ChallengeRoundRecord> {
    const rows = await this.db<RoundRow[]>`
      update hoc_vui_private.challenge_rounds
      set reward_granted = true, updated_at = now()
      where round_date = ${roundDate}::date and reward_granted = false
      returning ${this.db.unsafe(roundColumns)}
    `;
    const row = rows[0] ?? await roundByDate(this.db, roundDate);
    if (!row) throw new Error('round_not_found');
    return mapRound(row);
  }

  async voidAttemptsForQuestion(questionId: string, _voidedAt: string): Promise<void> {
    await withTransaction(this.db, async (tx) => {
      const affected = await tx<{ round_date: Date | string }[]>`
        select distinct round_date from hoc_vui_private.challenge_round_items where question_id = ${questionId}::uuid
      `;
      await tx`
        update hoc_vui_private.challenge_attempts as attempts
        set is_voided = true, contribution = 0
        from hoc_vui_private.challenge_round_items as items
        where attempts.round_item_id = items.id and items.question_id = ${questionId}::uuid
      `;
      for (const row of affected) await refreshRoundProgress(tx, localDate(row.round_date));
    });
  }

  async findReport(reportId: string): Promise<ChallengeReportPrivateRecord | null> {
    const rows = await this.db<ReportRow[]>`
      select ${this.db.unsafe(reportColumns)} from hoc_vui_private.challenge_reports
      where id = ${reportId}::uuid limit 1
    `;
    return rows[0] ? mapReport(rows[0]) : null;
  }

  async resolveReport(
    reportId: string,
    status: Extract<ChallengeReportStatus, 'dismissed' | 'voided'>,
    resolvedAt: string,
    reason = '',
  ): Promise<ChallengeReportPrivateRecord> {
    const rows = await this.db<ReportRow[]>`
      update hoc_vui_private.challenge_reports
      set status = ${status}, resolved_at = ${resolvedAt}, resolution_reason = ${reason || null}
      where id = ${reportId}::uuid and status = 'open'
      returning ${this.db.unsafe(reportColumns)}
    `;
    const row = rows[0];
    if (row) return mapReport(row);
    const existing = await this.findReport(reportId);
    if (!existing) throw new Error('report_not_found');
    if (existing.status !== status) throw new Error('report_already_resolved');
    return existing;
  }
}
