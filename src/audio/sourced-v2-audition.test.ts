import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('sourced-v2 audition surface', () => {
  it('declares the full sourced-v2 route and manifest', () => {
    const html = fs.readFileSync(path.join(root, 'design/audio/audition.html'), 'utf8');
    expect(html).toContain("revision === 'sourced-v2-full'");
    expect(html).toContain("./qa/sourced-v2-candidates.json");
    expect(html).toContain('renderSourcedV2');
  });

  it('keeps all 67 candidate URLs explicit and pending human listening', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'design/audio/qa/sourced-v2-candidates.json'), 'utf8'));
    const candidates = manifest.cues.flatMap((cue: { candidates: unknown[] }) => cue.candidates);
    expect(manifest.targetEntryCount).toBe(67);
    expect(candidates).toHaveLength(67);
    expect(candidates.every((candidate: any) => candidate.listeningStatus === 'pending-human-listening')).toBe(true);
    expect(candidates.every((candidate: any) => candidate.relativeUrl.startsWith('./candidates/sourced-v2/'))).toBe(true);
  });
});
