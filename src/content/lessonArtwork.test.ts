import { describe, expect, it } from 'vitest';
import { getLessonArtwork, LESSON_ARTWORKS } from './lessonArtwork';

const expectedIds = Array.from({ length: 29 }, (_, index) => `lesson-${String(index + 1).padStart(2, '0')}`);
const allowedThemes = ['local', 'north-mountains', 'red-river', 'central-coast', 'highlands', 'south'];
const allowedStatuses = ['confirmed-from-textbook', 'visual-reference-only', 'needs-content-review'];

describe('lesson artwork manifest', () => {
  it('contains exactly one artwork record for each lesson in stable order', () => {
    expect(LESSON_ARTWORKS.map((item) => item.lessonId)).toEqual(expectedIds);
    expect(new Set(LESSON_ARTWORKS.map((item) => item.lessonId)).size).toBe(29);
  });

  it('keeps every record local, descriptive, and inside the approved allowlists', () => {
    for (const artwork of LESSON_ARTWORKS) {
      expect(artwork.src).toMatch(/^\/art\/lessons\/lesson-(0[1-9]|1[0-9]|2[0-9])\.png$/);
      expect(artwork.alt.trim()).not.toBe('');
      expect(artwork.visualAnchor.trim()).not.toBe('');
      expect(allowedThemes).toContain(artwork.theme);
      expect(allowedStatuses).toContain(artwork.referenceStatus);
    }
  });

  it('keeps the reviewed lesson URLs and certainty boundaries explicit', () => {
    expect(getLessonArtwork('lesson-01').src).toBe('/art/lessons/lesson-01.png');
    expect(getLessonArtwork('lesson-07').src).toBe('/art/lessons/lesson-07.png');
    expect(getLessonArtwork('lesson-01').referenceStatus).toBe('confirmed-from-textbook');
    expect(getLessonArtwork('lesson-07').referenceStatus).toBe('confirmed-from-textbook');
    expect(getLessonArtwork('lesson-28').referenceStatus).toBe('needs-content-review');
  });

  it('returns the matching record and rejects an impossible runtime id clearly', () => {
    expect(getLessonArtwork('lesson-04')).toBe(LESSON_ARTWORKS[3]);
    expect(() => getLessonArtwork('lesson-99' as never)).toThrow('Unknown lesson artwork: lesson-99');
  });
});
