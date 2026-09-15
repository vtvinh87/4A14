import { describe, expect, it } from 'vitest';
import { COLLECTION_ARTWORKS, COLLECTION_EMBLEM_ARTWORK, getCollectionArtwork } from './collectionArtwork';

describe('collection artwork manifest', () => {
  it('maps every playable lesson to one local collection card', () => {
    expect(COLLECTION_ARTWORKS).toHaveLength(29);
    expect(new Set(COLLECTION_ARTWORKS.map((item) => item.lessonId)).size).toBe(29);
    for (const artwork of COLLECTION_ARTWORKS) {
      expect(artwork.src).toMatch(/^\/art\/lessons\/lesson-(0[1-9]|1[0-9]|2[0-9])\.png$/);
      expect(artwork.collectionAlt).toContain('thẻ sưu tập');
      expect(artwork.regionLabel.trim()).not.toBe('');
    }
  });

  it('keeps the gallery emblem local and resolves lesson artwork by id', () => {
    expect(COLLECTION_EMBLEM_ARTWORK.src).toBe('/art/collection/collection-emblem.png');
    expect(COLLECTION_EMBLEM_ARTWORK.alt).toContain('Hộ chiếu');
    expect(getCollectionArtwork('lesson-29').lessonId).toBe('lesson-29');
  });
});
