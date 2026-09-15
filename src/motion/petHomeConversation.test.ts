import { describe, expect, it } from 'vitest';
import { PET_HOME_DIALOGUES, pickPetHomeDialogue } from './petHomeConversation';

describe('home Pet dialogue catalog', () => {
  it('contains thirty unique lines across all approved tones', () => {
    expect(PET_HOME_DIALOGUES).toHaveLength(30);
    expect(new Set(PET_HOME_DIALOGUES.map((item) => item.text)).size).toBe(30);
    expect(new Set(PET_HOME_DIALOGUES.map((item) => item.tone)).size).toBe(6);
    expect(PET_HOME_DIALOGUES.every((item) => /tớ|cậu/i.test(item.text))).toBe(true);
    expect(PET_HOME_DIALOGUES.map((item) => item.text).join(' ')).not.toMatch(/\b(mình|con|bạn)\b/iu);
  });

  it('chooses a different line when the random candidate repeats the previous index', () => {
    const next = pickPetHomeDialogue(0, 0);

    expect(next.index).not.toBe(0);
    expect(next.dialogue).toBe(PET_HOME_DIALOGUES[next.index]);
  });
});
