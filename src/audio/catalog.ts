export type AudioBus = 'sfx' | 'pet' | 'notification' | 'music' | 'ambience';
export type AudioCategory = 'other' | 'outcome' | 'reward' | 'pet';

type CatalogRow = readonly [
  id: string,
  bus: AudioBus,
  variants: number,
  priority: number,
  cooldownMs: number,
  durationSeconds: number,
  loop: boolean,
  category: AudioCategory,
];

const CATALOG_ROWS = [
  ['ui-tap', 'sfx', 3, 20, 80, 0.1, false, 'other'],
  ['ui-confirm', 'sfx', 2, 30, 250, 0.28, false, 'other'],
  ['ui-back', 'sfx', 2, 30, 200, 0.18, false, 'other'],
  ['page-turn', 'sfx', 3, 30, 300, 0.4, false, 'other'],
  ['map-unfold', 'sfx', 1, 30, 1000, 0.85, false, 'other'],
  ['map-select', 'sfx', 2, 30, 180, 0.3, false, 'other'],
  ['landmark-open', 'sfx', 2, 30, 600, 0.65, false, 'other'],
  ['answer-select', 'sfx', 3, 20, 100, 0.12, false, 'other'],
  ['answer-correct', 'sfx', 3, 80, 700, 0.72, false, 'outcome'],
  ['answer-retry', 'sfx', 2, 80, 650, 0.38, false, 'outcome'],
  ['learning-hint', 'sfx', 2, 60, 900, 0.5, false, 'other'],
  ['match-connect', 'sfx', 3, 20, 120, 0.22, false, 'other'],
  ['lesson-complete', 'sfx', 1, 90, 3000, 2.2, false, 'reward'],
  ['stamp-press', 'sfx', 2, 90, 1000, 0.7, false, 'reward'],
  ['collection-open', 'sfx', 1, 30, 800, 0.65, false, 'other'],
  ['item-unlock', 'sfx', 1, 90, 1800, 1.2, false, 'reward'],
  ['challenge-submit', 'sfx', 1, 30, 1000, 0.55, false, 'other'],
  ['class-milestone', 'sfx', 1, 90, 5000, 2.5, false, 'reward'],
  ['reaction-positive', 'sfx', 2, 20, 500, 0.25, false, 'other'],
  ['message-send', 'notification', 2, 40, 500, 0.2, false, 'other'],
  ['message-receive', 'notification', 2, 40, 5000, 0.32, false, 'other'],
  ['pet-fox', 'pet', 3, 60, 2500, 0.65, false, 'pet'],
  ['pet-elephant', 'pet', 3, 60, 2500, 0.8, false, 'pet'],
  ['pet-owl', 'pet', 3, 60, 2500, 0.7, false, 'pet'],
  ['pet-dragon', 'pet', 3, 60, 2500, 0.9, false, 'pet'],
  ['birthday', 'sfx', 1, 90, 5000, 3, false, 'reward'],
  ['lesson-start', 'sfx', 1, 30, 800, 0.65, false, 'other'],
  ['ui-toggle', 'sfx', 2, 20, 150, 0.09, false, 'other'],
  ['music-home', 'music', 1, 0, 0, 48, true, 'other'],
  ['music-map', 'music', 1, 0, 0, 48, true, 'other'],
  ['music-focus', 'music', 1, 0, 0, 53.333, true, 'other'],
  ['music-cooperate', 'music', 1, 0, 0, 43.636, true, 'other'],
  ['ambience-garden', 'ambience', 1, 0, 0, 24, true, 'other'],
  ['ambience-mountain', 'ambience', 1, 0, 0, 24, true, 'other'],
  ['ambience-coast', 'ambience', 1, 0, 0, 24, true, 'other'],
  ['ambience-forest', 'ambience', 1, 0, 0, 24, true, 'other'],
  ['ambience-river', 'ambience', 1, 0, 0, 24, true, 'other'],
  ['ambience-evening', 'ambience', 1, 0, 0, 24, true, 'other'],
] as const satisfies readonly CatalogRow[];

export type AudioId = typeof CATALOG_ROWS[number][0];

export type AudioCue = {
  id: AudioId;
  bus: AudioBus;
  category: AudioCategory;
  variants: number;
  priority: number;
  cooldownMs: number;
  durationSeconds: number;
  targetDurationMs: number;
  loop: boolean;
  runtimeDirectory: 'sfx' | 'pet' | 'music' | 'ambience';
  deadlineMs: number;
  runtimeUrl: (variant: number) => string | null;
};

function runtimeDirectoryFor(bus: AudioBus): AudioCue['runtimeDirectory'] {
  if (bus === 'pet') return 'pet';
  if (bus === 'music') return 'music';
  if (bus === 'ambience') return 'ambience';
  return 'sfx';
}

export const AUDIO_CATALOG: readonly AudioCue[] = CATALOG_ROWS.map(([id, bus, variants, priority, cooldownMs, durationSeconds, loop, category]) => {
  const runtimeDirectory = runtimeDirectoryFor(bus);
  return {
    id,
    bus,
    category,
    variants,
    priority,
    cooldownMs,
    durationSeconds,
    targetDurationMs: Math.round(durationSeconds * 1000),
    loop,
    runtimeDirectory,
    deadlineMs: loop ? 0 : priority >= 80 ? 500 : 150,
    runtimeUrl: (variant: number) => variant >= 1 && variant <= variants
      ? `/audio/v1/${runtimeDirectory}/${id}__v${String(variant).padStart(2, '0')}.mp3`
      : null,
  } satisfies AudioCue;
});

const CUE_BY_ID = new Map<AudioId, AudioCue>(AUDIO_CATALOG.map((cue) => [cue.id, cue]));

export function getAudioCue(id: AudioId): AudioCue;
export function getAudioCue(id: string): AudioCue | null;
export function getAudioCue(id: string): AudioCue | null {
  return CUE_BY_ID.get(id as AudioId) ?? null;
}
