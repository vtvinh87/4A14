import { TOPICS } from '../../content/catalog';
import type { ProgressMapPoint } from './progressMapProjection';

export type ProgressMapTopicMeta = {
  topic: string;
  anchor: ProgressMapPoint | null;
  shortLabel: string;
  markerTone: 'teal' | 'blue' | 'gold';
};

const TOPIC_METADATA: readonly ProgressMapTopicMeta[] = [
  { topic: TOPICS[0], anchor: null, shortLabel: 'Cổng khởi hành', markerTone: 'gold' },
  { topic: TOPICS[1], anchor: { latitude: 21.9, longitude: 104.5 }, shortLabel: 'Miền núi phía Bắc', markerTone: 'teal' },
  { topic: TOPICS[2], anchor: { latitude: 20.7, longitude: 106.1 }, shortLabel: 'Đồng bằng Bắc Bộ', markerTone: 'blue' },
  { topic: TOPICS[3], anchor: { latitude: 16.4, longitude: 108.2 }, shortLabel: 'Duyên hải miền Trung', markerTone: 'teal' },
  { topic: TOPICS[4], anchor: { latitude: 13.0, longitude: 108.0 }, shortLabel: 'Tây Nguyên', markerTone: 'gold' },
  { topic: TOPICS[5], anchor: { latitude: 10.5, longitude: 106.3 }, shortLabel: 'Nam Bộ', markerTone: 'blue' },
];

export function getProgressMapTopicMeta(topic: string): ProgressMapTopicMeta | null {
  return TOPIC_METADATA.find((candidate) => candidate.topic === topic) ?? null;
}

export function getProgressMapTopicMetadata(): readonly ProgressMapTopicMeta[] {
  return TOPIC_METADATA;
}
