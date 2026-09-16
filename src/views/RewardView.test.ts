import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardView } from './RewardView';
import { createDefaultProgress } from '../progress/storage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../components/FloatingPet', () => ({
  FloatingPet: () => createElement('div', { 'data-testid': 'floating-pet' }, 'Pet'),
}));

describe('RewardView artwork', () => {
  let root: Root;
  let mount: HTMLDivElement;

  const setViewportWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  };

  beforeEach(() => {
    setViewportWidth(1024);
    document.body.innerHTML = '<div id="mount"></div>';
    mount = document.querySelector<HTMLDivElement>('#mount')!;
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    setViewportWidth(1024);
    document.body.innerHTML = '';
  });

  it('renders the lettered passport artwork and a paginated first stamp page', () => {
    act(() => {
      root.render(createElement(RewardView, {
        progress: createDefaultProgress(),
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      }));
    });

    const artworkSources = [...document.querySelectorAll<HTMLImageElement>('img[data-reward-art]')]
      .map((image) => image.getAttribute('src'));

    expect(artworkSources).toEqual(expect.arrayContaining([
      '/art/reward/passport-cover-lettered.png',
      '/art/reward/start-journey.png',
    ]));
    expect(document.querySelectorAll<HTMLButtonElement>('button[data-reward-stamp]')).toHaveLength(6);
    expect(document.querySelectorAll<HTMLImageElement>('img[data-reward-stamp]')).toHaveLength(6);
    expect(document.querySelectorAll<HTMLImageElement>('img[data-reward-stamp][src^="/art/stamps/stamp-"]')).toHaveLength(6);
    expect(document.querySelector('img[data-reward-stamp][src="/art/reward/stamp-future.png"]')).toBeNull();
    const passportArt = document.querySelector<HTMLImageElement>('img[data-reward-art][src="/art/reward/passport-cover-lettered.png"]');
    expect(passportArt?.getAttribute('alt')).toBe('Hộ chiếu Cáo Nhỏ');
    expect(passportArt?.getAttribute('aria-hidden')).toBeNull();
    expect(document.querySelector('.passport-cover-copy')).toBeNull();
    expect(document.querySelector('.passport-stamp-line')).toBeNull();
    expect(document.body.textContent).toContain('Hộ chiếu');
    expect(document.body.textContent).toContain('Bài 01');
    expect(document.body.textContent).not.toContain('Bài 29');
    expect(document.body.textContent).toContain('Bắt đầu từ một chặng đang mở');
    expect(document.querySelector('[data-stamp-page-number]')?.textContent).toBe('Trang 1 / 5');
    expect(document.querySelector<HTMLButtonElement>('[data-stamp-prev]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[data-stamp-next]')?.disabled).toBe(false);
  });

  it('moves through stamp pages without exceeding two desktop rows', () => {
    act(() => {
      root.render(createElement(RewardView, {
        progress: createDefaultProgress(),
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      }));
    });

    act(() => document.querySelector<HTMLButtonElement>('[data-stamp-next]')?.click());
    expect(document.querySelector('[data-stamp-page-number]')?.textContent).toBe('Trang 2 / 5');
    expect(document.querySelector('button[data-reward-stamp="lesson-07"]')).not.toBeNull();
    expect(document.querySelector('button[data-reward-stamp="lesson-01"]')).toBeNull();
    expect(document.querySelectorAll<HTMLButtonElement>('button[data-reward-stamp]')).toHaveLength(6);
  });

  it('uses a two-stamp page on compact screens so the grid stays within two rows', () => {
    setViewportWidth(390);
    act(() => {
      root.render(createElement(RewardView, {
        progress: createDefaultProgress(),
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      }));
    });

    expect(document.querySelectorAll<HTMLButtonElement>('button[data-reward-stamp]')).toHaveLength(2);
    expect(document.querySelector('[data-stamp-page-number]')?.textContent).toBe('Trang 1 / 15');
  });

  it('opens a larger artifact story and closes it again', () => {
    const progress = { ...createDefaultProgress(), stamps: ['stamp-lesson-19'] };
    act(() => {
      root.render(createElement(RewardView, {
        progress,
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      }));
    });

    for (let page = 0; page < 3; page += 1) {
      act(() => document.querySelector<HTMLButtonElement>('[data-stamp-next]')?.click());
    }
    const stamp = document.querySelector<HTMLButtonElement>('[data-reward-stamp="lesson-19"]');
    expect(stamp).not.toBeNull();
    act(() => stamp?.click());
    expect(document.querySelector('[data-stamp-dialog]')).not.toBeNull();
    expect(document.querySelector('[data-stamp-dialog-backdrop]')?.parentElement).toBe(document.body);
    expect(document.querySelector('[data-stamp-dialog-title]')?.textContent).toContain('Chùa Cầu Hội An');
    expect(document.querySelector('[data-stamp-dialog]')?.textContent).toContain('Chùa Cầu bắc qua');
    expect(document.querySelector<HTMLImageElement>('[data-stamp-dialog] img')?.getAttribute('src')).toBe('/art/stamps/stamp-19.png');

    act(() => document.querySelector<HTMLButtonElement>('[data-stamp-dialog-close]')?.click());
    expect(document.querySelector('[data-stamp-dialog]')).toBeNull();
  });

  it('shows a lock instruction instead of the story for an unearned stamp', () => {
    act(() => {
      root.render(createElement(RewardView, {
        progress: createDefaultProgress(),
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      }));
    });

    const lockedStamp = document.querySelector<HTMLButtonElement>('[data-reward-stamp="lesson-02"]');
    expect(lockedStamp?.querySelector('[data-stamp-lock]')).not.toBeNull();
    expect(lockedStamp?.querySelector('[data-stamp-lock]')?.classList.contains('is-centered')).toBe(true);
    expect(lockedStamp?.querySelector('[data-stamp-lock]')?.getAttribute('data-stamp-lock-position')).toBe('center');
    act(() => lockedStamp?.click());

    const dialog = document.querySelector('[data-stamp-dialog]');
    expect(dialog?.querySelector('[data-stamp-dialog-locked]')).not.toBeNull();
    expect(dialog?.querySelector('[data-stamp-dialog-lock]')?.classList.contains('is-centered')).toBe(true);
    expect(dialog?.querySelector('[data-stamp-dialog-lock]')?.getAttribute('data-stamp-dialog-lock-position')).toBe('center');
    expect(dialog?.textContent).toContain('Hoàn thành đủ 5 nhiệm vụ');
    expect(dialog?.textContent).toContain('mở khóa dấu này');
    expect(dialog?.textContent).not.toContain('Cát Bà');
  });
});
