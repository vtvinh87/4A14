import type { ProgressBoardLesson, ProgressBoardSummary } from '../../../shared/progress-board-contracts';

export type ProgressSummaryCardProps = {
  summary: ProgressBoardSummary;
  nextLesson: ProgressBoardLesson | null;
  onOpenNext: (lessonId: string) => void;
};

export function ProgressSummaryCard({ summary, nextLesson, onOpenNext }: ProgressSummaryCardProps) {
  return (
    <article className="progress-summary-card" data-progress-summary>
      <div className="progress-summary-heading">
        <div>
          <p className="eyebrow">HÀNH TRÌNH CỦA MÌNH</p>
          <h2>Mỗi bước nhỏ đều đáng tự hào</h2>
        </div>
        <span className="progress-summary-spark" aria-hidden="true">✦</span>
      </div>
      <p className="progress-summary-copy">Mình cùng nhìn lại những điều đã khám phá và chọn bước tiếp theo thật vừa sức.</p>
      <div className="progress-summary-stats" aria-label="Tóm tắt tiến trình cá nhân">
        <div><strong>{summary.exploredLessonCount}</strong><span>chặng đã khám phá</span></div>
        <div><strong>{summary.completedLessonCount}</strong><span>chặng đã hoàn thành</span></div>
        <div><strong>{summary.independentObjectiveCount}</strong><span>mục tiêu tự làm được</span></div>
      </div>
      {nextLesson ? (
        <button className="primary-small-button progress-summary-next" data-progress-summary-next type="button" onClick={() => onOpenNext(nextLesson.lessonId)}>
          Tiếp tục {nextLesson.title}
        </button>
      ) : (
        <p className="progress-summary-complete" role="status">Mình đã đi qua tất cả chặng đang mở. Hãy cùng ăn mừng hành trình này!</p>
      )}
    </article>
  );
}
