import type { ChallengeRecognition, ChallengeWeeklyResponse } from '../../shared/challenge-contracts';

export type ChallengeWeeklyMapProps = {
  weekly: ChallengeWeeklyResponse | null;
  loading?: boolean;
  error?: string;
  stale?: boolean;
  onRetry?: () => void | Promise<void>;
};

const recognitionLabels: Record<ChallengeRecognition['type'], { title: string; description: string }> = {
  question_creator: { title: 'Bạn tạo câu hỏi', description: 'Góp một mảnh kiến thức để cả lớp cùng khám phá.' },
  kind_helper: { title: 'Bạn lan tỏa điều hay', description: 'Gửi phản hồi tích cực để khích lệ bạn bè.' },
  steady_learner: { title: 'Bạn giữ nhịp học', description: 'Cùng lớp quay lại học đều đặn trong tuần.' },
  class_builder: { title: 'Bạn xây nhịp chung', description: 'Thêm những lượt trả lời đúng cho hành trình của lớp.' },
};

function parseLocalDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(value);
  return date ? new Intl.DateTimeFormat('vi-VN', options).format(date) : value;
}

function formatWeekRange(start: string, end: string): string {
  return `${formatDate(start, { day: '2-digit', month: '2-digit' })} – ${formatDate(end, { day: '2-digit', month: '2-digit' })}`;
}

function formatDayLabel(value: string): string {
  return formatDate(value, { weekday: 'short' }).replace('.', '');
}

function formatQuestionCount(count: number): string {
  return count === 1 ? '1 câu hỏi' : `${count} câu hỏi`;
}

function retryButton(onRetry: ChallengeWeeklyMapProps['onRetry']) {
  return onRetry ? <button className="secondary-button" type="button" data-challenge-week-retry onClick={() => void onRetry()}>Thử tải lại</button> : null;
}

export function ChallengeWeeklyMap({ weekly, loading = false, error = '', stale = false, onRetry }: ChallengeWeeklyMapProps) {
  if (!weekly) {
    return (
      <section className="challenge-weekly-map challenge-weekly-map-empty" data-challenge-weekly-map aria-live="polite">
        {loading && <p className="challenge-weekly-state">Đang gom lại những bước tiến của cả lớp…</p>}
        {!loading && error && <div className="challenge-dialog-error" role="alert"><p>{error}</p>{retryButton(onRetry)}</div>}
        {!loading && !error && <p className="challenge-weekly-state">Chưa có tổng kết cho tuần này. Mình cùng bắt đầu bằng một câu hỏi nhỏ nhé.</p>}
      </section>
    );
  }

  const progressPercent = Math.min(100, (weekly.classProgress.current / Math.max(weekly.classProgress.target, 1)) * 100);
  const completedCopy = weekly.classProgress.completedDays > 0
    ? `Lớp đã cùng chạm đích ${weekly.classProgress.completedDays} ngày.`
    : 'Mỗi lượt tham gia đều góp thêm một bước cho lớp.';

  return (
    <section className={`challenge-weekly-map${stale ? ' is-stale' : ''}`} data-challenge-weekly-map data-challenge-week-stale={stale ? 'true' : undefined} aria-live="polite">
      <header className="challenge-weekly-heading">
        <div>
          <p className="eyebrow">BẢN ĐỒ CÙNG HỌC</p>
          <h3>Nhịp học của cả lớp</h3>
          <p>{formatWeekRange(weekly.weekStart, weekly.weekEnd)}</p>
        </div>
        {stale && <span className="challenge-weekly-stale-label" data-challenge-week-stale>Đang hiển thị bản lưu gần nhất</span>}
      </header>

      {(stale || error) && <div className="challenge-weekly-sync-note" role={error ? 'alert' : 'status'}><span>{error || 'Tổng kết sẽ được làm mới khi có kết nối.'}</span>{retryButton(onRetry)}</div>}

      <section className="challenge-weekly-progress" aria-labelledby="challenge-weekly-progress-title">
        <div className="challenge-weekly-progress-copy" data-challenge-week-progress>
          <span id="challenge-weekly-progress-title">Đóng góp chung trong tuần</span>
          <strong>{weekly.classProgress.current}/{weekly.classProgress.target || '—'}</strong>
        </div>
        <div className="challenge-weekly-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={Math.max(weekly.classProgress.target, 1)} aria-valuenow={weekly.classProgress.current} aria-label="Đóng góp chung trong tuần">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <p>{completedCopy}</p>
      </section>

      <section className="challenge-weekly-days" aria-labelledby="challenge-weekly-days-title">
        <div className="challenge-weekly-section-heading"><h4 id="challenge-weekly-days-title">Bảy ô bước nhỏ</h4><span>Ai cũng có thể góp một ô</span></div>
        <div className="challenge-weekly-day-grid">
          {weekly.days.map((day) => (
            <article className={`challenge-weekly-day${day.completed ? ' is-completed' : ''}`} data-challenge-week-day={day.date} key={day.date}>
              <span className="challenge-weekly-day-label">{formatDayLabel(day.date)}</span>
              <strong>{day.target > 0 ? `${day.current}/${day.target}` : '—'}</strong>
              <small>{formatQuestionCount(day.questionCount)}</small>
              {day.completed && <span className="challenge-weekly-day-badge">Đã chạm đích</span>}
            </article>
          ))}
        </div>
      </section>

      <div className="challenge-weekly-columns">
        <section className="challenge-weekly-panel" aria-labelledby="challenge-weekly-topics-title">
          <div className="challenge-weekly-section-heading"><h4 id="challenge-weekly-topics-title">Điều lớp đã khám phá</h4><span>{weekly.topics.length} chủ đề</span></div>
          {weekly.topics.length > 0 ? <ul className="challenge-weekly-topic-list">{weekly.topics.map((topic) => <li key={topic.lessonId}><span>{topic.title}</span><strong>{formatQuestionCount(topic.questionCount)}</strong></li>)}</ul> : <p className="challenge-weekly-muted">Tuần này chưa có chủ đề mới.</p>}
        </section>

        <section className="challenge-weekly-panel" aria-labelledby="challenge-weekly-recognitions-title">
          <div className="challenge-weekly-section-heading"><h4 id="challenge-weekly-recognitions-title">Lời ghi nhận</h4><span>Không bỏ sót ai</span></div>
          {weekly.recognitions.length > 0 ? <ul className="challenge-weekly-recognition-list">{weekly.recognitions.map((recognition) => { const copy = recognitionLabels[recognition.type]; return <li key={recognition.type}><span className="challenge-weekly-recognition-icon" aria-hidden="true">✦</span><div><strong>{copy.title}</strong><small>{recognition.recipientIds.length} bạn · {copy.description}</small></div></li>; })}</ul> : <p className="challenge-weekly-muted">Mỗi bạn đều đang góp theo cách riêng của mình.</p>}
        </section>
      </div>

      <section className="challenge-weekly-my-summary" aria-labelledby="challenge-weekly-my-title">
        <div><p className="eyebrow">GÓC NHỎ CỦA CON</p><h4 id="challenge-weekly-my-title">Con đã góp những bước nào?</h4></div>
        <div className="challenge-weekly-my-stats"><span><strong>{weekly.mySummary.questionsCreated}</strong> câu hỏi đã tạo</span><span><strong>{weekly.mySummary.correctAnswers}</strong> lượt trả lời đúng</span><span><strong>{weekly.mySummary.revisits}</strong> lượt ôn lại</span></div>
      </section>
    </section>
  );
}
