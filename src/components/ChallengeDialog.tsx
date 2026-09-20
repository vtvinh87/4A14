import { useEffect, useRef, useState } from 'react';
import type { ChallengeAnswerResult, ChallengeQuestionMine, ChallengeReactionType, ChallengeWeeklyResponse } from '../../shared/challenge-contracts';
import type { ChallengeSourceFact } from '../../shared/challenge-source';
import { getMyChallengeQuestions, getWeeklyChallenge } from '../auth/apiClient';
import { useChallenge } from '../challenge/useChallenge';
import { ChallengeComposer } from './ChallengeComposer';
import { ChallengeQuestionCard } from './ChallengeQuestionCard';
import { ChallengeReactionBar } from './ChallengeReactionBar';
import { ChallengeReportDialog } from './ChallengeReportDialog';
import { ChallengeWeeklyMap } from './ChallengeWeeklyMap';
import { useChallengeSocial } from '../challenge/useChallengeSocial';
import { getFocusableElements, getNextFocusIndex } from './SettingsDialog';

type ChallengeTab = 'today' | 'mine' | 'week';

export type ChallengeDialogProps = {
  sourceFacts: readonly ChallengeSourceFact[];
  studentId?: string;
  canCreate?: boolean;
  canParticipate?: boolean;
  onChallengeSubmitted?: (question: ChallengeQuestionMine) => void;
  onChallengeAttemptResult?: (itemId: string, result: ChallengeAnswerResult) => void;
  onReactionConfirmed?: (itemId: string, reactionType: ChallengeReactionType) => void;
  onClose: () => void;
};

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
}

function statusLabel(status: ChallengeQuestionMine['status']): string {
  const labels: Record<ChallengeQuestionMine['status'], string> = {
    draft: 'Bản nháp',
    pending_parent_review: 'Chờ phụ huynh duyệt',
    approved: 'Đã được duyệt',
    featured: 'Đang góp sức cho lớp',
    closed: 'Đã khép lại',
    withdrawn: 'Đã rút lại',
    voided: 'Đang được kiểm tra',
    archived: 'Đã lưu trữ',
  };
  return labels[status];
}

export function ChallengeDialog({ sourceFacts, studentId, canCreate = true, canParticipate = true, onChallengeSubmitted, onChallengeAttemptResult, onReactionConfirmed, onClose }: ChallengeDialogProps) {
  const [tab, setTab] = useState<ChallengeTab>('today');
  const [mine, setMine] = useState<ChallengeQuestionMine[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState('');
  const [weekly, setWeekly] = useState<ChallengeWeeklyResponse | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState('');
  const [weeklyStale, setWeeklyStale] = useState(false);
  const [reportItemId, setReportItemId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const loadGeneration = useRef(0);
  const weeklyGeneration = useRef(0);
  const reportDialogOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  reportDialogOpenRef.current = Boolean(reportItemId);
  const daily = useChallenge(tab === 'today' && canParticipate);
  const social = useChallengeSocial(canParticipate);
  const isOnline = daily.isOnline !== false;

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (reportDialogOpenRef.current) return;
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
      const firstIndex = 0;
      const lastIndex = focusable.length - 1;
      if (event.shiftKey && (currentIndex <= firstIndex || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(firstIndex, focusable.length, true)]?.focus();
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

  useEffect(() => {
    if (tab !== 'mine') return undefined;
    const generation = ++loadGeneration.current;
    setMineLoading(true);
    setMineError('');
    void getMyChallengeQuestions().then((result) => {
      if (generation !== loadGeneration.current) return;
      if (!result.ok) {
        setMineError(result.message);
        setMineLoading(false);
        return;
      }
      setMine(result.questions);
      setMineLoading(false);
    });
    return () => {
      loadGeneration.current += 1;
    };
  }, [tab]);

  const refreshMine = async () => {
    const generation = ++loadGeneration.current;
    setMineLoading(true);
    setMineError('');
    const result = await getMyChallengeQuestions();
    if (generation !== loadGeneration.current) return;
    if (!result.ok) {
      setMineError(result.message);
      setMineLoading(false);
      return;
    }
    setMine(result.questions);
    setMineLoading(false);
  };

  const refreshWeekly = async () => {
    if (!canParticipate) return;
    const generation = ++weeklyGeneration.current;
    setWeeklyLoading(true);
    setWeeklyError('');
    if (!isOnline) {
      setWeeklyError('Con đang ở chế độ ngoại tuyến. Hãy kết nối mạng rồi thử lại nhé.');
      setWeeklyStale(Boolean(weekly));
      setWeeklyLoading(false);
      return;
    }
    const result = await getWeeklyChallenge();
    if (generation !== weeklyGeneration.current) return;
    if (!result.ok) {
      setWeeklyError(result.message);
      setWeeklyStale(Boolean(weekly));
      setWeeklyLoading(false);
      return;
    }
    const { ok: _ok, ...payload } = result;
    setWeekly(payload);
    setWeeklyStale(false);
    setWeeklyLoading(false);
  };

  useEffect(() => {
    if (tab !== 'week' || !canParticipate) return undefined;
    void refreshWeekly();
    return () => {
      weeklyGeneration.current += 1;
    };
  }, [tab, canParticipate, isOnline]);

  useEffect(() => {
    if (tab !== 'today') setReportItemId(null);
  }, [tab]);

  const today = daily.today;
  const progress = today?.classProgress;
  const remaining = progress ? Math.max(progress.target - progress.current, 0) : null;

  return (
    <div className="dialog-backdrop challenge-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="challenge-dialog"
        data-challenge-dialog
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="challenge-dialog-title"
        aria-describedby="challenge-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="challenge-dialog-heading">
          <div className="challenge-dialog-art" aria-hidden="true"><img src="/art/hud/challenge.png" alt="" /></div>
          <div className="challenge-dialog-title-copy">
            <p className="eyebrow">THÁCH ĐỐ</p>
            <h2 id="challenge-dialog-title">Thách đố tiếp sức</h2>
          </div>
          <button ref={closeRef} className="dialog-close challenge-dialog-close" type="button" onClick={onClose} aria-label="Đóng Thách đố">×</button>
        </header>

        <p id="challenge-dialog-description" className="challenge-dialog-intro">Mỗi câu đúng giúp cả lớp tiến thêm một bước. Mình cùng tạo, trả lời và học thêm điều mới nhé!</p>

        <section className="challenge-dialog-meter" aria-label="Tiến độ chung hôm nay">
          <div>
            <span className="challenge-dialog-meter-label">Cả lớp hôm nay</span>
            <strong>{progress ? `${progress.current}/${progress.target}` : '—/—'}</strong>
          </div>
          <div className="challenge-dialog-meter-track" aria-hidden="true"><span style={{ width: progress ? `${Math.min(100, (progress.current / Math.max(progress.target, 1)) * 100)}%` : '0%' }} /></div>
          <p>{progress?.completed ? 'Đích chung đã hoàn thành!' : remaining === null ? 'Đang tải tiến độ chung…' : `Còn ${remaining} câu đúng để chạm đích chung.`}</p>
        </section>

        <nav className="challenge-dialog-tabs" aria-label="Các khu vực Thách đố">
          <button type="button" data-challenge-tab="today" className={tab === 'today' ? 'is-active' : ''} aria-selected={tab === 'today'} role="tab" onClick={() => setTab('today')}>Hôm nay</button>
          <button type="button" data-challenge-tab="mine" className={tab === 'mine' ? 'is-active' : ''} aria-selected={tab === 'mine'} role="tab" onClick={() => setTab('mine')}>Câu hỏi của con</button>
          <button type="button" data-challenge-tab="week" className={tab === 'week' ? 'is-active' : ''} aria-selected={tab === 'week'} role="tab" onClick={() => setTab('week')}>Tuần này</button>
        </nav>

        <div className="challenge-dialog-content">
          {tab === 'today' && (
            <section aria-labelledby="challenge-today-title">
              <div className="challenge-dialog-section-heading">
                <div><p className="eyebrow">VÒNG HÔM NAY</p><h3 id="challenge-today-title">Mỗi câu hỏi là một bước tiến</h3></div>
                {today && <span className="challenge-round-date">{formatDate(today.roundDate)}</span>}
              </div>
              {!canParticipate && <p className="challenge-dialog-state">Phần Thách đố đang tạm dừng theo cài đặt của người lớn. Con vẫn có thể tiếp tục học trong các bài học khác nhé.</p>}
              {canParticipate && !isOnline && <p className="challenge-dialog-state" data-challenge-offline>Con đang ở chế độ ngoại tuyến. Mình vẫn có thể đọc câu hỏi; hãy kết nối mạng rồi thử lại các lượt tương tác nhé.</p>}
              {canParticipate && daily.loading && !today && <p className="challenge-dialog-state">Đang mở vòng Thách đố cho lớp…</p>}
              {daily.lastError && <div className="challenge-dialog-error" role="alert"><p>{daily.lastError}</p><button className="secondary-button" type="button" onClick={() => void daily.refresh()}>Thử lại</button></div>}
              {canParticipate && !daily.loading && !daily.lastError && today && today.questions.length === 0 && <p className="challenge-dialog-state">Hôm nay chưa có câu hỏi phù hợp. Con có thể tạo một câu đố từ mảnh kiến thức đã được kiểm duyệt.</p>}
              <div className="challenge-question-list">
                {canParticipate && today?.questions.map((question) => {
                  const isOwnQuestion = question.author.id === studentId;
                  const isReported = social.reportedItemIds.includes(question.roundItemId);
                  return <div className="challenge-question-entry" key={question.roundItemId}>
                    <ChallengeQuestionCard
                      question={question}
                      answer={daily.lastResult?.questionId === question.id ? daily.lastResult : null}
                      isSubmitting={daily.isSubmitting}
                      readOnly={isOwnQuestion}
                      offline={!isOnline}
                        onSubmit={async (input) => {
                          const result = await daily.submit(question.roundItemId, input);
                          if (result) onChallengeAttemptResult?.(question.roundItemId, result);
                          return result;
                        }}
                    />
                    {!isOwnQuestion && <>
                      <ChallengeReactionBar
                        itemId={question.roundItemId}
                        selected={social.reactions[question.roundItemId] ?? []}
                        pendingKey={social.pendingReactionKey}
                        disabled={isReported || !isOnline}
                        onReact={(reactionType) => {
                          void social.addReaction(question.roundItemId, reactionType).then((confirmed) => {
                            if (confirmed) onReactionConfirmed?.(question.roundItemId, reactionType);
                          });
                        }}
                      />
                      <div className="challenge-question-report-action">
                        {isReported ? <span className="challenge-question-reported" data-challenge-reported="true">Đã báo cho người lớn kiểm tra</span> : <button className="challenge-question-report-button" type="button" data-challenge-open-report={question.roundItemId} disabled={!isOnline} onClick={() => setReportItemId(question.roundItemId)}>Báo cho người lớn kiểm tra</button>}
                      </div>
                    </>}
                  </div>;
                })}
              </div>
              {reportItemId && <ChallengeReportDialog onClose={() => setReportItemId(null)} error={social.lastError} onSubmit={(input) => social.report(reportItemId, input)} />}
            </section>
          )}

          {tab === 'mine' && (
            <section aria-labelledby="challenge-mine-title">
              <div className="challenge-dialog-section-heading">
                <div><p className="eyebrow">GÓP SỨC CHO LỚP</p><h3 id="challenge-mine-title">Câu hỏi của con</h3></div>
                <button className="primary-small-button" type="button" data-challenge-open-composer onClick={() => document.getElementById('challenge-prompt')?.focus()}>Tạo câu hỏi</button>
              </div>
              <p className="challenge-dialog-section-copy">Mỗi ngày con có tối đa 3 lượt tạo câu hỏi. Phụ huynh sẽ xem trước để câu đố luôn vui, rõ và đúng kiến thức.</p>
              {mineLoading && <p className="challenge-dialog-state">Đang tải những câu hỏi con đã tạo…</p>}
              {mineError && <div className="challenge-dialog-error" role="alert"><p>{mineError}</p><button className="secondary-button" type="button" onClick={() => void refreshMine()}>Thử lại</button></div>}
              {!mineLoading && !mineError && mine.length > 0 && <ul className="challenge-mine-list">{mine.map((question) => <li key={question.id}><div><strong>{question.prompt}</strong><span>{question.lessonTitle}</span></div><span className={`challenge-mine-status is-${question.status}`}>{statusLabel(question.status)}</span></li>)}</ul>}
              {!mineLoading && !mineError && mine.length === 0 && <p className="challenge-dialog-state">Chưa có câu hỏi nào. Hãy chọn một mảnh kiến thức và rủ cả lớp cùng khám phá nhé.</p>}
              <ChallengeComposer
                sourceFacts={sourceFacts}
                quotaUsedOnCreatedDate={today?.myContribution.questionsCreated ?? 0}
                canCreate={canCreate}
                onSaved={async (question: ChallengeQuestionMine) => { await refreshMine(); await daily.refresh(); onChallengeSubmitted?.(question); }}
              />
            </section>
          )}

          {tab === 'week' && (
            canParticipate ? <ChallengeWeeklyMap weekly={weekly} loading={weeklyLoading} error={weeklyError} stale={weeklyStale} onRetry={refreshWeekly} />
              : <section className="challenge-week-boundary" data-challenge-week-boundary aria-labelledby="challenge-week-title"><p className="eyebrow">NHỊP HỌC CỦA CẢ LỚP</p><h3 id="challenge-week-title">Phần tổng kết đang tạm dừng</h3><p>Người lớn đã tạm dừng Thách đố cho lớp. Mình vẫn có thể cùng nhau học qua các bài học khác nhé.</p></section>
          )}
        </div>
      </section>
    </div>
  );
}
