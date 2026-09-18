import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProgressMapLandmark } from './progressMapLandmarks';
import { ProgressMapLandmarkCard } from './ProgressMapLandmarkCard';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ProgressMapLandmarkCard', () => {
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

  it('shows one short landmark story and an accessible close action', () => {
    const landmark = getProgressMapLandmark('hoa-lu');
    const onClose = vi.fn();

    act(() => root.render(createElement(ProgressMapLandmarkCard, {
      landmark,
      reducedMotion: true,
      onClose,
    })));

    expect(mount.querySelector('[role="dialog"]')).not.toBeNull();
    expect(mount.querySelector('h3')?.textContent).toBe(landmark.name);
    expect(mount.textContent).toContain(landmark.description);
    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Đóng ' + landmark.name + '"]')).not.toBeNull();
    expect(mount.querySelector('[data-reduced-motion="true"]')).not.toBeNull();
    expect(mount.textContent).not.toMatch(/điểm|hạng|xếp/i);

    const close = mount.querySelector<HTMLButtonElement>('[aria-label="Đóng ' + landmark.name + '"]')!;
    expect(document.activeElement).toBe(close);
    act(() => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
