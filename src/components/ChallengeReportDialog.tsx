import { useEffect, useRef, useState } from 'react';
import type { ChallengeReportReason } from '../../shared/challenge-contracts';
import type { ChallengeReportDraft } from '../challenge/useChallengeSocial';
import { getFocusableElements, getNextFocusIndex } from './SettingsDialog';

export type ChallengeReportDialogProps = {
  onClose: () => void;
  onSubmit: (input: ChallengeReportDraft) => boolean | Promise<boolean>;
  error?: string;
};

const reasons: readonly { value: ChallengeReportReason; label: string }[] = [
  { value: 'answer_or_source', label: 'Đáp án hoặc nguồn học chưa đúng' },
  { value: 'unclear', label: 'Câu hỏi hoặc lời giải thích chưa rõ' },
  { value: 'inappropriate', label: 'Nội dung chưa phù hợp' },
];

export function ChallengeReportDialog({ onClose, onSubmit, error: externalError = '' }: ChallengeReportDialogProps) {
  const [reason, setReason] = useState<ChallengeReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const lastIndex = focusable.length - 1;
      if (event.shiftKey && (currentIndex <= 0 || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(0, focusable.length, true)]?.focus();
      } else if (!event.shiftKey && (currentIndex === lastIndex || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(lastIndex, focusable.length, false)]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, []);

  const submit = async () => {
    if (!reason) {
      setLocalError('Hãy chọn một lý do để người lớn biết cách kiểm tra nhé.');
      return;
    }
    setLocalError('');
    setIsSubmitting(true);
    const success = await Promise.resolve(onSubmit({ reason, ...(details.trim() ? { details: details.trim() } : {}) }));
    if (success) {
      setIsSubmitting(false);
      onClose();
      return;
    }
    setIsSubmitting(false);
    setLocalError(externalError || 'Chưa gửi được báo cáo. Nội dung của con vẫn được giữ lại để thử lại.');
  };

  const displayError = localError || externalError;

  return (
    <div className="dialog-backdrop challenge-report-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="challenge-report-dialog" data-challenge-report-dialog role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="challenge-report-title" aria-describedby="challenge-report-description" onMouseDown={(event) => event.stopPropagation()}>
        <header className="challenge-report-heading">
          <div><p className="eyebrow">NHỜ NGƯỜI LỚN KIỂM TRA</p><h2 id="challenge-report-title">Có điều gì chưa ổn?</h2></div>
          <button ref={closeRef} className="dialog-close" type="button" aria-label="Đóng báo cáo" onClick={onClose}>×</button>
        </header>
        <p id="challenge-report-description" className="challenge-report-intro">Báo cáo không phải là chê bạn. Đây là cách để người lớn cùng kiểm tra câu hỏi và giữ góc học tập luôn vui, rõ ràng.</p>
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset className="challenge-report-reasons">
            <legend>Con muốn báo cho người lớn biết điều gì?</legend>
            {reasons.map((item) => <label key={item.value}><input type="radio" name="challenge-report-reason" value={item.value} data-challenge-report-reason={item.value} checked={reason === item.value} onChange={() => { setReason(item.value); setLocalError(''); }} /> <span>{item.label}</span></label>)}
          </fieldset>
          <label className="challenge-report-details-label" htmlFor="challenge-report-details">Mô tả thêm <span>(không bắt buộc)</span></label>
          <textarea id="challenge-report-details" data-challenge-report-details maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Ví dụ: Con chưa hiểu vì sao đáp án này đúng…" />
          <div className="challenge-report-meta"><span>Tối đa 500 ký tự</span><span>{details.length}/500</span></div>
          {displayError && <p className="challenge-report-error" data-challenge-report-error role="alert">{displayError}</p>}
          <div className="challenge-report-actions"><button className="secondary-button" type="button" onClick={onClose}>Để sau</button><button className="primary-small-button" type="submit" data-challenge-report-submit disabled={isSubmitting}>{isSubmitting ? 'Đang gửi…' : 'Gửi cho người lớn'}</button></div>
        </form>
      </section>
    </div>
  );
}
