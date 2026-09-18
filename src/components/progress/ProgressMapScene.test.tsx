import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardLesson, ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { TOPICS } from '../../content/catalog';
import { ProgressMapScene } from './ProgressMapScene';
import type { MapSelection } from './progressMapPresentation';

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
const baseProps = {
  topics,
  nextLessonId: 'lesson-01',
  reducedMotion: false,
  selection: { kind: 'welcome' } as MapSelection,
};

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

  it('renders the original illustrated map, five topic markers and both archipelago labels', () => {
    const onSelectTopic = vi.fn();
    act(() => root.render(createElement(ProgressMapScene, {
      ...baseProps,
      onSelectTopic,
      onSelectLandmark: vi.fn(),
    })));

    expect(mount.querySelector('[data-progress-map]')).not.toBeNull();
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('src')).toBe('/art/progress/vietnam-progress-map-illustrated.png');
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('width')).toBe('1840');
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('height')).toBe('1940');
    expect(mount.querySelectorAll('[data-progress-map-node]')).toHaveLength(5);
    expect(mount.querySelector('[data-progress-map-node="Địa phương em"]')).toBeNull();
    expect(mount.querySelector('[data-progress-map-route]')).toBeNull();
    expect(mount.querySelector('polyline')).toBeNull();
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('alt')).toMatch(/Hoàng Sa.*Trường Sa|Trường Sa.*Hoàng Sa/);
    expect(mount.textContent).toContain('Hoàng Sa');
    expect(mount.textContent).toContain('Trường Sa');

    const centralNode = mount.querySelector<HTMLButtonElement>('[data-progress-map-node="Duyên hải miền Trung"]')!;
    expect(centralNode.getAttribute('aria-pressed')).toBe('false');
    act(() => centralNode.click());
    expect(onSelectTopic).toHaveBeenCalledWith('Duyên hải miền Trung');
  });

  it('renders five topic shells for an empty board and exposes reduced motion', () => {
    act(() => root.render(createElement(ProgressMapScene, {
      ...baseProps,
      topics: [],
      nextLessonId: null,
      reducedMotion: true,
      onSelectTopic: vi.fn(),
      onSelectLandmark: vi.fn(),
    })));

    expect(mount.querySelectorAll('[data-progress-map-node]')).toHaveLength(5);
    expect(mount.querySelector('[data-progress-map][data-reduced-motion="true"]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-route]')).toBeNull();
  });

  it('exposes eight 44px landmark controls and delegates selection to the dialog owner', () => {
    const onSelectLandmark = vi.fn();
    act(() => root.render(createElement(ProgressMapScene, {
      ...baseProps,
      onSelectTopic: vi.fn(),
      onSelectLandmark,
    })));

    expect(mount.querySelectorAll('[data-progress-map-landmark]')).toHaveLength(8);
    const button = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hoa-lu"]')!;
    expect(button.getAttribute('aria-label')).toBe('Mở thông tin Cố đô Hoa Lư');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    act(() => button.click());
    expect(onSelectLandmark).toHaveBeenCalledWith('hoa-lu');
  });

  it('returns focus to a landmark trigger when the owner closes its shared panel', () => {
    const render = (selection: MapSelection) => act(() => root.render(createElement(ProgressMapScene, {
      ...baseProps,
      selection,
      onSelectTopic: vi.fn(),
      onSelectLandmark: vi.fn(),
    })));

    render({ kind: 'welcome' });
    const button = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hue"]')!;
    act(() => button.focus());
    render({ kind: 'landmark', landmarkId: 'hue' });
    render({ kind: 'welcome' });
    expect(document.activeElement).toBe(button);
  });

  it('marks only the selected region without selecting the local compass topic', () => {
    act(() => root.render(createElement(ProgressMapScene, {
      ...baseProps,
      selection: { kind: 'topic', topicName: 'Duyên hải miền Trung' },
      onSelectTopic: vi.fn(),
      onSelectLandmark: vi.fn(),
    })));

    expect(mount.querySelector('[data-progress-map-node="Duyên hải miền Trung"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(mount.querySelectorAll('[data-progress-map-node][aria-pressed="true"]')).toHaveLength(1);
  });
});
