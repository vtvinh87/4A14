import { useState } from 'react';
import type { ChallengePreferences, ChallengeQuestionParent } from '../../../shared/challenge-contracts';

export type ChallengeReviewQueueProps = {
  questions: readonly ChallengeQuestionParent[];
  settings: ChallengePreferences | null;
  loading: boolean;
  error: string;
  busyQuestionId: string | null;
  onRetry: () => void | Promise<void>;
  onApprove: (questionId: string, revision: number) => boolean | Promise<boolean>;
  onRequestRevision: (questionId: string, revision: number, reason: string) => boolean | Promise<boolean>;
  onWithdraw: (questionId: string) => boolean | Promise<boolean>;
  onSettingsChange: (patch: { canCreate?: boolean; canParticipate?: boolean }) => boolean | Promise<boolean>;
};

export function ChallengeReviewQueue({ questions, settings, loading, error, busyQuestionId, onRetry, onApprove, onRequestRevision, onWithdraw, onSettingsChange }: ChallengeReviewQueueProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [approvalQuestionId, setApprovalQuestionId] = useState<string | null>(null);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  const updateSetting = async (patch: { canCreate?: boolean; canParticipate?: boolean }) => {
    setSettingsBusy(true);
    try { await onSettingsChange(patch); } finally { setSettingsBusy(false); }
  };

  const approvalQuestion = questions.find((question) => question.id === approvalQuestionId) ?? null;
  const confirmApproval = async () => {
    if (!approvalQuestion || approvalSubmitting) return;
    setApprovalSubmitting(true);
    try {
      const accepted = await onApprove(approvalQuestion.id, approvalQuestion.revision);
      if (accepted) setApprovalQuestionId(null);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  if (loading) return <section className="parent-card parent-challenge-review-queue" data-challenge-review-queue><p>Đang tải hàng đợi duyệt câu hỏi…</p></section>;
  if (error) return <section className="parent-card parent-challenge-review-queue" data-challenge-review-queue><p role="alert">{error}</p><button className="secondary-button" type="button" data-challenge-review-retry onClick={() => void onRetry()}>Thử lại</button></section>;

  return (
    <section className="parent-card parent-challenge-review-queue" data-challenge-review-queue aria-labelledby="challenge-review-title">
      <div className="parent-card-heading parent-challenge-review-heading">
        <div><p className="eyebrow">THÁCH ĐỐ</p><h2 id="challenge-review-title">Chờ phụ huynh duyệt</h2></div>
        <span>{questions.length} câu</span>
      </div>

      {settings && <div className="parent-challenge-review-settings" data-challenge-review-settings>
        <label><span>Cho phép tạo câu hỏi</span><input type="checkbox" role="switch" aria-label="Cho phép tạo câu hỏi" checked={settings.canCreate} disabled={settingsBusy} onChange={(event) => void updateSetting({ canCreate: event.currentTarget.checked })} /></label>
        <label><span>Cho phép tham gia Thách đố</span><input type="checkbox" role="switch" aria-label="Cho phép tham gia Thách đố" checked={settings.canParticipate} disabled={settingsBusy} onChange={(event) => void updateSetting({ canParticipate: event.currentTarget.checked })} /></label>
      </div>}

      {questions.length === 0 ? <p className="parent-challenge-review-empty">Chưa có câu hỏi nào đang chờ duyệt.</p> : <div className="parent-challenge-review-list">
        {questions.map((question) => {
          const reason = reasons[question.id] ?? '';
          const busy = busyQuestionId === question.id;
          return <article className="parent-challenge-review-card" data-challenge-review-card={question.id} key={question.id}>
            <div className="parent-challenge-review-card-heading"><strong>{question.prompt}</strong><span>Revision {question.revision}</span></div>
            <ol className="parent-challenge-review-options" aria-label={`Bốn phương án của câu hỏi ${question.id}`}>
              {question.options.map((option) => <li key={option.id} className={option.id === question.correctOptionId ? 'is-correct' : ''}>{option.text}{option.id === question.correctOptionId && <strong> · Đáp án chuẩn</strong>}</li>)}
            </ol>
            <p><strong>Lời giải thích:</strong> {question.explanation}</p>
            <div data-challenge-review-source><details><summary>Kiểm tra nguồn kiến thức</summary><p>{question.sourceVersion} · {question.sourceFactId} · {question.lessonTitle}</p></details></div>
            <label htmlFor={`challenge-review-reason-${question.id}`}>Lý do cần sửa (nếu chưa duyệt)</label>
            <textarea id={`challenge-review-reason-${question.id}`} data-challenge-review-reason={question.id} value={reason} disabled={busy} onChange={(event) => setReasons((current) => ({ ...current, [question.id]: event.target.value }))} />
            <div className="parent-challenge-review-actions">
              <button className="primary-small-button" type="button" data-challenge-review-approve={question.id} disabled={busy} onClick={() => setApprovalQuestionId(question.id)}>Duyệt câu hỏi</button>
              <button className="secondary-button" type="button" data-challenge-review-request={question.id} disabled={busy || !reason.trim()} onClick={() => void Promise.resolve(onRequestRevision(question.id, question.revision, reason.trim())).then((accepted) => { if (accepted) setReasons((current) => ({ ...current, [question.id]: '' })); })}>Yêu cầu sửa</button>
              <button className="text-button" type="button" data-challenge-review-withdraw={question.id} disabled={busy} onClick={() => void onWithdraw(question.id)}>Rút câu hỏi</button>
            </div>
          </article>;
        })}
      </div>}

      {approvalQuestion && <div className="challenge-approval-modal-backdrop" data-challenge-approval-modal>
        <section className="challenge-approval-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-approval-title" aria-describedby="challenge-approval-description">
          <p className="eyebrow">XÁC NHẬN PHÊ DUYỆT</p>
          <h3 id="challenge-approval-title">Phụ huynh đã kiểm tra câu đố chưa?</h3>
          <p id="challenge-approval-description">Khi phê duyệt, phụ huynh xác nhận câu hỏi, đáp án, các phương án và lời giải thích phù hợp với mảnh kiến thức con đã chọn. Phụ huynh chịu trách nhiệm về tính chính xác và phù hợp của câu đố trước khi câu đố được đưa đến các bạn trong lớp.</p>
          <blockquote>{approvalQuestion.prompt}</blockquote>
          <div className="challenge-approval-modal-actions">
            <button className="secondary-button" type="button" data-challenge-approval-review disabled={approvalSubmitting} onClick={() => setApprovalQuestionId(null)}>Xem lại</button>
            <button className="primary-small-button" type="button" data-challenge-approval-confirm disabled={approvalSubmitting || busyQuestionId === approvalQuestion.id} onClick={() => void confirmApproval()}>{approvalSubmitting ? 'Đang phê duyệt…' : 'Phê duyệt câu hỏi'}</button>
          </div>
        </section>
      </div>}
    </section>
  );
}
