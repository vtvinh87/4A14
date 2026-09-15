import { describe, expect, it } from 'vitest';
import { getStampArtifact, STAMP_ARTIFACTS } from './stampArtifacts';

const LESSON_IDS = Array.from({ length: 29 }, (_, index) => `lesson-${String(index + 1).padStart(2, '0')}`);

describe('stamp artifact catalogue', () => {
  it('keeps one short, story-rich artifact for every lesson', () => {
    expect(STAMP_ARTIFACTS).toHaveLength(29);
    expect(STAMP_ARTIFACTS.map((artifact) => artifact.lessonId)).toEqual(LESSON_IDS);

    for (const artifact of STAMP_ARTIFACTS) {
      expect(artifact.name.trim().split(/\s+/).length).toBeLessThanOrEqual(4);
      expect(artifact.src).toBe(`/art/stamps/stamp-${artifact.lessonId.slice(-2)}.png`);
      expect(artifact.alt.length).toBeGreaterThan(10);
      expect(artifact.story.length).toBeGreaterThan(120);
      expect(artifact.sourceNote.length).toBeGreaterThan(20);
    }
  });

  it('looks up an artifact by lesson id', () => {
    expect(getStampArtifact('lesson-19').name).toBe('Chùa Cầu Hội An');
    expect(getStampArtifact('lesson-29').lessonId).toBe('lesson-29');
  });
});
