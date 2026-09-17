import type {
  ChallengePreferences,
  ChallengePreferencesPatch,
  ChallengeAuthorView,
  ChallengeQuestionMine,
  ChallengeQuestionParent,
  ChallengeQuestionRecord,
  ChallengeOptionTuple,
  ReviewChallengeQuestionInput,
  ReviseChallengeQuestionInput,
} from '../../shared/challenge-contracts.ts';
import type { RoundCandidate } from './roundRules.ts';

export type InsertPendingQuestion = {
  id?: string;
  authorId: string;
  sourceFactId: string;
  sourceVersion: string;
  lessonId: string;
  lessonTitle: string;
  prompt: string;
  options: ChallengeOptionTuple;
  correctOptionId: string;
  explanation: string;
  createdLocalDate: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChallengeQuestionReviewRecord = {
  questionId: string;
  revision: number;
  decision: ReviewChallengeQuestionInput['decision'];
  reason: string | null;
  reviewerStudentId: string;
  reviewerScope: 'parent_grant';
  createdAt: string;
};

export type UpdateDraftRevisionInput = ReviseChallengeQuestionInput & {
  lessonId?: string;
  lessonTitle?: string;
  sourceVersion?: string;
};

export interface AuthoringRepository {
  countNewQuestionsForDay(authorId: string, localDate: string): Promise<number>;
  insertPendingQuestion(input: InsertPendingQuestion): Promise<ChallengeQuestionRecord | 'quota_exceeded'>;
  listMine(authorId: string, limit: number): Promise<readonly ChallengeQuestionMine[]>;
  listQuestionsBetween(startDate: string, endDate: string): Promise<readonly ChallengeQuestionRecord[]>;
  findForAuthor(authorId: string, questionId: string): Promise<ChallengeQuestionRecord | null>;
  updateDraftRevision(
    authorId: string,
    questionId: string,
    revision: number,
    input: UpdateDraftRevisionInput,
  ): Promise<ChallengeQuestionRecord | 'not_found' | 'revision_conflict'>;
  listApprovedCandidates(roundDate: string): Promise<readonly RoundCandidate[]>;
  getAuthorView(authorId: string): Promise<ChallengeAuthorView | null>;
  markQuestionFeatured(questionId: string, featuredAt: string): Promise<void>;
  markQuestionClosed(questionId: string, closedAt: string): Promise<void>;
  voidQuestion(questionId: string, voidedAt: string): Promise<'ok' | 'not_found' | 'invalid_state'>;
  listPendingForStudent(studentId: string): Promise<readonly ChallengeQuestionParent[]>;
  reviewQuestion(
    studentId: string,
    questionId: string,
    revision: number,
    decision: ReviewChallengeQuestionInput,
  ): Promise<ChallengeQuestionRecord | 'not_found' | 'revision_conflict' | 'invalid_state'>;
  withdrawQuestion(studentId: string, questionId: string): Promise<'ok' | 'not_found' | 'invalid_state'>;
  getPreferences(studentId: string): Promise<ChallengePreferences>;
  updatePreferences(studentId: string, patch: ChallengePreferencesPatch): Promise<ChallengePreferences>;
}

export type AuthoringRepositoryOptions = {
  now?: () => Date;
  idFactory?: () => string;
  authorViews?: readonly ChallengeAuthorView[];
};
