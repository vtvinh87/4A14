import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardLesson, ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { TOPICS } from '../../content/catalog';
import { ProgressMapScene } from './ProgressMapScene';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lesson = (topic: string, index: number): ProgressBoardLesson => ({
  lessonId: `lesson-${String(index + 1).padStart(2, '0')}`,
  title: `Chặng ${index + 1}`,
  topic,
  completed: index === 2,
  state: index < 2 ? 'explored' : index === 2 ? 'independent' : 'not_started',
  completedMissionCount: index < 2 ? 2 : index === 2 ? 5 : 0,
  missionCount: 5,
  objectives: [],
  nextAction: index === 2 ? 'celebrate' : index < 2 ? 'practice' : 'explore',
});

const topics: ProgressBoardTopic[] = TOPICS.map((topic, index) => ({ topic, lessons: [lesson(topic, index)] }));

describe('ProgressMapScene', () => {
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

  it('renders the illustrated Vietnam map, six topic nodes and both archipelago labels', () => {
    const onSelectLesson = vi.fn();
    act(() => root.render(createElement(ProgressMapScene, {
      topics,
      nextLessonId: 'lesson-01',
      selectedLessonId: 'lesson-01',
      reducedMotion: false,
      onSelectLesson,
      onOpenLesson: vi.fn(),
    })));

    expect(mount.querySelector('[data-progress-map]')).not.toBeNull();
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('src')).toBe('/art/progress/vietnam-progress-map-illustrated.png');
    expect(mount.querySelectorAll('[data-progress-map-node]')).toHaveLength(6);
    expect(mount.querySelector('[data-progress-map-route]')).toBeNull();
    expect(mount.querySelector('polyline')).toBeNull();
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('alt')).toMatch(/Hoàng Sa.*Trường Sa|Trường Sa.*Hoàng Sa/);
    expect(mount.textContent).toContain('Hoàng Sa');
    expect(mount.textContent).toContain('Trường Sa');

    const firstNode = mount.querySelector<HTMLButtonElement>('[data-progress-map-node="Địa phương em"]')!;
    expect(firstNode.getAttribute('aria-label')).toContain('Địa phương em');
    expect(firstNode.getAttribute('aria-pressed')).toBe('true');
    expect(firstNode.getAttribute('data-progress-state')).toBe('explored');
    act(() => firstNode.click());
    expect(onSelectLesson).toHaveBeenCalledWith('lesson-01');
  });

  it('renders all topic shells for an empty board and exposes reduced motion', () => {
    act(() => root.render(createElement(ProgressMapScene, {
      topics: [],
      nextLessonId: null,
      selectedLessonId: null,
      reducedMotion: true,
      onSelectLesson: vi.fn(),
      onOpenLesson: vi.fn(),
    })));

    expect(mount.querySelectorAll('[data-progress-map-node]')).toHaveLength(6);
    expect(mount.querySelector('[data-progress-map][data-reduced-motion="true"]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-route]')).toBeNull();
  });

  it('exposes eight landmark controls and opens a short card', () => {
    act(() => root.render(createElement(ProgressMapScene, {
      topics,
      nextLessonId: 'lesson-01',
      selectedLessonId: 'lesson-01',
      reducedMotion: true,
      onSelectLesson: vi.fn(),
      onOpenLesson: vi.fn(),
    })));

    expect(mount.querySelectorAll('[data-progress-map-landmark]')).toHaveLength(8);
    const button = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hoa-lu"]')!;
    expect(button.getAttribute('aria-label')).toBe('Mở thông tin Cố đô Hoa Lư');
    act(() => button.click());
    const card = mount.querySelector('[data-progress-map-landmark-card="hoa-lu"]');
    expect(card).not.toBeNull();
    expect(card?.parentElement).toBe(mount.querySelector('[data-progress-map]'));
    expect(mount.querySelector('[data-progress-map-canvas]')?.contains(card)).toBe(false);
  });

  it('closes the landmark card and returns focus to its trigger', () => {
    act(() => root.render(createElement(ProgressMapScene, {
      topics,
      nextLessonId: 'lesson-01',
      selectedLessonId: 'lesson-01',
      reducedMotion: true,
      onSelectLesson: vi.fn(),
      onOpenLesson: vi.fn(),
    })));

    const button = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hue"]')!;
    act(() => button.click());
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng Cố đô Huế"]')?.click());
    expect(mount.querySelector('[data-progress-map-landmark-card="hue"]')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('does not reopen a completed topic by falling back to its first lesson', () => {
    const completedTopic = TOPICS.map((topic) => ({
      topic,
      lessons: [lesson(topic, 2)],
    }));
    const onSelectLesson = vi.fn();
    const onSelectTopic = vi.fn();
    act(() => root.render(createElement(ProgressMapScene, {
      topics: completedTopic,
      nextLessonId: null,
      selectedLessonId: null,
      reducedMotion: false,
      onSelectLesson,
      onSelectTopic,
      onOpenLesson: vi.fn(),
    })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-node="Địa phương em"]')?.click());
    expect(onSelectLesson).not.toHaveBeenCalled();
    expect(onSelectTopic).toHaveBeenCalledWith('Địa phương em');
  });
});
