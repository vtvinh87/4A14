import { act, createElement, Fragment, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Choice, Mission, Order, Select, SourceRef } from '../../content/types';
import type { StampArtifact } from '../../content/stampArtifacts';
import { MVP_LESSON_PACKAGES } from '../../content/packages';
import {
  DiscoveryReveal,
  ExpeditionChoice,
  getStableChoiceOptions,
  OrderRouteBuilder,
  SatchelSelect,
} from './ExpeditionInteractions';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const source: SourceRef = {
  sourceId: 'sgk-lsdl4-sample',
  pdfPage: 1,
  printedPage: 1,
  locator: 'Mở đầu',
};

const stamp: StampArtifact = {
  lessonId: 'lesson-01',
  name: 'Mũi Tên Cổ Loa',
  region: 'Địa phương em',
  src: '/art/stamps/stamp-01.png',
  alt: 'Mũi tên đồng Cổ Loa',
  story: 'Một manh mối lịch sử.',
  sourceNote: 'Bài 01.',
};

const mission: Mission = {
  id: 'mission-test',
  title: 'Mở túi nhà thám hiểm',
  discovery: [
    { text: 'Bản đồ giúp tìm đường.', source },
    { text: 'Chú giải giúp hiểu kí hiệu.', source },
  ],
  activities: [],
};

const order: Order = {
  id: 'order-test',
  objectiveId: 'objective-test',
  type: 'order',
  prompt: 'Xếp tuyến đường.',
  hint: 'Bắt đầu ở cổng.',
  explanation: 'Đường đi có thứ tự.',
  source,
  reviewStatus: 'verified',
  items: [
    { id: 'gate', text: 'Cổng làng' },
    { id: 'river', text: 'Bến sông' },
    { id: 'hill', text: 'Đỉnh đồi' },
  ],
  correctOrder: ['gate', 'river', 'hill'],
};

const select: Select = {
  id: 'select-test',
  objectiveId: 'objective-test',
  type: 'select',
  prompt: 'Nhặt manh mối.',
  hint: 'Tìm dấu của dòng sông.',
  explanation: 'Hai mảnh ghép liên quan.',
  source,
  reviewStatus: 'verified',
  options: [
    { id: 'river', text: 'Phù sa bên bờ sông' },
    { id: 'boat', text: 'Chiếc ghe trên kênh' },
    { id: 'snow', text: 'Tuyết trên núi xa' },
  ],
  correctIds: ['river', 'boat'],
};

const choice: Choice = {
  id: 'choice-test',
  objectiveId: 'objective-test',
  type: 'choice',
  prompt: 'Chọn lối đi.',
  hint: 'Quan sát dấu chân.',
  explanation: 'Mỗi quyết định mở một đoạn đường.',
  source,
  reviewStatus: 'verified',
  options: [
    { id: 'map', text: 'Theo bản đồ có chú giải' },
    { id: 'guess', text: 'Đoán theo màu sắc' },
  ],
  correctId: 'map',
};

function Harness({
  children,
  initialIds = [],
}: {
  children: (ids: string[], setIds: (next: string[]) => void) => ReactNode;
  initialIds?: string[];
}) {
  const [ids, setIds] = useState(initialIds);
  return createElement(Fragment, null, children(ids, setIds));
}

describe('expedition interactions', () => {
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

  it('reveals each clue card before enabling the discovery handoff', () => {
    const onDone = vi.fn();
    act(() => {
      root.render(createElement(DiscoveryReveal, { mission, stamp, onDone }));
    });

    expect(mount.querySelector('[data-discovery-content="0"]')).toBeNull();
    expect(mount.querySelector<HTMLButtonElement>('[data-discovery-done]')?.disabled).toBe(true);

    act(() => mount.querySelector<HTMLButtonElement>('[data-discovery-reveal="0"]')?.click());
    expect(mount.querySelector('[data-discovery-content="0"]')?.textContent).toContain('Bản đồ giúp tìm đường.');
    expect(mount.querySelector<HTMLButtonElement>('[data-discovery-done]')?.disabled).toBe(true);

    act(() => mount.querySelector<HTMLButtonElement>('[data-discovery-reveal="1"]')?.click());
    expect(mount.querySelector<HTMLButtonElement>('[data-discovery-done]')?.disabled).toBe(false);
    act(() => mount.querySelector<HTMLButtonElement>('[data-discovery-done]')?.click());
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('places route tiles from the bank and supports undo plus accessible moves', () => {
    act(() => {
      root.render(createElement(Harness, {
        children: (ids: string[], setIds: (next: string[]) => void) => createElement(OrderRouteBuilder, {
          activity: order,
          placedIds: ids,
          onPlace: (id: string) => setIds([...ids, id]),
          onUndo: () => setIds(ids.slice(0, -1)),
          onMove: (index: number, delta: number) => {
            const next = [...ids];
            const target = index + delta;
            if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
            setIds(next);
          },
        }),
      }));
    });

    const initialBankIds = [...mount.querySelectorAll<HTMLButtonElement>('[data-route-bank]')].map((item) => item.dataset.routeBank);
    expect(initialBankIds).not.toEqual(order.correctOrder);
    expect(mount.querySelectorAll('[data-route-placed]')).toHaveLength(0);
    expect(mount.querySelector<HTMLButtonElement>('[data-route-undo]')?.disabled).toBe(true);
    act(() => mount.querySelector<HTMLButtonElement>('[data-route-bank="gate"]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-route-bank="river"]')?.click());
    expect([...mount.querySelectorAll('.route-stop-copy')].map((item) => item.textContent)).toEqual(['Cổng làng', 'Bến sông']);
    expect(mount.querySelector<HTMLButtonElement>('[data-route-move="1-up"]')?.getAttribute('aria-label')).toContain('Đưa “Bến sông” lên');
    act(() => mount.querySelector<HTMLButtonElement>('[data-route-undo]')?.click());
    expect([...mount.querySelectorAll('.route-stop-copy')].map((item) => item.textContent)).toEqual(['Cổng làng']);
    expect([...mount.querySelectorAll<HTMLButtonElement>('[data-route-bank]')].map((item) => item.dataset.routeBank)).toEqual(initialBankIds.filter((id) => id !== 'gate'));
    act(() => mount.querySelector<HTMLButtonElement>('[data-route-undo]')?.click());
    expect([...mount.querySelectorAll<HTMLButtonElement>('[data-route-bank]')].map((item) => item.dataset.routeBank)).toEqual(initialBankIds);
  });

  it('keeps collected clues visible in the satchel and allows removing one', () => {
    act(() => {
      root.render(createElement(Harness, {
        children: (ids: string[], setIds: (next: string[]) => void) => createElement(SatchelSelect, {
          activity: select,
          selectedIds: ids,
          onToggle: (id: string) => setIds(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]),
        }),
      }));
    });

    act(() => mount.querySelector<HTMLButtonElement>('[data-satchel-option="river"]')?.click());
    expect(mount.querySelector('[data-satchel-item="river"]')?.textContent).toContain('Phù sa bên bờ sông');
    expect(mount.querySelector('[data-satchel-empty]')).toBeNull();
    act(() => mount.querySelector<HTMLButtonElement>('[data-satchel-remove="river"]')?.click());
    expect(mount.querySelector('[data-satchel-item="river"]')).toBeNull();
    expect(mount.querySelector('[data-satchel-empty]')).not.toBeNull();
  });

  it('marks a selected choice as the expedition decision without revealing correctness', () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(createElement(ExpeditionChoice, { activity: choice, selectedId: null, onSelect }));
    });

    const option = mount.querySelector<HTMLButtonElement>('[data-choice-option="map"]')!;
    expect(option.getAttribute('aria-pressed')).toBe('false');
    expect(mount.textContent).not.toContain('Đúng');
    act(() => option.click());
    expect(onSelect).toHaveBeenCalledWith('map');
  });

  it('keeps choice order stable per activity while varying seeded answer positions', () => {
    const choices = MVP_LESSON_PACKAGES.flatMap((lesson) => lesson.missions.flatMap((mission) => mission.activities.filter((activity): activity is Choice => activity.type === 'choice')));
    const positions = choices.map((activity) => getStableChoiceOptions(activity).findIndex((option) => option.id === activity.correctId));

    expect(choices.length).toBeGreaterThanOrEqual(29);
    expect(new Set(positions).size).toBeGreaterThan(1);
    expect(positions.some((position) => position === 0)).toBe(true);
    expect(positions.some((position) => position > 0)).toBe(true);
    expect(getStableChoiceOptions(choice).map((option) => option.id)).toEqual(getStableChoiceOptions(choice).map((option) => option.id));
    expect(getStableChoiceOptions(choice).map((option) => option.id).sort()).toEqual(choice.options.map((option) => option.id).sort());
  });
});
