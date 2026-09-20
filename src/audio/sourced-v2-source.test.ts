import { describe, expect, it } from 'vitest';

import { validateSourceRecords } from '../../scripts/sourced-v2-source-contract.mjs';

describe('sourced-v2 source registry', () => {
  it('rejects a record that is missing license evidence, hash or zero cost', () => {
    expect(() =>
      validateSourceRecords([
        {
          id: 'broken',
          localPath: 'design/audio/source.wav',
          sourceUrl: 'https://example.test/source.wav',
          license: 'CC0',
          costUsd: 1,
        },
      ]),
    ).toThrow(/sourcePage|license|sha|cost/i);
  });

  it('accepts a complete CC0 record', () => {
    expect(() =>
      validateSourceRecords([
        {
          id: 'complete',
          localPath: 'design/audio/source.wav',
          sourceUrl: 'https://example.test/source.wav',
          sourcePage: 'https://example.test/license',
          licenseEvidenceUrl: 'https://example.test/license',
          sha256: 'a'.repeat(64),
          bytes: 12,
          license: 'CC0',
          costUsd: 0,
        },
      ]),
    ).not.toThrow();
  });
});
