import {
  getLessonArtwork,
  LESSON_ARTWORKS,
  type LessonArtwork,
  type LessonArtworkId,
} from './lessonArtwork';

export type CollectionArtwork = LessonArtwork & {
  regionLabel: string;
  collectionAlt: string;
};

export const COLLECTION_EMBLEM_ARTWORK = {
  src: '/art/collection/collection-emblem.png',
  alt: 'Hộ chiếu mở cùng la bàn và các tem hành trình Việt Nam',
} as const;

const REGION_LABELS: Record<LessonArtwork['theme'], string> = {
  local: 'Địa phương em',
  'north-mountains': 'Trung du và miền núi phía Bắc',
  'red-river': 'Đồng bằng Bắc Bộ',
  'central-coast': 'Duyên hải miền Trung',
  highlands: 'Tây Nguyên',
  south: 'Nam Bộ',
};

export const COLLECTION_ARTWORKS: readonly CollectionArtwork[] = LESSON_ARTWORKS.map((artwork) => ({
  ...artwork,
  regionLabel: REGION_LABELS[artwork.theme],
  collectionAlt: `${artwork.alt}, minh hoạ thẻ sưu tập ${REGION_LABELS[artwork.theme]}`,
}));

export function getCollectionArtwork(id: LessonArtworkId): CollectionArtwork {
  const artwork = getLessonArtwork(id);
  const collectionArtwork = COLLECTION_ARTWORKS.find((item) => item.lessonId === id);
  if (!collectionArtwork) throw new Error(`Unknown collection artwork: ${id}`);
  return { ...artwork, ...collectionArtwork };
}
