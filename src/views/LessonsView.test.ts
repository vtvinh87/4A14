import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { LessonsView } from './LessonsView';
import { getLessonPackage } from '../content/packages';
import { createDefaultProgress } from '../progress/storage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('lesson card artwork', () => {
  it('shows all 29 playable lessons and keeps navigation working after image failure', () => {
    const mount = document.createElement('div');
    const root = createRoot(mount);
    const onOpenLesson = vi.fn();
    try {
      act(() => root.render(createElement(LessonsView, {
        progress: createDefaultProgress(), onOpenLesson, onBack: vi.fn(),
      })));
      const images = [...mount.querySelectorAll<HTMLImageElement>('.lesson-card-art img')];
      expect(images).toHaveLength(29);
      expect(images[0].getAttribute('src')).toBe('/art/lessons/lesson-01.png');
      expect(images[6].getAttribute('src')).toBe('/art/lessons/lesson-07.png');
      expect(images[28].getAttribute('src')).toBe('/art/lessons/lesson-29.png');
      expect(mount.querySelectorAll('.lesson-card')).toHaveLength(29);
      expect(mount.querySelectorAll('.primary-small-button:disabled')).toHaveLength(28);
      expect(mount.querySelector('.lesson-grid')?.classList.contains('lesson-grid-three-up-landscape')).toBe(true);
      expect(mount.querySelector('.lesson-grid')?.getAttribute('data-landscape-columns')).toBe('3');
      expect(mount.textContent).toContain('Mỗi bài có năm nhiệm vụ');
      for (const image of images) {
        expect(image.alt.length).toBeGreaterThan(0);
        expect(image.getAttribute('loading')).toBe('lazy');
        expect(image.getAttribute('decoding')).toBe('async');
        expect(image.closest('[aria-hidden="true"]')).toBeNull();
      }
      act(() => images[0].dispatchEvent(new Event('error')));
      expect(mount.querySelector('.lesson-card-art img')).toBe(images[1]);
      expect(mount.querySelector('.lesson-art-water')).not.toBeNull();
      act(() => mount.querySelector<HTMLButtonElement>('.primary-small-button')!.click());
      expect(onOpenLesson).toHaveBeenCalledWith('lesson-01');
      expect(mount.textContent).toContain('29 bài học trong hành trình');
    } finally {
      act(() => root.unmount());
    }
  });
  it('opens the next card when the preceding lesson gains its fifth completed mission', () => {
    const mount = document.createElement('div');
    const root = createRoot(mount);
    const onOpenLesson = vi.fn();
    const progress = createDefaultProgress();
    const missionIds = getLessonPackage('lesson-01').missions.map(m => m.id);
    try {
      act(() => root.render(createElement(LessonsView, { progress: { ...progress, completedMissions: missionIds.slice(0, 4) }, onOpenLesson, onBack: vi.fn() })));
      expect(mount.querySelectorAll<HTMLButtonElement>('.primary-small-button')[1].disabled).toBe(true);
      act(() => root.render(createElement(LessonsView, { progress: { ...progress, completedMissions: missionIds }, onOpenLesson, onBack: vi.fn() })));
      const buttons = mount.querySelectorAll<HTMLButtonElement>('.primary-small-button');
      expect(buttons[1].disabled).toBe(false);
      expect(buttons[2].disabled).toBe(true);
      act(() => buttons[1].click());
      expect(onOpenLesson).toHaveBeenCalledWith('lesson-02');
    } finally { act(() => root.unmount()); }
  });

});
