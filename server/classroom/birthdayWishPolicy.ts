import {
  GENERIC_BIRTHDAY_LABEL,
  sanitizePeerBirthdayCard,
  validateBirthdayWishInput,
  type BirthdayWishInput,
  type PeerBirthdayCard,
} from '../../shared/birthday-wish-contracts';
import { validateAvatarId } from '../../shared/account-contracts';

export type BirthdayWishRateOutcome = { allowed: boolean };

export type BirthdayWishRecord = {
  key: string;
  birthdayCardId: string;
  displayName: string;
  avatarId: PeerBirthdayCard['avatarId'];
  birthdayLabel: typeof GENERIC_BIRTHDAY_LABEL;
  templateId: BirthdayWishInput['templateId'];
  emojiId?: BirthdayWishInput['emojiId'];
  stickerId?: BirthdayWishInput['stickerId'];
  createdAt: string;
};

export type BirthdayWishPolicyContext = {
  senderId: string;
  recipientId: string;
  senderActive: boolean;
  recipientActive: boolean;
  sameClass: boolean;
  recipientWishesEnabled: boolean;
  currentBirthdayYear: number;
  existingWishKeys: ReadonlySet<string>;
  rateLimit: BirthdayWishRateOutcome;
  birthdayCard: PeerBirthdayCard;
};

export type BirthdayWishRepository = {
  insertIfAbsent(record: BirthdayWishRecord): Promise<BirthdayWishInsertIfAbsentResult>;
};

export type BirthdayWishInsertIfAbsentResult = {
  inserted: boolean;
  record: BirthdayWishRecord;
};

export type BirthdayWishPolicyError =
  | 'inactive-account'
  | 'cross-class'
  | 'recipient-not-consented'
  | 'rate-limited'
  | 'invalid-content'
  | 'free-text-not-allowed'
  | 'invalid-card'
  | 'invalid-repository-record';
export type BirthdayWishPolicyResult =
  | { ok: true; record: BirthdayWishRecord }
  | { ok: false; code: BirthdayWishPolicyError };

export function birthdayWishKey(senderId: string, recipientId: string, year: number): string {
  return `${senderId}:${recipientId}:${year}`;
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) return null;
  return value;
}

function sanitizeRepositoryRecord(record: BirthdayWishRecord, expectedKey: string, expectedCardId: string): BirthdayWishRecord | null {
  if (record.key !== expectedKey || record.birthdayCardId !== expectedCardId) return null;
  const createdAt = canonicalUtcTimestamp(record.createdAt);
  if (!createdAt) return null;
  const avatar = validateAvatarId(record.avatarId);
  if (!avatar.ok) return null;
  const content = validateBirthdayWishInput({
    birthdayCardId: record.birthdayCardId,
    templateId: record.templateId,
    ...(record.emojiId === undefined ? {} : { emojiId: record.emojiId }),
    ...(record.stickerId === undefined ? {} : { stickerId: record.stickerId }),
  });
  if (!content.ok) return null;
  const card = sanitizePeerBirthdayCard({
    birthdayCardId: record.birthdayCardId,
    displayName: record.displayName,
    avatarId: avatar.value,
    birthdayLabel: GENERIC_BIRTHDAY_LABEL,
  });
  if (!card.displayName) return null;
  return {
    key: expectedKey,
    birthdayCardId: card.birthdayCardId,
    displayName: card.displayName,
    avatarId: card.avatarId,
    birthdayLabel: GENERIC_BIRTHDAY_LABEL,
    templateId: content.value.templateId,
    ...(content.value.emojiId === undefined ? {} : { emojiId: content.value.emojiId }),
    ...(content.value.stickerId === undefined ? {} : { stickerId: content.value.stickerId }),
    createdAt,
  };
}

export async function submitBirthdayWish(
  context: BirthdayWishPolicyContext,
  input: unknown,
  repository: BirthdayWishRepository,
): Promise<BirthdayWishPolicyResult> {
  const validation = validateBirthdayWishInput(input);
  if (!validation.ok) return { ok: false, code: validation.code === 'free-text-not-allowed' ? 'free-text-not-allowed' : 'invalid-content' };
  if (validation.value.birthdayCardId !== context.birthdayCard.birthdayCardId) return { ok: false, code: 'invalid-card' };
  if (!context.senderActive || !context.recipientActive) return { ok: false, code: 'inactive-account' };
  if (!context.sameClass) return { ok: false, code: 'cross-class' };
  if (!context.recipientWishesEnabled) return { ok: false, code: 'recipient-not-consented' };
  if (!context.rateLimit.allowed) return { ok: false, code: 'rate-limited' };

  const key = birthdayWishKey(context.senderId, context.recipientId, context.currentBirthdayYear);
  const card = sanitizePeerBirthdayCard(context.birthdayCard);

  const record: BirthdayWishRecord = {
    key,
    birthdayCardId: card.birthdayCardId,
    displayName: card.displayName,
    avatarId: card.avatarId,
    birthdayLabel: GENERIC_BIRTHDAY_LABEL,
    templateId: validation.value.templateId,
    ...(validation.value.emojiId === undefined ? {} : { emojiId: validation.value.emojiId }),
    ...(validation.value.stickerId === undefined ? {} : { stickerId: validation.value.stickerId }),
    createdAt: new Date().toISOString(),
  };
  const atomicResult = await repository.insertIfAbsent(record);
  const safeRecord = sanitizeRepositoryRecord(atomicResult.record, key, card.birthdayCardId);
  return safeRecord ? { ok: true, record: safeRecord } : { ok: false, code: 'invalid-repository-record' };
}
