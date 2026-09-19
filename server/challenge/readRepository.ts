import type { ChallengeAuthorView, ChallengeOptionTuple, ChallengePreferences, ChallengeQuestionMine, ChallengeQuestionRecord } from '../../shared/challenge-contracts.ts';
import type { DatabaseClient } from '../db/client.ts';
import type { ChallengeAttemptRecord, ChallengeReactionRecord, ChallengeRoundItemRecord, ChallengeRoundRecord } from './playTypes.ts';

type JsonRecord = Record<string, unknown>;
type SnapshotRow = {
  round?: unknown;
  items?: unknown;
  attempts?: unknown;
  questions?: unknown;
  authors?: unknown;
  contributionCount?: unknown;
  mine?: unknown;
  preferences?: unknown;
  rounds?: unknown;
  contributions?: unknown;
  reactions?: unknown;
  roster?: unknown;
  itemQuestions?: unknown;
};

export type ChallengeTodayReadSnapshot = {
  round: ChallengeRoundRecord | null;
  preferences: ChallengePreferences | null;
  items: readonly ChallengeRoundItemRecord[];
  attempts: readonly ChallengeAttemptRecord[];
  questions: readonly ChallengeQuestionRecord[];
  authors: readonly ChallengeAuthorView[];
  currentContributions: number;
  mine: readonly ChallengeQuestionMine[];
};

export type ChallengeWeeklyReadSnapshot = {
  rounds: readonly ChallengeRoundRecord[];
  items: readonly ChallengeRoundItemRecord[];
  contributionByDate: ReadonlyMap<string, number>;
  questions: readonly ChallengeQuestionRecord[];
  attempts: readonly ChallengeAttemptRecord[];
  reactions: readonly ChallengeReactionRecord[];
  roster: readonly string[];
  itemQuestions: readonly ChallengeQuestionRecord[];
  mine: readonly ChallengeQuestionMine[];
};

export interface ChallengeReadRepository {
  loadToday(studentId: string, roundDate: string): Promise<ChallengeTodayReadSnapshot>;
  loadWeekly(studentId: string, startDate: string, endDate: string): Promise<ChallengeWeeklyReadSnapshot>;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function arrayOf(value: unknown): readonly JsonRecord[] {
  if (typeof value === 'string') {
    try { return arrayOf(JSON.parse(value)); } catch { return []; }
  }
  return Array.isArray(value) ? value.map(record) : [];
}

function stringArray(value: unknown): readonly string[] {
  if (typeof value === 'string') {
    try { return stringArray(JSON.parse(value)); } catch { return []; }
  }
  return Array.isArray(value) ? value.map((entry) => stringValue(entry)) : [];
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? fallback : String(value);
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : stringValue(value);
}

function isoString(value: unknown, fallback = ''): string {
  const raw = stringValue(value, fallback);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function nullableIsoString(value: unknown): string | null {
  return value === null || value === undefined ? null : isoString(value);
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 'true';
}

function mapRound(value: unknown): ChallengeRoundRecord {
  const row = record(value);
  return {
    roundDate: stringValue(row.roundDate),
    timezone: stringValue(row.timezone) as ChallengeRoundRecord['timezone'],
    status: stringValue(row.status) as ChallengeRoundRecord['status'],
    targetContributions: numberValue(row.targetContributions),
    currentContributions: numberValue(row.currentContributions),
    selectedQuestionCount: numberValue(row.selectedQuestionCount),
    completed: booleanValue(row.completed),
    closesAt: isoString(row.closesAt),
    rewardGranted: booleanValue(row.rewardGranted),
    createdAt: isoString(row.createdAt),
    updatedAt: isoString(row.updatedAt),
    closedAt: nullableIsoString(row.closedAt),
    voidedAt: nullableIsoString(row.voidedAt),
    selectionSeedVersion: stringValue(row.selectionSeedVersion),
  };
}

function mapItem(value: unknown): ChallengeRoundItemRecord {
  const row = record(value);
  return {
    id: stringValue(row.id),
    roundDate: stringValue(row.roundDate),
    questionId: stringValue(row.questionId),
    position: numberValue(row.position),
    featuredAt: isoString(row.featuredAt),
    authorId: stringValue(row.authorId),
    selectionSeedVersion: stringValue(row.selectionSeedVersion),
    selectionMetadata: record(row.selectionMetadata),
    closedAt: nullableIsoString(row.closedAt),
  };
}

function mapQuestion(value: unknown): ChallengeQuestionRecord {
  const row = record(value);
  return {
    id: stringValue(row.id),
    authorId: stringValue(row.authorId),
    sourceFactId: stringValue(row.sourceFactId),
    sourceVersion: stringValue(row.sourceVersion),
    lessonId: stringValue(row.lessonId),
    lessonTitle: stringValue(row.lessonTitle),
    prompt: stringValue(row.prompt),
    options: (Array.isArray(row.options) ? row.options : []) as ChallengeOptionTuple,
    correctOptionId: stringValue(row.correctOptionId),
    explanation: stringValue(row.explanation),
    status: stringValue(row.status) as ChallengeQuestionRecord['status'],
    revision: numberValue(row.revision),
    createdLocalDate: stringValue(row.createdLocalDate),
    createdAt: isoString(row.createdAt),
    updatedAt: isoString(row.updatedAt),
    submittedAt: nullableIsoString(row.submittedAt),
    reviewedAt: nullableIsoString(row.reviewedAt),
    featuredAt: nullableIsoString(row.featuredAt),
    closedAt: nullableIsoString(row.closedAt),
    reviewReason: nullableString(row.reviewReason),
    withdrawnAt: nullableIsoString(row.withdrawnAt),
    voidedAt: nullableIsoString(row.voidedAt),
  };
}

function mapMine(value: unknown): ChallengeQuestionMine {
  const question = mapQuestion(value);
  return { ...question, quotaUsedOnCreatedDate: numberValue(record(value).quotaUsedOnCreatedDate) };
}

function mapAttempt(value: unknown): ChallengeAttemptRecord {
  const row = record(value);
  return {
    id: stringValue(row.id),
    roundItemId: stringValue(row.roundItemId),
    roundDate: stringValue(row.roundDate),
    questionId: stringValue(row.questionId),
    studentId: stringValue(row.studentId),
    idempotencyKey: stringValue(row.idempotencyKey),
    selectedOptionId: stringValue(row.selectedOptionId),
    isCorrect: booleanValue(row.isCorrect),
    isPractice: booleanValue(row.isPractice),
    isVoided: booleanValue(row.isVoided),
    contribution: numberValue(row.contribution) === 1 ? 1 : 0,
    answeredAt: isoString(row.answeredAt),
  };
}

function mapReaction(value: unknown): ChallengeReactionRecord {
  const row = record(value);
  return {
    roundItemId: stringValue(row.roundItemId),
    actorId: stringValue(row.actorId),
    reactionType: stringValue(row.reactionType) as ChallengeReactionRecord['reactionType'],
    createdAt: isoString(row.createdAt),
    idempotencyKey: nullableString(row.idempotencyKey),
  };
}

function mapAuthor(value: unknown): ChallengeAuthorView {
  const row = record(value);
  return { id: stringValue(row.id), displayName: stringValue(row.displayName), avatarId: stringValue(row.avatarId) };
}

function mapPreferences(value: unknown): ChallengePreferences | null {
  if (value === null || value === undefined) return null;
  const row = record(value);
  return {
    studentId: stringValue(row.studentId),
    canCreate: booleanValue(row.canCreate),
    canParticipate: booleanValue(row.canParticipate),
    updatedAt: isoString(row.updatedAt),
  };
}

const questionObject = `
  jsonb_build_object(
    'id', questions.id,
    'authorId', questions.author_id,
    'sourceFactId', questions.source_fact_id,
    'sourceVersion', questions.source_version,
    'lessonId', questions.lesson_id,
    'lessonTitle', questions.lesson_title,
    'prompt', questions.prompt,
    'options', questions.options,
    'correctOptionId', questions.correct_option_id,
    'explanation', questions.explanation,
    'status', questions.status,
    'revision', questions.revision,
    'createdLocalDate', questions.created_local_date,
    'createdAt', questions.created_at,
    'updatedAt', questions.updated_at,
    'submittedAt', questions.submitted_at,
    'reviewedAt', questions.reviewed_at,
    'featuredAt', questions.featured_at,
    'closedAt', questions.closed_at,
    'reviewReason', questions.review_reason,
    'withdrawnAt', questions.withdrawn_at,
    'voidedAt', questions.voided_at
  )
`;

const mineObject = `
  jsonb_build_object(
    'id', mine.id,
    'authorId', mine.author_id,
    'sourceFactId', mine.source_fact_id,
    'sourceVersion', mine.source_version,
    'lessonId', mine.lesson_id,
    'lessonTitle', mine.lesson_title,
    'prompt', mine.prompt,
    'options', mine.options,
    'correctOptionId', mine.correct_option_id,
    'explanation', mine.explanation,
    'status', mine.status,
    'revision', mine.revision,
    'createdLocalDate', mine.created_local_date,
    'createdAt', mine.created_at,
    'updatedAt', mine.updated_at,
    'submittedAt', mine.submitted_at,
    'reviewedAt', mine.reviewed_at,
    'featuredAt', mine.featured_at,
    'closedAt', mine.closed_at,
    'reviewReason', mine.review_reason,
    'withdrawnAt', mine.withdrawn_at,
    'voidedAt', mine.voided_at,
    'quotaUsedOnCreatedDate', mine.quota_used_on_created_date
  )
`;

function roundObject(alias: string): string {
  return `jsonb_build_object(
    'roundDate', ${alias}.round_date,
    'timezone', ${alias}.timezone,
    'status', ${alias}.status,
    'targetContributions', ${alias}.target_contributions,
    'currentContributions', ${alias}.current_contributions,
    'selectedQuestionCount', ${alias}.selected_question_count,
    'completed', ${alias}.completed,
    'closesAt', ${alias}.closes_at,
    'rewardGranted', ${alias}.reward_granted,
    'createdAt', ${alias}.created_at,
    'updatedAt', ${alias}.updated_at,
    'closedAt', ${alias}.closed_at,
    'voidedAt', ${alias}.voided_at,
    'selectionSeedVersion', ${alias}.selection_seed_version
  )`;
}

function itemObject(alias: string): string {
  return `jsonb_build_object(
    'id', ${alias}.id,
    'roundDate', ${alias}.round_date,
    'questionId', ${alias}.question_id,
    'authorId', ${alias}.author_id,
    'position', ${alias}.position,
    'featuredAt', ${alias}.featured_at,
    'selectionSeedVersion', ${alias}.selection_seed_version,
    'selectionMetadata', ${alias}.selection_metadata,
    'closedAt', ${alias}.closed_at
  )`;
}

function attemptObject(alias: string): string {
  return `jsonb_build_object(
    'id', ${alias}.id,
    'roundItemId', ${alias}.round_item_id,
    'roundDate', ${alias}.round_date,
    'questionId', ${alias}.question_id,
    'studentId', ${alias}.student_id,
    'idempotencyKey', ${alias}.idempotency_key,
    'selectedOptionId', ${alias}.selected_option_id,
    'isCorrect', ${alias}.is_correct,
    'isPractice', ${alias}.is_practice,
    'isVoided', ${alias}.is_voided,
    'contribution', ${alias}.contribution,
    'answeredAt', ${alias}.answered_at
  )`;
}

function reactionObject(alias: string): string {
  return `jsonb_build_object(
    'roundItemId', ${alias}.round_item_id,
    'actorId', ${alias}.actor_id,
    'reactionType', ${alias}.reaction_type,
    'createdAt', ${alias}.created_at,
    'idempotencyKey', ${alias}.idempotency_key
  )`;
}

export class PostgresChallengeReadRepository implements ChallengeReadRepository {
  constructor(private readonly db: DatabaseClient) {}

  async loadToday(studentId: string, roundDate: string): Promise<ChallengeTodayReadSnapshot> {
    const rows = await this.db<SnapshotRow[]>`
      select
        (select ${this.db.unsafe(roundObject('rounds'))}
         from hoc_vui_private.challenge_rounds as rounds
         where rounds.round_date = ${roundDate}::date limit 1) as round,
        (select jsonb_build_object(
            'studentId', preferences.student_id,
            'canCreate', preferences.can_create,
            'canParticipate', preferences.can_participate,
            'updatedAt', preferences.updated_at
          )
          from hoc_vui_private.challenge_preferences as preferences
          where preferences.student_id = ${studentId}::uuid limit 1) as preferences,
        coalesce((select jsonb_agg(${this.db.unsafe(itemObject('items'))} order by items.position, items.id)
          from hoc_vui_private.challenge_round_items as items where items.round_date = ${roundDate}::date), '[]'::jsonb) as items,
        coalesce((select jsonb_agg(${this.db.unsafe(attemptObject('attempts'))} order by attempts.answered_at, attempts.id)
          from hoc_vui_private.challenge_attempts as attempts
          where attempts.student_id = ${studentId}::uuid and attempts.round_date = ${roundDate}::date), '[]'::jsonb) as attempts,
        coalesce((select jsonb_agg(${this.db.unsafe(questionObject)} order by questions.created_at, questions.id)
          from hoc_vui_private.challenge_questions as questions
          where questions.id in (select items.question_id from hoc_vui_private.challenge_round_items as items where items.round_date = ${roundDate}::date)), '[]'::jsonb) as questions,
        coalesce((select jsonb_agg(jsonb_build_object('id', accounts.id, 'displayName', accounts.display_name, 'avatarId', accounts.avatar_id) order by accounts.id)
          from hoc_vui_private.accounts as accounts
          where accounts.role = 'student' and accounts.active = true
            and accounts.id in (select items.author_id from hoc_vui_private.challenge_round_items as items where items.round_date = ${roundDate}::date)), '[]'::jsonb) as authors,
        coalesce((select sum(attempts.contribution)::int from hoc_vui_private.challenge_attempts as attempts
          where attempts.round_date = ${roundDate}::date and attempts.is_voided = false), 0)::int as "contributionCount",
        coalesce((select jsonb_agg(${this.db.unsafe(mineObject)} order by mine.created_at desc, mine.id desc)
          from (
            select questions.*, count(*) over (partition by questions.author_id, questions.created_local_date)::int as quota_used_on_created_date
            from hoc_vui_private.challenge_questions as questions
            where questions.author_id = ${studentId}::uuid
            order by questions.created_at desc, questions.id desc
            limit 50
          ) as mine), '[]'::jsonb) as mine
    `;
    const row = rows[0] ?? {};
    return {
      round: row.round ? mapRound(row.round) : null,
      preferences: mapPreferences(row.preferences),
      items: arrayOf(row.items).map(mapItem),
      attempts: arrayOf(row.attempts).map(mapAttempt),
      questions: arrayOf(row.questions).map(mapQuestion),
      authors: arrayOf(row.authors).map(mapAuthor),
      currentContributions: numberValue(row.contributionCount),
      mine: arrayOf(row.mine).map(mapMine),
    };
  }

  async loadWeekly(studentId: string, startDate: string, endDate: string): Promise<ChallengeWeeklyReadSnapshot> {
    const rows = await this.db<SnapshotRow[]>`
      select
        coalesce((select jsonb_agg(${this.db.unsafe(roundObject('rounds'))} order by rounds.round_date)
          from hoc_vui_private.challenge_rounds as rounds where rounds.round_date between ${startDate}::date and ${endDate}::date), '[]'::jsonb) as rounds,
        coalesce((select jsonb_agg(${this.db.unsafe(itemObject('items'))} order by items.round_date, items.position, items.id)
          from hoc_vui_private.challenge_round_items as items where items.round_date between ${startDate}::date and ${endDate}::date), '[]'::jsonb) as items,
        coalesce((select jsonb_agg(jsonb_build_object('roundDate', grouped.round_date, 'contributionCount', grouped.contribution_count) order by grouped.round_date)
          from (
            select attempts.round_date, coalesce(sum(attempts.contribution), 0)::int as contribution_count
            from hoc_vui_private.challenge_attempts as attempts
            where attempts.round_date between ${startDate}::date and ${endDate}::date and attempts.is_voided = false
            group by attempts.round_date
          ) as grouped), '[]'::jsonb) as contributions,
        coalesce((select jsonb_agg(${this.db.unsafe(questionObject)} order by questions.created_at, questions.id)
          from hoc_vui_private.challenge_questions as questions
          where questions.created_local_date between ${startDate}::date and ${endDate}::date), '[]'::jsonb) as questions,
        coalesce((select jsonb_agg(${this.db.unsafe(attemptObject('attempts'))} order by attempts.answered_at, attempts.id)
          from hoc_vui_private.challenge_attempts as attempts
          where attempts.round_date between ${startDate}::date and ${endDate}::date), '[]'::jsonb) as attempts,
        coalesce((select jsonb_agg(${this.db.unsafe(reactionObject('reactions'))} order by reactions.created_at, reactions.round_item_id, reactions.actor_id)
          from hoc_vui_private.challenge_reactions as reactions
          join hoc_vui_private.challenge_round_items as items on items.id = reactions.round_item_id
          where items.round_date between ${startDate}::date and ${endDate}::date), '[]'::jsonb) as reactions,
        coalesce((select jsonb_agg(accounts.id order by accounts.id)
          from hoc_vui_private.accounts as accounts where accounts.role = 'student' and accounts.active = true), '[]'::jsonb) as roster,
        coalesce((select jsonb_agg(${this.db.unsafe(questionObject)} order by questions.created_at, questions.id)
          from hoc_vui_private.challenge_questions as questions
          where questions.id in (select items.question_id from hoc_vui_private.challenge_round_items as items where items.round_date between ${startDate}::date and ${endDate}::date)), '[]'::jsonb) as "itemQuestions",
        coalesce((select jsonb_agg(${this.db.unsafe(mineObject)} order by mine.created_at desc, mine.id desc)
          from (
            select questions.*, count(*) over (partition by questions.author_id, questions.created_local_date)::int as quota_used_on_created_date
            from hoc_vui_private.challenge_questions as questions
            where questions.author_id = ${studentId}::uuid
            order by questions.created_at desc, questions.id desc
            limit 50
          ) as mine), '[]'::jsonb) as mine
    `;
    const row = rows[0] ?? {};
    const contributions = arrayOf(row.contributions);
    return {
      rounds: arrayOf(row.rounds).map(mapRound),
      items: arrayOf(row.items).map(mapItem),
      contributionByDate: new Map(contributions.map((entry) => [stringValue(entry.roundDate), numberValue(entry.contributionCount)])),
      questions: arrayOf(row.questions).map(mapQuestion),
      attempts: arrayOf(row.attempts).map(mapAttempt),
      reactions: arrayOf(row.reactions).map(mapReaction),
      roster: stringArray(row.roster),
      itemQuestions: arrayOf(row.itemQuestions).map(mapQuestion),
      mine: arrayOf(row.mine).map(mapMine),
    };
  }
}
