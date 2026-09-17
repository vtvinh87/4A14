import type { ChallengeSourceFact } from '../../shared/challenge-source.ts';
import {
  type ChallengeFailure,
  type ChallengeQuestionMine,
  type ChallengeQuestionRecord,
  type CreateChallengeQuestionInput,
  type ReviseChallengeQuestionInput,
  type ServiceResult,
} from '../../shared/challenge-contracts.ts';
import { localChallengeDate } from './roundRules.ts';
import type { AuthoringRepository, UpdateDraftRevisionInput } from './authoringTypes.ts';
import { validateCreateChallengeQuestion } from './validation.ts';

type AuthoringServiceDependencies = {
  repository: AuthoringRepository;
  sourceCatalog: readonly ChallengeSourceFact[];
  activeStudentDisplayNames: () => Promise<readonly string[]>;
  clock: () => Date;
  idFactory: () => string;
};

const AUTHORING_KEYS = new Set(['sourceFactId', 'prompt', 'correctAnswer', 'distractors', 'explanation']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function inputForValidation(value: unknown): CreateChallengeQuestionInput {
  const record = isRecord(value) ? value : {};
  return {
    sourceFactId: record.sourceFactId as string,
    prompt: record.prompt as string,
    correctAnswer: record.correctAnswer as string,
    distractors: record.distractors as [string, string, string],
    explanation: record.explanation as string,
  };
}

function validationFailure(fieldErrors: Record<string, string>): ChallengeFailure {
  return {
    ok: false,
    code: 'invalid',
    message: 'Câu hỏi chưa đủ điều kiện để gửi.',
    fieldErrors,
  };
}

function invalidInput(value: unknown, allowRevision: boolean): ChallengeFailure | null {
  if (!isRecord(value)) return validationFailure({ form: 'Dữ liệu câu hỏi không hợp lệ.' });
  const allowed = allowRevision ? new Set([...AUTHORING_KEYS, 'revision']) : AUTHORING_KEYS;
  const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
  return unknownKeys.length ? validationFailure(Object.fromEntries(unknownKeys.map((key) => [key, 'Trường này không được phép gửi lên.']))) : null;
}

function mine(question: ChallengeQuestionRecord, quota: number): ChallengeQuestionMine {
  return { ...structuredClone(question), quotaUsedOnCreatedDate: quota };
}

function quotaFailure(): ChallengeFailure {
  return { ok: false, code: 'rate-limited', reason: 'quota_exceeded', message: 'Mỗi ngày con chỉ được tạo tối đa 3 câu hỏi.' };
}

export function createChallengeAuthoringService(deps: AuthoringServiceDependencies) {
  async function createQuestion(studentId: string, input: CreateChallengeQuestionInput): Promise<ServiceResult<ChallengeQuestionMine>> {
    const preferences = await deps.repository.getPreferences(studentId);
    if (!preferences.canCreate) return { ok: false, code: 'forbidden', message: 'Tính năng tạo câu hỏi đang được phụ huynh tạm dừng.' };

    const unknown = invalidInput(input, false);
    if (unknown) return unknown;
    const raw = inputForValidation(input);
    const names = await deps.activeStudentDisplayNames();
    const validation = validateCreateChallengeQuestion(raw, deps.sourceCatalog, { forbiddenDisplayNames: names });
    if (!validation.ok) return validationFailure(validation.fieldErrors);
    const fact = deps.sourceCatalog.find((candidate) => candidate.id === raw.sourceFactId)!;
    const timestamp = deps.clock().toISOString();
    const result = await deps.repository.insertPendingQuestion({
      id: deps.idFactory(),
      authorId: studentId,
      sourceFactId: fact.id,
      sourceVersion: fact.sourceVersion,
      lessonId: fact.lessonId,
      lessonTitle: fact.lessonTitle,
      prompt: text(raw.prompt),
      options: [
        { id: 'correct', text: text(raw.correctAnswer) },
        { id: 'wrong-1', text: text(raw.distractors[0]) },
        { id: 'wrong-2', text: text(raw.distractors[1]) },
        { id: 'wrong-3', text: text(raw.distractors[2]) },
      ],
      correctOptionId: 'correct',
      explanation: text(raw.explanation),
      createdLocalDate: localChallengeDate(deps.clock()),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (result === 'quota_exceeded') return quotaFailure();
    const quota = await deps.repository.countNewQuestionsForDay(studentId, result.createdLocalDate);
    return { ok: true, ...mine(result, quota) };
  }

  async function listMine(studentId: string): Promise<ServiceResult<readonly ChallengeQuestionMine[]>> {
    const result = await deps.repository.listMine(studentId, 50);
    return { ok: true, items: result };
  }

  async function reviseQuestion(studentId: string, questionId: string, input: ReviseChallengeQuestionInput): Promise<ServiceResult<ChallengeQuestionMine>> {
    const unknown = invalidInput(input, true);
    if (unknown) return unknown;
    if (!isRecord(input) || !Number.isInteger(input.revision) || input.revision < 1) return validationFailure({ revision: 'Revision hiện tại không hợp lệ.' });
    const current = await deps.repository.findForAuthor(studentId, questionId);
    if (!current) return { ok: false, code: 'not-found', message: 'Không tìm thấy câu hỏi của con.' };

    const raw = inputForValidation(input);
    const names = await deps.activeStudentDisplayNames();
    const validation = validateCreateChallengeQuestion(raw, deps.sourceCatalog, { forbiddenDisplayNames: names });
    if (!validation.ok) return validationFailure(validation.fieldErrors);
    const fact = deps.sourceCatalog.find((candidate) => candidate.id === raw.sourceFactId)!;
    const update: UpdateDraftRevisionInput = {
      revision: input.revision,
      sourceFactId: fact.id,
      prompt: text(raw.prompt),
      correctAnswer: text(raw.correctAnswer),
      distractors: [text(raw.distractors[0]), text(raw.distractors[1]), text(raw.distractors[2])],
      explanation: text(raw.explanation),
      sourceVersion: fact.sourceVersion,
      lessonId: fact.lessonId,
      lessonTitle: fact.lessonTitle,
    };
    const result = await deps.repository.updateDraftRevision(studentId, questionId, input.revision, update);
    if (result === 'not_found') return { ok: false, code: 'not-found', message: 'Không tìm thấy câu hỏi của con.' };
    if (result === 'revision_conflict') return { ok: false, code: 'conflict', reason: 'revision_conflict', message: 'Câu hỏi đã thay đổi hoặc chưa được yêu cầu sửa.' };
    const quota = await deps.repository.countNewQuestionsForDay(studentId, current.createdLocalDate);
    return { ok: true, ...mine(result, quota) };
  }

  return { createQuestion, listMine, reviseQuestion };
}
