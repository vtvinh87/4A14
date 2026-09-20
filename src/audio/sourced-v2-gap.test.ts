import { describe, expect, it } from 'vitest';

import { buildSourcedV2Gap } from '../../scripts/sourced-v2-contract.mjs';

describe('sourced-v2 full-catalog gap', () => {
  it('keeps the 67 catalog targets and reports exactly 61 missing runtime targets', () => {
    const catalog = {
      cues: [
        { id: 'ui-tap', variants: 3 },
        { id: 'answer-correct', variants: 3 },
        { id: 'music-home', variants: 1 },
      ],
    };
    const currentRuntime = [
      { id: 'ui-tap', variant: 1 },
      { id: 'answer-correct', variant: 1 },
      { id: 'music-home', variant: 1 },
    ];

    const report = buildSourcedV2Gap(catalog, currentRuntime, 7);

    expect(report.catalogTargetCount).toBe(7);
    expect(report.currentRuntimeCount).toBe(3);
    expect(report.missingTargetCount).toBe(4);
    expect(report.missingTargets).toEqual([
      { id: 'ui-tap', variant: 2 },
      { id: 'ui-tap', variant: 3 },
      { id: 'answer-correct', variant: 2 },
      { id: 'answer-correct', variant: 3 },
    ]);
  });

  it('rejects duplicate runtime keys and catalog variants below one', () => {
    expect(() =>
      buildSourcedV2Gap(
        { cues: [{ id: 'ui-tap', variants: 0 }] },
        [{ id: 'ui-tap', variant: 1 }, { id: 'ui-tap', variant: 1 }],
      ),
    ).toThrow(/variant|duplicate/i);
  });
});
