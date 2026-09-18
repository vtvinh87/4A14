import type {
  ChallengeReactionType,
  ChallengeReportReason,
  ChallengeReportStatus,
  ChallengeRound,
  ChallengeRoundItem,
} from '../../shared/challenge-contracts.ts';

export type ChallengeEventType =
  | 'challenge.question_created'
  | 'challenge.question_approved'
  | 'challenge.question_revised'
  | 'challenge.attempt_recorded'
  | 'challenge.practice_completed'
  | 'challenge.feedback_viewed'
  | 'challenge.reaction_added'
  | 'challenge.report_created';

export type ChallengeRoundRecord = ChallengeRound & {
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  voidedAt: string | null;
  selectionSeedVersion: string;
};

export type CreateRoundInput = {
  roundDate: string;
  timezone: 'Asia/Ho_Chi_Minh';
  status?: ChallengeRound['status'];
  targetContributions: number;
  closesAt: string;
  selectionSeedVersion?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChallengeRoundItemRecord = ChallengeRoundItem & {
  authorId: string;
  selectionSeedVersion: string;
  selectionMetadata: Record<string, unknown>;
  closedAt: string | null;
};

export type CreateRoundItemInput = {
  id?: string;
  roundDate: string;
  questionId: string;
  authorId: string;
  position: number;
  featuredAt: string;
  selectionSeedVersion: string;
  selectionMetadata?: Record<string, unknown>;
};

export type ChallengeAttemptRecord = {
  id: string;
  roundItemId: string;
  roundDate: string;
  questionId: string;
  studentId: string;
  idempotencyKey: string;
  selectedOptionId: string;
  isCorrect: boolean;
  isPractice: boolean;
  isVoided: boolean;
  contribution: 0 | 1;
  answeredAt: string;
};

export type InsertAttemptInput = Omit<ChallengeAttemptRecord, 'roundDate' | 'questionId'> & {
  id?: string;
  roundDate?: string;
  questionId?: string;
};

export type ChallengeEventRecord = {
  eventId: string;
  studentId: string;
  eventType: ChallengeEventType;
  payload: Record<string, unknown>;
  occurredAt: string;
  localDate: string;
  source: string;
  sourceVersion: string;
  createdAt: string;
};

export type AppendChallengeEventInput = Omit<ChallengeEventRecord, 'createdAt'> & { createdAt?: string };

export type UpsertReactionInput = {
  idempotencyKey?: string | null;
  roundItemId: string;
  actorId: string;
  reactionType: ChallengeReactionType;
  createdAt?: string;
};

export type ChallengeReactionRecord = {
  roundItemId: string;
  actorId: string;
  reactionType: ChallengeReactionType;
  createdAt: string;
  idempotencyKey: string | null;
};

export type ChallengeReportPrivateRecord = {
  id: string;
  roundItemId: string;
  reporterId: string;
  reason: ChallengeReportReason;
  details: string | null;
  status: ChallengeReportStatus;
  idempotencyKey: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionReason: string | null;
};

export type CreateChallengeReportInput = {
  id?: string;
  roundItemId: string;
  reporterId: string;
  reason: ChallengeReportReason;
  details?: string | null;
  idempotencyKey?: string | null;
  createdAt?: string;
};

export type PlayRepositoryOptions = {
  now?: () => Date;
  idFactory?: () => string;
  rounds?: readonly ChallengeRoundRecord[];
  items?: readonly ChallengeRoundItemRecord[];
  attempts?: readonly ChallengeAttemptRecord[];
  reactions?: readonly ChallengeReactionRecord[];
  reports?: readonly ChallengeReportPrivateRecord[];
  events?: readonly ChallengeEventRecord[];
};

export interface PlayRepository {
  getRound(roundDate: string): Promise<ChallengeRoundRecord | null>;
  listRoundsBetween(startDate: string, endDate: string): Promise<readonly ChallengeRoundRecord[]>;
  listOpenRoundsBefore(roundDate: string): Promise<readonly ChallengeRoundRecord[]>;
  insertRoundIfAbsent(input: CreateRoundInput): Promise<ChallengeRoundRecord>;
  closeRound(roundDate: string, closedAt: string): Promise<void>;
  listRoundItems(roundDate: string): Promise<readonly ChallengeRoundItemRecord[]>;
  listRoundItemsBetween(startDate: string, endDate: string): Promise<readonly ChallengeRoundItemRecord[]>;
  insertRoundItem(input: CreateRoundItemInput): Promise<ChallengeRoundItemRecord>;
  findRoundItem(itemId: string): Promise<ChallengeRoundItemRecord | null>;
  findAttempt(itemId: string, studentId: string): Promise<ChallengeAttemptRecord | null>;
  findAttemptByIdempotency(studentId: string, idempotencyKey: string): Promise<ChallengeAttemptRecord | null>;
  insertAttempt(input: InsertAttemptInput): Promise<ChallengeAttemptRecord | 'duplicate'>;
  countCorrectContributions(roundDate: string): Promise<number>;
  countCorrectContributionsBetween(startDate: string, endDate: string): Promise<ReadonlyMap<string, number>>;
  listAttemptsForStudent(studentId: string, startDate: string, endDate: string): Promise<readonly ChallengeAttemptRecord[]>;
  listAttemptsBetween(startDate: string, endDate: string): Promise<readonly ChallengeAttemptRecord[]>;
  listReactionsBetween(startDate: string, endDate: string): Promise<readonly ChallengeReactionRecord[]>;
  appendEvent(input: AppendChallengeEventInput): Promise<void>;
  upsertReaction(input: UpsertReactionInput): Promise<ChallengeReactionRecord>;
  createReport(input: CreateChallengeReportInput): Promise<ChallengeReportPrivateRecord>;
  findReportByIdempotency(reporterId: string, idempotencyKey: string): Promise<ChallengeReportPrivateRecord | null>;
  hasOpenReport(itemId: string): Promise<boolean>;
  hasOpenReportByReporter(itemId: string, reporterId: string): Promise<boolean>;
  hasOpenReportForQuestion(questionId: string): Promise<boolean>;

  // These small extensions are used by the later moderation/reward services;
  // keeping them in the persistence contract prevents service code from
  // reaching into adapter internals.
  grantRoundReward(roundDate: string): Promise<ChallengeRoundRecord>;
  voidAttemptsForQuestion(questionId: string, voidedAt: string): Promise<void>;
  findReport(reportId: string): Promise<ChallengeReportPrivateRecord | null>;
  resolveReport(reportId: string, status: Extract<ChallengeReportStatus, 'dismissed' | 'voided'>, resolvedAt: string, reason?: string): Promise<ChallengeReportPrivateRecord>;
}
