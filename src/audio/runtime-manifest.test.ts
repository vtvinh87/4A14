import { describe, expect, it } from 'vitest';
import { AUDIO_CATALOG } from './catalog';
import { AUDIO_RUNTIME_MANIFEST } from './runtime-manifest.generated';

describe('local sourced-v2 full pilot runtime manifest', () => {
  const legacyPilotUrls = {
    'ui-tap:1': '/audio/v1/sfx/ui-tap__v01.mp3',
    'answer-correct:1': '/audio/v1/sfx/answer-correct__v01.mp3',
    'answer-retry:1': '/audio/v1/sfx/answer-retry__v01.mp3',
    'stamp-press:1': '/audio/v1/sfx/stamp-press__v01.mp3',
    'pet-fox:1': '/audio/v1/sfx/pet-fox__v01.mp3',
    'music-home:1': '/audio/v1/music/music-home__v01.mp3',
  } as const;

  it('preserves all six sourced-v1 pilot URLs exactly', () => {
    const actual = new Map(AUDIO_RUNTIME_MANIFEST.map((entry) => [`${entry.id}:${entry.variant}`, entry.relativeUrl]));

    for (const [key, relativeUrl] of Object.entries(legacyPilotUrls)) expect(actual.get(key)).toBe(relativeUrl);
  });

  it('covers every catalog target while keeping full sourced-v2 local-only', () => {
    const expectedKeys = AUDIO_CATALOG.flatMap((cue) => Array.from({ length: cue.variants }, (_, index) => `${cue.id}:${index + 1}`));
    const actualKeys = AUDIO_RUNTIME_MANIFEST.map((entry) => `${entry.id}:${entry.variant}`);
    const sourcedV2Entries = AUDIO_RUNTIME_MANIFEST.filter((entry) => entry.relativeUrl.startsWith('/audio/v2/'));

    expect(AUDIO_RUNTIME_MANIFEST).toHaveLength(67);
    expect(actualKeys).toEqual(expectedKeys);
    expect(new Set(actualKeys).size).toBe(actualKeys.length);
    expect(sourcedV2Entries).toHaveLength(61);
    expect(sourcedV2Entries.every((entry) => entry.listeningStatus === 'pending-human-listening')).toBe(true);
    expect(AUDIO_RUNTIME_MANIFEST.every((entry) => entry.listeningStatus === 'pending-human-listening')).toBe(true);
    expect(AUDIO_RUNTIME_MANIFEST.every((entry) => entry.runtimeMode === 'pilot')).toBe(true);
  });
});
