import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallCard } from './PwaInstallCard';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PwaInstallCard', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false }) });
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('keeps the fallback honest until the browser supplies an install prompt', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const preventDefault = vi.fn();
    const userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });

    await act(async () => {
      root.render(createElement(PwaInstallCard));
    });
    expect(mount.textContent).toContain('Mở menu trình duyệt');
    expect(mount.textContent?.toLowerCase()).not.toContain('đã được cài');

    const event = Object.assign(new Event('beforeinstallprompt'), { prompt, preventDefault, userChoice });
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    const button = mount.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Cài Học Vui');

    await act(async () => {
      button.click();
      await userChoice;
    });
    expect(prompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(mount.textContent).toContain('Học Vui đã được cài');
  });

  it('shows the iOS home-screen instruction instead of a synthetic install success', async () => {
    const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    try {
      await act(async () => {
        root.render(createElement(PwaInstallCard));
      });
      expect(mount.textContent).toContain('Thêm vào Màn hình chính');
      expect(mount.textContent?.toLowerCase()).not.toContain('đã được cài');
    } finally {
      if (originalUserAgent) Object.defineProperty(navigator, 'userAgent', originalUserAgent);
    }
  });
});
