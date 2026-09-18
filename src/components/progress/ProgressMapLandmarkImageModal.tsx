import { forwardRef, type RefObject } from 'react';
import type { ProgressMapLandmarkDetail } from './progressMapLandmarkDetails';
import { getProgressMapAsset, type ProgressMapLandmarkPresentation } from './progressMapPresentation';

export type ProgressMapLandmarkImageModalProps = {
  landmark: ProgressMapLandmarkPresentation;
  detail: ProgressMapLandmarkDetail;
  modalRef: RefObject<HTMLElement>;
  closeButtonRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
};

export const ProgressMapLandmarkImageModal = forwardRef<HTMLElement, ProgressMapLandmarkImageModalProps>(function ProgressMapLandmarkImageModal({ landmark, detail, modalRef, closeButtonRef, onClose }, forwardedRef) {
  const titleId = 'progress-map-landmark-modal-title-' + landmark.id;
  const descriptionId = 'progress-map-landmark-modal-description-' + landmark.id;
  const asset = getProgressMapAsset(landmark.assetId);

  return (
    <div
      className="progress-map-landmark-image-modal-backdrop"
      data-progress-map-landmark-modal-backdrop
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={forwardedRef ?? modalRef}
        className="progress-map-landmark-image-modal"
        data-progress-map-landmark-modal
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="progress-map-landmark-image-modal-close"
          data-progress-map-landmark-modal-close
          type="button"
          onClick={onClose}
          aria-label={'Đóng thông tin ' + landmark.name}
        >
          ×
        </button>
        <div className="progress-map-landmark-image-modal-media">
          <img
            className="progress-map-landmark-image-modal-image"
            data-progress-map-landmark-modal-image
            src={asset.src}
            width={asset.width}
            height={asset.height}
            alt=""
          />
        </div>
        <div className="progress-map-landmark-image-modal-copy">
          <p className="progress-map-info-panel-kicker">TÌM HIỂU THÊM</p>
          <h2 id={titleId} data-progress-map-landmark-modal-title>{landmark.name}</h2>
          <p id={descriptionId} data-progress-map-landmark-modal-lead>{detail.lead}</p>
          <h3 className="progress-map-landmark-image-modal-facts-heading">Điều thú vị</h3>
          <ul className="progress-map-landmark-image-modal-facts">
            {detail.facts.map((fact) => <li data-progress-map-landmark-modal-fact key={fact}>{fact}</li>)}
          </ul>
          <div className="progress-map-landmark-image-modal-sources" aria-label={'Nguồn tham khảo ' + landmark.name}>
            <span>Nguồn tham khảo</span>
            {detail.sourceUrls.map((sourceUrl, index) => (
              <a href={sourceUrl} key={sourceUrl} target="_blank" rel="noreferrer">Nguồn {index + 1}</a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
});
