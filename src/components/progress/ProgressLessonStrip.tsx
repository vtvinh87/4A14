import type { ProgressBoardLesson } from '../../../shared/progress-board-contracts';
import { PROGRESS_STATE_LABELS } from './ProgressLessonCard';

export type ProgressLessonStripProps = {
  lessons: readonly ProgressBoardLesson[];
  selectedLessonId: string | null;
  reducedMotion: boolean;
  onSelectLesson: (lessonId: string) => void;
};

export function ProgressLessonStrip({ lessons, selectedLessonId, reducedMotion, onSelectLesson }: ProgressLessonStripProps) {
  return (
    <div className="progress-lesson-strip" data-progress-lesson-strip data-reduced-motion={reducedMotion ? 'true' : 'false'} aria-label="Các chặng trong vùng này">
      {lessons.map((lesson, index) => (
        <button
          className={'progress-strip-lesson progress-strip-lesson-' + lesson.state + (selectedLessonId === lesson.lessonId ? ' is-selected' : '')}
          data-progress-strip-lesson={lesson.lessonId}
          data-progress-state={lesson.state}
          data-reduced-motion={reducedMotion ? 'true' : 'false'}
          key={lesson.lessonId}
          type="button"
          aria-pressed={selectedLessonId === lesson.lessonId}
          aria-label={'Chặng ' + (index + 1) + ': ' + lesson.title + ', ' + PROGRESS_STATE_LABELS[lesson.state]}
          onClick={() => onSelectLesson(lesson.lessonId)}
        >
          <span className="progress-strip-lesson-mark" aria-hidden="true">{lesson.state === 'independent' ? '✓' : index + 1}</span>
          <span className="progress-strip-lesson-title">{lesson.title}</span>
          <span className="progress-strip-lesson-state">{PROGRESS_STATE_LABELS[lesson.state]}</span>
        </button>
      ))}
    </div>
  );
}
