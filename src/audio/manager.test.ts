import { describe, expect, it } from 'vitest';
import { AudioManager } from './manager';

describe('AudioManager', () => {
  it('tracks document visibility so hidden pages do not play feedback', () => {
    const audio = new AudioManager();

    expect(audio.isDocumentHidden()).toBe(false);
    audio.setDocumentHidden(true);
    expect(audio.isDocumentHidden()).toBe(true);
    audio.setDocumentHidden(false);
    expect(audio.isDocumentHidden()).toBe(false);
  });
});
