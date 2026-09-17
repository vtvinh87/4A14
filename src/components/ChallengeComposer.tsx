import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChallengeSourceFact } from '../../shared/challenge-source';
import {
  CHALLENGE_DAILY_NEW_QUESTION_LIMIT,
  CHALLENGE_EXPLANATION_MAX_LENGTH,
  CHALLENGE_EXPLANATION_MIN_LENGTH,
  CHALLENGE_OPTION_MAX_LENGTH,
  CHALLENGE_OPTION_MIN_LENGTH,
  CHALLENGE_PROMPT_MAX_LENGTH,
  CHALLENGE_PROMPT_MIN_LENGTH,
  type ChallengeQuestionMine,
  type CreateChallengeQuestionInput,
  type ReviseChallengeQuestionInput,
} from '../../shared/challenge-contracts';
import { createChallengeQuestion, reviseChallengeQuestion, type ChallengeQuestionResponse } from '../auth/apiClient';
import { clearChallengeDraft, emptyChallengeDraft, loadChallengeDraft, saveChallengeDraft, type ChallengeDraft } from '../challenge/drafts';

export type ChallengeComposerProps = {
  sourceFacts: readonly ChallengeSourceFact[];
  quotaUsedOnCreatedDate: number;
  canCreate: boolean;
  initialQuestion?: ChallengeQuestionMine | null;
  storage?: Storage | null;
  onCreate?: (input: CreateChallengeQuestionInput, idempotencyKey: string) => ReturnType<typeof createChallengeQuestion>;
  onRevise?: (questionId: string, input: ReviseChallengeQuestionInput, idempotencyKey: string) => ReturnType<typeof reviseChallengeQuestion>;
  onSaved?: (question: ChallengeQuestionMine) => Promise<void> | void;
};

type ComposerErrors = Record<string, string>;

function textLength(value: string): number {
  return Array.from(value.trim()).length;
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
}

function emptyForFact(factId: string): ChallengeDraft {
  return { ...emptyChallengeDraft(), sourceFactId: factId };
}

function draftFromQuestion(question: ChallengeQuestionMine): ChallengeDraft {
  const distractors = question.options.filter((option) => option.id !== question.correctOptionId).slice(0, 3).map((option) => option.text);
  while (distractors.length < 3) distractors.push('');
  return {
    sourceFactId: question.sourceFactId,
    prompt: question.prompt,
    correctAnswer: question.options.find((option) => option.id === question.correctOptionId)?.text ?? '',
    distractors: distractors as [string, string, string],
    explanation: question.explanation,
    updatedAt: question.updatedAt,
  };
}

function initialDraft(sourceFacts: readonly ChallengeSourceFact[], question: ChallengeQuestionMine | null | undefined, storage?: Storage | null): { draft: ChallengeDraft; storageAvailable: boolean } {
  if (question) return { draft: draftFromQuestion(question), storageAvailable: true };
  const loaded = loadChallengeDraft(storage);
  const draft = loaded.draft;
  if (!draft.sourceFactId && sourceFacts[0]) return { draft: { ...draft, sourceFactId: sourceFacts[0].id }, storageAvailable: loaded.available };
  return { draft, storageAvailable: loaded.available };
}

function validateDraft(draft: ChallengeDraft, sourceFacts: readonly ChallengeSourceFact[]): ComposerErrors {
  const errors: ComposerErrors = {};
  const fact = sourceFacts.find((candidate) => candidate.id === draft.sourceFactId);
  if (!fact) errors.sourceFactId = 'Hãy chọn một mảnh kiến thức trong danh sách.';
  if (textLength(draft.prompt) < CHALLENGE_PROMPT_MIN_LENGTH || textLength(draft.prompt) > CHALLENGE_PROMPT_MAX_LENGTH) errors.prompt = `Câu hỏi dài từ ${CHALLENGE_PROMPT_MIN_LENGTH} đến ${CHALLENGE_PROMPT_MAX_LENGTH} ký tự.`;
  if (textLength(draft.correctAnswer) < CHALLENGE_OPTION_MIN_LENGTH || textLength(draft.correctAnswer) > CHALLENGE_OPTION_MAX_LENGTH) errors.correctAnswer = `Đáp án chuẩn dài từ ${CHALLENGE_OPTION_MIN_LENGTH} đến ${CHALLENGE_OPTION_MAX_LENGTH} ký tự.`;
  draft.distractors.forEach((option, index) => {
    if (textLength(option) < CHALLENGE_OPTION_MIN_LENGTH || textLength(option) > CHALLENGE_OPTION_MAX_LENGTH) errors[`distractor-${index}`] = `Phương án ${index + 1} dài từ ${CHALLENGE_OPTION_MIN_LENGTH} đến ${CHALLENGE_OPTION_MAX_LENGTH} ký tự.`;
  });
  if (textLength(draft.explanation) < CHALLENGE_EXPLANATION_MIN_LENGTH || textLength(draft.explanation) > CHALLENGE_EXPLANATION_MAX_LENGTH) errors.explanation = `Lời giải thích dài từ ${CHALLENGE_EXPLANATION_MIN_LENGTH} đến ${CHALLENGE_EXPLANATION_MAX_LENGTH} ký tự.`;
  if (fact) {
    const options = [draft.correctAnswer, ...draft.distractors].map(normalize);
    if (new Set(options).size !== 4) errors.distractors = 'Bốn phương án phải khác nhau.';
  }
  return errors;
}

function groupedSourceFacts(sourceFacts: readonly ChallengeSourceFact[]): { lessonId: string; lessonTitle: string; facts: readonly ChallengeSourceFact[] }[] {
  const groups = new Map<string, { lessonId: string; lessonTitle: string; facts: ChallengeSourceFact[] }>();
  for (const fact of sourceFacts) {
    const group = groups.get(fact.lessonId) ?? { lessonId: fact.lessonId, lessonTitle: fact.lessonTitle, facts: [] };
    group.facts.push(fact);
    groups.set(fact.lessonId, group);
  }
  return [...groups.values()].sort((left, right) => left.lessonId.localeCompare(right.lessonId, undefined, { numeric: true }));
}

function idempotencyKey(): string {
  try {
    return `challenge-${crypto.randomUUID()}`;
  } catch {
    return `challenge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function ChallengeComposer({
  sourceFacts,
  quotaUsedOnCreatedDate,
  canCreate,
  initialQuestion,
  storage,
  onCreate = createChallengeQuestion,
  onRevise = reviseChallengeQuestion,
  onSaved,
}: ChallengeComposerProps) {
  const initial = useMemo(() => initialDraft(sourceFacts, initialQuestion, storage), [sourceFacts, initialQuestion, storage]);
  const [draft, setDraft] = useState<ChallengeDraft>(initial.draft);
  const [storageAvailable, setStorageAvailable] = useState(initial.storageAvailable);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const skipSaveRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const isRevision = Boolean(initialQuestion);
  const fact = sourceFacts.find((candidate) => candidate.id === draft.sourceFactId) ?? sourceFacts[0];
  const sourceGroups = useMemo(() => groupedSourceFacts(sourceFacts), [sourceFacts]);
  const errors = useMemo(() => validateDraft(draft, sourceFacts), [draft, sourceFacts]);
  const quotaBlocked = !isRevision && quotaUsedOnCreatedDate >= CHALLENGE_DAILY_NEW_QUESTION_LIMIT;
  const valid = Object.keys(errors).length === 0 && Boolean(fact);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (!draft.prompt && !draft.distractors.some(Boolean) && !draft.explanation) return;
    const result = saveChallengeDraft(draft, storage);
    setStorageAvailable(result.available);
  }, [draft, storage]);

  useEffect(() => {
    setDraft(initial.draft);
    setStorageAvailable(initial.storageAvailable);
    setError('');
    idempotencyKeyRef.current = null;
  }, [initial]);

  const update = (patch: Partial<ChallengeDraft>) => {
    setDraft((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
    setError('');
  };

  const updateDistractor = (index: number, value: string) => {
    const distractors = [...draft.distractors] as [string, string, string];
    distractors[index] = value;
    update({ distractors });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || quotaBlocked || submitting) {
      setError(Object.values(errors)[0] ?? (quotaBlocked ? 'Con đã dùng hết 3 lượt tạo câu hỏi hôm nay.' : 'Hãy hoàn thiện câu hỏi trước khi gửi.'));
      return;
    }
    const key = idempotencyKeyRef.current ?? idempotencyKey();
    idempotencyKeyRef.current = key;
    setSubmitting(true);
    setError('');
    const input: CreateChallengeQuestionInput = {
      sourceFactId: draft.sourceFactId,
      prompt: draft.prompt.trim(),
      correctAnswer: draft.correctAnswer.trim(),
      distractors: draft.distractors.map((option) => option.trim()) as [string, string, string],
      explanation: draft.explanation.trim(),
    };
    const result = isRevision && initialQuestion
      ? await onRevise(initialQuestion.id, { ...input, revision: initialQuestion.revision }, key)
      : await onCreate(input, key);
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    skipSaveRef.current = true;
    clearChallengeDraft(storage);
    setDraft(emptyForFact(fact?.id ?? ''));
    idempotencyKeyRef.current = null;
    setSubmitting(false);
    await onSaved?.(result.question);
  };

  if (!canCreate) {
    return <section className="challenge-composer challenge-composer-paused" data-challenge-composer-paused><p>Phụ huynh đang tạm dừng việc tạo câu hỏi. Con vẫn có thể tiếp tục học và trả lời các câu đố đã mở.</p></section>;
  }

  return (
    <section className="challenge-composer" data-challenge-composer aria-labelledby="challenge-composer-title">
      <div className="challenge-composer-heading">
        <div>
          <p className="eyebrow">THÁCH ĐỐ</p>
          <h2 id="challenge-composer-title">{isRevision ? 'Sửa câu hỏi cùng phụ huynh' : 'Tạo một câu đố cho lớp'}</h2>
        </div>
        {!isRevision && <span data-challenge-quota>{quotaUsedOnCreatedDate}/{CHALLENGE_DAILY_NEW_QUESTION_LIMIT} câu hôm nay</span>}
      </div>

      {isRevision && initialQuestion?.reviewReason && <p className="challenge-review-reason" data-challenge-review-reason>Phụ huynh nhắn: {initialQuestion.reviewReason}</p>}
      {!storageAvailable && <p className="challenge-storage-notice" data-challenge-storage-notice>Không thể lưu bản nháp trên thiết bị này; con vẫn có thể gửi khi mạng ổn định.</p>}
      <p className="challenge-source-card" data-challenge-source-card><strong>Mảnh kiến thức</strong><span>{fact?.lessonTitle ?? 'Chưa có mảnh kiến thức'}</span><small>{fact?.source.locator ?? ''}</small><small data-challenge-source-kind>{fact?.sourceKind === 'lesson-reference' ? 'Mảnh tham khảo — phụ huynh sẽ kiểm tra trước khi duyệt' : 'Mảnh đã được kiểm duyệt'}</small></p>

      <form onSubmit={submit} data-challenge-composer-form>
        <label data-challenge-source-label htmlFor="challenge-source">Chọn mảnh kiến thức</label>
        <select id="challenge-source" value={draft.sourceFactId} onChange={(event) => update({ sourceFactId: event.target.value })} disabled={submitting}>
          {sourceGroups.map((group) => <optgroup label={group.lessonTitle} key={group.lessonId}>
            {group.facts.map((sourceFact) => <option value={sourceFact.id} key={sourceFact.id}>{sourceFact.source.locator}</option>)}
          </optgroup>)}
        </select>

        <label data-challenge-prompt-label htmlFor="challenge-prompt">Viết câu hỏi <span>({CHALLENGE_PROMPT_MIN_LENGTH}–{CHALLENGE_PROMPT_MAX_LENGTH} ký tự)</span></label>
        <textarea id="challenge-prompt" data-challenge-prompt value={draft.prompt} maxLength={CHALLENGE_PROMPT_MAX_LENGTH + 1} disabled={submitting} onChange={(event) => update({ prompt: event.target.value })} />

        <fieldset>
          <legend>Câu trả lời</legend>
          <label htmlFor="challenge-correct-answer">Đáp án chuẩn <span>(con tự viết)</span></label>
          <input id="challenge-correct-answer" data-challenge-correct-answer value={draft.correctAnswer} maxLength={CHALLENGE_OPTION_MAX_LENGTH + 1} disabled={submitting} onChange={(event) => update({ correctAnswer: event.target.value })} />
          {[0, 1, 2].map((index) => <label key={index} htmlFor={`challenge-distractor-${index}`}>Phương án {index + 1}
            <input id={`challenge-distractor-${index}`} data-challenge-distractor={index} value={draft.distractors[index]} maxLength={CHALLENGE_OPTION_MAX_LENGTH + 1} disabled={submitting} onChange={(event) => updateDistractor(index, event.target.value)} />
          </label>)}
        </fieldset>

        <label data-challenge-explanation-label htmlFor="challenge-explanation">Viết lời giải thích <span>({CHALLENGE_EXPLANATION_MIN_LENGTH}–{CHALLENGE_EXPLANATION_MAX_LENGTH} ký tự)</span></label>
        <textarea id="challenge-explanation" data-challenge-explanation value={draft.explanation} maxLength={CHALLENGE_EXPLANATION_MAX_LENGTH + 1} disabled={submitting} onChange={(event) => update({ explanation: event.target.value })} />

        <p data-challenge-validation aria-live="polite">{Object.values(errors)[0] ?? (!isRevision && quotaBlocked ? 'Con đã dùng hết 3 lượt tạo câu hỏi hôm nay.' : 'Bốn phương án sẽ được xáo trộn khi câu hỏi mở trong ngày.')}</p>
        <p aria-live="polite" data-challenge-error>{error}</p>
        <button className="primary-small-button" data-challenge-submit type="submit" disabled={!valid || quotaBlocked || submitting}>{submitting ? 'Đang gửi...' : isRevision ? 'Gửi lại để phụ huynh duyệt' : 'Gửi câu đố'}</button>
      </form>
    </section>
  );
}
