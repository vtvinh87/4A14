import { describe, expect, it } from 'vitest';
import { projectProgressMapPoint, PROGRESS_MAP_VIEWPORT } from './progressMapProjection';

describe('progress map projection', () => {
  it('projects the viewport corners into the scene bounds', () => {
    expect(projectProgressMapPoint({ latitude: 6.7, longitude: 102.1 }, PROGRESS_MAP_VIEWPORT)).toEqual({ left: 0, top: 100 });
    expect(projectProgressMapPoint({ latitude: 23.5, longitude: 118 }, PROGRESS_MAP_VIEWPORT)).toEqual({ left: 100, top: 0 });
  });

  it('clamps points outside the viewport', () => {
    expect(projectProgressMapPoint({ latitude: 40, longitude: 90 }, PROGRESS_MAP_VIEWPORT)).toEqual({ left: 0, top: 0 });
    expect(projectProgressMapPoint({ latitude: -5, longitude: 140 }, PROGRESS_MAP_VIEWPORT)).toEqual({ left: 100, top: 100 });
  });

  it('keeps a point between the geographic bounds', () => {
    const projected = projectProgressMapPoint({ latitude: 15.1, longitude: 110.05 }, PROGRESS_MAP_VIEWPORT);
    expect(projected.left).toBeCloseTo(49.999, 2);
    expect(projected.top).toBeCloseTo(50, 2);
  });
});
