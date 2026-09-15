import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingPet } from './FloatingPet';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./Pet', () => ({
  Pet: ({ onTap, mood, message }: { onTap: () => void; mood: string; message?: string }) => createElement('button', { type: 'button', 'data-testid': 'pet-tap', 'data-mood': mood, onClick: onTap }, message ?? 'Pet'),
}));

type PointerOptions = {
  pointerId?: number;
  pointerType?: string;
  clientX?: number;
  clientY?: number;
  button?: number;
};

function pointerEvent(type: string, options: PointerOptions = {}): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    pointerType: { value: options.pointerType ?? 'touch' },
    clientX: { value: options.clientX ?? 0 },
    clientY: { value: options.clientY ?? 0 },
    button: { value: options.button ?? 0 },
    isPrimary: { value: true },
  });
  return event;
}

function dispatchPointer(target: Element, type: string, options: PointerOptions = {}) {
  act(() => {
    target.dispatchEvent(pointerEvent(type, options));
  });
}

function dispatchClick(target: Element) {
  act(() => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

function dispatchKey(target: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

function getWidget(): HTMLDivElement {
  const widget = document.querySelector<HTMLDivElement>('[data-floating-pet-widget]');
  if (!widget) throw new Error('floating Pet widget was not rendered');
  return widget;
}

describe('FloatingPet', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '<div class="world-overlay"><div class="content-view"></div></div><div id="mount"></div>';
    mount = document.querySelector<HTMLDivElement>('#mount')!;
    setViewport(1200, 800);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = '';
  });

  function renderPet(onTap = vi.fn(), props: { message?: string; followUpMessage?: string; tapMessage?: string } = {}) {
    act(() => {
      root.render(createElement(FloatingPet, { mood: 'idle', reducedMotion: false, onTap, ...props }));
    });
    return onTap;
  }

  it('temporarily shows the tap greeting and greet mood before returning to the automatic cue', () => {
    vi.useFakeTimers();
    const onTap = renderPet(vi.fn(), { message: 'Cậu đang làm rất tốt!', tapMessage: 'Tớ vẫy tay cổ vũ cậu đây!' });
    const button = document.querySelector<HTMLButtonElement>('[data-testid="pet-tap"]')!;

    expect(button.textContent).toBe('Cậu đang làm rất tốt!');
    expect(button.dataset.mood).toBe('idle');

    dispatchClick(button);

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(button.textContent).toBe('Tớ vẫy tay cổ vũ cậu đây!');
    expect(button.dataset.mood).toBe('greet');

    act(() => vi.advanceTimersByTime(7999));
    expect(button.textContent).toBe('Tớ vẫy tay cổ vũ cậu đây!');
    expect(button.dataset.mood).toBe('greet');

    act(() => vi.advanceTimersByTime(1));
    expect(button.textContent).toBe('Cậu đang làm rất tốt!');
    expect(button.dataset.mood).toBe('idle');
    vi.useRealTimers();
  });

  it('rotates a long source follow-up after the short automatic cue', () => {
    vi.useFakeTimers();
    renderPet(vi.fn(), { message: 'Chọn một thẻ ở mỗi cột nhé.', followUpMessage: 'Xem trong sách: trang 6.' });
    const button = document.querySelector<HTMLButtonElement>('[data-testid="pet-tap"]')!;

    expect(button.textContent).toBe('Chọn một thẻ ở mỗi cột nhé.');
    act(() => vi.advanceTimersByTime(7999));
    expect(button.textContent).toBe('Chọn một thẻ ở mỗi cột nhé.');
    act(() => vi.advanceTimersByTime(1));
    expect(button.textContent).toBe('Xem trong sách: trang 6.');
    vi.useRealTimers();
  });

  function enablePointerCapture(element: HTMLElement) {
    let captured = false;
    const setPointerCapture = vi.fn(() => { captured = true; });
    const hasPointerCapture = vi.fn(() => captured);
    const releasePointerCapture = vi.fn(() => { captured = false; });
    Object.defineProperties(element, {
      setPointerCapture: { configurable: true, value: setPointerCapture },
      hasPointerCapture: { configurable: true, value: hasPointerCapture },
      releasePointerCapture: { configurable: true, value: releasePointerCapture },
    });
    return { setPointerCapture, releasePointerCapture };
  }

  it('portals outside transformed content and preserves tap while suppressing drag click', () => {
    const onTap = renderPet();
    const layer = document.querySelector<HTMLElement>('[data-floating-pet-layer]');
    const widget = getWidget();
    const button = document.querySelector<HTMLButtonElement>('[data-testid="pet-tap"]')!;
    const capture = enablePointerCapture(button);

    expect(layer?.parentElement?.className).toBe('world-overlay');
    expect(mount.querySelector('[data-floating-pet-layer]')).toBeNull();

    dispatchPointer(button, 'pointerdown', { clientX: 900, clientY: 650 });
    dispatchPointer(button, 'pointerup', { clientX: 900, clientY: 650 });
    dispatchClick(button);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(capture.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(1);

    const startLeft = Number.parseFloat(widget.style.left);
    const startTop = Number.parseFloat(widget.style.top);
    dispatchPointer(button, 'pointerdown', { clientX: 900, clientY: 650 });
    dispatchPointer(widget, 'pointermove', { clientX: 1020, clientY: 570 });
    dispatchPointer(widget, 'pointerup', { clientX: 1020, clientY: 570 });
    dispatchClick(button);

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(Number.parseFloat(widget.style.left)).toBe(startLeft + 120);
    expect(Number.parseFloat(widget.style.top)).toBe(startTop - 80);
  });

  it('keeps a fast drag captured by the Pet button after the pointer leaves the widget', () => {
    setViewport(820, 1180);
    const onTap = renderPet();
    const widget = getWidget();
    const button = document.querySelector<HTMLButtonElement>('[data-testid="pet-tap"]')!;
    const capture = enablePointerCapture(button);
    const startLeft = Number.parseFloat(widget.style.left);
    const startTop = Number.parseFloat(widget.style.top);

    dispatchPointer(button, 'pointerdown', { clientX: 110, clientY: 410 });
    dispatchPointer(button, 'pointermove', { clientX: 560, clientY: 1030 });
    dispatchPointer(button, 'pointerup', { clientX: 560, clientY: 1030 });
    dispatchClick(button);

    expect(capture.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledTimes(0);
    expect(Number.parseFloat(widget.style.left)).toBeGreaterThan(startLeft);
    expect(Number.parseFloat(widget.style.top)).toBeGreaterThan(startTop);
    expect(Number.parseFloat(widget.style.left)).toBe(startLeft + 450);
    expect(Number.parseFloat(widget.style.top)).toBe(startTop + 620);
  });

  it('cleans pointer cancellation and supports keyboard movement with viewport bounds', () => {
    const onTap = renderPet();
    const widget = getWidget();
    const button = document.querySelector<HTMLButtonElement>('[data-testid="pet-tap"]')!;

    dispatchPointer(widget, 'pointerdown', { clientX: 900, clientY: 650 });
    dispatchPointer(widget, 'pointermove', { clientX: 780, clientY: 570 });
    dispatchPointer(widget, 'pointercancel', { clientX: 780, clientY: 570 });

    dispatchPointer(button, 'pointerdown', { clientX: 780, clientY: 570 });
    dispatchPointer(widget, 'pointerup', { clientX: 780, clientY: 570 });
    dispatchClick(button);
    expect(onTap).toHaveBeenCalledTimes(1);

    const beforeKeyboard = Number.parseFloat(widget.style.left);
    const keyEvent = dispatchKey(widget, 'ArrowRight');
    expect(keyEvent.defaultPrevented).toBe(true);
    expect(Number.parseFloat(widget.style.left)).toBe(beforeKeyboard + 24);

    setViewport(360, 240);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(Number.parseFloat(widget.style.left)).toBe(28);
    expect(Number.parseFloat(widget.style.top)).toBe(140);
  });

  it('cleans an unexpected lost pointer capture without leaking the next tap', () => {
    const onTap = renderPet();
    const widget = getWidget();
    const button = document.querySelector<HTMLButtonElement>('[data-testid="pet-tap"]')!;

    dispatchPointer(button, 'pointerdown', { clientX: 900, clientY: 650 });
    dispatchPointer(widget, 'pointermove', { clientX: 780, clientY: 570 });
    dispatchPointer(widget, 'lostpointercapture', { clientX: 780, clientY: 570 });
    dispatchClick(button);
    expect(onTap).toHaveBeenCalledTimes(0);

    dispatchPointer(button, 'pointerdown', { clientX: 780, clientY: 570 });
    dispatchPointer(widget, 'pointerup', { clientX: 780, clientY: 570 });
    dispatchClick(button);
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
