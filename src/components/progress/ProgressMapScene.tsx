import type { CSSProperties } from 'react';
import type { ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { getProgressMapTopicMetadata, type ProgressMapTopicMeta } from './progressMapMeta';
import { PROGRESS_MAP_VIEWPORT, projectProgressMapPoint } from './progressMapProjection';
import { ProgressMapNode } from './ProgressMapNode';
import { summarizeProgressMapTopic } from './progressMapSelectors';
import { VietnamMapBase } from './VietnamMapBase';
import type { ProgressClassUnlockSummary } from './ClassUnlockCard';

export type ProgressMapSceneProps = {
  topics: readonly ProgressBoardTopic[];
  nextLessonId: string | null;
  selectedLessonId: string | null;
  selectedTopicName?: string | null;
  reducedMotion: boolean;
  classUnlock?: ProgressClassUnlockSummary | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectTopic?: (topicName: string) => void;
  onOpenLesson: (lessonId: string) => void;
};

type ScenePosition = { left: number; top: number };

const START_GATE_POSITION: ScenePosition = { left: 24, top: 88 };
const ARCHIPELAGO_LABELS: readonly { id: 'hoang-sa' | 'truong-sa'; label: string; point: { latitude: number; longitude: number } }[] = [
  { id: 'hoang-sa', label: 'Hoàng Sa', point: { latitude: 16.35, longitude: 112.4 } },
  { id: 'truong-sa', label: 'Trường Sa', point: { latitude: 9.65, longitude: 113.45 } },
];

function positionForTopic(meta: ProgressMapTopicMeta): ScenePosition {
  return meta.anchor ? projectProgressMapPoint(meta.anchor, PROGRESS_MAP_VIEWPORT) : START_GATE_POSITION;
}

function positionStyle(position: ScenePosition): CSSProperties {
  return { left: `${position.left}%`, top: `${position.top}%` };
}

function topicOrEmpty(topics: readonly ProgressBoardTopic[], topic: string): ProgressBoardTopic {
  return topics.find((candidate) => candidate.topic === topic) ?? { topic, lessons: [] };
}

export function ProgressMapScene({ topics, nextLessonId, selectedLessonId, selectedTopicName, reducedMotion, onSelectLesson, onSelectTopic }: ProgressMapSceneProps) {
  const topicEntries = getProgressMapTopicMetadata().map((meta) => {
    const topic = topicOrEmpty(topics, meta.topic);
    return { meta, topic, snapshot: summarizeProgressMapTopic(topic, nextLessonId), position: positionForTopic(meta) };
  });
  const requestedLessonId = selectedLessonId ?? nextLessonId;
  const selectedTopicIndex = selectedTopicName
    ? topicEntries.findIndex(({ meta }) => meta.topic === selectedTopicName)
    : topicEntries.findIndex(({ topic }) => topic.lessons.some((lesson) => lesson.lessonId === requestedLessonId));
  const fallbackTopicIndex = selectedTopicIndex >= 0 ? selectedTopicIndex : 0;
  const routePoints = topicEntries.map(({ position }) => `${position.left},${position.top}`).join(' ');

  return (
    <section
      className="progress-map-scene"
      data-progress-map
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-label="Bản đồ hành trình Việt Nam"
    >
      <div className="progress-map-canvas" data-progress-map-canvas>
        <VietnamMapBase reducedMotion={reducedMotion} />
        <svg className="progress-map-route" data-progress-map-route viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={routePoints} pathLength="1" />
        </svg>
        <div className="progress-map-archipelago-labels" aria-label="Các quần đảo trên bản đồ">
          {ARCHIPELAGO_LABELS.map(({ id, label, point }) => (
            <span
              className="progress-map-archipelago-label"
              data-progress-map-archipelago={id}
              key={id}
              style={positionStyle(projectProgressMapPoint(point, PROGRESS_MAP_VIEWPORT))}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="progress-map-node-layer">
          {topicEntries.map(({ meta, topic, snapshot, position }, index) => {
            const topicLessonId = snapshot.nextLessonId;
            return (
              <div className="progress-map-node-position" data-progress-map-node-position={meta.topic} key={meta.topic} style={positionStyle(position)}>
                <ProgressMapNode
                  meta={meta}
                  snapshot={snapshot}
                  selected={index === fallbackTopicIndex}
                  reducedMotion={reducedMotion}
                onSelect={() => {
                  onSelectTopic?.(topic.topic);
                  if (topicLessonId) onSelectLesson(topicLessonId);
                }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className="progress-map-scene-hint">Chạm vào một chặng để xem bước tiếp theo nhé!</p>
    </section>
  );
}
