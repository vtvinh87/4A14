import { describe, expect, it } from 'vitest';
import {
  BIRTHDAY_EMOJI_IDS,
  BIRTHDAY_STICKER_IDS,
  BIRTHDAY_WISH_TEMPLATE_IDS,
  sanitizePeerBirthdayCard,
  validateBirthdayWishInput,
  type BirthdayWishInput,
  type PeerBirthdayCard,
} from './birthday-wish-contracts';

describe('birthday wish shared contract', () => {
  it('exposes non-empty literal allowlists', () => {
    expect(BIRTHDAY_WISH_TEMPLATE_IDS.length).toBeGreaterThan(0);
    expect(BIRTHDAY_EMOJI_IDS.length).toBeGreaterThan(0);
    expect(BIRTHDAY_STICKER_IDS.length).toBeGreaterThan(0);
  });

  it('accepts only an opaque card id and approved content ids', () => {
    const input: BirthdayWishInput = {
      birthdayCardId: 'card_srv_123',
      templateId: BIRTHDAY_WISH_TEMPLATE_IDS[0],
      emojiId: BIRTHDAY_EMOJI_IDS[0],
      stickerId: BIRTHDAY_STICKER_IDS[0],
    };

    expect(validateBirthdayWishInput(input)).toEqual({ ok: true, value: input });
    expect(validateBirthdayWishInput({ ...input, templateId: 'free-text-template' })).toEqual({ ok: false, code: 'invalid-content' });
    expect(validateBirthdayWishInput({ ...input, emojiId: 'arbitrary-emoji' })).toEqual({ ok: false, code: 'invalid-content' });
    expect(validateBirthdayWishInput({ ...input, stickerId: 'arbitrary-sticker' })).toEqual({ ok: false, code: 'invalid-content' });
    expect(validateBirthdayWishInput({ ...input, freeText: 'Chúc mừng!' })).toEqual({ ok: false, code: 'free-text-not-allowed' });
  });

  it('keeps the peer card free of exact birthday and account metadata', () => {
    const card: PeerBirthdayCard = sanitizePeerBirthdayCard({
      birthdayCardId: 'card_srv_123',
      displayName: '  An   Nguyễn  ',
      avatarId: 'fox-sunny',
      birthdayLabel: 'Hôm nay là sinh nhật',
    });

    expect(card.displayName).toBe('An Nguyễn');
    expect(card.birthdayLabel).toBe('Hôm nay là sinh nhật');
    expect(card).not.toHaveProperty('birthDate');
    expect(card).not.toHaveProperty('age');
    expect(card).not.toHaveProperty('classroomId');
    expect(card).not.toHaveProperty('username');
  });
});
