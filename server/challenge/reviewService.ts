import type {
  ChallengeFailure,
  ChallengePreferences,
  ChallengePreferencesPatch,
  ChallengeQuestionParent,
  ChallengeQuestionRecord,
  ReviewChallengeQuestionInput,
  ServiceResult,
} from '../../shared/challenge-contracts.ts';
import type { AuthoringRepository } from './authoringTypes.ts';

export type ChallengeReviewRequest = ReviewChallengeQuestionInput & { revision?: number };

type ReviewServiceDependencies = {
  repository: AuthoringRepository;
  clock: () => Date;
};

function invalid(message: string): ChallengeFailure {
  return { ok: false, code: 'invalid', message };
}

function conflict(reason: 'revision_conflict' | 'not_available', message: string): ChallengeFailure {
  return { ok: false, code: 'conflict', reason, message };
}

function parentView(question: ChallengeQuestionRecord, quotaUsedOnCreatedDate: number): ChallengeQuestionParent {
  return {
    ...structuredClone(question),
    quotaUsedOnCreatedDate,
    preview: null,
    reviewHistory: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function validateReviewInput(input: unknown): input is ChallengeReviewRequest {
  if (!isRecord(input)) return false;
  if (input.decision === 'approve') return Object.keys(input).every((key) => key === 'decision' || key === 'revision');
  return input.decision === 'request_revision'
    && typeof input.reason === 'string'
    && input.reason.trim().length >= 1
    && input.reason.trim().length <= 500
    && Object.keys(input).every((key) => key === 'decision' || key === 'reason' || key === 'revision');
}

function validateSettingsPatch(value: unknown): value is ChallengePreferencesPatch {
  if (!isRecord(value)) return false;
  return Object.keys(value).every((key) => key === 'canCreate' || key === 'canParticipate')
    && (value.canCreate === undefined || typeof value.canCreate === 'boolean')
    && (value.canParticipate === undefined || typeof value.canParticipate === 'boolean');
}

export function createChallengeReviewService(deps: ReviewServiceDependencies) {
  async function listPending(parentStudentId: string): Promise<ServiceResult<readonly ChallengeQuestionParent[]>> {
    return { ok: true, items: await deps.repository.listPendingForStudent(parentStudentId) };
  }

  async function review(parentStudentId: string, questionId: string, input: ChallengeReviewRequest): Promise<ServiceResult<ChallengeQuestionParent>> {
    if (!validateReviewInput(input)) return invalid('Quyết định duyệt câu hỏi hoặc lý do cần sửa chưa hợp lệ.');
    const pending = await deps.repository.listPendingForStudent(parentStudentId);
    const question = pending.find((candidate) => candidate.id === questionId);
    if (!question) return { ok: false, code: 'not-found', message: 'Không tìm thấy câu hỏi đang chờ duyệt.' };
    if (input.revision !== undefined && (!Number.isInteger(input.revision) || input.revision < 1)) return invalid('Revision câu hỏi không hợp lệ.');
    const revision = input.revision ?? question.revision;
    const decision: ReviewChallengeQuestionInput = input.decision === 'approve'
      ? { decision: 'approve' }
      : { decision: 'request_revision', reason: input.reason.trim() };
    const result = await deps.repository.reviewQuestion(parentStudentId, questionId, revision, decision);
    if (result === 'not_found') return { ok: false, code: 'not-found', message: 'Không tìm thấy câu hỏi đang chờ duyệt.' };
    if (result === 'revision_conflict') return conflict('revision_conflict', 'Câu hỏi đã thay đổi; hãy tải lại hàng đợi duyệt.');
    if (result === 'invalid_state') return conflict('not_available', 'Câu hỏi này không còn chờ duyệt.');
    const quota = await deps.repository.countNewQuestionsForDay(parentStudentId, result.createdLocalDate);
    return { ok: true, ...parentView(result, quota) };
  }

  async function withdraw(parentStudentId: string, questionId: string): Promise<ServiceResult<void>> {
    const result = await deps.repository.withdrawQuestion(parentStudentId, questionId);
    if (result === 'not_found') return { ok: false, code: 'not-found', message: 'Không tìm thấy câu hỏi của con.' };
    if (result === 'invalid_state') return conflict('not_available', 'Câu hỏi này đã được đưa vào một ngày chơi hoặc đã đóng.');
    return { ok: true };
  }

  async function getSettings(parentStudentId: string): Promise<ServiceResult<ChallengePreferences>> {
    return { ok: true, ...(await deps.repository.getPreferences(parentStudentId)) };
  }

  async function updateSettings(parentStudentId: string, patch: ChallengePreferencesPatch): Promise<ServiceResult<ChallengePreferences>> {
    if (!validateSettingsPatch(patch)) return invalid('Cài đặt Thách đố chưa hợp lệ.');
    return { ok: true, ...(await deps.repository.updatePreferences(parentStudentId, patch)) };
  }

  return { listPending, review, withdraw, getSettings, updateSettings };
}
