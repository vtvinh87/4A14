import rawLandmarks from './progressMapLandmarks.json';
import type { ProgressMapNormalizedPoint, ProgressMapPoint } from './progressMapProjection';

export type ProgressMapLandmarkId =
  | 'lung-cu'
  | 'khue-van-cac'
  | 'hoa-lu'
  | 'kim-lien'
  | 'hue'
  | 'hoi-an'
  | 'tay-nguyen-rong-house'
  | 'mekong-floating-market';

export type ProgressMapLandmark = {
  id: ProgressMapLandmarkId;
  name: string;
  description: string;
  anchor: ProgressMapPoint;
  artworkAnchor: ProgressMapNormalizedPoint;
  hitArea: { widthPercent: number; heightPercent: number };
};

export type ProgressMapLandmarkCardProps = {
  landmark: ProgressMapLandmark;
  reducedMotion: boolean;
  onClose: () => void;
};

export const PROGRESS_MAP_LANDMARKS: readonly ProgressMapLandmark[] = rawLandmarks as readonly ProgressMapLandmark[];

export function getProgressMapLandmark(id: ProgressMapLandmarkId): ProgressMapLandmark {
  const landmark = PROGRESS_MAP_LANDMARKS.find((candidate) => candidate.id === id);
  if (!landmark) throw new Error('Unknown progress map landmark: ' + id);
  return landmark;
}
