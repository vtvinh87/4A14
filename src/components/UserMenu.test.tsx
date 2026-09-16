import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('UserMenu', () => {
  let root: Root;
  let mount: HTMLDivElement;

  const renderMenu = (overrides: Partial<Parameters<typeof UserMenu>[0]> = {}) => {
    const props = {
      displayName: 'Bé Bảo',
      avatarId: 'fox-scout' as const,
      onOpenProfile: vi.fn(),
      onOpenParent: vi.fn(),
      onLogout: vi.fn(),
      ...overrides,
    };
    act(() => root.render(createElement(UserMenu, props)));
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

  it('opens a labelled menu with exactly the three account actions', () => {
    renderMenu();
    const trigger = mount.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]');

    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(mount.querySelector('[role="menu"]')).toBeNull();

    act(() => trigger?.click());

    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(mount.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe('Menu tài khoản');
    expect(Array.from(mount.querySelectorAll<HTMLElement>('[role="menuitem"]')).map((item) => item.textContent?.trim())).toEqual(['Hồ sơ', 'Phụ huynh', 'Đăng xuất']);
  });

  it('renders a vector chevron instead of a text glyph', () => {
    renderMenu();
    const trigger = mount.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]')!;
    const chevron = mount.querySelector<HTMLElement>('[data-user-menu-chevron]')!;

    expect(chevron.textContent).toBe('');
    expect(chevron.querySelector('svg')).not.toBeNull();
    expect(chevron.getAttribute('data-state')).toBe('closed');
    expect(mount.textContent).not.toContain('⌄');

    act(() => trigger.click());
    expect(chevron.getAttribute('data-state')).toBe('open');
  });

  it('renders the dedicated HUD artwork for every account action', () => {
    renderMenu();
    const trigger = mount.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]')!;
    act(() => trigger.click());

    const items = Array.from(mount.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    expect(items.map((item) => item.querySelector('img')?.getAttribute('src'))).toEqual([
      '/art/hud/profile.png',
      '/art/hud/parent.png',
      '/art/hud/logout.png',
    ]);
  });

  it('routes each action and returns focus to the trigger after selection', () => {
    const onOpenProfile = vi.fn();
    const onOpenParent = vi.fn();
    const onLogout = vi.fn();
    renderMenu({ onOpenProfile, onOpenParent, onLogout });
    const trigger = mount.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]')!;

    for (const [index, callback] of [[0, onOpenProfile], [1, onOpenParent], [2, onLogout]] as const) {
      act(() => trigger.click());
      const item = mount.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[index];
      act(() => item.click());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mount.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    }
  });

  it('opens with Enter or Space, then closes on Escape and outside pointer input', () => {
    renderMenu();
    const trigger = mount.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]')!;

    act(() => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))); 
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    act(() => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    act(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(mount.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
