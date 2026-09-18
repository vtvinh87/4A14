import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { getProgressMapTopicMetadata, type ProgressMapTopicMeta } from './progressMapMeta';
import { PROGRESS_MAP_VIEWPORT, projectProgressMapPoint } from './progressMapProjection';
import { ProgressMapNode } from './ProgressMapNode';
import { summarizeProgressMapTopic } from './progressMapSelectors';
import { VietnamMapBase } from './VietnamMapBase';
import type { ProgressClassUnlockSummary } from './ClassUnlockCard';
import { ProgressMapLandmarkCard } from './ProgressMapLandmarkCard';
import { getProgressMapLandmark, PROGRESS_MAP_LANDMARKS, type ProgressMapLandmarkId } from './progressMapLandmarks';

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
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<ProgressMapLandmarkId | null>(null);
  const landmarkTriggerRefs = useRef(new Map<ProgressMapLandmarkId, HTMLButtonElement>());
  const previousLandmarkIdRef = useRef<ProgressMapLandmarkId | null>(null);
  const topicEntries = getProgressMapTopicMetadata().map((meta) => {
    const topic = topicOrEmpty(topics, meta.topic);
    return { meta, topic, snapshot: summarizeProgressMapTopic(topic, nextLessonId), position: positionForTopic(meta) };
  });
  const requestedLessonId = selectedLessonId ?? nextLessonId;
  const selectedTopicIndex = selectedTopicName
    ? topicEntries.findIndex(({ meta }) => meta.topic === selectedTopicName)
    : topicEntries.findIndex(({ topic }) => topic.lessons.some((lesson) => lesson.lessonId === requestedLessonId));
  const fallbackTopicIndex = selectedTopicIndex >= 0 ? selectedTopicIndex : 0;
  const landmarkEntries = PROGRESS_MAP_LANDMARKS.map((landmark) => ({
    landmark,
    position: projectProgressMapPoint(landmark.anchor, PROGRESS_MAP_VIEWPORT),
  }));
  const selectedLandmark = selectedLandmarkId ? getProgressMapLandmark(selectedLandmarkId) : null;

  useEffect(() => {
    const previousLandmarkId = previousLandmarkIdRef.current;
    if (previousLandmarkId && selectedLandmarkId === null) {
      landmarkTriggerRefs.current.get(previousLandmarkId)?.focus();
    }
    previousLandmarkIdRef.current = selectedLandmarkId;
  }, [selectedLandmarkId]);

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
          {landmarkEntries.map(({ landmark, position }) => (
            <button
              className="progress-map-landmark-hit-area"
              data-progress-map-landmark={landmark.id}
              key={landmark.id}
              type="button"
              aria-label={'Mở thông tin ' + landmark.name}
              aria-pressed={selectedLandmarkId === landmark.id}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                '--landmark-hit-width': `${landmark.hitArea.widthPercent}%`,
                '--landmark-hit-height': `${landmark.hitArea.heightPercent}%`,
              } as CSSProperties}
              ref={(element) => {
                if (element) landmarkTriggerRefs.current.set(landmark.id, element);
                else landmarkTriggerRefs.current.delete(landmark.id);
              }}
              onClick={() => setSelectedLandmarkId(landmark.id)}
            />
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
      {selectedLandmark && (
        <ProgressMapLandmarkCard
          landmark={selectedLandmark}
          reducedMotion={reducedMotion}
          onClose={() => setSelectedLandmarkId(null)}
        />
      )}
      <p className="progress-map-scene-hint">Chạm vào một chặng để xem bước tiếp theo nhé!</p>
    </section>
  );
}
