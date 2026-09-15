import { useEffect, useRef } from 'react';
import type { JourneyFeatureDefinition } from './JourneyFeatureRail';
import { getFocusableElements, getNextFocusIndex } from './SettingsDialog';

type FeatureComingSoonDialogProps = {
  feature: JourneyFeatureDefinition;
  onClose: () => void;
};

export function FeatureComingSoonDialog({ feature, onClose }: FeatureComingSoonDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const firstIndex = 0;
      const lastIndex = focusable.length - 1;
      if (event.shiftKey && (currentIndex <= firstIndex || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(firstIndex, focusable.length, true)]?.focus();
      } else if (!event.shiftKey && (currentIndex === lastIndex || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(lastIndex, focusable.length, false)]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className="dialog-backdrop feature-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="feature-dialog"
        data-coming-soon-dialog={feature.id}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="feature-coming-soon-title"
        aria-describedby="feature-coming-soon-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="feature-dialog-heading">
          <div className="feature-dialog-art" aria-hidden="true">
            <img src={feature.art} alt="" />
          </div>
          <div className="feature-dialog-title-copy">
            <p className="eyebrow">SẮP RA MẮT</p>
            <h2 id="feature-coming-soon-title">{feature.label} đang được phát triển</h2>
          </div>
          <button ref={closeRef} className="dialog-close feature-dialog-close" type="button" onClick={onClose} aria-label={`Đóng thông báo ${feature.label}`}>×</button>
        </div>

        <p id="feature-coming-soon-description" className="feature-dialog-copy">
          {feature.description} Hãy quay lại sau để cùng khám phá tính năng mới nhé!
        </p>
        <button className="primary-small-button feature-dialog-action" type="button" onClick={onClose}>Đã hiểu</button>
      </section>
    </div>
  );
}
