import type { ChallengeAnswerResult } from '../../shared/challenge-contracts';

export type ChallengeFeedbackProps = {
  result: ChallengeAnswerResult;
  correctOptionText?: string;
  onPractice?: () => void | Promise<void>;
  disablePractice?: boolean;
  onContinue?: () => void;
};

export function ChallengeFeedback({ result, correctOptionText, onPractice, disablePractice = false, onContinue }: ChallengeFeedbackProps) {
  const voided = result.voided;
  const correct = result.correct && !voided;
  return (
    <section className={`challenge-feedback${correct ? ' is-correct' : voided ? ' is-voided' : ' is-review'}`} data-challenge-feedback aria-live="polite">
      <p className="challenge-feedback-kicker">{voided ? 'CÂU HỎI ĐANG ĐƯỢC KIỂM TRA' : correct ? 'TUYỆT VỜI' : 'MÌNH CÙNG XEM LẠI NHÉ'}</p>
      <h3>{voided ? 'Câu hỏi này đang được người lớn kiểm tra.' : correct ? 'Cả lớp vừa tiến thêm một bước!' : 'Mỗi lần xem lại là một lần hiểu sâu hơn.'}</h3>
      <p className="challenge-feedback-answer">{voided ? 'Lượt trả lời vẫn được giữ lại, nhưng chưa tính vào tiến độ chung.' : <>Đáp án đúng: <strong>{correctOptionText ?? result.correctOptionId}</strong></>}</p>
      <p className="challenge-feedback-explanation"><strong>Giải thích:</strong> {result.explanation}</p>
      <p className="challenge-feedback-source"><strong>Nguồn học:</strong> {result.sourceLabel}</p>
      {result.practiceOnly && <p className="challenge-feedback-practice-note">Lượt ôn lại này chỉ để luyện tập, không cộng thêm đóng góp.</p>}
      <div className="challenge-feedback-actions">
        {onPractice && <button className="secondary-button" type="button" data-challenge-practice disabled={disablePractice} onClick={() => void onPractice()}>Ôn lại nhẹ nhàng</button>}
        {onContinue && <button className="primary-small-button" type="button" onClick={onContinue}>Khám phá câu tiếp theo</button>}
      </div>
    </section>
  );
}
