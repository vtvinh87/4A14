import type { ProgressBoardLesson, ProgressBoardNextAction, ProgressState } from '../../../shared/progress-board-contracts';

export type ProgressLessonCardProps = {
  lesson: ProgressBoardLesson;
  selected: boolean;
  onSelect: (lessonId: string) => void;
  reducedMotion: boolean;
};

export const PROGRESS_STATE_LABELS: Record<ProgressState, string> = {
  not_started: 'Chưa khám phá',
  explored: 'Đã khám phá',
  practicing: 'Đang luyện tập',
  independent: 'Tự làm được',
};

export const PROGRESS_ACTION_LABELS: Record<ProgressBoardNextAction, string> = {
  explore: 'Khám phá',
  practice: 'Luyện tập',
  review: 'Xem lại',
  celebrate: 'Ăn mừng chặng này',
};

export function ProgressLessonCard({ lesson, selected, onSelect, reducedMotion }: ProgressLessonCardProps) {
  const stateLabel = PROGRESS_STATE_LABELS[lesson.state];
  return (
    <button
      className={'progress-lesson-card progress-lesson-card-' + lesson.state + (selected ? ' is-selected' : '')}
      data-progress-lesson={lesson.lessonId}
      data-progress-state={lesson.state}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      type="button"
      aria-pressed={selected}
      aria-label={lesson.title + ': ' + stateLabel}
      onClick={() => onSelect(lesson.lessonId)}
    >
      <span className="progress-lesson-card-kicker">{lesson.topic}</span>
      <strong>{lesson.title}</strong>
      <span className="progress-lesson-card-missions">{lesson.completedMissionCount}/{lesson.missionCount} nhiệm vụ đã hoàn thành</span>
      <span className="progress-lesson-card-footer">
        <span className="progress-state-chip" data-progress-state-label>{stateLabel}</span>
        <span className="progress-lesson-card-action">{PROGRESS_ACTION_LABELS[lesson.nextAction]}</span>
      </span>
    </button>
  );
}
