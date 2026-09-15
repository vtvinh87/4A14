import { useEffect, useRef, type CSSProperties } from 'react';
import type { AvatarId } from '../../shared/account-contracts';
import { DEFAULT_AVATAR_ID, getAvatarDefinition } from '../profile/avatarCatalog';
import { getFocusableElements, getNextFocusIndex } from './SettingsDialog';

export type BirthdayCelebrationProps = {
  displayName: string;
  avatarId: AvatarId;
  reducedMotion: boolean;
  soundEnabled: boolean;
  onClose: () => void;
  onPlaySound?: () => void;
  onSound?: () => void;
};

const CONFETTI_COLORS = ['#ffcf56', '#4bb8c0', '#ee8b38', '#8bcf94', '#7b91d6', '#f27c92'];

export function BirthdayCelebration({ displayName, avatarId, reducedMotion, soundEnabled, onClose, onPlaySound, onSound }: BirthdayCelebrationProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const soundRequestedRef = useRef(false);
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

  const playSound = onPlaySound ?? onSound;
  useEffect(() => {
    if (!soundEnabled || soundRequestedRef.current) return;
    soundRequestedRef.current = true;
    playSound?.();
  }, [playSound, soundEnabled]);

  const avatar = getAvatarDefinition(avatarId) ?? getAvatarDefinition(DEFAULT_AVATAR_ID);
  const safeName = displayName.trim() || 'bạn nhỏ';

  return (
    <div className="birthday-celebration-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="birthday-celebration"
        data-birthday-celebration={reducedMotion ? 'reduced-motion' : 'motion'}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="birthday-celebration-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {!reducedMotion && (
          <div className="birthday-confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span
                key={index}
                className="birthday-confetti-piece"
                data-birthday-confetti="true"
                style={{ '--birthday-confetti-color': CONFETTI_COLORS[index % CONFETTI_COLORS.length] } as CSSProperties}
              />
            ))}
          </div>
        )}
        <div className="birthday-celebration-art">
          <img data-birthday-avatar src={avatar?.assetUrl} alt="Cáo Nhỏ" />
        </div>
        <p className="eyebrow">MỘT NGÀY THẬT VUI</p>
        <h2 id="birthday-celebration-title">Chúc mừng sinh nhật, {safeName}!</h2>
        <p className="birthday-celebration-copy">Cáo Nhỏ chúc con luôn vui vẻ, khám phá thật nhiều điều hay và có một ngày ngập tràn tiếng cười.</p>
        <button ref={closeRef} className="primary-small-button birthday-celebration-close" type="button" aria-label="Đóng lời chúc sinh nhật" onClick={onClose}>Đóng lời chúc sinh nhật</button>
      </section>
    </div>
  );
}
