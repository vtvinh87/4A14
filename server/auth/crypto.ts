import { createHash, randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const ALGORITHM = `scrypt-v1-n${COST}-r${BLOCK_SIZE}-p${PARALLELIZATION}`;

export type SecretHash = { hash: string; salt: string; algorithm: string };

function deriveSecret(secret: string, salt: string, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(secret, salt, keyLength, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashSecret(secret: string): Promise<SecretHash> {
  const salt = randomBytes(16).toString('base64url');
  const derived = await deriveSecret(secret, salt, KEY_LENGTH);
  return { hash: derived.toString('base64url'), salt, algorithm: ALGORITHM };
}

export async function verifySecret(secret: string, credential: Pick<SecretHash, 'hash' | 'salt' | 'algorithm'>): Promise<boolean> {
  if (credential.algorithm !== ALGORITHM) return false;
  try {
    const expected = Buffer.from(credential.hash, 'base64url');
    const actual = await deriveSecret(secret, credential.salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function randomUuid(): string {
  return randomUUID();
}

export function hashToken(token: string): string {
  // The token is already high entropy; the one-way hash prevents a DB read from becoming a live session.
  return createHash('sha256').update(token).digest('base64url');
}

export function credentialAlgorithm(): string {
  return ALGORITHM;
}
