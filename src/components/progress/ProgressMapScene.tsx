import { useEffect, useRef, type CSSProperties } from 'react';
import type { ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { ProgressMapNode } from './ProgressMapNode';
import {
  PROGRESS_MAP_LANDMARK_PRESENTATIONS,
  PROGRESS_MAP_TOPIC_PRESENTATIONS,
  type MapSelection,
} from './progressMapPresentation';
import { summarizeProgressMapTopic } from './progressMapSelectors';
import { VietnamMapBase } from './VietnamMapBase';

export type ProgressMapSceneProps = {
  topics: readonly ProgressBoardTopic[];
  nextLessonId: string | null;
  selection: MapSelection;
  reducedMotion: boolean;
  onSelectTopic: (topicName: string) => void;
  onSelectLandmark: (landmarkId: (typeof PROGRESS_MAP_LANDMARK_PRESENTATIONS)[number]['id']) => void;
};

type ScenePosition = { left: number; top: number };

function positionStyle(position: ScenePosition): CSSProperties {
  return { left: `${position.left}%`, top: `${position.top}%` };
}

function topicOrEmpty(topics: readonly ProgressBoardTopic[], topic: string): ProgressBoardTopic {
  return topics.find((candidate) => candidate.topic === topic) ?? { topic, lessons: [] };
}

export function ProgressMapScene({ topics, nextLessonId, selection, reducedMotion, onSelectTopic, onSelectLandmark }: ProgressMapSceneProps) {
  const landmarkTriggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const previousSelectionRef = useRef<MapSelection>(selection);
  const topicEntries = PROGRESS_MAP_TOPIC_PRESENTATIONS.map((meta) => {
    const topic = topicOrEmpty(topics, meta.topic);
    return { meta, topic, snapshot: summarizeProgressMapTopic(topic, nextLessonId) };
  });

  useEffect(() => {
    const previousSelection = previousSelectionRef.current;
    if (previousSelection.kind === 'landmark' && selection.kind !== 'landmark') {
      landmarkTriggerRefs.current.get(previousSelection.landmarkId)?.focus();
    }
    previousSelectionRef.current = selection;
  }, [selection]);

  return (
    <section
      className="progress-map-scene"
      data-progress-map
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-label="Bản đồ hành trình Việt Nam"
    >
      <div className="progress-map-canvas" data-progress-map-canvas>
        <VietnamMapBase reducedMotion={reducedMotion} />
        <p className="visually-hidden" data-progress-map-archipelago-summary>
          Bản đồ thể hiện Việt Nam cùng hai quần đảo Hoàng Sa và Trường Sa ở vị trí riêng biệt trên biển.
        </p>
        <div className="progress-map-landmark-layer" data-progress-map-landmarks>
          {PROGRESS_MAP_LANDMARK_PRESENTATIONS.map((landmark) => (
            <button
              className="progress-map-landmark-hit-area"
              data-progress-map-landmark={landmark.id}
              key={landmark.id}
              type="button"
              aria-label={'Mở thông tin ' + landmark.name}
              aria-pressed={selection.kind === 'landmark' && selection.landmarkId === landmark.id}
              style={positionStyle(landmark.position)}
              ref={(element) => {
                if (element) landmarkTriggerRefs.current.set(landmark.id, element);
                else landmarkTriggerRefs.current.delete(landmark.id);
              }}
              onClick={() => onSelectLandmark(landmark.id)}
            >
              <span className="progress-map-landmark-spark" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="progress-map-node-layer" data-progress-map-topic-markers>
          {topicEntries.filter(({ meta }) => meta.renderMarker).map(({ meta, topic, snapshot }) => (
            <div className="progress-map-node-position" data-progress-map-node-position={meta.topic} key={meta.topic} style={positionStyle(meta.position)}>
              <ProgressMapNode
                meta={meta}
                snapshot={snapshot}
                selected={selection.kind === 'topic' && selection.topicName === topic.topic}
                reducedMotion={reducedMotion}
                onSelect={() => onSelectTopic(topic.topic)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
