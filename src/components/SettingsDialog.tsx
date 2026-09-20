import { useEffect, useRef } from 'react';
import type { AudioPreferences } from '../audio/preferences';
import type { AppSettings } from '../progress/storage';
import { CheckIcon, SettingsIcon, SoundIcon } from './icons';
import { PwaInstallCard } from './PwaInstallCard';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

export function getNextFocusIndex(index: number, count: number, backward: boolean): number {
  if (count <= 0) return -1;
  return (index + (backward ? -1 : 1) + count) % count;
}

type SettingsDialogProps = {
  settings: AppSettings;
  audioPreferences: AudioPreferences;
  saveStatus?: 'saved' | 'recovery' | 'warning';
  onChange: (key: keyof AppSettings, value: boolean) => void;
  onAudioPreferencesChange: (next: AudioPreferences) => void;
  onAudioPreview?: () => void;
  onClose: () => void;
  onLogout?: () => void;
};

export function SettingsDialog({ settings, audioPreferences, saveStatus = 'saved', onChange, onAudioPreferencesChange, onAudioPreview, onClose, onLogout }: SettingsDialogProps) {
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
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="settings-dialog" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="settings-title" aria-describedby="settings-description" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <div className="dialog-title-icon"><SettingsIcon size={23} /></div>
          <div>
            <p className="eyebrow">GÓC CỦA BẠN</p>
            <h2 id="settings-title">Cài đặt hành trình</h2>
          </div>
          <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Đóng cài đặt">×</button>
        </div>

        <p id="settings-description" className="visually-hidden">Dùng Tab để di chuyển trong cài đặt, Shift cộng Tab để quay lại, hoặc Escape để đóng.</p>

        <div className="settings-list">
          <button className="settings-row" type="button" onClick={() => onChange('sound', !settings.sound)} aria-pressed={settings.sound}>
            <span className="settings-row-icon"><SoundIcon size={22} /></span>
            <span className="settings-row-copy"><strong>Âm thanh phản hồi</strong><small>Âm chạm và âm khám phá</small></span>
            <span className={`toggle${settings.sound ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
          </button>
          <button className="settings-row" type="button" onClick={() => onChange('reducedMotion', !settings.reducedMotion)} aria-pressed={settings.reducedMotion}>
            <span className="settings-row-icon"><CheckIcon size={22} /></span>
            <span className="settings-row-copy"><strong>Giảm chuyển động</strong><small>Giữ Cáo Nhỏ tĩnh để dễ tập trung</small></span>
            <span className={`toggle${settings.reducedMotion ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
          </button>
        </div>

        <section className="audio-preferences" aria-labelledby="audio-preferences-title">
          <div className="audio-preferences-heading">
            <strong id="audio-preferences-title">Âm thanh khám phá</strong>
            <small>Cài đặt này chỉ lưu trên thiết bị.</small>
          </div>
          <label className="audio-preference-toggle"><span>Nhạc nền</span><input type="checkbox" checked={audioPreferences.music} onChange={(event) => onAudioPreferencesChange({ ...audioPreferences, music: event.target.checked })} /></label>
          <label className="audio-preference-toggle"><span>Không gian</span><input type="checkbox" checked={audioPreferences.ambience} onChange={(event) => onAudioPreferencesChange({ ...audioPreferences, ambience: event.target.checked })} /></label>
          <label className="audio-preference-toggle"><span>Báo tin nhắn</span><input type="checkbox" checked={audioPreferences.notifications} onChange={(event) => onAudioPreferencesChange({ ...audioPreferences, notifications: event.target.checked })} /></label>
          <label className="audio-preference-range"><span>Âm lượng tổng <output>{Math.round(audioPreferences.masterVolume * 100)}%</output></span><input aria-label="Âm lượng tổng" type="range" min="0" max="1" step="0.01" value={audioPreferences.masterVolume} onChange={(event) => onAudioPreferencesChange({ ...audioPreferences, masterVolume: Number(event.target.value) })} /></label>
          <label className="audio-preference-range"><span>Hiệu ứng <output>{Math.round(audioPreferences.sfxVolume * 100)}%</output></span><input aria-label="Âm lượng hiệu ứng" type="range" min="0" max="1" step="0.01" value={audioPreferences.sfxVolume} onChange={(event) => onAudioPreferencesChange({ ...audioPreferences, sfxVolume: Number(event.target.value) })} /></label>
          <label className="audio-preference-range"><span>Nhạc <output>{Math.round(audioPreferences.musicVolume * 100)}%</output></span><input aria-label="Âm lượng nhạc" type="range" min="0" max="1" step="0.01" value={audioPreferences.musicVolume} onChange={(event) => onAudioPreferencesChange({ ...audioPreferences, musicVolume: Number(event.target.value) })} /></label>
          <label className="audio-preference-range"><span>Không gian <output>{Math.round(audioPreferences.ambienceVolume * 100)}%</output></span><input aria-label="Âm lượng không gian" type="range" min="0" max="1" step="0.01" value={audioPreferences.ambienceVolume} onChange={(event) => onAudioPreferencesChange({ ...audioPreferences, ambienceVolume: Number(event.target.value) })} /></label>
          <button className="secondary-button audio-preview-button" type="button" onClick={onAudioPreview}>Nghe thử âm đã chọn</button>
        </section>

        <p className={`saved-note is-${saveStatus}`} role="status"><span className="saved-dot" /> {saveStatus === 'recovery' ? 'Dữ liệu cũ chưa bị ghi đè; cài đặt mới chỉ giữ trong phiên này.' : saveStatus === 'warning' ? 'Cài đặt chưa được ghi; thay đổi hiện chỉ giữ trong phiên này.' : 'Cài đặt được lưu trên thiết bị này.'}</p>
        <PwaInstallCard />
        {onLogout && <button className="secondary-button settings-logout-button" type="button" onClick={onLogout}>Đăng xuất tài khoản</button>}
      </section>
    </div>
  );
}
