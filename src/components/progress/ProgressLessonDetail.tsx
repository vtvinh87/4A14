import type { ProgressBoardLesson, ProgressBoardObjective } from '../../../shared/progress-board-contracts';
import { PROGRESS_ACTION_LABELS, PROGRESS_STATE_LABELS } from './ProgressLessonCard';

export type ProgressLessonDetailProps = {
  lesson: ProgressBoardLesson;
  onAction: (lesson: ProgressBoardLesson, objective?: ProgressBoardObjective) => void;
};

function objectiveCountCopy(objective: ProgressBoardObjective): string {
  return objective.practicedActivityCount + ' hoạt động đã luyện · ' + objective.independentActivityCount + ' hoạt động tự làm được';
}

export function ProgressLessonDetail({ lesson, onAction }: ProgressLessonDetailProps) {
  return (
    <section className="progress-lesson-detail" data-progress-lesson-detail aria-labelledby={'progress-lesson-detail-' + lesson.lessonId}>
      <div className="progress-lesson-detail-heading">
        <div>
          <p className="eyebrow">{lesson.topic}</p>
          <h2 id={'progress-lesson-detail-' + lesson.lessonId}>{lesson.title}</h2>
        </div>
        <span className="progress-state-chip" data-progress-detail-state>{PROGRESS_STATE_LABELS[lesson.state]}</span>
      </div>
      <p className="progress-lesson-detail-summary">
        {lesson.completed
          ? 'Mình đã hoàn thành ' + lesson.completedMissionCount + '/' + lesson.missionCount + ' nhiệm vụ của chặng này.'
          : 'Mình đã hoàn thành ' + lesson.completedMissionCount + '/' + lesson.missionCount + ' nhiệm vụ. Cứ đi từng bước là được!'}
      </p>
      <div className="progress-objective-list">
        {lesson.objectives.map((objective) => (
          <article className={'progress-objective progress-objective-' + objective.state} data-progress-objective={objective.objectiveId} key={objective.objectiveId}>
            <div className="progress-objective-copy">
              <p className="progress-objective-state">{PROGRESS_STATE_LABELS[objective.state]}</p>
              <h3>{objective.label}</h3>
              <p>{objective.state === 'independent' ? 'Tuyệt vời, mình đã tự làm được bước này!' : 'Mình đang luyện thêm bước này.'}</p>
              <small>{objectiveCountCopy(objective)}</small>
            </div>
            <button className="secondary-button" data-progress-objective-action={objective.objectiveId} type="button" onClick={() => onAction(lesson, objective)}>
              {PROGRESS_ACTION_LABELS[objective.nextAction]}
            </button>
          </article>
        ))}
      </div>
      {lesson.objectives.length === 0 && (
        <button className="primary-small-button" data-progress-lesson-action type="button" onClick={() => onAction(lesson)}>
          {PROGRESS_ACTION_LABELS[lesson.nextAction]}
        </button>
      )}
    </section>
  );
}
