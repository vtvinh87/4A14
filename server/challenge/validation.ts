import {
  CHALLENGE_EXPLANATION_MAX_LENGTH,
  CHALLENGE_EXPLANATION_MIN_LENGTH,
  CHALLENGE_OPTION_MAX_LENGTH,
  CHALLENGE_OPTION_MIN_LENGTH,
  CHALLENGE_PROMPT_MAX_LENGTH,
  CHALLENGE_PROMPT_MIN_LENGTH,
  type CreateChallengeQuestionInput,
} from '../../shared/challenge-contracts.ts';
import type { ChallengeSourceFact } from '../../shared/challenge-source.ts';

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: 'VALIDATION_ERROR'; fieldErrors: Record<string, string> };

const ALLOWED_INPUT_KEYS = new Set(['sourceFactId', 'prompt', 'correctAnswer', 'distractors', 'explanation']);
const CONTACT_PATTERN = /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?84|0)\d[\d\s.-]{7,}\d)/iu;
const MARKUP_PATTERN = /<[^>]*>|javascript\s*:/iu;
const CONTACT_WORD_PATTERN = /\b(?:zalo|facebook|instagram|email|liên\s*hệ|số\s*điện\s*thoại)\b/iu;
const OFFENSIVE_MARKERS = ['đồ ngu', 'ngu ngốc', 'chửi'];

export function normalizeChallengeOption(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
}

function textLength(value: string): number {
  return Array.from(value.trim()).length;
}

function safeText(value: string): boolean {
  if (MARKUP_PATTERN.test(value) || CONTACT_PATTERN.test(value) || CONTACT_WORD_PATTERN.test(value)) return false;
  const normalized = normalizeChallengeOption(value);
  return !OFFENSIVE_MARKERS.some((marker) => normalized.includes(marker));
}

function inputRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
}

export function validateCreateChallengeQuestion(
  input: CreateChallengeQuestionInput,
  sourceCatalog: readonly ChallengeSourceFact[],
  context: { forbiddenDisplayNames?: readonly string[] } = {},
): ValidationResult {
  const errors: Record<string, string> = {};
  if (!inputRecord(input)) return { ok: false, code: 'VALIDATION_ERROR', fieldErrors: { form: 'Dữ liệu câu hỏi không hợp lệ.' } };
  for (const key of Object.keys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) errors[key] = 'Trường này không được phép gửi lên.';
  }

  const sourceFactId = input.sourceFactId;
  if (typeof sourceFactId !== 'string' || !sourceCatalog.some((fact) => fact.id === sourceFactId)) errors.sourceFactId = 'Hãy chọn một fact đã được kiểm duyệt.';

  const prompt = input.prompt;
  if (typeof prompt !== 'string' || textLength(prompt) < CHALLENGE_PROMPT_MIN_LENGTH || textLength(prompt) > CHALLENGE_PROMPT_MAX_LENGTH) {
    errors.prompt = `Câu hỏi dài từ ${CHALLENGE_PROMPT_MIN_LENGTH} đến ${CHALLENGE_PROMPT_MAX_LENGTH} ký tự.`;
  }

  const correctAnswer = input.correctAnswer;
  if (typeof correctAnswer !== 'string' || textLength(correctAnswer) < CHALLENGE_OPTION_MIN_LENGTH || textLength(correctAnswer) > CHALLENGE_OPTION_MAX_LENGTH) {
    errors.correctAnswer = `Đáp án chuẩn dài từ ${CHALLENGE_OPTION_MIN_LENGTH} đến ${CHALLENGE_OPTION_MAX_LENGTH} ký tự.`;
  }

  const distractors = input.distractors;
  if (!Array.isArray(distractors) || distractors.length !== 3 || distractors.some((option) => typeof option !== 'string')) {
    errors.distractors = 'Cần đúng ba phương án gây nhiễu.';
  } else {
    distractors.forEach((option, index) => {
      if (textLength(option) < CHALLENGE_OPTION_MIN_LENGTH || textLength(option) > CHALLENGE_OPTION_MAX_LENGTH) {
        errors[`distractors.${index}`] = `Phương án dài từ ${CHALLENGE_OPTION_MIN_LENGTH} đến ${CHALLENGE_OPTION_MAX_LENGTH} ký tự.`;
      }
    });
  }

  const explanation = input.explanation;
  if (typeof explanation !== 'string' || textLength(explanation) < CHALLENGE_EXPLANATION_MIN_LENGTH || textLength(explanation) > CHALLENGE_EXPLANATION_MAX_LENGTH) {
    errors.explanation = `Lời giải thích dài từ ${CHALLENGE_EXPLANATION_MIN_LENGTH} đến ${CHALLENGE_EXPLANATION_MAX_LENGTH} ký tự.`;
  }

  const fact = typeof sourceFactId === 'string' ? sourceCatalog.find((candidate) => candidate.id === sourceFactId) : undefined;
  const texts = [prompt, correctAnswer, ...(Array.isArray(distractors) ? distractors : []), explanation].filter((value): value is string => typeof value === 'string');
  texts.forEach((value, index) => {
    if (!safeText(value)) errors[`text.${index}`] = 'Nội dung cần lành mạnh, không chứa mã, liên kết hoặc thông tin liên hệ.';
  });

  const names = (context.forbiddenDisplayNames ?? []).map(normalizeChallengeOption).filter((name) => name.length > 1);
  if (names.some((name) => texts.some((value) => normalizeChallengeOption(value).includes(name)))) {
    errors.content = 'Câu hỏi không nên gọi tên một bạn khác trong lớp.';
  }

  if (typeof correctAnswer === 'string' && Array.isArray(distractors) && distractors.length === 3 && distractors.every((option) => typeof option === 'string')) {
    const normalizedOptions = [correctAnswer, ...distractors].map(normalizeChallengeOption);
    if (new Set(normalizedOptions).size !== 4) errors.distractors = 'Bốn phương án phải khác nhau.';
  }

  return Object.keys(errors).length ? { ok: false, code: 'VALIDATION_ERROR', fieldErrors: errors } : { ok: true };
}
