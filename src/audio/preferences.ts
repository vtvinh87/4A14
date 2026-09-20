export type AudioPreferences = {
  version: 1;
  music: boolean;
  ambience: boolean;
  notifications: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambienceVolume: number;
};

export const AUDIO_PREFERENCES_KEY = 'hoc-vui-audio-preferences-v1';

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  version: 1,
  music: false,
  ambience: true,
  notifications: true,
  masterVolume: 0.65,
  sfxVolume: 0.65,
  musicVolume: 0.28,
  ambienceVolume: 0.22,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

type AudioPreferencesRecord = {
  version: 1;
  music: boolean;
  ambience: boolean;
  notifications: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambienceVolume: number;
};

function hasAudioPreferencesShape(value: unknown): value is AudioPreferencesRecord {
  if (!isRecord(value) || value.version !== 1) return false;
  return typeof value.music === 'boolean'
    && typeof value.ambience === 'boolean'
    && typeof value.notifications === 'boolean'
    && isFiniteNumber(value.masterVolume)
    && isFiniteNumber(value.sfxVolume)
    && isFiniteNumber(value.musicVolume)
    && isFiniteNumber(value.ambienceVolume);
}

export function sanitizeAudioPreferences(value: unknown): AudioPreferences {
  if (!hasAudioPreferencesShape(value)) return { ...DEFAULT_AUDIO_PREFERENCES };
  return {
    version: 1,
    music: value.music,
    ambience: value.ambience,
    notifications: value.notifications,
    masterVolume: clampVolume(value.masterVolume),
    sfxVolume: clampVolume(value.sfxVolume),
    musicVolume: clampVolume(value.musicVolume),
    ambienceVolume: clampVolume(value.ambienceVolume),
  };
}

export function isAudioPreferences(value: unknown): value is AudioPreferences {
  return hasAudioPreferencesShape(value)
    && [value.masterVolume, value.sfxVolume, value.musicVolume, value.ambienceVolume].every((item) => item >= 0 && item <= 1);
}

export function loadAudioPreferences(storage: StorageLike | null = getStorage()): AudioPreferences {
  if (!storage) return { ...DEFAULT_AUDIO_PREFERENCES };
  try {
    const raw = storage.getItem(AUDIO_PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_PREFERENCES };
    return sanitizeAudioPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_AUDIO_PREFERENCES };
  }
}

export function saveAudioPreferences(preferences: AudioPreferences, storage: StorageLike | null = getStorage()): boolean {
  if (!storage || !isAudioPreferences(preferences)) return false;
  try {
    storage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
