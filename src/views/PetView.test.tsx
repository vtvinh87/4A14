import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PET_HOME_DIALOGUES_BY_PET } from '../motion/petHomeConversation';
import { PetView } from './PetView';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../components/Pet', () => ({
  Pet: ({ message, messageTone, onTap, pet }: { message?: string; messageTone?: string; onTap: () => void; pet?: { id: string } }) => createElement(
    'button',
    { type: 'button', 'data-test-pet-button': true, 'data-pet-id': pet?.id ?? 'missing', 'data-tone': messageTone, onClick: onTap },
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
    expect(PET_HOME_DIALOGUES_BY_PET['fox-orange'].some((item) => item.text === before)).toBe(true);

    act(() => petButton?.click());

    expect(onPetTap).toHaveBeenCalledOnce();
    expect(petButton?.textContent).not.toBe(before);
    expect(PET_HOME_DIALOGUES_BY_PET['fox-orange'].some((item) => item.text === petButton?.textContent)).toBe(true);
  });

  it('uses the selected unlocked Pet catalog for the home dialogue', () => {
    act(() => root.render(createElement(PetView, {
      petMood: 'idle',
      reducedMotion: false,
      onPetTap: vi.fn(),
      onOpenSettings: vi.fn(),
      stamps: ['stamp-lesson-09', 'stamp-lesson-19', 'stamp-lesson-29'],
    })));

    for (const petId of ['fox-orange', 'elephant-blue', 'owl-purple', 'dragon-jade'] as const) {
      act(() => mount.querySelector<HTMLButtonElement>(`[data-pet-card][data-pet-id="${petId}"]`)?.click());

      const petButton = mount.querySelector<HTMLButtonElement>('[data-test-pet-button]');
      const catalog = PET_HOME_DIALOGUES_BY_PET[petId];
      const dialogue = catalog.find((item) => item.text === petButton?.textContent);

      expect(petButton?.dataset.petId).toBe(petId);
      expect(dialogue).toBeDefined();
      expect(petButton?.dataset.tone).toBe(dialogue?.tone);
    }
  });
});
