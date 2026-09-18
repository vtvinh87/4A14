import type { ProgressBoardLesson, ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { ClassUnlockCard, type ProgressClassUnlockSummary } from './ClassUnlockCard';
import { PROGRESS_ACTION_LABELS, PROGRESS_STATE_LABELS } from './ProgressLessonCard';
import { ProgressLessonDetail } from './ProgressLessonDetail';
import { ProgressLessonStrip } from './ProgressLessonStrip';
import type { ProgressMapTopicSnapshot } from './progressMapSelectors';
import { getProgressMapAsset } from './progressMapPresentation';

export type ProgressMapDrawerProps = {
  topic: ProgressBoardTopic;
  topicSnapshot: ProgressMapTopicSnapshot;
  selectedLesson: ProgressBoardLesson | null;
  expanded: boolean;
  detailsOpen: boolean;
  reducedMotion: boolean;
  classUnlock?: ProgressClassUnlockSummary | null;
  onToggleExpanded: () => void;
  onToggleDetails: () => void;
  onSelectLesson: (lessonId: string) => void;
  onOpenLesson: (lessonId: string) => void;
};

function getActionLesson(topic: ProgressBoardTopic, snapshot: ProgressMapTopicSnapshot, selectedLesson: ProgressBoardLesson | null): ProgressBoardLesson | null {
  return selectedLesson
    ?? topic.lessons.find((lesson) => lesson.lessonId === snapshot.nextLessonId)
    ?? null;
}

function getStatusCopy(snapshot: ProgressMapTopicSnapshot): string {
  if (snapshot.lessonCount === 0) return 'Vùng này chưa có bài để mở.';
  if (snapshot.exploredLessonCount === snapshot.lessonCount) return 'Mình đã ghé qua tất cả chặng ở đây.';
  return snapshot.exploredLessonCount + '/' + snapshot.lessonCount + ' chặng đã ghé qua';
}

export function ProgressMapDrawer({ topic, topicSnapshot, selectedLesson, expanded, detailsOpen, reducedMotion, classUnlock, onToggleExpanded, onToggleDetails, onSelectLesson, onOpenLesson }: ProgressMapDrawerProps) {
  const actionLesson = getActionLesson(topic, topicSnapshot, selectedLesson);
  const actionLabel = actionLesson
    ? PROGRESS_ACTION_LABELS[actionLesson.nextAction]
    : topicSnapshot.state === 'independent' ? 'Đã hoàn thành' : 'Chưa có bài';
  const stateLabel = PROGRESS_STATE_LABELS[topicSnapshot.state];
  const bookAsset = getProgressMapAsset('book-progress');

  return (
    <aside className={'progress-map-drawer' + (expanded ? ' is-expanded' : '')} data-progress-map-drawer data-reduced-motion={reducedMotion ? 'true' : 'false'} aria-label={'Thông tin chặng ' + topic.topic}>
      <div className="progress-map-drawer-main">
        <span className="progress-map-drawer-emblem" aria-hidden="true">
          <img src={bookAsset.src} width={bookAsset.width} height={bookAsset.height} alt="" />
        </span>
        <div className="progress-map-drawer-copy">
          <p className="progress-map-drawer-kicker">{stateLabel}</p>
          <h2>{topic.topic}</h2>
          <p>{getStatusCopy(topicSnapshot)}</p>
        </div>
        <div className="progress-map-drawer-actions">
          <button
            className="progress-map-drawer-cta primary-small-button"
            data-progress-map-drawer-cta
            type="button"
            disabled={!actionLesson}
            onClick={() => {
              if (actionLesson) onOpenLesson(actionLesson.lessonId);
            }}
          >
            {actionLabel}
          </button>
          <button className="progress-map-drawer-expand text-button" data-progress-map-drawer-expand type="button" aria-expanded={expanded} onClick={onToggleExpanded}>
            {expanded ? 'Thu gọn' : 'Xem các chặng'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="progress-map-drawer-expanded" data-progress-map-drawer-expanded>
          <ProgressLessonStrip lessons={topic.lessons} selectedLessonId={selectedLesson?.lessonId ?? null} reducedMotion={reducedMotion} onSelectLesson={onSelectLesson} />
          {selectedLesson && (
            <button className="progress-map-drawer-details text-button" data-progress-map-drawer-details type="button" aria-expanded={detailsOpen} onClick={onToggleDetails}>
              {detailsOpen ? 'Ẩn chi tiết chặng' : 'Xem chi tiết chặng'}
            </button>
          )}
          {classUnlock && <ClassUnlockCard summary={classUnlock} />}
        </div>
      )}

      {expanded && detailsOpen && selectedLesson && (
        <div className="progress-map-drawer-detail" data-progress-map-drawer-detail>
          <button className="progress-map-drawer-back text-button" data-progress-map-drawer-back type="button" onClick={onToggleDetails}>← Bản đồ</button>
          <ProgressLessonDetail lesson={selectedLesson} onAction={(lesson) => onOpenLesson(lesson.lessonId)} />
        </div>
      )}
    </aside>
  );
}
