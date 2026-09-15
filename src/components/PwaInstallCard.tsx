import { useEffect, useState } from 'react';
import { isIosDevice, isStandaloneDisplay, type DeferredInstallPromptEvent } from '../pwa/install';

export function PwaInstallCard() {
  const [promptEvent, setPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    setInstalled(isStandaloneDisplay());
    setIos(isIosDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      const candidate = event as Partial<DeferredInstallPromptEvent>;
      if (typeof candidate.prompt !== 'function' || !candidate.userChoice) return;
      event.preventDefault();
      setPromptEvent(candidate as DeferredInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent || busy) return;
    setBusy(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // The browser owns the prompt lifecycle; a dismissed or unavailable prompt is not an install success.
    } finally {
      setBusy(false);
      setPromptEvent(null);
    }
  };

  return (
    <section className="pwa-install-card" aria-labelledby="pwa-install-title">
      <div className="pwa-install-heading">
        <div>
          <p className="eyebrow">CÀI TRÊN THIẾT BỊ</p>
          <h3 id="pwa-install-title">Mang Học Vui theo con</h3>
        </div>
        <span className="pwa-install-mark" aria-hidden="true">↗</span>
      </div>
      {installed && <p className="pwa-install-copy" role="status">Học Vui đã được cài trên thiết bị này.</p>}
      {!installed && promptEvent && <div className="pwa-install-copy"><p>Cài Học Vui để mở nhanh từ màn hình chính.</p><button className="secondary-button" type="button" onClick={() => void install()} disabled={busy}>{busy ? 'Đang mở…' : 'Cài Học Vui'}</button></div>}
      {!installed && !promptEvent && ios && <p className="pwa-install-copy">Trên iPhone/iPad: chạm <strong>Chia sẻ</strong> → <strong>Thêm vào Màn hình chính</strong>.</p>}
      {!installed && !promptEvent && !ios && <p className="pwa-install-copy">Mở menu trình duyệt để chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.</p>}
    </section>
  );
}
