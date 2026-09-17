import { randomUUID } from 'node:crypto';
import type {
  ChallengePreferences,
  ChallengeAuthorView,
  ChallengeQuestionMine,
  ChallengeQuestionParent,
  ChallengeQuestionRecord,
  ChallengeQuestionStatus,
  ReviewChallengeQuestionInput,
} from '../../shared/challenge-contracts.ts';
import { CHALLENGE_DAILY_NEW_QUESTION_LIMIT } from '../../shared/challenge-contracts.ts';
import type {
  AuthoringRepository,
  AuthoringRepositoryOptions,
  ChallengeQuestionReviewRecord,
  InsertPendingQuestion,
  UpdateDraftRevisionInput,
} from './authoringTypes.ts';
import type { RoundCandidate } from './roundRules.ts';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function localDateFromTimestamp(value: string): string {
  return value.slice(0, 10);
}

function toMine(question: ChallengeQuestionRecord, quotaUsedOnCreatedDate: number): ChallengeQuestionMine {
  return { ...clone(question), quotaUsedOnCreatedDate };
}

function allowedRevisionStatus(status: ChallengeQuestionStatus): boolean {
  return status === 'draft';
}

export class MemoryAuthoringRepository implements AuthoringRepository {
  readonly questions = new Map<string, ChallengeQuestionRecord>();
  readonly reviews: ChallengeQuestionReviewRecord[] = [];
  readonly preferences = new Map<string, ChallengePreferences>();

  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private readonly featureHistory = new Map<string, string[]>();
  private readonly authorViews = new Map<string, ChallengeAuthorView>();

  constructor(options: AuthoringRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
    for (const author of options.authorViews ?? []) this.authorViews.set(author.id, clone(author));
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private countCreated(authorId: string, localDate: string): number {
    return [...this.questions.values()].filter((question) => question.authorId === authorId && question.createdLocalDate === localDate).length;
  }

  private reviewsFor(questionId: string): readonly ChallengeQuestionReviewRecord[] {
    return this.reviews.filter((review) => review.questionId === questionId).sort((left, right) => left.revision - right.revision);
  }

  async countNewQuestionsForDay(authorId: string, localDate: string): Promise<number> {
    return this.countCreated(authorId, localDate);
  }

  async insertPendingQuestion(input: InsertPendingQuestion): Promise<ChallengeQuestionRecord | 'quota_exceeded'> {
    // There is no await between the quota check and the Map write. This makes
    // the memory adapter's critical section match the database transaction's
    // advisory-lock semantics for concurrent unit/API tests.
    if (this.countCreated(input.authorId, input.createdLocalDate) >= CHALLENGE_DAILY_NEW_QUESTION_LIMIT) return 'quota_exceeded';
    const createdAt = input.createdAt ?? this.timestamp();
    const question: ChallengeQuestionRecord = {
      id: input.id ?? this.idFactory(),
      authorId: input.authorId,
      sourceFactId: input.sourceFactId,
      sourceVersion: input.sourceVersion,
      lessonId: input.lessonId,
      lessonTitle: input.lessonTitle,
      prompt: input.prompt,
      options: clone(input.options),
      correctOptionId: input.correctOptionId,
      explanation: input.explanation,
      status: 'pending_parent_review',
      revision: 1,
      createdLocalDate: input.createdLocalDate,
      createdAt,
      updatedAt: input.updatedAt ?? createdAt,
      submittedAt: createdAt,
      reviewedAt: null,
      featuredAt: null,
      closedAt: null,
      reviewReason: null,
      withdrawnAt: null,
      voidedAt: null,
    };
    this.questions.set(question.id, clone(question));
    return clone(question);
  }

  async listMine(authorId: string, limit: number): Promise<readonly ChallengeQuestionMine[]> {
    const boundedLimit = Math.min(50, Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 50));
    return [...this.questions.values()]
      .filter((question) => question.authorId === authorId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
      .slice(0, boundedLimit)
      .map((question) => toMine(question, this.countCreated(authorId, question.createdLocalDate)));
  }

  async listQuestionsBetween(startDate: string, endDate: string): Promise<readonly ChallengeQuestionRecord[]> {
    return [...this.questions.values()]
      .filter((question) => question.createdLocalDate >= startDate && question.createdLocalDate <= endDate)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
      .map(clone);
  }

  async findForAuthor(authorId: string, questionId: string): Promise<ChallengeQuestionRecord | null> {
    const question = this.questions.get(questionId);
    return question?.authorId === authorId ? clone(question) : null;
  }

  async updateDraftRevision(
    authorId: string,
    questionId: string,
    revision: number,
    input: UpdateDraftRevisionInput,
  ): Promise<ChallengeQuestionRecord | 'not_found' | 'revision_conflict'> {
    const question = this.questions.get(questionId);
    if (!question || question.authorId !== authorId) return 'not_found';
    if (question.revision !== revision || input.revision !== revision || !allowedRevisionStatus(question.status)) return 'revision_conflict';

    const updatedAt = this.timestamp();
    const next: ChallengeQuestionRecord = {
      ...question,
      sourceFactId: input.sourceFactId,
      sourceVersion: input.sourceVersion ?? question.sourceVersion,
      lessonId: input.lessonId ?? question.lessonId,
      lessonTitle: input.lessonTitle ?? question.lessonTitle,
      prompt: input.prompt,
      options: [
        { id: question.correctOptionId, text: input.correctAnswer },
        { id: 'wrong-1', text: input.distractors[0] },
        { id: 'wrong-2', text: input.distractors[1] },
        { id: 'wrong-3', text: input.distractors[2] },
      ],
      explanation: input.explanation,
      status: 'pending_parent_review',
      revision: question.revision + 1,
      updatedAt,
      submittedAt: updatedAt,
      reviewedAt: null,
      reviewReason: null,
    };
    this.questions.set(questionId, clone(next));
    return clone(next);
  }

  async listApprovedCandidates(roundDate: string): Promise<readonly RoundCandidate[]> {
    const fromDate = new Date(`${roundDate}T00:00:00.000Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - 7);
    const from = fromDate.toISOString().slice(0, 10);
    return [...this.questions.values()]
      .filter((question) => question.status === 'approved')
      .map((question) => ({
        questionId: question.id,
        authorId: question.authorId,
        approvedAt: question.reviewedAt ?? question.updatedAt,
        lastFeaturedAt: question.featuredAt,
        recentRoundDates: (this.featureHistory.get(question.id) ?? [])
          .map(localDateFromTimestamp)
          .filter((date) => date >= from && date <= roundDate),
      }))
      .sort((left, right) => left.approvedAt.localeCompare(right.approvedAt) || left.questionId.localeCompare(right.questionId));
  }

  async getAuthorView(authorId: string): Promise<ChallengeAuthorView | null> {
    return clone(this.authorViews.get(authorId) ?? { id: authorId, displayName: 'Bạn trong lớp', avatarId: 'fox-leaf' });
  }

  async markQuestionFeatured(questionId: string, featuredAt: string): Promise<void> {
    const question = this.questions.get(questionId);
    if (!question) throw new Error('not_found');
    if (question.status === 'featured') return;
    if (question.status !== 'approved') throw new Error('invalid_state');
    const next = { ...question, status: 'featured' as const, featuredAt, updatedAt: featuredAt };
    this.questions.set(questionId, clone(next));
    this.featureHistory.set(questionId, [...(this.featureHistory.get(questionId) ?? []), featuredAt]);
  }

  async markQuestionClosed(questionId: string, closedAt: string): Promise<void> {
    const question = this.questions.get(questionId);
    if (!question) throw new Error('not_found');
    if (question.status === 'closed') return;
    if (question.status !== 'featured') throw new Error('invalid_state');
    this.questions.set(questionId, clone({ ...question, status: 'closed' as const, closedAt, updatedAt: closedAt }));
  }

  async voidQuestion(questionId: string, voidedAt: string): Promise<'ok' | 'not_found' | 'invalid_state'> {
    const question = this.questions.get(questionId);
    if (!question) return 'not_found';
    if (question.status === 'voided') return 'ok';
    if (!['approved', 'featured', 'closed'].includes(question.status)) return 'invalid_state';
    this.questions.set(questionId, clone({ ...question, status: 'voided' as const, voidedAt, updatedAt: voidedAt }));
    return 'ok';
  }

  async listPendingForStudent(studentId: string): Promise<readonly ChallengeQuestionParent[]> {
    return [...this.questions.values()]
      .filter((question) => question.authorId === studentId && question.status === 'pending_parent_review')
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((question) => ({
        ...toMine(question, this.countCreated(studentId, question.createdLocalDate)),
        preview: null,
        reviewHistory: this.reviewsFor(question.id).map((review) => ({
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
    const question = this.questions.get(questionId);
    if (!question || question.authorId !== studentId) return 'not_found';
    if (question.revision !== revision) return 'revision_conflict';
    if (question.status !== 'pending_parent_review') return 'invalid_state';

    const reviewedAt = this.timestamp();
    const next: ChallengeQuestionRecord = {
      ...question,
      status: decision.decision === 'approve' ? 'approved' : 'draft',
      reviewedAt,
      updatedAt: reviewedAt,
      reviewReason: decision.decision === 'request_revision' ? decision.reason : null,
    };
    this.questions.set(questionId, clone(next));
    this.reviews.push({
      questionId,
      revision,
      decision: decision.decision,
      reason: decision.decision === 'request_revision' ? decision.reason : null,
      reviewerStudentId: studentId,
      reviewerScope: 'parent_grant',
      createdAt: reviewedAt,
    });
    return clone(next);
  }

  async withdrawQuestion(studentId: string, questionId: string): Promise<'ok' | 'not_found' | 'invalid_state'> {
    const question = this.questions.get(questionId);
    if (!question || question.authorId !== studentId) return 'not_found';
    if (!['draft', 'pending_parent_review', 'approved'].includes(question.status)) return 'invalid_state';
    const withdrawnAt = this.timestamp();
    this.questions.set(questionId, clone({ ...question, status: 'withdrawn' as const, withdrawnAt, updatedAt: withdrawnAt }));
    return 'ok';
  }

  async getPreferences(studentId: string): Promise<ChallengePreferences> {
    const existing = this.preferences.get(studentId);
    if (existing) return clone(existing);
    const created: ChallengePreferences = { studentId, canCreate: true, canParticipate: true, updatedAt: this.timestamp() };
    this.preferences.set(studentId, clone(created));
    return clone(created);
  }

  async updatePreferences(studentId: string, patch: { canCreate?: boolean; canParticipate?: boolean }): Promise<ChallengePreferences> {
    const current = await this.getPreferences(studentId);
    const next: ChallengePreferences = {
      ...current,
      ...(typeof patch.canCreate === 'boolean' ? { canCreate: patch.canCreate } : {}),
      ...(typeof patch.canParticipate === 'boolean' ? { canParticipate: patch.canParticipate } : {}),
      updatedAt: this.timestamp(),
    };
    this.preferences.set(studentId, clone(next));
    return clone(next);
  }
}
