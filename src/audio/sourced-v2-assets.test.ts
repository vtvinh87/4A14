import { describe, expect, it } from 'vitest';

import { validateCandidateRecords } from '../../scripts/sourced-v2-assets-contract.mjs';

const complete = (overrides = {}) => ({
  id: 'ui-confirm',
  variant: 1,
  outputPath: 'design/audio/candidates/sourced-v2/sfx/ui-confirm__v01.wav',
  exists: true,
  bytes: 100,
  sha256: 'a'.repeat(64),
  sourceSha256: 'b'.repeat(64),
  sampleRate: 48000,
  channels: 1,
  codec: 'pcm_s24le',
  durationSeconds: 0.2,
  bus: 'sfx',
  ...overrides,
});

describe('sourced-v2 candidate assets', () => {
  it('rejects missing files, invalid channels and missing hashes', () => {
    expect(() => validateCandidateRecords([complete({ exists: false })])).toThrow(/missing/i);
    expect(() => validateCandidateRecords([complete({ channels: 2 })])).toThrow(/channel/i);
    expect(() => validateCandidateRecords([complete({ sha256: null })])).toThrow(/sha/i);
  });

  it('rejects duplicate output paths', () => {
    expect(() => validateCandidateRecords([complete(), complete({ id: 'ui-back' })])).toThrow(/duplicate/i);
  });

  it('accepts a normalized SFX record', () => {
    expect(() => validateCandidateRecords([complete()])).not.toThrow();
  });
});
