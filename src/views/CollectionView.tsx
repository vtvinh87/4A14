import { useState } from 'react';
import { MVP_LESSONS } from '../content/catalog';
import {
  COLLECTION_ARTWORKS,
  COLLECTION_EMBLEM_ARTWORK,
} from '../content/collectionArtwork';
import type { LessonArtworkId } from '../content/lessonArtwork';
import type { Progress } from '../content/types';
import { getLessonRewardState } from '../game/rewards';

type CollectionViewProps = {
  progress: Progress;
};

const FALLBACK_ARTWORK_ID = 'emblem';

export function CollectionView({ progress }: CollectionViewProps) {
  const [failedArtwork, setFailedArtwork] = useState<Partial<Record<LessonArtworkId | typeof FALLBACK_ARTWORK_ID, boolean>>>({});
  const rewardStates = COLLECTION_ARTWORKS.map((artwork, index) => {
    const lesson = MVP_LESSONS.find((candidate) => candidate.id === artwork.lessonId);
    const state = lesson
      ? getLessonRewardState(progress, lesson.id)
      : { completed: 0, total: 0, stamped: false };
    return { artwork, index, lesson, state };
  });
  const earned = rewardStates.filter(({ state }) => state.stamped).length;

  const markArtworkFailed = (id: LessonArtworkId | typeof FALLBACK_ARTWORK_ID) => {
    setFailedArtwork((current) => current[id] ? current : { ...current, [id]: true });
  };

  return (
    <section className="content-view collection-view" aria-labelledby="collection-title">
      <div className="view-heading">
        <div className="page-title-tag"><h1 id="collection-title">Bộ sưu tập</h1></div>
        <span className="collection-count">{earned} / {rewardStates.length} dấu</span>
      </div>

      <div className="collection-hero">
        <div className="collection-hero-art">
          <img
            src={COLLECTION_EMBLEM_ARTWORK.src}
            alt={COLLECTION_EMBLEM_ARTWORK.alt}
            onError={() => markArtworkFailed(FALLBACK_ARTWORK_ID)}
            draggable={false}
          />
        </div>
        <div className="collection-hero-copy">
          <p className="collection-kicker">HÀNH TRÌNH QUA VIỆT NAM</p>
          <h2>{earned ? `Bạn đã sưu tầm ${earned} dấu hành trình` : 'Mỗi bài học mở thêm một dấu nhớ'}</h2>
          <p>Khám phá từng vùng đất, câu chuyện và nét văn hoá qua các thẻ minh hoạ trong hộ chiếu của bạn.</p>
        </div>
      </div>

      <div className="collection-gallery" aria-label="Gallery thẻ sưu tập theo bài học">
        {rewardStates.map(({ artwork, index, lesson, state }) => {
          const isFallback = Boolean(failedArtwork[artwork.lessonId]);
          const title = lesson?.title ?? `Huy hiệu bài ${index + 1}`;
          const number = lesson?.number ?? `Bài ${index + 1}`;
          const status = state.stamped
            ? 'Đã nhận'
            : lesson
              ? `${state.completed}/${state.total} nhiệm vụ`
              : 'Sắp mở';

          return (
            <article className={`collection-card${state.stamped ? ' is-earned' : ''}`} key={artwork.lessonId}>
              <div className="collection-card-art">
                <img
                  src={isFallback ? COLLECTION_EMBLEM_ARTWORK.src : artwork.src}
                  alt={isFallback ? COLLECTION_EMBLEM_ARTWORK.alt : artwork.collectionAlt}
                  loading="lazy"
                  decoding="async"
                  onError={() => markArtworkFailed(isFallback ? FALLBACK_ARTWORK_ID : artwork.lessonId)}
                  draggable={false}
                />
                <span className={`collection-card-status${state.stamped ? ' is-earned' : ''}`}>{status}</span>
              </div>
              <div className="collection-card-copy">
                <small>{number}</small>
                <h3>{title}</h3>
                <p>{artwork.regionLabel}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
