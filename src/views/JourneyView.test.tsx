import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PET_HOME_DIALOGUES } from '../motion/petHomeConversation';
import { JourneyView } from './JourneyView';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../components/Pet', () => ({
  Pet: ({ message, messageTone, onTap }: { message?: string; messageTone?: string; onTap: () => void }) => createElement(
    'button',
    { type: 'button', 'data-test-pet-dialogue': messageTone ?? '', onClick: onTap },
    message,
  ),
}));

describe('JourneyView launch surface', () => {
  it('uses the rotating dialogue catalog for the full-size Journey Pet', () => {
    const mount = document.createElement('div');
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(JourneyView, {
        petMood: 'idle',
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      })));

      const petButton = mount.querySelector<HTMLButtonElement>('[data-test-pet-dialogue]');
      expect(petButton).not.toBeNull();
      const firstDialogue = petButton?.textContent;
      expect(PET_HOME_DIALOGUES.some((item) => item.text === firstDialogue)).toBe(true);

      act(() => petButton?.click());
      expect(petButton?.textContent).not.toBe(firstDialogue);
      expect(PET_HOME_DIALOGUES.some((item) => item.text === petButton?.textContent)).toBe(true);
    } finally {
      act(() => root.unmount());
    }
  });

  it('keeps the launch CTA, removes redundant milestones, and exposes the feature rail', () => {
    const mount = document.createElement('div');
    const root = createRoot(mount);
    const onOpenLessons = vi.fn();

    try {
      act(() => root.render(createElement(JourneyView, {
        petMood: 'idle',
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons,
      })));

      expect(mount.querySelector('.journey-layout')?.children).toHaveLength(3);
      expect(mount.querySelector('.journey-path')).toBeNull();
      expect(mount.querySelector('.journey-status')).toBeNull();
      expect(mount.querySelector('.path-entry-button')).toBeNull();
      expect(mount.textContent).not.toContain('Chặng khởi hành');
      expect(mount.textContent).not.toContain('Hoàn thành bài 6 để mở');
      expect(mount.textContent).not.toContain('Đủ 29 chặng trong danh mục bài học');
      expect(mount.textContent).not.toContain('Danh mục bài học');
      expect(mount.querySelector('.primary-cta')).not.toBeNull();
      expect(mount.querySelector('[data-journey-feature-rail]')).not.toBeNull();
      expect(mount.querySelector('[data-journey-feature="leaderboard"] img')?.getAttribute('src')).toBe('/art/hud/leaderboard.png');
      expect(mount.querySelector('[data-journey-feature="challenge"] img')?.getAttribute('src')).toBe('/art/hud/challenge.png');

      act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="leaderboard"]')?.click());
      expect(mount.querySelector('[data-coming-soon-dialog]')).not.toBeNull();
      expect(mount.textContent).toContain('Bảng xếp hạng đang được phát triển');

      act(() => mount.querySelector<HTMLButtonElement>('.feature-dialog-close')?.click());
      expect(mount.querySelector('[data-coming-soon-dialog]')).toBeNull();

      act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="challenge"]')?.click());
      expect(mount.textContent).toContain('Thách đố đang được phát triển');

      act(() => mount.querySelector<HTMLButtonElement>('.primary-cta')?.click());
      expect(onOpenLessons).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
    }
  });

  it('traps modal focus and restores it to the feature button after Escape', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(JourneyView, {
        petMood: 'idle',
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      })));

      const featureButton = mount.querySelector<HTMLButtonElement>('[data-journey-feature="leaderboard"]');
      expect(featureButton).not.toBeNull();
      act(() => featureButton?.focus());
      act(() => featureButton?.click());

      const closeButton = mount.querySelector<HTMLButtonElement>('.feature-dialog-close');
      const actionButton = mount.querySelector<HTMLButtonElement>('.feature-dialog-action');
      expect(document.activeElement).toBe(closeButton);

      act(() => {
        actionButton?.focus();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      });
      expect(document.activeElement).toBe(closeButton);

      act(() => {
        closeButton?.focus();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
      });
      expect(document.activeElement).toBe(actionButton);

      act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      expect(mount.querySelector('[data-coming-soon-dialog]')).toBeNull();
      expect(document.activeElement).toBe(featureButton);
    } finally {
      act(() => root.unmount());
      mount.remove();
    }
  });

  it('dismisses on backdrop press without dismissing when the dialog content is pressed', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(JourneyView, {
        petMood: 'idle',
        reducedMotion: false,
        onPetTap: vi.fn(),
        onOpenLessons: vi.fn(),
      })));
      act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="challenge"]')?.click());

      const dialog = mount.querySelector<HTMLElement>('[data-coming-soon-dialog]');
      const backdrop = mount.querySelector<HTMLElement>('.feature-dialog-backdrop');
      expect(dialog).not.toBeNull();
      expect(backdrop).not.toBeNull();

      act(() => dialog?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
      expect(mount.querySelector('[data-coming-soon-dialog]')).not.toBeNull();

      act(() => backdrop?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
      expect(mount.querySelector('[data-coming-soon-dialog]')).toBeNull();
    } finally {
      act(() => root.unmount());
      mount.remove();
    }
  });
});
