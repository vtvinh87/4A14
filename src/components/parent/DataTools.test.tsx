import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTools } from './DataTools';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DataTools composition', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('uses game artwork and keeps only the device settings actions', () => {
    act(() => root.render(createElement(DataTools, {
      settings: { sound: true, reducedMotion: false },
      storageRecovery: false,
      storageWriteWarning: false,
      onOpenSettings: vi.fn(),
      onChangeParentPin: vi.fn(),
    })));

    expect(mount.querySelector('[data-data-tools-art="settings"]')?.getAttribute('src')).toBe('/art/hud/settings.png');
    expect(mount.querySelector('[data-device-feature-art="sound"]')?.getAttribute('src')).toBe('/art/hud/sound.png');
    expect(mount.querySelector('[data-device-feature-art="reduced-motion"]')?.getAttribute('src')).toBe('/art/collection/collection-emblem.png');
    expect(mount.querySelectorAll('[data-device-feature-art]')).toHaveLength(2);
    expect(mount.querySelector('.device-row-action')?.textContent).toContain('Đổi PIN phụ huynh');
    expect(mount.querySelector('.data-tools-actions')).toBeNull();
    expect(mount.textContent).not.toContain('Offline');
    expect(mount.textContent).not.toContain('Bản local');
    expect(mount.textContent).not.toContain('Service Worker');
    expect(mount.textContent).not.toContain('Xuất sao lưu');
    expect(mount.textContent).not.toContain('Nhập sao lưu');
    expect(mount.textContent).not.toContain('Đặt lại tiến độ');
    expect(mount.querySelector('.data-tools-card .parent-note')).toBeNull();
  });
});
