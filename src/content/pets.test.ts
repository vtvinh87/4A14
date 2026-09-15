import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPetById, isPetUnlocked, PETS } from './pets';
import { PetView } from '../views/PetView';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../components/Pet', () => ({
  Pet: ({ pet }: { pet?: { name: string } }) => createElement('div', { 'data-testid': 'active-pet' }, pet?.name ?? 'Cáo Nhỏ'),
}));

describe('Pet companion catalogue', () => {
  it('declares the orange fox plus three distinct unlockable adventure pets', () => {
    expect(PETS).toHaveLength(4);
    expect(PETS.map((pet) => pet.id)).toEqual(['fox-orange', 'elephant-blue', 'owl-purple', 'dragon-jade']);
    expect(PETS.map((pet) => pet.requiredStamp)).toEqual([null, 'stamp-lesson-09', 'stamp-lesson-19', 'stamp-lesson-29']);
    expect(new Set(PETS.map((pet) => pet.color)).size).toBe(4);
    for (const pet of PETS) {
      expect(pet.name.trim().split(/\s+/).length).toBeLessThanOrEqual(4);
      expect(pet.image.src).toMatch(pet.id === 'fox-orange' ? /^\/art\/fox-pet-alpha\.png$/ : /^\/art\/pets\/.+\.png$/);
      expect(pet.image.alt.length).toBeGreaterThan(0);
      expect(pet.description.length).toBeGreaterThan(20);
      expect(pet.story.length).toBeGreaterThan(20);
      expect(pet.personality.length).toBeGreaterThan(20);
      expect(pet.cue.length).toBeGreaterThan(0);
    }
    expect(getPetById('dragon-jade').requiredStamp).toBe('stamp-lesson-29');
  });

  it('opens each new pet only after its matching lesson stamp exists', () => {
    const [fox, elephant, owl, dragon] = PETS;
    expect(isPetUnlocked(fox, [])).toBe(true);
    expect(isPetUnlocked(elephant, [])).toBe(false);
    expect(isPetUnlocked(elephant, ['stamp-lesson-09'])).toBe(true);
    expect(isPetUnlocked(owl, ['stamp-lesson-09'])).toBe(false);
    expect(isPetUnlocked(owl, ['stamp-lesson-19'])).toBe(true);
    expect(isPetUnlocked(dragon, ['stamp-lesson-29'])).toBe(true);
    expect(isPetUnlocked(dragon, ['stamp-lesson-09', 'stamp-lesson-19'])).toBe(false);
  });
});

describe('PetView catalogue', () => {
  let mount: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('shows three locked pets with their lesson milestones before any new stamp', () => {
    act(() => root.render(createElement(PetView, {
      petMood: 'idle',
      reducedMotion: false,
      onPetTap: vi.fn(),
      onOpenSettings: vi.fn(),
      stamps: [],
    })));

    expect(mount.querySelector('#pet-title')?.textContent).toBe('Pet của tôi');
    expect(mount.querySelectorAll('[data-pet-card]')).toHaveLength(4);
    expect(mount.querySelectorAll('[data-pet-card][data-locked="true"]')).toHaveLength(3);
    expect(mount.textContent).toContain('Mở sau dấu Bài 09');
    expect(mount.textContent).toContain('Mở sau dấu Bài 19');
    expect(mount.textContent).toContain('Mở sau dấu Bài 29');
    expect(mount.querySelector('.pet-feature-grid')).toBeNull();
    expect(mount.textContent).not.toContain('Biểu cảm nhẹ nhàng');
  });

  it('renders the three new pet artworks as selectable after their stamps are earned', () => {
    act(() => root.render(createElement(PetView, {
      petMood: 'idle',
      reducedMotion: false,
      onPetTap: vi.fn(),
      onOpenSettings: vi.fn(),
      stamps: ['stamp-lesson-09', 'stamp-lesson-19', 'stamp-lesson-29'],
    })));

    expect(mount.querySelectorAll('[data-pet-card][data-locked="true"]')).toHaveLength(0);
    expect(mount.querySelectorAll('img[data-pet-art]')).toHaveLength(4);
    expect(mount.querySelector('img[data-pet-art][src="/art/pets/voi-nui-xanh.png"]')).not.toBeNull();
    expect(mount.querySelector('img[data-pet-art][src="/art/pets/cu-tim-tham-hiem.png"]')).not.toBeNull();
    expect(mount.querySelector('img[data-pet-art][src="/art/pets/rong-ngoc.png"]')).not.toBeNull();
    expect(mount.querySelectorAll('[data-pet-card][aria-disabled="true"]')).toHaveLength(0);
    expect(mount.querySelector('[data-pet-description]')?.textContent).toContain('Cáo Nhỏ');
    expect(mount.querySelector('[data-pet-story]')?.textContent).toContain('chiếc la bàn');
    expect(mount.querySelector('[data-pet-personality]')?.textContent).toContain('Tính cách');

    act(() => mount.querySelector<HTMLButtonElement>('[data-pet-card][data-pet-id="owl-purple"]')?.click());
    expect(mount.querySelector('[data-pet-detail-title]')?.textContent).toContain('Cú Tím Thám Hiểm');
    expect(mount.querySelector('[data-pet-description]')?.textContent).toContain('Cú Tím Thám Hiểm');
    expect(mount.querySelector('[data-pet-story]')?.textContent).toContain('mái ngói cổ');
    expect(mount.querySelector('[data-pet-personality]')?.textContent).toContain('Thông thái');
  });

  it('lets a locked pet show its unlock guidance instead of disabling the card', () => {
    act(() => root.render(createElement(PetView, {
      petMood: 'idle',
      reducedMotion: false,
      onPetTap: vi.fn(),
      onOpenSettings: vi.fn(),
      stamps: [],
    })));

    const lockedCard = mount.querySelector<HTMLButtonElement>('[data-pet-card][data-pet-id="elephant-blue"]');
    expect(lockedCard).not.toBeNull();
    expect(lockedCard?.disabled).toBe(false);
    expect(lockedCard?.getAttribute('aria-disabled')).toBeNull();

    act(() => lockedCard?.click());

    expect(mount.querySelector('[data-pet-detail][data-pet-unlocked="false"]')).not.toBeNull();
    expect(mount.querySelector('[data-pet-detail-title]')?.textContent).toContain('Voi Núi Xanh');
    expect(mount.querySelector('[data-pet-description]')?.textContent).toContain('Voi Núi Xanh');
    expect(mount.querySelector('[data-pet-personality]')?.textContent).toContain('Tính cách');
    expect(mount.querySelector('[data-pet-unlock-guide]')?.textContent).toContain('Bài 09');
  });
});
