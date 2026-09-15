import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BirthdayCelebration } from './BirthdayCelebration';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BirthdayCelebration', () => {
  let root: Root;
  let mount: HTMLDivElement;

  const renderCelebration = (overrides: Partial<Parameters<typeof BirthdayCelebration>[0]> = {}) => {
    const props = {
      displayName: 'Bé Bảo',
      avatarId: 'fox-scout' as const,
      reducedMotion: false,
      soundEnabled: false,
      onClose: vi.fn(),
      ...overrides,
    };
    act(() => root.render(createElement(BirthdayCelebration, props)));
    return props;
  };

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('renders a child-directed dialog with an allowlisted local fox and no age or exact birth date', () => {
    renderCelebration();

    const dialog = mount.querySelector('[role="dialog"]');
    const image = mount.querySelector<HTMLImageElement>('[data-birthday-avatar]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(mount.textContent).toContain('Chúc mừng sinh nhật, Bé Bảo');
    expect(mount.textContent).not.toContain('2014-09-14');
    expect(mount.textContent).not.toMatch(/\b\d+\s*tuổi\b/i);
    expect(image?.src).toMatch(/\/art\/fox-pet-alpha\.png$/);
    expect(image?.getAttribute('src')).toBe('/art/fox-pet-alpha.png');
    expect(mount.querySelectorAll('[data-birthday-confetti]').length).toBeGreaterThan(0);
  });

  it('uses a calm static variant without confetti when reduced motion is enabled', () => {
    renderCelebration({ reducedMotion: true });

    expect(mount.querySelector('[data-birthday-celebration="reduced-motion"]')).not.toBeNull();
    expect(mount.querySelector('[data-birthday-confetti]')).toBeNull();
  });

  it('requests sound once only when the App sound setting allows it', () => {
    const onPlaySound = vi.fn();
    renderCelebration({ soundEnabled: true, onPlaySound });
    expect(onPlaySound).toHaveBeenCalledTimes(1);

    act(() => root.render(createElement(BirthdayCelebration, {
      displayName: 'Bé Bảo',
      avatarId: 'fox-scout',
      reducedMotion: false,
      soundEnabled: true,
      onPlaySound,
      onClose: vi.fn(),
    })));
    expect(onPlaySound).toHaveBeenCalledTimes(1);

    const disabledSound = vi.fn();
    act(() => root.render(createElement(BirthdayCelebration, {
      displayName: 'Bé Bảo',
      avatarId: 'fox-scout',
      reducedMotion: false,
      soundEnabled: false,
      onPlaySound: disabledSound,
      onClose: vi.fn(),
    })));
    expect(disabledSound).not.toHaveBeenCalled();
  });

  it('calls onClose from the close control and keeps a malicious avatar value local', () => {
    const onClose = vi.fn();
    renderCelebration({ avatarId: 'https://example.com/avatar.png' as never, onClose });

    const close = mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]');
    act(() => close?.click());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mount.querySelector<HTMLImageElement>('[data-birthday-avatar]')?.getAttribute('src')).toBe('/art/fox-pet-alpha.png');
  });

  it('traps keyboard focus inside the modal and restores the previous focus after close', () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open birthday';
    document.body.insertBefore(opener, mount);
    const backgroundAfter = document.createElement('button');
    backgroundAfter.type = 'button';
    backgroundAfter.textContent = 'Background after';
    document.body.appendChild(backgroundAfter);
    opener.focus();

    const onClose = vi.fn();
    renderCelebration({ onClose });

    const dialog = mount.querySelector<HTMLElement>('[role="dialog"]');
    const close = mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]');
    const extraAction = document.createElement('button');
    extraAction.type = 'button';
    extraAction.textContent = 'Extra action';
    dialog?.appendChild(extraAction);

    expect(document.activeElement).toBe(close);

    act(() => {
      close?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(extraAction);

    act(() => {
      extraAction.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(close);
    expect(document.activeElement).not.toBe(backgroundAfter);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);

    opener.remove();
    backgroundAfter.remove();
  });
});
