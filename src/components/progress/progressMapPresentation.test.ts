import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../content/catalog';
import {
  PROGRESS_MAP_LANDMARK_PRESENTATIONS,
  PROGRESS_MAP_TOPIC_PRESENTATIONS,
  getProgressMapAsset,
} from './progressMapPresentation';

describe('progress map presentation metadata', () => {
  it('keeps six topic presentations aligned with the published catalog', () => {
    expect(PROGRESS_MAP_TOPIC_PRESENTATIONS.map((entry) => entry.topic)).toEqual([...TOPICS]);
    expect(new Set(PROGRESS_MAP_TOPIC_PRESENTATIONS.map((entry) => entry.topic)).size).toBe(TOPICS.length);
    expect(JSON.stringify(PROGRESS_MAP_TOPIC_PRESENTATIONS)).not.toMatch(/6\/29|0\/5|3\/4/);
  });

  it('keeps artwork anchors bounded and separated from the map edge', () => {
    expect(PROGRESS_MAP_TOPIC_PRESENTATIONS.every(({ position }) => position.left > 0 && position.left < 100 && position.top > 0 && position.top < 100)).toBe(true);
    expect(PROGRESS_MAP_LANDMARK_PRESENTATIONS).toHaveLength(8);
    expect(PROGRESS_MAP_LANDMARK_PRESENTATIONS.every(({ position }) => position.left > 0 && position.left < 100 && position.top > 0 && position.top < 100)).toBe(true);
    expect(new Set(PROGRESS_MAP_LANDMARK_PRESENTATIONS.map(({ id }) => id)).size).toBe(8);
  });

  it('registers every accepted runtime asset without falling back to emoji', () => {
    expect(getProgressMapAsset('fox-welcome')).toMatchObject({ src: '/art/progress/support/fox-welcome.webp', decorative: false });
    expect(getProgressMapAsset('region-central')).toMatchObject({ src: '/art/progress/support/region-central.webp', decorative: true });
    expect(getProgressMapAsset('compass-start')).toMatchObject({ src: '/art/progress/support/compass-start.webp', decorative: true });
    expect(Object.values(PROGRESS_MAP_TOPIC_PRESENTATIONS).some((entry) => entry.shortLabel.includes('6/29'))).toBe(false);
  });

  it('assigns dedicated landmark artwork to all eight landmarks', () => {
    expect(PROGRESS_MAP_LANDMARK_PRESENTATIONS.map(({ id, assetId }) => ({ id, assetId }))).toEqual([
      { id: 'lung-cu', assetId: 'landmark-lung-cu' },
      { id: 'khue-van-cac', assetId: 'landmark-khue-van-cac' },
      { id: 'hoa-lu', assetId: 'landmark-hoa-lu' },
      { id: 'kim-lien', assetId: 'landmark-kim-lien' },
      { id: 'hue', assetId: 'landmark-hue' },
      { id: 'hoi-an', assetId: 'landmark-hoi-an' },
      { id: 'tay-nguyen-rong-house', assetId: 'landmark-tay-nguyen-rong-house' },
      { id: 'mekong-floating-market', assetId: 'landmark-mekong-floating-market' },
    ]);
    expect(getProgressMapAsset('landmark-hoa-lu')).toMatchObject({ src: '/art/progress/support/landmark-hoa-lu.webp', decorative: true });
    expect(getProgressMapAsset('landmark-kim-lien')).toMatchObject({ src: '/art/progress/support/landmark-kim-lien.webp', decorative: true });
    expect(getProgressMapAsset('landmark-hoi-an')).toMatchObject({ src: '/art/progress/support/landmark-hoi-an.webp', decorative: true });
    expect(getProgressMapAsset('landmark-lung-cu')).toMatchObject({ src: '/art/progress/support/landmark-lung-cu.webp', decorative: true });
    expect(getProgressMapAsset('landmark-khue-van-cac')).toMatchObject({ src: '/art/progress/support/landmark-khue-van-cac.webp', decorative: true });
    expect(getProgressMapAsset('landmark-hue')).toMatchObject({ src: '/art/progress/support/landmark-hue.webp', decorative: true });
    expect(getProgressMapAsset('landmark-tay-nguyen-rong-house')).toMatchObject({ src: '/art/progress/support/landmark-tay-nguyen-rong-house.webp', decorative: true });
    expect(getProgressMapAsset('landmark-mekong-floating-market')).toMatchObject({ src: '/art/progress/support/landmark-mekong-floating-market.webp', decorative: true });
  });

  it('keeps the Tay Nguyen landmark hit target clear of the topic marker', () => {
    const topic = PROGRESS_MAP_TOPIC_PRESENTATIONS.find(({ topic }) => topic === 'Tây Nguyên');
    const landmark = PROGRESS_MAP_LANDMARK_PRESENTATIONS.find(({ id }) => id === 'tay-nguyen-rong-house');
    expect(topic).toBeDefined();
    expect(landmark).toBeDefined();
    expect(Math.abs(topic!.position.top - landmark!.position.top)).toBeGreaterThanOrEqual(13);
  });

  it('keeps the Mekong landmark hit target clear of the Nam Bo topic marker', () => {
    const topic = PROGRESS_MAP_TOPIC_PRESENTATIONS.find(({ topic }) => topic === 'Nam Bộ');
    const landmark = PROGRESS_MAP_LANDMARK_PRESENTATIONS.find(({ id }) => id === 'mekong-floating-market');
    expect(topic).toBeDefined();
    expect(landmark).toBeDefined();
    expect(
      Math.abs(topic!.position.left - landmark!.position.left) >= 13
      || Math.abs(topic!.position.top - landmark!.position.top) >= 13,
    ).toBe(true);
  });
});
