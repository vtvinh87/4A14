import { describe, expect, it } from 'vitest';
import { deriveScrypt } from './scrypt';

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

describe('portable scrypt derivation', () => {
  it('matches the RFC 7914 reference vector', async () => {
    const derived = await deriveScrypt(
      new TextEncoder().encode('password'),
      new TextEncoder().encode('NaCl'),
      { cost: 1024, blockSize: 8, parallelization: 16, keyLength: 64 },
    );

    expect(hex(derived)).toBe('fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b3731622eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640');
  });
});
