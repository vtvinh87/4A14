import type { ProgressMapTopicMeta } from './progressMapMeta';
import type { ProgressMapTopicSnapshot } from './progressMapSelectors';
import { PROGRESS_STATE_LABELS } from './ProgressLessonCard';

export type ProgressMapNodeProps = {
  meta: ProgressMapTopicMeta;
  snapshot: ProgressMapTopicSnapshot;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
};

const STATE_SYMBOLS: Record<ProgressMapTopicSnapshot['state'], string> = {
  not_started: '☆',
  explored: '✦',
  practicing: '◈',
  independent: '✓',
};

export function ProgressMapNode({ meta, snapshot, selected, reducedMotion, onSelect }: ProgressMapNodeProps) {
  const stateLabel = PROGRESS_STATE_LABELS[snapshot.state];
  return (
    <button
      className={'progress-map-node progress-map-node-' + meta.markerTone + ' progress-map-node-' + snapshot.state + (selected ? ' is-selected' : '')}
      data-progress-map-node={meta.topic}
      data-progress-state={snapshot.state}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      type="button"
      aria-pressed={selected}
      aria-label={meta.topic + ': ' + stateLabel}
      onClick={onSelect}
    >
      <span className="progress-map-node-emblem" aria-hidden="true">{STATE_SYMBOLS[snapshot.state]}</span>
      <span className="progress-map-node-label">{meta.shortLabel}</span>
      <span className="progress-map-node-state">{stateLabel}</span>
    </button>
  );
}
