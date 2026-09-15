import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '../../content/types';
import { buildBezierPath, getRelativeCenter } from './matchGeometry';
import { MatchBoard } from './MatchBoard';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const activity: Match = {
  id: 'match-test',
  objectiveId: 'objective-test',
  prompt: 'Ghép các thẻ trên đường thám hiểm.',
  hint: 'Mỗi thẻ chỉ ghép một lần.',
  explanation: 'Hãy nhìn kỹ từng manh mối.',
  source: { sourceId: 'vbt-lsdl4-2026', pdfPage: 1, printedPage: 1, locator: 'test' },
  reviewStatus: 'verified',
  type: 'match',
  pairs: [
    { leftId: 'left-a', left: 'Bản đồ', rightId: 'right-a', right: 'Thu nhỏ không gian' },
    { leftId: 'left-b', left: 'Biểu đồ', rightId: 'right-b', right: 'Thể hiện số liệu' },
  ],
};

type Rect = { left: number; top: number; width: number; height: number };

function setRect(element: Element, rect: Rect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect,
    }),
  });
}

type PointerOptions = { pointerId?: number; pointerType?: string; clientX?: number; clientY?: number; button?: number };

function dispatchPointer(target: Element, type: string, options: PointerOptions = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    pointerType: { value: options.pointerType ?? 'touch' },
    clientX: { value: options.clientX ?? 0 },
    clientY: { value: options.clientY ?? 0 },
    button: { value: options.button ?? 0 },
    isPrimary: { value: true },
  });
  act(() => target.dispatchEvent(event));
}

class TestResizeObserver {
  static instances: TestResizeObserver[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    TestResizeObserver.instances.push(this);
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe('MatchBoard geometry helpers', () => {
  it('maps viewport rectangles into the bordered and scrolled SVG coordinate space', () => {
    expect(getRelativeCenter(
      { left: 140, top: 77, width: 20, height: 20 },
      { left: 100, top: 50, width: 500, height: 200 },
      { scrollLeft: 12, scrollTop: 8, borderLeft: 2, borderTop: 3 },
    )).toEqual({ x: 60, y: 42 });
  });

  it('creates a cubic path whose endpoints remain the measured port centers', () => {
    expect(buildBezierPath({ x: 60, y: 42 }, { x: 460, y: 96 })).toBe('M 60 42 C 180 42, 340 96, 460 96');
  });
});

describe('MatchBoard', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    TestResizeObserver.instances = [];
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, writable: true, value: TestResizeObserver });
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
    vi.restoreAllMocks();
  });

  function renderBoard(overrides: Partial<Parameters<typeof MatchBoard>[0]> = {}) {
    const props: Parameters<typeof MatchBoard>[0] = {
      activity,
      pairs: [],
      selectedLeft: null,
      selectedRight: null,
      onLeft: vi.fn(),
      onRight: vi.fn(),
      ...overrides,
    };
    act(() => root.render(createElement(MatchBoard, props)));
    return props;
  }

  function setMeasuredPorts() {
    const surface = mount.querySelector<HTMLElement>('[data-match-board-surface]');
    const left = mount.querySelector<HTMLElement>('[data-match-port="left:left-a"]');
    const rightA = mount.querySelector<HTMLElement>('[data-match-port="right:right-a"]');
    const rightB = mount.querySelector<HTMLElement>('[data-match-port="right:right-b"]');
    if (!surface || !left || !rightA || !rightB) throw new Error('match board ports were not rendered');
    setRect(surface, { left: 100, top: 50, width: 700, height: 300 });
    setRect(left, { left: 145, top: 110, width: 20, height: 20 });
    setRect(rightA, { left: 735, top: 80, width: 20, height: 20 });
    setRect(rightB, { left: 735, top: 200, width: 20, height: 20 });
    return { surface, left, rightA, rightB };
  }

  it('draws a measured route between the actual guessed ports without correctness styling', () => {
    renderBoard({ pairs: [['left-a', 'right-b']] });
    setMeasuredPorts();
    act(() => TestResizeObserver.instances[0]?.trigger());

    const path = mount.querySelector<SVGPathElement>('[data-match-line="0"]');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBe('M 55 70 C 232 70, 468 160, 645 160');
    expect(path?.getAttribute('data-match-line-state')).toBe('connected');
    expect(path?.getAttribute('data-match-correct')).toBeNull();
    expect(mount.querySelectorAll('[data-match-endpoint]').length).toBe(2);
    expect(mount.querySelector('[data-match-endpoint="left:left-a:0"]')?.textContent).toContain('1');
    expect(mount.querySelectorAll('.match-rope, .match-connector, [data-match-rope]').length).toBe(0);
  });

  it('numbers and colors each route independently, including crossed guesses', () => {
    renderBoard({ pairs: [['left-a', 'right-b'], ['left-b', 'right-a']] });
    const surface = mount.querySelector<HTMLElement>('[data-match-board-surface]');
    const leftA = mount.querySelector<HTMLElement>('[data-match-port="left:left-a"]');
    const leftB = mount.querySelector<HTMLElement>('[data-match-port="left:left-b"]');
    const rightA = mount.querySelector<HTMLElement>('[data-match-port="right:right-a"]');
    const rightB = mount.querySelector<HTMLElement>('[data-match-port="right:right-b"]');
    if (!surface || !leftA || !leftB || !rightA || !rightB) throw new Error('match board ports were not rendered');
    setRect(surface, { left: 100, top: 50, width: 700, height: 300 });
    setRect(leftA, { left: 145, top: 90, width: 20, height: 20 });
    setRect(leftB, { left: 145, top: 190, width: 20, height: 20 });
    setRect(rightA, { left: 735, top: 90, width: 20, height: 20 });
    setRect(rightB, { left: 735, top: 190, width: 20, height: 20 });
    act(() => TestResizeObserver.instances[0]?.trigger());

    const endpointOne = mount.querySelector<SVGCircleElement>('[data-match-endpoint="left:left-a:0"] circle');
    const endpointTwo = mount.querySelector<SVGCircleElement>('[data-match-endpoint="left:left-b:1"] circle');
    expect(endpointOne?.getAttribute('fill')).not.toBe(endpointTwo?.getAttribute('fill'));
    expect(mount.querySelector('[data-match-endpoint="left:left-a:0"]')?.textContent).toContain('1');
    expect(mount.querySelector('[data-match-endpoint="left:left-b:1"]')?.textContent).toContain('2');
  });

  it('shows a temporary route for two selected endpoints while keeping it correctness agnostic', () => {
    renderBoard({ selectedLeft: 'left-a', selectedRight: 'right-b' });
    setMeasuredPorts();
    act(() => TestResizeObserver.instances[0]?.trigger());

    const preview = mount.querySelector<SVGPathElement>('[data-match-line="preview"]');
    expect(preview?.getAttribute('data-match-line-state')).toBe('preview');
    expect(preview?.getAttribute('data-match-correct')).toBeNull();
  });

  it('uses tap callbacks for selection and preserves endpoint identity for re-pairing', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    renderBoard({ onLeft, onRight, selectedLeft: 'left-a' });

    const left = mount.querySelector<HTMLButtonElement>('[data-match-card="left:left-a"]');
    const right = mount.querySelector<HTMLButtonElement>('[data-match-card="right:right-b"]');
    expect(left?.getAttribute('aria-pressed')).toBe('true');
    act(() => left?.click());
    act(() => right?.click());
    expect(onLeft).toHaveBeenCalledWith('left-a');
    expect(onRight).toHaveBeenCalledWith('right-b');
  });

  it('connects a valid drag through onConnect and cancels without invoking tap callbacks', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    const onConnect = vi.fn();
    renderBoard({ onLeft, onRight, onConnect });
    const { left, rightB } = setMeasuredPorts();
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => rightB });

    dispatchPointer(left, 'pointerdown', { pointerType: 'mouse', clientX: 155, clientY: 120 });
    dispatchPointer(left, 'pointermove', { pointerType: 'mouse', clientX: 280, clientY: 150 });
    dispatchPointer(left, 'pointerup', { pointerType: 'mouse', clientX: 745, clientY: 210 });

    expect(onConnect).toHaveBeenCalledWith('left-a', 'right-b');
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();

    onConnect.mockClear();
    dispatchPointer(left, 'pointerdown', { pointerType: 'mouse', clientX: 155, clientY: 120 });
    dispatchPointer(left, 'pointermove', { pointerType: 'mouse', clientX: 280, clientY: 150 });
    dispatchPointer(left, 'pointercancel', { pointerType: 'mouse', clientX: 280, clientY: 150 });
    expect(onConnect).not.toHaveBeenCalled();
  });

  it('keeps a live mouse tether from the measured port to the pointer while dragging', () => {
    const onConnect = vi.fn();
    renderBoard({ onConnect });
    const { surface, left } = setMeasuredPorts();
    act(() => TestResizeObserver.instances[0]?.trigger());

    dispatchPointer(left, 'pointerdown', { pointerType: 'mouse', clientX: 155, clientY: 120 });
    dispatchPointer(left, 'pointermove', { pointerType: 'mouse', clientX: 430, clientY: 250 });

    const tether = mount.querySelector<SVGPathElement>('[data-match-line="dragging"]');
    expect(tether?.getAttribute('data-match-line-state')).toBe('dragging');
    expect(tether?.getAttribute('d')).toContain('M 55 70');
    expect(tether?.getAttribute('d')).toContain('330 200');
    expect(mount.querySelectorAll('[data-match-endpoint]').length).toBe(0);

    dispatchPointer(left, 'pointerup', { pointerType: 'mouse', clientX: 430, clientY: 250 });
    expect(mount.querySelector('[data-match-line="dragging"]')).toBeNull();
    expect(surface).toBeTruthy();
  });

  it('keeps touch input as a tap fallback instead of starting a drag', () => {
    const onLeft = vi.fn();
    const onConnect = vi.fn();
    renderBoard({ onLeft, onConnect });
    const { left, rightB } = setMeasuredPorts();
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => rightB });

    dispatchPointer(left, 'pointerdown', { pointerType: 'touch', clientX: 155, clientY: 120 });
    dispatchPointer(left, 'pointermove', { pointerType: 'touch', clientX: 280, clientY: 150 });
    dispatchPointer(left, 'pointerup', { pointerType: 'touch', clientX: 745, clientY: 210 });
    expect(onConnect).not.toHaveBeenCalled();

    act(() => left.click());
    expect(onLeft).toHaveBeenCalledWith('left-a');
  });

  it('recomputes route coordinates when the observed board is resized', () => {
    renderBoard({ pairs: [['left-a', 'right-b']] });
    const { surface, left, rightB } = setMeasuredPorts();
    act(() => TestResizeObserver.instances[0]?.trigger());
    expect(mount.querySelector('[data-match-line="0"]')?.getAttribute('d')).toContain('M 55 70');

    setRect(surface, { left: 120, top: 70, width: 760, height: 360 });
    setRect(left, { left: 170, top: 150, width: 20, height: 20 });
    setRect(rightB, { left: 820, top: 300, width: 20, height: 20 });
    act(() => TestResizeObserver.instances[0]?.trigger());
    expect(mount.querySelector('[data-match-line="0"]')?.getAttribute('d')).toContain('M 60 90');
  });
});
