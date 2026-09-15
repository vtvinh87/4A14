import { createHash, randomBytes, randomUUID, scrypt as nodeScrypt } from 'node:crypto';
import { deriveScrypt } from './scrypt.ts';
const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const ALGORITHM = `scrypt-v1-n${COST}-r${BLOCK_SIZE}-p${PARALLELIZATION}`;

export type SecretHash = { hash: string; salt: string; algorithm: string };

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isDenoRuntime(): boolean {
  return typeof (globalThis as typeof globalThis & { Deno?: unknown }).Deno !== 'undefined';
}

function deriveSecret(secret: string, salt: string, keyLength: number): Promise<Uint8Array> {
  if (!isDenoRuntime()) {
    return new Promise((resolve, reject) => {
      nodeScrypt(secret, salt, keyLength, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION }, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      });
    });
  }
  return deriveScrypt(new TextEncoder().encode(secret), new TextEncoder().encode(salt), { cost: COST, blockSize: BLOCK_SIZE, parallelization: PARALLELIZATION, keyLength });
}

export async function hashSecret(secret: string): Promise<SecretHash> {
  const salt = encodeBase64Url(randomBytes(16));
  const derived = await deriveSecret(secret, salt, KEY_LENGTH);
  return { hash: encodeBase64Url(derived), salt, algorithm: ALGORITHM };
}

export async function verifySecret(secret: string, credential: Pick<SecretHash, 'hash' | 'salt' | 'algorithm'>): Promise<boolean> {
  if (credential.algorithm !== ALGORITHM) return false;
  try {
    const expected = decodeBase64Url(credential.hash);
    const actual = await deriveSecret(secret, credential.salt, expected.length);
    if (expected.length !== actual.length) return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export function randomToken(): string {
  return encodeBase64Url(randomBytes(32));
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
