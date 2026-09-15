import { AVATAR_IDS, DEFAULT_AVATAR_ID, type AvatarId } from '../../shared/account-contracts';

export { AVATAR_IDS, DEFAULT_AVATAR_ID };

export const AVATAR_ASSET_URL = '/art/fox-pet-alpha.png';

export type AvatarDefinition = {
  id: AvatarId;
  assetUrl: typeof AVATAR_ASSET_URL;
  variantClass: string;
};

const definitions: Record<AvatarId, AvatarDefinition> = {
  'fox-scout': { id: 'fox-scout', assetUrl: AVATAR_ASSET_URL, variantClass: 'avatar-variant-scout' },
  'fox-sunny': { id: 'fox-sunny', assetUrl: AVATAR_ASSET_URL, variantClass: 'avatar-variant-sunny' },
  'fox-leaf': { id: 'fox-leaf', assetUrl: AVATAR_ASSET_URL, variantClass: 'avatar-variant-leaf' },
  'fox-night': { id: 'fox-night', assetUrl: AVATAR_ASSET_URL, variantClass: 'avatar-variant-night' },
};

export const AVATAR_CATALOG: Readonly<Record<AvatarId, AvatarDefinition>> = definitions;

export function getAvatarDefinition(value: unknown): AvatarDefinition | undefined {
  if (typeof value !== 'string' || !(AVATAR_IDS as readonly string[]).includes(value)) return undefined;
  return definitions[value as AvatarId];
}
