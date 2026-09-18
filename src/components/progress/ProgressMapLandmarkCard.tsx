import { useEffect, useRef } from 'react';
import type { ProgressMapLandmarkCardProps } from './progressMapLandmarks';

export function ProgressMapLandmarkCard({ landmark, reducedMotion, onClose }: ProgressMapLandmarkCardProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = `progress-map-landmark-title-${landmark.id}`;
  const descriptionId = `progress-map-landmark-description-${landmark.id}`;

  useEffect(() => {
    closeRef.current?.focus();
  }, [landmark.id]);

  return (
    <article
      className="progress-map-landmark-card"
      data-progress-map-landmark-card={landmark.id}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className="progress-map-landmark-card-kicker">Câu chuyện nhỏ</span>
      <h3 id={titleId}>{landmark.name}</h3>
      <p id={descriptionId}>{landmark.description}</p>
      <button ref={closeRef} type="button" aria-label={'Đóng ' + landmark.name} onClick={onClose}>
        ×
      </button>
    </article>
  );
}
