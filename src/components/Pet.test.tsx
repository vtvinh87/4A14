import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pet } from './Pet';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./FoxPet2D5D', () => ({
  FoxPet2D5D: () => null,
}));

describe('Pet speech bubble', () => {
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

  it('marks a full-size bubble with its tone for the visual treatment', () => {
    act(() => root.render(createElement(Pet, {
      mood: 'idle',
      reducedMotion: false,
      onTap: vi.fn(),
      message: 'Tớ đang nghe đây. Cậu cứ suy nghĩ thật bình tĩnh nhé.',
      messageTone: 'playful',
      size: 'full',
    })));

    const bubble = mount.querySelector('.pet-bubble');
    expect(bubble?.classList.contains('pet-bubble-full')).toBe(true);
    expect(bubble?.classList.contains('pet-bubble-tone-playful')).toBe(true);
  });
});
