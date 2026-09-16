import { describe, expect, it } from 'vitest';
import { PETS } from '../content/pets';
import {
  PET_HOME_DIALOGUES,
  PET_HOME_DIALOGUES_BY_PET,
  pickPetHomeDialogue,
} from './petHomeConversation';

describe('home Pet dialogue catalog', () => {
  it('contains thirty unique lines for every Pet and five lines per tone', () => {
    const catalogs = PETS.map((pet) => PET_HOME_DIALOGUES_BY_PET[pet.id]);
    const allDialogues = catalogs.flat();
    const toneNames = ['encouraging', 'playful', 'curious', 'moody', 'joyful', 'serious'] as const;

    expect(Object.keys(PET_HOME_DIALOGUES_BY_PET)).toEqual(PETS.map((pet) => pet.id));
    expect(catalogs.map((catalog) => catalog.length)).toEqual([30, 30, 30, 30]);
    expect(new Set(allDialogues.map((item) => item.text)).size).toBe(120);
    expect(new Set(allDialogues.map((item) => item.tone))).toEqual(new Set(toneNames));
    expect(allDialogues.every((item) => /tớ|cậu/i.test(item.text))).toBe(true);
    expect(allDialogues.map((item) => item.text).join(' ')).not.toMatch(/\b(mình|con|bạn)\b/iu);

    for (const catalog of catalogs) {
      for (const tone of toneNames) {
        expect(catalog.filter((item) => item.tone === tone)).toHaveLength(5);
      }
    }
  });

  it('keeps the existing fox export as the default catalog alias', () => {
    expect(PET_HOME_DIALOGUES).toBe(PET_HOME_DIALOGUES_BY_PET['fox-orange']);
  });

  it('selects from the requested Pet catalog and skips the previous index', () => {
    const next = pickPetHomeDialogue('owl-purple', 0, 0);

    expect(next.index).toBe(1);
    expect(next.dialogue).toBe(PET_HOME_DIALOGUES_BY_PET['owl-purple'][1]);
  });

  it('clamps random input and falls back to the first line for non-finite values', () => {
    expect(pickPetHomeDialogue('dragon-jade', -1, -1).index).toBe(0);
    expect(pickPetHomeDialogue('dragon-jade', -1, 1).index).toBe(29);
    expect(pickPetHomeDialogue('dragon-jade', -1, Number.NaN).index).toBe(0);
    expect(pickPetHomeDialogue('dragon-jade', -1, Number.POSITIVE_INFINITY).index).toBe(0);
  });
});
