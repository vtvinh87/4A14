import { CHALLENGE_DAILY_NEW_QUESTION_LIMIT } from '../../shared/challenge-contracts.ts';
import type {
  ChallengePreferences,
  ChallengeAuthorView,
  ChallengeQuestionMine,
  ChallengeQuestionParent,
  ChallengeQuestionRecord,
  ChallengeQuestionStatus,
  ReviewChallengeQuestionInput,
} from '../../shared/challenge-contracts.ts';
import { withTransaction, type DatabaseClient, type DatabaseTransaction } from '../db/client.ts';
import type {
  AuthoringRepository,
  ChallengeQuestionReviewRecord as InternalReviewRecord,
  InsertPendingQuestion,
  UpdateDraftRevisionInput,
} from './authoringTypes.ts';
import type { RoundCandidate } from './roundRules.ts';

type QueryClient = DatabaseClient | DatabaseTransaction;
type TimestampValue = Date | string | null;

type QuestionRow = {
  id: string;
  author_id: string;
  source_fact_id: string;
  source_version: string;
  lesson_id: string;
  lesson_title: string;
  prompt: string;
  options: unknown;
  correct_option_id: string;
  explanation: string;
  status: ChallengeQuestionStatus;
  revision: number;
  created_local_date: string | Date;
  created_at: TimestampValue;
  updated_at: TimestampValue;
  submitted_at: TimestampValue;
  reviewed_at: TimestampValue;
  featured_at: TimestampValue;
  closed_at: TimestampValue;
  review_reason: string | null;
  withdrawn_at: TimestampValue;
  voided_at: TimestampValue;
  quota_used_on_created_date?: number;
  recent_round_dates?: string[];
};

type ReviewRow = {
  question_id: string;
  revision: number;
  decision: ReviewChallengeQuestionInput['decision'];
  reason: string | null;
  reviewer_student_id: string;
  reviewer_scope: 'parent_grant';
  created_at: TimestampValue;
};

type PreferenceRow = { student_id: string; can_create: boolean; can_participate: boolean; updated_at: TimestampValue };

function iso(value: TimestampValue): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function localDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function parseOptions(value: unknown): ChallengeQuestionRecord['options'] {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(parsed) || parsed.length !== 4) throw new Error('invalid_challenge_options');
  return parsed.map((option) => ({ id: String(option.id), text: String(option.text) })) as ChallengeQuestionRecord['options'];
}

function mapQuestion(row: QuestionRow): ChallengeQuestionRecord {
  return {
    id: row.id,
    authorId: row.author_id,
    sourceFactId: row.source_fact_id,
    sourceVersion: row.source_version,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    prompt: row.prompt,
    options: parseOptions(row.options),
    correctOptionId: row.correct_option_id,
    explanation: row.explanation,
    status: row.status,
    revision: row.revision,
    createdLocalDate: localDate(row.created_local_date),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    submittedAt: iso(row.submitted_at),
    reviewedAt: iso(row.reviewed_at),
    featuredAt: iso(row.featured_at),
    closedAt: iso(row.closed_at),
    reviewReason: row.review_reason,
    withdrawnAt: iso(row.withdrawn_at),
    voidedAt: iso(row.voided_at),
  };
}

function mapPreference(row: PreferenceRow): ChallengePreferences {
  return { studentId: row.student_id, canCreate: row.can_create, canParticipate: row.can_participate, updatedAt: iso(row.updated_at)! };
}

function mapReview(row: ReviewRow): InternalReviewRecord {
  return {
    questionId: row.question_id,
    revision: row.revision,
    decision: row.decision,
    reason: row.reason,
    reviewerStudentId: row.reviewer_student_id,
    reviewerScope: row.reviewer_scope,
    createdAt: iso(row.created_at)!,
  };
}

function boundedLimit(value: number): number {
  return Math.min(50, Math.max(0, Number.isFinite(value) ? Math.floor(value) : 50));
}

async function findQuestion(db: QueryClient, authorId: string, questionId: string): Promise<QuestionRow | null> {
  const rows = await db<QuestionRow[]>`
    select id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options, correct_option_id, explanation,
           status, revision, created_local_date, created_at, updated_at, submitted_at, reviewed_at, featured_at, closed_at,
           review_reason, withdrawn_at, voided_at
    from hoc_vui_private.challenge_questions
    where id = ${questionId}::uuid and author_id = ${authorId}::uuid
    limit 1
  `;
  return rows[0] ?? null;
}

export class PostgresAuthoringRepository implements AuthoringRepository {
  constructor(private readonly db: DatabaseClient) {}

  async countNewQuestionsForDay(authorId: string, localDateValue: string): Promise<number> {
    const rows = await this.db<{ question_count: number }[]>`
      select count(*)::int as question_count
      from hoc_vui_private.challenge_questions
      where author_id = ${authorId}::uuid and created_local_date = ${localDateValue}::date
    `;
    return Number(rows[0]?.question_count ?? 0);
  }

  async insertPendingQuestion(input: InsertPendingQuestion): Promise<ChallengeQuestionRecord | 'quota_exceeded'> {
    return withTransaction(this.db, async (tx) => {
      await tx`
        select pg_advisory_xact_lock(hashtextextended(${`${input.authorId}:${input.createdLocalDate}`}, 0::bigint))
      `;
      const countRows = await tx<{ question_count: number }[]>`
        select count(*)::int as question_count
        from hoc_vui_private.challenge_questions
        where author_id = ${input.authorId}::uuid and created_local_date = ${input.createdLocalDate}::date
      `;
      if (Number(countRows[0]?.question_count ?? 0) >= CHALLENGE_DAILY_NEW_QUESTION_LIMIT) return 'quota_exceeded';

      const createdAt = input.createdAt ?? new Date().toISOString();
      const rows = await tx<QuestionRow[]>`
        insert into hoc_vui_private.challenge_questions (
          id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options,
          correct_option_id, explanation, status, revision, created_local_date, created_at, updated_at, submitted_at
        ) values (
          ${input.id ?? null}::uuid, ${input.authorId}::uuid, ${input.sourceFactId}, ${input.sourceVersion}, ${input.lessonId},
          ${input.lessonTitle}, ${input.prompt}, ${JSON.stringify(input.options)}::jsonb, ${input.correctOptionId}, ${input.explanation},
          'pending_parent_review', 1, ${input.createdLocalDate}::date, ${createdAt}, ${input.updatedAt ?? createdAt}, ${createdAt}
        )
        returning id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options, correct_option_id, explanation,
                  status, revision, created_local_date, created_at, updated_at, submitted_at, reviewed_at, featured_at, closed_at,
                  review_reason, withdrawn_at, voided_at
      `;
      return mapQuestion(rows[0]);
    });
  }

  async listMine(authorId: string, limit: number): Promise<readonly ChallengeQuestionMine[]> {
    const rows = await this.db<QuestionRow[]>`
      select id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options, correct_option_id, explanation,
             status, revision, created_local_date, created_at, updated_at, submitted_at, reviewed_at, featured_at, closed_at,
             review_reason, withdrawn_at, voided_at,
             count(*) over (partition by author_id, created_local_date)::int as quota_used_on_created_date
      from hoc_vui_private.challenge_questions
      where author_id = ${authorId}::uuid
      order by created_at desc, id desc
      limit ${boundedLimit(limit)}
    `;
    return rows.map((row) => ({ ...mapQuestion(row), quotaUsedOnCreatedDate: Number(row.quota_used_on_created_date ?? 0) })) as readonly ChallengeQuestionMine[];
  }

  async listQuestionsBetween(startDate: string, endDate: string): Promise<readonly ChallengeQuestionRecord[]> {
    const rows = await this.db<QuestionRow[]>`
      select id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options, correct_option_id, explanation,
             status, revision, created_local_date, created_at, updated_at, submitted_at, reviewed_at, featured_at, closed_at,
             review_reason, withdrawn_at, voided_at
      from hoc_vui_private.challenge_questions
      where created_local_date between ${startDate}::date and ${endDate}::date
      order by created_at asc, id asc
    `;
    return rows.map(mapQuestion);
  }

  async findForAuthor(authorId: string, questionId: string): Promise<ChallengeQuestionRecord | null> {
    const row = await findQuestion(this.db, authorId, questionId);
    return row ? mapQuestion(row) : null;
  }

  async updateDraftRevision(
    authorId: string,
    questionId: string,
    revision: number,
    input: UpdateDraftRevisionInput,
  ): Promise<ChallengeQuestionRecord | 'not_found' | 'revision_conflict'> {
    return withTransaction(this.db, async (tx) => {
      const current = await findQuestion(tx, authorId, questionId);
      if (!current) return 'not_found';
      if (current.revision !== revision || input.revision !== revision || current.status !== 'draft') return 'revision_conflict';

      const updatedAt = new Date().toISOString();
      const rows = await tx<QuestionRow[]>`
        update hoc_vui_private.challenge_questions
        set source_fact_id = ${input.sourceFactId}, source_version = coalesce(${input.sourceVersion ?? null}, source_version),
            lesson_id = coalesce(${input.lessonId ?? null}, lesson_id), lesson_title = coalesce(${input.lessonTitle ?? null}, lesson_title),
            prompt = ${input.prompt},
            options = ${JSON.stringify([
              { id: current.correct_option_id, text: input.correctAnswer },
              { id: 'wrong-1', text: input.distractors[0] },
              { id: 'wrong-2', text: input.distractors[1] },
              { id: 'wrong-3', text: input.distractors[2] },
            ])}::jsonb,
            explanation = ${input.explanation}, status = 'pending_parent_review', revision = revision + 1,
            updated_at = ${updatedAt}, submitted_at = ${updatedAt}, reviewed_at = null, review_reason = null
        where id = ${questionId}::uuid and author_id = ${authorId}::uuid and status = 'draft' and revision = ${revision}
        returning id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options, correct_option_id, explanation,
                  status, revision, created_local_date, created_at, updated_at, submitted_at, reviewed_at, featured_at, closed_at,
                  review_reason, withdrawn_at, voided_at
      `;
      return rows[0] ? mapQuestion(rows[0]) : 'revision_conflict';
    });
  }

  async listApprovedCandidates(roundDate: string): Promise<readonly RoundCandidate[]> {
    const rows = await this.db<Pick<QuestionRow, 'id' | 'author_id' | 'reviewed_at' | 'updated_at' | 'featured_at' | 'recent_round_dates'>[]>`
      select id, author_id, reviewed_at, updated_at, featured_at,
             case when featured_at is not null and featured_at::date between (${roundDate}::date - 7) and ${roundDate}::date
                  then array[featured_at::date::text] else array[]::text[] end as recent_round_dates
      from hoc_vui_private.challenge_questions
      where status = 'approved'
      order by reviewed_at asc nulls last, id asc
    `;
    return rows.map((row) => ({
      questionId: row.id,
      authorId: row.author_id,
      approvedAt: iso(row.reviewed_at) ?? iso(row.updated_at)!,
      lastFeaturedAt: iso(row.featured_at),
      recentRoundDates: row.recent_round_dates ?? [],
    }));
  }

  async getAuthorView(authorId: string): Promise<ChallengeAuthorView | null> {
    const rows = await this.db<{ id: string; display_name: string; avatar_id: string }[]>`
      select id, display_name, avatar_id
      from hoc_vui_private.accounts
      where id = ${authorId}::uuid and role = 'student' and active = true
      limit 1
    `;
    const row = rows[0];
    return row ? { id: row.id, displayName: row.display_name, avatarId: row.avatar_id } : null;
  }

  async markQuestionFeatured(questionId: string, featuredAt: string): Promise<void> {
    const rows = await this.db<{ id: string }[]>`
      update hoc_vui_private.challenge_questions
      set status = 'featured', featured_at = ${featuredAt}, updated_at = ${featuredAt}
      where id = ${questionId}::uuid and status = 'approved'
      returning id
    `;
    if (rows.length === 0) {
      const current = await this.db<{ status: ChallengeQuestionStatus }[]>`
        select status from hoc_vui_private.challenge_questions where id = ${questionId}::uuid limit 1
      `;
      if (current[0]?.status === 'featured') return;
      throw new Error(current.length === 0 ? 'not_found' : 'invalid_state');
    }
  }

  async markQuestionClosed(questionId: string, closedAt: string): Promise<void> {
    const rows = await this.db<{ id: string }[]>`
      update hoc_vui_private.challenge_questions
      set status = 'closed', closed_at = ${closedAt}, updated_at = ${closedAt}
      where id = ${questionId}::uuid and status = 'featured'
      returning id
    `;
    if (rows.length === 0) {
      const current = await this.db<{ status: ChallengeQuestionStatus }[]>`
        select status from hoc_vui_private.challenge_questions where id = ${questionId}::uuid limit 1
      `;
      if (current[0]?.status === 'closed') return;
      throw new Error(current.length === 0 ? 'not_found' : 'invalid_state');
    }
  }

  async voidQuestion(questionId: string, voidedAt: string): Promise<'ok' | 'not_found' | 'invalid_state'> {
    const rows = await this.db<{ id: string }[]>`
      update hoc_vui_private.challenge_questions
      set status = 'voided', voided_at = ${voidedAt}, updated_at = ${voidedAt}
      where id = ${questionId}::uuid and status in ('approved', 'featured', 'closed')
      returning id
    `;
    if (rows.length > 0) return 'ok';
    const current = await this.db<{ status: ChallengeQuestionStatus }[]>`
      select status from hoc_vui_private.challenge_questions where id = ${questionId}::uuid limit 1
    `;
    if (current.length === 0) return 'not_found';
    return current[0].status === 'voided' ? 'ok' : 'invalid_state';
  }

  async listPendingForStudent(studentId: string): Promise<readonly ChallengeQuestionParent[]> {
    const rows = await this.db<QuestionRow[]>`
      select id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options, correct_option_id, explanation,
             status, revision, created_local_date, created_at, updated_at, submitted_at, reviewed_at, featured_at, closed_at,
             review_reason, withdrawn_at, voided_at,
             count(*) over (partition by author_id, created_local_date)::int as quota_used_on_created_date
      from hoc_vui_private.challenge_questions
      where author_id = ${studentId}::uuid and status = 'pending_parent_review'
      order by created_at asc, id asc
    `;
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const reviewRows = await this.db<ReviewRow[]>`
      select question_id, revision, decision, reason, reviewer_student_id, reviewer_scope, created_at
      from hoc_vui_private.challenge_question_reviews
      where question_id = any(${this.db.array(ids)}::uuid[])
      order by revision asc, created_at asc
    `;
    const reviewsByQuestion = new Map<string, InternalReviewRecord[]>();
    for (const row of reviewRows) {
      const review = mapReview(row);
      const list = reviewsByQuestion.get(review.questionId) ?? [];
      list.push(review);
      reviewsByQuestion.set(review.questionId, list);
    }
    return rows.map((row) => ({
      ...mapQuestion(row),
      quotaUsedOnCreatedDate: Number(row.quota_used_on_created_date ?? 0),
      preview: null,
      reviewHistory: (reviewsByQuestion.get(row.id) ?? []).map((review) => ({
        revision: review.revision,
        decision: review.decision,
        reason: review.reason,
        createdAt: review.createdAt,
      })),
    }));
  }

  async reviewQuestion(
    studentId: string,
    questionId: string,
    revision: number,
    decision: ReviewChallengeQuestionInput,
  ): Promise<ChallengeQuestionRecord | 'not_found' | 'revision_conflict' | 'invalid_state'> {
    return withTransaction(this.db, async (tx) => {
      const current = await findQuestion(tx, studentId, questionId);
      if (!current) return 'not_found';
      if (current.revision !== revision) return 'revision_conflict';
      if (current.status !== 'pending_parent_review') return 'invalid_state';

      const reviewedAt = new Date().toISOString();
      const reason = decision.decision === 'request_revision' ? decision.reason : null;
      await tx`
        insert into hoc_vui_private.challenge_question_reviews
          (question_id, revision, decision, reason, reviewer_student_id, reviewer_scope, created_at)
        values (${questionId}::uuid, ${revision}, ${decision.decision}, ${reason}, ${studentId}::uuid, 'parent_grant', ${reviewedAt})
      `;
      const rows = await tx<QuestionRow[]>`
        update hoc_vui_private.challenge_questions
        set status = ${decision.decision === 'approve' ? 'approved' : 'draft'}, review_reason = ${reason},
            reviewed_at = ${reviewedAt}, updated_at = ${reviewedAt}
        where id = ${questionId}::uuid and author_id = ${studentId}::uuid and status = 'pending_parent_review' and revision = ${revision}
        returning id, author_id, source_fact_id, source_version, lesson_id, lesson_title, prompt, options, correct_option_id, explanation,
                  status, revision, created_local_date, created_at, updated_at, submitted_at, reviewed_at, featured_at, closed_at,
                  review_reason, withdrawn_at, voided_at
      `;
      return rows[0] ? mapQuestion(rows[0]) : 'invalid_state';
    });
  }

  async withdrawQuestion(studentId: string, questionId: string): Promise<'ok' | 'not_found' | 'invalid_state'> {
    const rows = await this.db<{ id: string }[]>`
      update hoc_vui_private.challenge_questions
      set status = 'withdrawn', withdrawn_at = now(), updated_at = now()
      where id = ${questionId}::uuid and author_id = ${studentId}::uuid and status in ('draft', 'pending_parent_review', 'approved')
      returning id
    `;
    if (rows.length > 0) return 'ok';
    const current = await this.db<{ id: string; author_id: string }[]>`
      select id, author_id from hoc_vui_private.challenge_questions where id = ${questionId}::uuid limit 1
    `;
    return current.length === 0 || current[0].author_id !== studentId ? 'not_found' : 'invalid_state';
  }

  async getPreferences(studentId: string): Promise<ChallengePreferences> {
    await this.db`
      insert into hoc_vui_private.challenge_preferences (student_id)
      values (${studentId}::uuid)
      on conflict (student_id) do nothing
    `;
    const rows = await this.db<PreferenceRow[]>`
      select student_id, can_create, can_participate, updated_at
      from hoc_vui_private.challenge_preferences
      where student_id = ${studentId}::uuid
      limit 1
    `;
    if (!rows[0]) throw new Error('challenge_preferences_missing');
    return mapPreference(rows[0]);
  }

  async updatePreferences(studentId: string, patch: { canCreate?: boolean; canParticipate?: boolean }): Promise<ChallengePreferences> {
    const rows = await this.db<PreferenceRow[]>`
      insert into hoc_vui_private.challenge_preferences (student_id, can_create, can_participate, updated_at)
      values (${studentId}::uuid, ${patch.canCreate ?? true}, ${patch.canParticipate ?? true}, now())
      on conflict (student_id) do update set
        can_create = coalesce(${patch.canCreate ?? null}, hoc_vui_private.challenge_preferences.can_create),
        can_participate = coalesce(${patch.canParticipate ?? null}, hoc_vui_private.challenge_preferences.can_participate),
        updated_at = now()
      returning student_id, can_create, can_participate, updated_at
    `;
    if (!rows[0]) throw new Error('challenge_preferences_missing');
    return mapPreference(rows[0]);
  }
}
