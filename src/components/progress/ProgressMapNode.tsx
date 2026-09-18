import type { ProgressMapTopicPresentation } from './progressMapPresentation';
import type { ProgressMapTopicSnapshot } from './progressMapSelectors';
import { PROGRESS_STATE_LABELS } from './ProgressLessonCard';

export type ProgressMapNodeProps = {
  meta: ProgressMapTopicPresentation;
  snapshot: ProgressMapTopicSnapshot;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
};

export function ProgressMapNode({ meta, snapshot, selected, reducedMotion, onSelect }: ProgressMapNodeProps) {
  const stateLabel = PROGRESS_STATE_LABELS[snapshot.state];
  const lessonCountLabel = snapshot.lessonCount === 1 ? '1 bài' : `${snapshot.lessonCount} bài`;

  return (
    <button
      className={'progress-map-node progress-map-node-' + meta.markerTone + ' progress-map-node-' + snapshot.state + (selected ? ' is-selected' : '')}
      data-progress-map-node={meta.topic}
      data-progress-state={snapshot.state}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      type="button"
      aria-pressed={selected}
      aria-label={`${meta.topic}: ${stateLabel}. ${lessonCountLabel}.`}
      onClick={onSelect}
    >
      <span className="progress-map-node-dot" aria-hidden="true">
        <span className="progress-map-node-status" data-progress-map-status={snapshot.state} />
      </span>
      <span className="visually-hidden">{meta.shortLabel}</span>
    </button>
  );
}
