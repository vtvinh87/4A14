import { describe, expect, it } from 'vitest';
import { AUDIO_CATALOG, getAudioCue } from './catalog';

describe('audio catalog runtime projection', () => {
  it('keeps the design inventory at 38 logical cues and 67 target variants', () => {
    expect(AUDIO_CATALOG).toHaveLength(38);
    expect(AUDIO_CATALOG.reduce((total, cue) => total + cue.variants, 0)).toBe(67);
    expect(AUDIO_CATALOG.filter((cue) => cue.loop)).toHaveLength(10);
    expect(AUDIO_CATALOG.filter((cue) => !cue.loop)).toHaveLength(28);
    expect(new Set(AUDIO_CATALOG.map((cue) => cue.id)).size).toBe(38);
  });

  it('exposes safe runtime paths without shipping design prompts', () => {
    const cue = getAudioCue('answer-correct');
    expect(cue).toMatchObject({ id: 'answer-correct', bus: 'sfx', variants: 3, loop: false });
    expect(cue.runtimeDirectory).toBe('sfx');
    expect(cue.runtimeUrl(2)).toBe('/audio/v1/sfx/answer-correct__v02.mp3');
    expect(cue.runtimeUrl(4)).toBeNull();
    expect(Object.keys(cue)).not.toContain('prompt');
  });
});
