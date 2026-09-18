import { describe, expect, it } from 'vitest';
import { PROGRESS_MAP_LANDMARKS } from './progressMapLandmarks';
import { PROGRESS_MAP_VIEWPORT } from './progressMapProjection';

describe('progress map landmarks', () => {
  it('contains exactly eight geographically anchored landmarks', () => {
    expect(PROGRESS_MAP_LANDMARKS).toHaveLength(8);
    expect(new Set(PROGRESS_MAP_LANDMARKS.map(({ id }) => id)).size).toBe(8);

    for (const landmark of PROGRESS_MAP_LANDMARKS) {
      expect(landmark.description.length).toBeLessThanOrEqual(120);
      expect(landmark.anchor.latitude).toBeGreaterThanOrEqual(PROGRESS_MAP_VIEWPORT.minLatitude);
      expect(landmark.anchor.latitude).toBeLessThanOrEqual(PROGRESS_MAP_VIEWPORT.maxLatitude);
      expect(landmark.anchor.longitude).toBeGreaterThanOrEqual(PROGRESS_MAP_VIEWPORT.minLongitude);
      expect(landmark.anchor.longitude).toBeLessThanOrEqual(PROGRESS_MAP_VIEWPORT.maxLongitude);
      expect(landmark.hitArea.widthPercent).toBeGreaterThan(0);
      expect(landmark.hitArea.heightPercent).toBeGreaterThan(0);
      expect(landmark.artworkAnchor.left).toBeGreaterThanOrEqual(0);
      expect(landmark.artworkAnchor.left).toBeLessThanOrEqual(100);
      expect(landmark.artworkAnchor.top).toBeGreaterThanOrEqual(0);
      expect(landmark.artworkAnchor.top).toBeLessThanOrEqual(100);
    }
  });
});
