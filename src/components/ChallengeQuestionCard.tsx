import { useEffect, useRef, useState } from 'react';
import type { ChallengeAnswerResult, ChallengeQuestionView, SubmitChallengeAttemptInput } from '../../shared/challenge-contracts';
import { DEFAULT_AVATAR_ID } from '../../shared/account-contracts';
import { getAvatarDefinition } from '../profile/avatarCatalog';
import { ChallengeFeedback } from './ChallengeFeedback';

export type ChallengeQuestionCardProps = {
  question: ChallengeQuestionView;
  answer?: ChallengeAnswerResult | null;
  isSubmitting?: boolean;
  readOnly?: boolean;
  offline?: boolean;
  onSubmit: (input: SubmitChallengeAttemptInput) => ChallengeAnswerResult | null | Promise<ChallengeAnswerResult | null>;
  onContinue?: () => void;
};

function createIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `challenge-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function ChallengeQuestionCard({ question, answer = null, isSubmitting = false, readOnly = false, offline = false, onSubmit, onContinue }: ChallengeQuestionCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [validationError, setValidationError] = useState('');
  const idempotencyKey = useRef<string | null>(null);
  const currentAnswer = answer?.questionId === question.id ? answer : null;
  const avatar = getAvatarDefinition(question.author.avatarId) ?? getAvatarDefinition(DEFAULT_AVATAR_ID);

  useEffect(() => {
    setSelectedOptionId('');
    setValidationError('');
    idempotencyKey.current = null;
  }, [question.id]);

  const submit = async () => {
    if (offline) return;
    if (!selectedOptionId) {
      setValidationError('Hãy chọn một phương án trước khi gửi nhé.');
      return;
    }
    setValidationError('');
    const key = idempotencyKey.current ?? createIdempotencyKey();
    idempotencyKey.current = key;
    const result = await onSubmit({ selectedOptionId, idempotencyKey: key });
    if (!result) setValidationError('Chưa nhận được xác nhận từ máy chủ. Hãy thử lại nhé.');
  };

  const practice = async () => {
    const key = createIdempotencyKey();
    const optionId = currentAnswer?.selectedOptionId ?? selectedOptionId;
    if (!optionId) return;
    await onSubmit({ selectedOptionId: optionId, idempotencyKey: key, isPractice: true });
  };

  return (
    <article className="challenge-question-card" data-challenge-question-card={question.id} aria-labelledby={`challenge-question-title-${question.id}`}>
      <div className="challenge-question-card-heading">
        <div className="challenge-question-author">
          <span className={`challenge-author-avatar ${avatar?.variantClass ?? ''}`} aria-hidden="true"><img src={avatar?.assetUrl} alt="" /></span>
          <span><strong>{question.author.displayName}</strong><small>{question.lessonTitle}</small></span>
        </div>
        {question.practiceOnly && <span className="challenge-question-practice-badge">Ôn lại</span>}
      </div>
      <p className="challenge-question-source">{question.sourceLabel}</p>
      <h2 id={`challenge-question-title-${question.id}`}>{question.prompt}</h2>
      <fieldset className="challenge-question-options" disabled={Boolean(currentAnswer) || isSubmitting || readOnly || offline}>
        <legend className="visually-hidden">Chọn một trong bốn phương án</legend>
        {question.options.map((option, index) => {
          const selected = selectedOptionId === option.id;
          const isCorrect = Boolean(currentAnswer && currentAnswer.correctOptionId === option.id);
          const isChosen = Boolean(currentAnswer && currentAnswer.selectedOptionId === option.id);
          return <label className={`challenge-question-option${selected ? ' is-selected' : ''}${isCorrect ? ' is-correct' : ''}${isChosen && !isCorrect ? ' is-chosen-wrong' : ''}`} key={option.id}>
            <input
              type="radio"
              name={`challenge-answer-${question.id}`}
              value={option.id}
              checked={selected || isChosen}
              aria-label={`Phương án ${index + 1}: ${option.text}${isCorrect ? ' — đáp án đúng' : isChosen ? ' — phương án con đã chọn' : ''}`}
              onChange={() => { setSelectedOptionId(option.id); setValidationError(''); idempotencyKey.current = null; }}
            />
            <span className="challenge-question-option-marker" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <span>{option.text}</span>
            {currentAnswer && isCorrect && <strong className="challenge-option-status">✓ Đáp án đúng</strong>}
            {currentAnswer && isChosen && !isCorrect && <strong className="challenge-option-status">○ Con đã chọn</strong>}
          </label>;
        })}
      </fieldset>
      {readOnly && <p className="challenge-question-author-note" data-challenge-author-note>Đây là câu hỏi của em; mời các bạn trong lớp cùng thử sức nhé.</p>}
      {offline && !currentAnswer && <p className="challenge-question-offline-note" data-challenge-offline>Con đang ở chế độ ngoại tuyến; câu hỏi vẫn mở để đọc. Hãy kết nối mạng rồi thử lại lượt trả lời nhé.</p>}
      {validationError && <p className="challenge-question-error" role="alert">{validationError}</p>}
      {!currentAnswer && !readOnly && <button className="primary-small-button challenge-question-submit" type="button" data-challenge-submit disabled={isSubmitting || offline} onClick={() => void submit()}>{isSubmitting ? 'Đang ghi nhận…' : 'Gửi câu trả lời'}</button>}
      {currentAnswer && <ChallengeFeedback result={currentAnswer} correctOptionText={question.options.find((option) => option.id === currentAnswer.correctOptionId)?.text} onPractice={practice} disablePractice={offline} onContinue={onContinue} />}
    </article>
  );
}
