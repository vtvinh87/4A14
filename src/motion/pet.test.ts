import { describe, expect, it } from 'vitest';
import { petMessage, type PetMood } from './pet';

describe('default Pet copy', () => {
  it('uses tớ-cậu instead of bạn in default mood messages', () => {
    const moods: PetMood[] = ['idle', 'greet', 'think', 'celebrate', 'rest'];
    const copy = moods.map(petMessage).join(' ');

    expect(copy).not.toMatch(/\bbạn\b/iu);
    expect(copy).not.toMatch(/\bmình\b/iu);
    expect(copy).toMatch(/tớ/i);
    expect(copy).toMatch(/cậu/i);
  });
});
