import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProgressMapLandmarkDetail } from './progressMapLandmarkDetails';
import { getProgressMapLandmarkPresentation } from './progressMapPresentation';
import { ProgressMapLandmarkImageModal } from './ProgressMapLandmarkImageModal';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  return createElement(ProgressMapLandmarkImageModal, {
    landmark: getProgressMapLandmarkPresentation('kim-lien'),
    detail: getProgressMapLandmarkDetail('kim-lien'),
    modalRef,
    closeButtonRef,
    onClose,
  });
}

describe('ProgressMapLandmarkImageModal', () => {
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

  it('renders an accessible landmark detail dialog with the dedicated image and facts', () => {
    act(() => root.render(createElement(Harness, { onClose: vi.fn() })));

    const modal = mount.querySelector('[data-progress-map-landmark-modal]');
    expect(modal?.getAttribute('role')).toBe('dialog');
    expect(modal?.getAttribute('aria-modal')).toBe('true');
    expect(modal?.getAttribute('aria-labelledby')).toBe('progress-map-landmark-modal-title-kim-lien');
    expect(mount.querySelector('[data-progress-map-landmark-modal-title]')?.textContent).toBe('Làng Sen Kim Liên');
    expect(mount.querySelectorAll('[data-progress-map-landmark-modal-fact]')).toHaveLength(3);
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-landmark-modal-image]')?.src).toContain('landmark-kim-lien.webp');
    expect(mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark-modal-close]')?.getAttribute('aria-label')).toBe('Đóng thông tin Làng Sen Kim Liên');
  });

  it('delegates closing to the parent exactly once', () => {
    const onClose = vi.fn();
    act(() => root.render(createElement(Harness, { onClose })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark-modal-close]')?.click());

    expect(onClose).toHaveBeenCalledOnce();
  });
});
