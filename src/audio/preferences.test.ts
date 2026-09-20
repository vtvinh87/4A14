import { describe, expect, it } from 'vitest';
import {
  AUDIO_PREFERENCES_KEY,
  DEFAULT_AUDIO_PREFERENCES,
  loadAudioPreferences,
  sanitizeAudioPreferences,
  saveAudioPreferences,
} from './preferences';

describe('audio preferences', () => {
  it('uses the independent defaults without duplicating the progress sound master', () => {
    expect(DEFAULT_AUDIO_PREFERENCES).toEqual({
      version: 1,
      music: false,
      ambience: true,
      notifications: true,
      masterVolume: 0.65,
      sfxVolume: 0.65,
      musicVolume: 0.28,
      ambienceVolume: 0.22,
    });
  });

  it('clamps finite volumes and discards invalid preference shapes', () => {
    expect(sanitizeAudioPreferences({
      version: 1,
      music: true,
      ambience: false,
      notifications: true,
      masterVolume: 2,
      sfxVolume: -1,
      musicVolume: 2,
      ambienceVolume: 0.4,
    })).toEqual({ ...DEFAULT_AUDIO_PREFERENCES, music: true, ambience: false, notifications: true, masterVolume: 1, sfxVolume: 0, musicVolume: 1, ambienceVolume: 0.4 });
    expect(sanitizeAudioPreferences({ version: 1 })).toEqual(DEFAULT_AUDIO_PREFERENCES);
    expect(sanitizeAudioPreferences({ ...DEFAULT_AUDIO_PREFERENCES, version: 2 })).toEqual(DEFAULT_AUDIO_PREFERENCES);
  });

  it('falls back when storage is corrupt or unavailable and saves only validated data', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    };

    expect(loadAudioPreferences(adapter)).toEqual(DEFAULT_AUDIO_PREFERENCES);
    storage.set(AUDIO_PREFERENCES_KEY, '{broken');
    expect(loadAudioPreferences(adapter)).toEqual(DEFAULT_AUDIO_PREFERENCES);
    expect(saveAudioPreferences({ ...DEFAULT_AUDIO_PREFERENCES, masterVolume: 0.4 }, adapter)).toBe(true);
    expect(loadAudioPreferences(adapter).masterVolume).toBe(0.4);
    expect(saveAudioPreferences({ ...DEFAULT_AUDIO_PREFERENCES, musicVolume: Number.NaN }, adapter)).toBe(false);
  });
});
