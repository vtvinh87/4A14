import type { ChallengeSourceFact } from './challenge-source.ts';

export const CHALLENGE_DAILY_NEW_QUESTION_LIMIT = 3 as const;
export const CHALLENGE_ROUND_QUESTION_LIMIT = 5 as const;
export const CHALLENGE_PROMPT_MIN_LENGTH = 20 as const;
export const CHALLENGE_PROMPT_MAX_LENGTH = 240 as const;
export const CHALLENGE_OPTION_MIN_LENGTH = 1 as const;
export const CHALLENGE_OPTION_MAX_LENGTH = 140 as const;
export const CHALLENGE_EXPLANATION_MIN_LENGTH = 20 as const;
export const CHALLENGE_EXPLANATION_MAX_LENGTH = 500 as const;
export const CHALLENGE_REPORT_DETAILS_MAX_LENGTH = 500 as const;

export type ChallengeQuestionStatus =
  | 'draft'
  | 'pending_parent_review'
  | 'approved'
  | 'featured'
  | 'closed'
  | 'withdrawn'
  | 'voided'
  | 'archived';

export type ChallengeReviewDecision = 'approve' | 'request_revision';
export type ChallengeReactionType = 'interesting' | 'learned' | 'clear_explanation' | 'thanks';
export type ChallengeReportReason = 'answer_or_source' | 'unclear' | 'inappropriate';
export type ChallengeReportStatus = 'open' | 'dismissed' | 'voided';
export type ChallengeRoundStatus = 'open' | 'closed' | 'empty';
export type ChallengeRolloutMode = 'off' | 'pilot' | 'on';

export type ChallengeOption = { id: string; text: string };
export type ChallengeOptionTuple = [ChallengeOption, ChallengeOption, ChallengeOption, ChallengeOption];

export type ChallengeAuthorView = {
  id: string;
  displayName: string;
  avatarId: string;
};

export type CreateChallengeQuestionInput = {
  sourceFactId: string;
  prompt: string;
  correctAnswer: string;
  distractors: [string, string, string];
  explanation: string;
};

export type ReviseChallengeQuestionInput = CreateChallengeQuestionInput & { revision: number };

export type ReviewChallengeQuestionInput =
  | { decision: 'approve' }
  | { decision: 'request_revision'; reason: string };

export type ChallengeQuestionRecord = {
  id: string;
  authorId: string;
  sourceFactId: string;
  sourceVersion: string;
  lessonId: string;
  lessonTitle: string;
  prompt: string;
  options: ChallengeOptionTuple;
  correctOptionId: string;
  explanation: string;
  status: ChallengeQuestionStatus;
  revision: number;
  createdLocalDate: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  featuredAt: string | null;
  closedAt: string | null;
  reviewReason: string | null;
  withdrawnAt: string | null;
  voidedAt: string | null;
};

export type ChallengeQuestionView = {
  id: string;
  roundItemId: string;
  lessonId: string;
  lessonTitle: string;
  author: ChallengeAuthorView;
  prompt: string;
  options: ChallengeOptionTuple;
  sourceLabel: string;
  closesAt: string;
  answeredByMe: boolean;
  practiceOnly: boolean;
};

export type ChallengeQuestionMine = Omit<ChallengeQuestionRecord, 'options'> & {
  options: ChallengeOptionTuple;
  quotaUsedOnCreatedDate: number;
};

export type ChallengeQuestionParent = ChallengeQuestionMine & {
  preview: ChallengeQuestionView | null;
  reviewHistory: readonly {
    revision: number;
    decision: ChallengeReviewDecision;
    reason: string | null;
    createdAt: string;
  }[];
};

export type ChallengePreferences = {
  studentId: string;
  canCreate: boolean;
  canParticipate: boolean;
  updatedAt: string;
};

export type ChallengePreferencesPatch = Partial<Pick<ChallengePreferences, 'canCreate' | 'canParticipate'>>;

export type ChallengeRound = {
  roundDate: string;
  timezone: 'Asia/Ho_Chi_Minh';
  status: ChallengeRoundStatus;
  targetContributions: number;
  currentContributions: number;
  selectedQuestionCount: number;
  completed: boolean;
  closesAt: string;
  rewardGranted: boolean;
};

export type ChallengeRoundItem = {
  id: string;
  roundDate: string;
  questionId: string;
  position: number;
  featuredAt: string;
};

export type ChallengeTodayResponse = {
  roundDate: string;
  roundStatus: ChallengeRoundStatus;
  questions: ChallengeQuestionView[];
  classProgress: { current: number; target: number; completed: boolean };
  myContribution: { correctAnswers: number; questionsCreated: number; questionsRevisited: number };
};

export type ChallengeAnswerResult = {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  sourceLabel: string;
  classContributionAdded: boolean;
  duplicate: boolean;
  practiceOnly?: boolean;
  voided?: boolean;
};

export type ChallengeRecognition = {
  type: 'question_creator' | 'kind_helper' | 'steady_learner' | 'class_builder';
  recipientIds: string[];
};

export type ChallengeWeeklyDay = {
  date: string;
  current: number;
  target: number;
  completed: boolean;
  rewardGranted: boolean;
  questionCount: number;
};

export type ChallengeWeeklyResponse = {
  weekStart: string;
  weekEnd: string;
  days: ChallengeWeeklyDay[];
  classProgress: { current: number; target: number; completedDays: number };
  topics: { lessonId: string; title: string; questionCount: number }[];
  recognitions: ChallengeRecognition[];
  mySummary: { questionsCreated: number; correctAnswers: number; revisits: number };
};

export type SubmitChallengeAttemptInput = {
  selectedOptionId: string;
  /** `attemptId` is the original public contract; `idempotencyKey` is accepted
   * as the clearer API name while both are normalized server-side. */
  attemptId?: string;
  idempotencyKey?: string;
  isPractice?: boolean;
};

export type AddChallengeReactionInput = {
  reactionType: ChallengeReactionType;
  idempotencyKey: string;
};

export type ReportChallengeItemInput = {
  reason: ChallengeReportReason;
  details?: string;
  idempotencyKey: string;
};

export type ResolveChallengeReportInput = { decision: 'dismissed' | 'voided'; reason: string };

export type ChallengeReactionRecord = {
  roundItemId: string;
  actorId: string;
  reactionType: ChallengeReactionType;
  createdAt: string;
};

export type ChallengeReportRecord = {
  id: string;
  roundItemId: string;
  reason: ChallengeReportReason;
  status: ChallengeReportStatus;
  createdAt: string;
};

export type ChallengeFailureReason =
  | 'quota_exceeded'
  | 'revision_conflict'
  | 'already_attempted'
  | 'self_question'
  | 'round_closed'
  | 'question_reported'
  | 'not_available'
  | 'rollout_disabled';

export type ChallengeFailureCode = 'invalid' | 'forbidden' | 'not-found' | 'conflict' | 'expired' | 'locked' | 'stale' | 'rate-limited' | 'unavailable';
export type ChallengeFailure = {
  ok: false;
  code: ChallengeFailureCode;
  message: string;
  reason?: ChallengeFailureReason;
  fieldErrors?: Record<string, string>;
};
export type ServiceResult<T extends Record<string, unknown> | readonly unknown[] | void> =
  | (T extends void ? { ok: true } : T extends readonly unknown[] ? { ok: true; items: T } : { ok: true } & T)
  | ChallengeFailure;

export type ChallengeRolloutConfig = {
  enabled: boolean;
  mode: ChallengeRolloutMode;
  scope: 'single-class';
};

export type ChallengeSourceCatalog = readonly ChallengeSourceFact[];
