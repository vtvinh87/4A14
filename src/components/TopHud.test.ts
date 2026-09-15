import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopHud } from './TopHud';
import { createDefaultProgress } from '../progress/storage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('TopHud navigation', () => {
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

  it('opens the passport chip and routes parent access through the account menu', () => {
    const onOpenReward = vi.fn();
    const onOpenParent = vi.fn();
    const onOpenProfile = vi.fn();
    const onLogout = vi.fn();
    act(() => root.render(createElement(TopHud, {
      progress: createDefaultProgress(),
      settings: createDefaultProgress().settings,
      onToggleSound: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenReward,
      onOpenParent,
      onOpenProfile,
      onLogout,
      displayName: 'Bé Bảo',
      avatarId: 'fox-scout',
    })));

    act(() => mount.querySelector<HTMLButtonElement>('.passport-chip')?.click());
    expect(onOpenReward).toHaveBeenCalledOnce();
    expect(onOpenParent).not.toHaveBeenCalled();

    const userTrigger = mount.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]');
    expect(userTrigger?.getAttribute('aria-expanded')).toBe('false');
    act(() => userTrigger?.click());
    const accountItems = mount.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    expect(accountItems).toHaveLength(3);
    expect(accountItems[0].textContent).toBe('Hồ sơ');
    expect(accountItems[1].textContent).toBe('Phụ huynh');
    expect(accountItems[2].textContent).toBe('Đăng xuất');
    act(() => accountItems[1].click());
    expect(onOpenParent).toHaveBeenCalledOnce();

    act(() => userTrigger?.click());
    act(() => mount.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[0]?.click());
    expect(onOpenProfile).toHaveBeenCalledOnce();

    act(() => userTrigger?.click());
    act(() => mount.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[2]?.click());
    expect(onLogout).toHaveBeenCalledOnce();
    expect(mount.textContent).toContain('Bé Bảo');
  });

  it('returns focus and closes the account menu on Escape or outside click', () => {
    act(() => root.render(createElement(TopHud, {
      progress: createDefaultProgress(), settings: createDefaultProgress().settings,
      onToggleSound: vi.fn(), onOpenSettings: vi.fn(), onOpenReward: vi.fn(), onOpenParent: vi.fn(), onOpenProfile: vi.fn(), onLogout: vi.fn(),
      displayName: 'Bé Bảo', avatarId: 'fox-scout',
    })));
    const trigger = mount.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]')!;
    act(() => trigger.click());
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    act(() => trigger.click());
    act(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(mount.querySelector('[role="menu"]')).toBeNull();
  });
});
