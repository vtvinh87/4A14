import { TOPICS } from '../../content/catalog';
import { PROGRESS_MAP_LANDMARKS, type ProgressMapLandmarkId } from './progressMapLandmarks';

export type ProgressMapNormalizedPosition = {
  left: number;
  top: number;
};

export type MapSelection =
  | { kind: 'welcome' }
  | { kind: 'topic'; topicName: string }
  | { kind: 'landmark'; landmarkId: ProgressMapLandmarkId };

export type ProgressMapAssetId =
  | 'fox-welcome'
  | 'fox-guide'
  | 'region-local'
  | 'region-north'
  | 'region-delta'
  | 'region-central'
  | 'region-highlands'
  | 'region-south'
  | 'landmark-lung-cu'
  | 'landmark-khue-van-cac'
  | 'landmark-hoa-lu'
  | 'landmark-kim-lien'
  | 'landmark-hue'
  | 'landmark-hoi-an'
  | 'landmark-tay-nguyen-rong-house'
  | 'landmark-mekong-floating-market'
  | 'panel-foliage'
  | 'compass-start'
  | 'book-progress';

export type ProgressMapAsset = {
  id: ProgressMapAssetId;
  src: string;
  width: number;
  height: number;
  decorative: boolean;
};

export type ProgressMapTopicPresentation = {
  topic: string;
  position: ProgressMapNormalizedPosition;
  shortLabel: string;
  markerTone: 'teal' | 'blue' | 'gold';
  assetId: ProgressMapAssetId;
  renderMarker: boolean;
};

export type ProgressMapLandmarkPresentation = {
  id: ProgressMapLandmarkId;
  name: string;
  description: string;
  position: ProgressMapNormalizedPosition;
  assetId: ProgressMapAssetId;
};

const PROGRESS_MAP_ASSETS: Readonly<Record<ProgressMapAssetId, ProgressMapAsset>> = {
  'fox-welcome': { id: 'fox-welcome', src: '/art/progress/support/fox-welcome.webp', width: 640, height: 640, decorative: false },
  'fox-guide': { id: 'fox-guide', src: '/art/progress/support/fox-guide.webp', width: 480, height: 480, decorative: true },
  'region-local': { id: 'region-local', src: '/art/progress/support/region-local.webp', width: 720, height: 480, decorative: true },
  'region-north': { id: 'region-north', src: '/art/progress/support/region-north.webp', width: 720, height: 480, decorative: true },
  'region-delta': { id: 'region-delta', src: '/art/progress/support/region-delta.webp', width: 720, height: 480, decorative: true },
  'region-central': { id: 'region-central', src: '/art/progress/support/region-central.webp', width: 720, height: 480, decorative: true },
  'region-highlands': { id: 'region-highlands', src: '/art/progress/support/region-highlands.webp', width: 720, height: 480, decorative: true },
  'region-south': { id: 'region-south', src: '/art/progress/support/region-south.webp', width: 720, height: 480, decorative: true },
  'landmark-lung-cu': { id: 'landmark-lung-cu', src: '/art/progress/support/landmark-lung-cu.webp', width: 720, height: 480, decorative: true },
  'landmark-khue-van-cac': { id: 'landmark-khue-van-cac', src: '/art/progress/support/landmark-khue-van-cac.webp', width: 720, height: 480, decorative: true },
  'landmark-hoa-lu': { id: 'landmark-hoa-lu', src: '/art/progress/support/landmark-hoa-lu.webp', width: 720, height: 480, decorative: true },
  'landmark-kim-lien': { id: 'landmark-kim-lien', src: '/art/progress/support/landmark-kim-lien.webp', width: 720, height: 480, decorative: true },
  'landmark-hue': { id: 'landmark-hue', src: '/art/progress/support/landmark-hue.webp', width: 720, height: 480, decorative: true },
  'landmark-hoi-an': { id: 'landmark-hoi-an', src: '/art/progress/support/landmark-hoi-an.webp', width: 720, height: 480, decorative: true },
  'landmark-tay-nguyen-rong-house': { id: 'landmark-tay-nguyen-rong-house', src: '/art/progress/support/landmark-tay-nguyen-rong-house.webp', width: 720, height: 480, decorative: true },
  'landmark-mekong-floating-market': { id: 'landmark-mekong-floating-market', src: '/art/progress/support/landmark-mekong-floating-market.webp', width: 720, height: 480, decorative: true },
  'panel-foliage': { id: 'panel-foliage', src: '/art/progress/support/panel-foliage.webp', width: 900, height: 300, decorative: true },
  'compass-start': { id: 'compass-start', src: '/art/progress/support/compass-start.webp', width: 192, height: 192, decorative: true },
  'book-progress': { id: 'book-progress', src: '/art/progress/support/book-progress.webp', width: 192, height: 192, decorative: true },
};

const TOPIC_PRESENTATIONS: readonly ProgressMapTopicPresentation[] = [
  { topic: TOPICS[0], position: { left: 15, top: 88 }, shortLabel: 'Địa phương em', markerTone: 'gold', assetId: 'region-local', renderMarker: false },
  { topic: TOPICS[1], position: { left: 20, top: 9 }, shortLabel: 'Miền núi phía Bắc', markerTone: 'teal', assetId: 'region-north', renderMarker: true },
  { topic: TOPICS[2], position: { left: 43, top: 18 }, shortLabel: 'Đồng bằng Bắc Bộ', markerTone: 'blue', assetId: 'region-delta', renderMarker: true },
  { topic: TOPICS[3], position: { left: 49, top: 34 }, shortLabel: 'Duyên hải miền Trung', markerTone: 'teal', assetId: 'region-central', renderMarker: true },
  { topic: TOPICS[4], position: { left: 52, top: 70 }, shortLabel: 'Tây Nguyên', markerTone: 'gold', assetId: 'region-highlands', renderMarker: true },
  { topic: TOPICS[5], position: { left: 35, top: 82 }, shortLabel: 'Nam Bộ', markerTone: 'blue', assetId: 'region-south', renderMarker: true },
];

const LANDMARK_ASSET_IDS: Readonly<Record<ProgressMapLandmarkId, ProgressMapAssetId>> = {
  'lung-cu': 'landmark-lung-cu',
  'khue-van-cac': 'landmark-khue-van-cac',
  'hoa-lu': 'landmark-hoa-lu',
  'kim-lien': 'landmark-kim-lien',
  hue: 'landmark-hue',
  'hoi-an': 'landmark-hoi-an',
  'tay-nguyen-rong-house': 'landmark-tay-nguyen-rong-house',
  'mekong-floating-market': 'landmark-mekong-floating-market',
};

export const PROGRESS_MAP_TOPIC_PRESENTATIONS = TOPIC_PRESENTATIONS;

export const PROGRESS_MAP_LANDMARK_PRESENTATIONS: readonly ProgressMapLandmarkPresentation[] = PROGRESS_MAP_LANDMARKS.map((landmark) => ({
  id: landmark.id,
  name: landmark.name,
  description: landmark.description,
  position: landmark.artworkAnchor,
  assetId: LANDMARK_ASSET_IDS[landmark.id],
}));

export function getProgressMapAsset(id: ProgressMapAssetId): ProgressMapAsset {
  return PROGRESS_MAP_ASSETS[id];
}

export function getProgressMapTopicPresentation(topic: string): ProgressMapTopicPresentation | null {
  return TOPIC_PRESENTATIONS.find((entry) => entry.topic === topic) ?? null;
}

export function getProgressMapLandmarkPresentation(id: ProgressMapLandmarkId): ProgressMapLandmarkPresentation {
  const presentation = PROGRESS_MAP_LANDMARK_PRESENTATIONS.find((entry) => entry.id === id);
  if (!presentation) throw new Error('Unknown progress map landmark presentation: ' + id);
  return presentation;
}
