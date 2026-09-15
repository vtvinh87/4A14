import type { AvatarId } from './account-contracts';

export const BIRTHDAY_WISH_TEMPLATE_IDS = ['birthday-cheer', 'birthday-sparkle', 'birthday-smile'] as const;
export const BIRTHDAY_EMOJI_IDS = ['party', 'star', 'heart'] as const;
export const BIRTHDAY_STICKER_IDS = ['fox-confetti', 'fox-gift', 'fox-cake'] as const;
export const GENERIC_BIRTHDAY_LABEL = 'Hôm nay là sinh nhật' as const;

export type BirthdayWishTemplateId = typeof BIRTHDAY_WISH_TEMPLATE_IDS[number];
export type BirthdayEmojiId = typeof BIRTHDAY_EMOJI_IDS[number];
export type BirthdayStickerId = typeof BIRTHDAY_STICKER_IDS[number];

export type BirthdayWishInput = {
  birthdayCardId: string;
  templateId: BirthdayWishTemplateId;
  emojiId?: BirthdayEmojiId;
  stickerId?: BirthdayStickerId;
};

export type PeerBirthdayCard = {
  birthdayCardId: string;
  displayName: string;
  avatarId: AvatarId;
  birthdayLabel: typeof GENERIC_BIRTHDAY_LABEL;
};

export type BirthdayWishValidationError = 'invalid-content' | 'free-text-not-allowed';
export type BirthdayWishValidationResult =
  | { ok: true; value: BirthdayWishInput }
  | { ok: false; code: BirthdayWishValidationError };

export function sanitizePeerBirthdayCard(card: PeerBirthdayCard): PeerBirthdayCard {
  return {
    birthdayCardId: card.birthdayCardId,
    displayName: card.displayName.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 40),
    avatarId: card.avatarId,
    birthdayLabel: GENERIC_BIRTHDAY_LABEL,
  };
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T => isString(value) && values.includes(value as T);

export function validateBirthdayWishInput(value: unknown): BirthdayWishValidationResult {
  if (!value || typeof value !== 'object') return { ok: false, code: 'invalid-content' };
  const candidate = value as Record<string, unknown>;
  const allowedKeys = new Set(['birthdayCardId', 'templateId', 'emojiId', 'stickerId']);
  if (Object.keys(candidate).some((key) => !allowedKeys.has(key))) {
    return { ok: false, code: 'freeText' in candidate ? 'free-text-not-allowed' : 'invalid-content' };
  }
  if (!isString(candidate.birthdayCardId) || !candidate.birthdayCardId.trim()) return { ok: false, code: 'invalid-content' };
  if (!isOneOf(BIRTHDAY_WISH_TEMPLATE_IDS, candidate.templateId)) return { ok: false, code: 'invalid-content' };
  if (candidate.emojiId !== undefined && !isOneOf(BIRTHDAY_EMOJI_IDS, candidate.emojiId)) return { ok: false, code: 'invalid-content' };
  if (candidate.stickerId !== undefined && !isOneOf(BIRTHDAY_STICKER_IDS, candidate.stickerId)) return { ok: false, code: 'invalid-content' };
  return { ok: true, value: candidate as BirthdayWishInput };
}
