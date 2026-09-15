import { describe, expect, it } from 'vitest';
import { grantReward, getLessonRewardState } from './rewards';
import type { Progress } from '../content/types';

const baseProgress = (): Progress => ({
  schemaVersion: 1,
  completedMissions: [],
  stamps: [],
  settings: { sound: true, reducedMotion: false },
  session: null,
  updatedAt: '2026-09-10T00:00:00.000Z',
});

describe('rewards', () => {
  it('unions mission completion and grants exactly one lesson stamp', () => {
    let progress = baseProgress();
    progress = grantReward(progress, 'b1-m1');
    progress = grantReward(progress, 'b1-m2');
    expect(progress.stamps).toEqual([]);
    progress = grantReward(progress, 'b1-m3');
    expect(progress.stamps).toEqual([]);
    progress = grantReward(progress, 'b1-m4');
    progress = grantReward(progress, 'b1-m5');
    expect(progress.completedMissions).toEqual(['b1-m1', 'b1-m2', 'b1-m3', 'b1-m4', 'b1-m5']);
    expect(progress.stamps).toEqual(['stamp-lesson-01']);
    expect(getLessonRewardState(progress, 'lesson-01')).toEqual({ completed: 5, total: 5, stamped: true });
  });

  it('is idempotent on refresh or double tap', () => {
    let progress = baseProgress();
    progress = ['b7-m1', 'b7-m2', 'b7-m3', 'b7-m4', 'b7-m5'].reduce((current, missionId) => grantReward(current, missionId), progress);
    const again = grantReward(progress, 'b7-m5');
    expect(again).toEqual(progress);
    expect(again.completedMissions.filter((id) => id === 'b7-m5')).toHaveLength(1);
    expect(again.stamps.filter((id) => id === 'stamp-lesson-07')).toHaveLength(1);
  });

  it('ignores unknown mission ids', () => {
    const progress = baseProgress();
    expect(grantReward(progress, 'unknown')).toEqual(progress);
  });
});
