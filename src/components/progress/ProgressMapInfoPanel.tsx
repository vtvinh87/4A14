import { useEffect, useRef } from 'react';
import type { ProgressBoardData, ProgressBoardLesson, ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { ProgressMapDrawer } from './ProgressMapDrawer';
import type { ProgressClassUnlockSummary } from './ClassUnlockCard';
import type { ProgressMapLandmarkId } from './progressMapLandmarks';
import { getProgressMapAsset, getProgressMapLandmarkPresentation, getProgressMapTopicPresentation, type MapSelection } from './progressMapPresentation';
import { summarizeProgressMapTopic } from './progressMapSelectors';

export type ProgressMapInfoPanelProps = {
  selection: MapSelection;
  data: ProgressBoardData;
  selectedLessonId: string | null;
  expanded: boolean;
  detailsOpen: boolean;
  classUnlock?: ProgressClassUnlockSummary | null;
  reducedMotion: boolean;
  onToggleExpanded: () => void;
  onToggleDetails: () => void;
  onSelectLesson: (lessonId: string) => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenLandmarkImage: (landmarkId: ProgressMapLandmarkId, trigger: HTMLButtonElement) => void;
  onBack: () => void;
};

const EMPTY_TOPIC: ProgressBoardTopic = { topic: '', lessons: [] };

function topicForSelection(data: ProgressBoardData, selection: Extract<MapSelection, { kind: 'topic' }>): ProgressBoardTopic {
  return data.topics.find((topic) => topic.topic === selection.topicName) ?? { ...EMPTY_TOPIC, topic: selection.topicName };
}

function selectedLessonForTopic(topic: ProgressBoardTopic, selectedLessonId: string | null): ProgressBoardLesson | null {
  return selectedLessonId ? topic.lessons.find((lesson) => lesson.lessonId === selectedLessonId) ?? null : null;
}

export function ProgressMapInfoPanel({ selection, data, selectedLessonId, expanded, detailsOpen, classUnlock, reducedMotion, onToggleExpanded, onToggleDetails, onSelectLesson, onOpenLesson, onOpenLandmarkImage, onBack }: ProgressMapInfoPanelProps) {
  const foliageAsset = getProgressMapAsset('panel-foliage');
  const landmarkPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (selection.kind === 'landmark') landmarkPanelRef.current?.focus();
  }, [selection]);

  if (selection.kind === 'welcome') {
    const asset = getProgressMapAsset('fox-welcome');
    return (
      <section className="progress-map-info-panel progress-map-info-panel-welcome" data-progress-map-info-panel="welcome" aria-label="Gợi ý bắt đầu bản đồ">
        <div className="progress-map-info-panel-welcome-copy">
          <p className="progress-map-info-panel-kicker">CÙNG NHAU KHÁM PHÁ</p>
          <h2>Cậu muốn ghé miền nào?</h2>
          <p>Chạm một dấu mốc trên bản đồ để xem bước tiếp theo nhé.</p>
        </div>
        <img data-progress-map-welcome-art src={asset.src} width={asset.width} height={asset.height} alt="" />
        <img className="progress-map-panel-foliage" data-progress-map-panel-foliage src={foliageAsset.src} width={foliageAsset.width} height={foliageAsset.height} alt="" />
      </section>
    );
  }

  if (selection.kind === 'landmark') {
    const landmark = getProgressMapLandmarkPresentation(selection.landmarkId);
    const asset = getProgressMapAsset(landmark.assetId);
    return (
      <section ref={landmarkPanelRef} tabIndex={-1} className="progress-map-info-panel progress-map-info-panel-landmark" data-progress-map-info-panel="landmark" aria-live="polite" aria-label={'Thông tin ' + landmark.name}>
        <button
          className="progress-map-landmark-image-trigger"
          data-progress-map-landmark-image-trigger
          type="button"
          aria-label={'Xem ảnh lớn: ' + landmark.name}
          onClick={(event) => onOpenLandmarkImage(landmark.id, event.currentTarget)}
        >
          <img data-progress-map-landmark-art src={asset.src} width={asset.width} height={asset.height} alt="" />
        </button>
        <div className="progress-map-info-panel-landmark-copy">
          <p className="progress-map-info-panel-kicker">ĐIỂM DỪNG NHỎ</p>
          <h2 data-progress-map-landmark-title={landmark.id}>{landmark.name}</h2>
          <p>{landmark.description}</p>
          <button className="text-button progress-map-info-panel-back" data-progress-map-info-back type="button" onClick={onBack}>← Về bản đồ</button>
        </div>
        <img className="progress-map-panel-foliage" data-progress-map-panel-foliage src={foliageAsset.src} width={foliageAsset.width} height={foliageAsset.height} alt="" />
      </section>
    );
  }

  const topic = topicForSelection(data, selection);
  const topicPresentation = getProgressMapTopicPresentation(topic.topic);
  const selectedLesson = selectedLessonForTopic(topic, selectedLessonId);
  const topicSnapshot = summarizeProgressMapTopic(topic, data.nextLessonId);
  const guideAsset = getProgressMapAsset('fox-guide');

  return (
    <section className="progress-map-info-panel progress-map-info-panel-topic" data-progress-map-info-panel="topic" aria-label={'Thông tin chặng ' + topic.topic}>
      {topicPresentation && <img className="progress-map-info-panel-topic-art" src={getProgressMapAsset(topicPresentation.assetId).src} width={getProgressMapAsset(topicPresentation.assetId).width} height={getProgressMapAsset(topicPresentation.assetId).height} alt="" />}
      <img className="progress-map-info-panel-guide-art" data-progress-map-guide-art src={guideAsset.src} width={guideAsset.width} height={guideAsset.height} alt="" />
      <ProgressMapDrawer
        topic={topic}
        topicSnapshot={topicSnapshot}
        selectedLesson={selectedLesson}
        expanded={expanded}
        detailsOpen={detailsOpen}
        reducedMotion={reducedMotion}
        classUnlock={classUnlock}
        onToggleExpanded={onToggleExpanded}
        onToggleDetails={onToggleDetails}
        onSelectLesson={onSelectLesson}
        onOpenLesson={onOpenLesson}
      />
      <img className="progress-map-panel-foliage" data-progress-map-panel-foliage src={foliageAsset.src} width={foliageAsset.width} height={foliageAsset.height} alt="" />
    </section>
  );
}
