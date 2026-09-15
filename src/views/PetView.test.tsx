import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PET_HOME_DIALOGUES } from '../motion/petHomeConversation';
import { PetView } from './PetView';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../components/Pet', () => ({
  Pet: ({ message, messageTone, onTap }: { message?: string; messageTone?: string; onTap: () => void }) => createElement(
    'button',
    { type: 'button', 'data-test-pet-button': true, 'data-tone': messageTone, onClick: onTap },
    message,
  ),
}));

describe('PetView home companion', () => {
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

  it('starts with a catalog line and changes it on each Pet tap', () => {
    const onPetTap = vi.fn();
    act(() => root.render(createElement(PetView, {
      petMood: 'idle',
      reducedMotion: false,
      onPetTap,
      onOpenSettings: vi.fn(),
      stamps: [],
    })));

    const petButton = mount.querySelector<HTMLButtonElement>('[data-test-pet-button]');
    const before = petButton?.textContent ?? '';
    expect(PET_HOME_DIALOGUES.some((item) => item.text === before)).toBe(true);

    act(() => petButton?.click());

    expect(onPetTap).toHaveBeenCalledOnce();
    expect(petButton?.textContent).not.toBe(before);
    expect(PET_HOME_DIALOGUES.some((item) => item.text === petButton?.textContent)).toBe(true);
  });
});
