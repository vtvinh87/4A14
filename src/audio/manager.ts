import { AUDIO_CATALOG, getAudioCue, type AudioBus, type AudioCue, type AudioId } from './catalog';
import { AudioAdmissionPolicy, type ActiveAudioVoice } from './policy';
import {
  DEFAULT_AUDIO_PREFERENCES,
  sanitizeAudioPreferences,
  type AudioPreferences,
} from './preferences';

export type FeedbackKind = 'tap' | 'success' | 'hint';
export type PlayOptions = { eventKey?: string; ownerGeneration?: number };

export type AudioManifestEntry = {
  id: AudioId;
  variant: number;
  relativeUrl: string;
  listeningStatus: 'accepted' | 'pending-human-listening' | 'blocked';
  runtimeMode?: 'pilot' | 'production';
};

export type AudioManagerOptions = {
  contextFactory?: () => AudioContext;
  fetchImpl?: typeof fetch;
  manifest?: readonly AudioManifestEntry[];
  now?: () => number;
};

const LEGACY_ID: Record<FeedbackKind, AudioId> = {
  tap: 'ui-tap',
  success: 'answer-correct',
  hint: 'learning-hint',
};

const TONES: Record<FeedbackKind, { frequency: number; duration: number; gain: number; type: OscillatorType }> = {
  tap: { frequency: 440, duration: 0.07, gain: 0.035, type: 'sine' },
  success: { frequency: 660, duration: 0.15, gain: 0.045, type: 'triangle' },
  hint: { frequency: 320, duration: 0.11, gain: 0.03, type: 'sine' },
};

type BusName = 'sfx' | 'pet' | 'notification' | 'music' | 'ambience';
type OneShotVoice = ActiveAudioVoice & { source: AudioScheduledSourceNode | null; gain: GainNode | null };
type BedState = { id: AudioId | null; source: AudioBufferSourceNode | null; gain: GainNode | null; generation: number };
type BufferCacheEntry = { buffer: AudioBuffer; bytes: number; lastUsedAt: number };

const ONE_SHOT_CACHE_BUDGET_BYTES = 12 * 1024 * 1024;
const BED_CACHE_BUDGET_BYTES = 48 * 1024 * 1024;

function estimateAudioBufferBytes(buffer: AudioBuffer): number {
  return Math.max(1, Number(buffer.length) || 1) * Math.max(1, Number(buffer.numberOfChannels) || 1) * 4;
}

function asAudioContextFactory(): (() => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Constructor = candidate.AudioContext ?? candidate.webkitAudioContext;
  return Constructor ? () => new Constructor() : null;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function busFor(cue: AudioCue): BusName {
  return cue.bus === 'sfx' ? 'sfx' : cue.bus;
}

function busPreferenceEnabled(bus: AudioBus, preferences: AudioPreferences): boolean {
  if (bus === 'music') return preferences.music;
  if (bus === 'ambience') return preferences.ambience;
  if (bus === 'notification') return preferences.notifications;
  return true;
}

function isPlayableRuntimeEntry(entry: AudioManifestEntry): boolean {
  return entry.listeningStatus === 'accepted' || entry.runtimeMode === 'pilot';
}

export class AudioManager {
  private context: AudioContext | null = null;
  private readonly contextFactory: (() => AudioContext) | null;
  private readonly fetchImpl: typeof fetch | null;
  private readonly manifest = new Map<string, AudioManifestEntry>();
  private readonly now: () => number;
  private readonly policy = new AudioAdmissionPolicy();
  private readonly voices = new Map<string, OneShotVoice>();
  private readonly beds: Record<'music' | 'ambience', BedState> = {
    music: { id: null, source: null, gain: null, generation: 0 },
    ambience: { id: null, source: null, gain: null, generation: 0 },
  };
  private readonly oneShotCache = new Map<string, BufferCacheEntry>();
  private readonly bedCache = new Map<string, BufferCacheEntry>();
  private oneShotCacheBytes = 0;
  private bedCacheBytes = 0;
  private readonly busGains = new Map<BusName, GainNode>();
  private masterGain: GainNode | null = null;
  private enabled: boolean;
  private documentHidden = false;
  private disposed = false;
  private unlocked = false;
  private visibilitySuspended = false;
  private generation = 0;
  private ownerGeneration: number | undefined;
  private sequence = 0;
  private preferences: AudioPreferences = { ...DEFAULT_AUDIO_PREFERENCES };

  constructor(enabled = true, options: AudioManagerOptions = {}) {
    this.enabled = enabled;
    this.contextFactory = options.contextFactory ?? asAudioContextFactory();
    this.fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.now = options.now ?? nowMs;
    for (const entry of options.manifest ?? []) this.manifest.set(`${entry.id}:${entry.variant}`, entry);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
    this.updateMix();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setPreferences(preferences: AudioPreferences): void {
    this.preferences = sanitizeAudioPreferences(preferences);
    if (!this.preferences.music) this.stopBed('music');
    if (!this.preferences.ambience) this.stopBed('ambience');
    if (!this.preferences.notifications) this.stopBus('notification');
    this.updateMix();
  }

  getPreferences(): AudioPreferences {
    return { ...this.preferences };
  }

  setOwnerGeneration(generation: number): void {
    this.ownerGeneration = generation;
  }

  setDocumentHidden(hidden: boolean): void {
    this.documentHidden = hidden;
    if (!this.context) return;
    if (hidden) {
      this.visibilitySuspended = true;
      this.stopOneShots();
      if (this.context.state === 'running') void this.context.suspend().catch(() => undefined);
      return;
    }
    if (!this.enabled || !this.unlocked || !this.visibilitySuspended) return;
    this.visibilitySuspended = false;
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  isDocumentHidden(): boolean {
    return this.documentHidden;
  }

  async unlockFromGesture(): Promise<void> {
    if (this.disposed || this.documentHidden || !this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    this.unlocked = true;
    if (context.state === 'suspended') await context.resume().catch(() => undefined);
  }

  play(kind: FeedbackKind): void {
    this.playCue(LEGACY_ID[kind]);
  }

  playCue(id: AudioId, options: PlayOptions = {}): void {
    if (this.disposed || this.documentHidden || !this.enabled) return;
    const cue = getAudioCue(id);
    if (!cue || !busPreferenceEnabled(cue.bus, this.preferences) || cue.loop) return;
    if (options.ownerGeneration !== undefined && this.ownerGeneration !== undefined && options.ownerGeneration !== this.ownerGeneration) return;

    const now = this.now();
    const activeVoices = Array.from(this.voices.values()).map(({ source: _source, gain: _gain, ...voice }) => voice);
    const decision = this.policy.admit({
      id,
      bus: cue.bus,
      category: cue.category,
      priority: cue.priority,
      cooldownMs: cue.cooldownMs,
      nowMs: now,
      eventKey: options.eventKey,
    }, activeVoices);
    if (!decision.accepted) return;
    if (decision.evictVoiceId) this.stopVoice(decision.evictVoiceId, 20);

    const voiceId = `audio-voice-${++this.sequence}`;
    this.voices.set(voiceId, {
      voiceId,
      id,
      bus: cue.bus,
      category: cue.category,
      priority: cue.priority,
      startedAt: now,
      source: null,
      gain: null,
    });

    const context = this.ensureContext();
    if (!context) {
      this.voices.delete(voiceId);
      return;
    }
    if (context.state === 'suspended' && !this.documentHidden) void context.resume().catch(() => undefined);

    const variant = (this.sequence % cue.variants) + 1;
    const entry = this.findPlayableRuntimeEntry(id, variant);
    if (entry && this.fetchImpl) {
      void this.startRuntimeAsset(cue, entry, voiceId, this.generation, now);
      return;
    }
    if (id === 'ui-tap' || id === 'answer-correct' || id === 'learning-hint') {
      this.startLegacyFallback(id, voiceId);
      return;
    }
    this.voices.delete(voiceId);
  }

  setBed(bus: 'music' | 'ambience', id: AudioId | null): void {
    const state = this.beds[bus];
    if (state.id === id) return;
    this.stopBed(bus);
    if (!id || this.disposed || this.documentHidden || !this.enabled) return;
    const cue = getAudioCue(id);
    if (!cue || cue.bus !== bus || !busPreferenceEnabled(bus, this.preferences)) return;
    const context = this.ensureContext();
    if (!context || !this.fetchImpl) return;
    const entry = this.findPlayableRuntimeEntry(id, 1);
    if (!entry) return;
    const generation = ++state.generation;
    state.id = id;
    state.generation = generation;
    void this.startBedAsset(bus, cue, entry, generation);
  }

  stopAll(): void {
    this.generation += 1;
    this.stopOneShots();
    this.stopBed('music');
    this.stopBed('ambience');
  }

  activeVoiceCount(): number {
    return this.voices.size;
  }

  decodedCacheBytes(): number {
    return this.oneShotCacheBytes + this.bedCacheBytes;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopAll();
    const context = this.context;
    this.context = null;
    this.busGains.clear();
    this.masterGain = null;
    this.clearCache(this.oneShotCache, 'one-shot');
    this.clearCache(this.bedCache, 'bed');
    if (context) void context.close().catch(() => undefined);
  }

  private ensureContext(): AudioContext | null {
    if (this.context || this.disposed || !this.contextFactory) return this.context;
    try {
      this.context = this.contextFactory();
      this.setupMix(this.context);
      return this.context;
    } catch {
      this.context = null;
      return null;
    }
  }

  private setupMix(context: AudioContext): void {
    this.masterGain = context.createGain();
    this.masterGain.connect(context.destination);
    for (const bus of ['sfx', 'pet', 'notification', 'music', 'ambience'] as const) {
      const gain = context.createGain();
      gain.connect(this.masterGain);
      this.busGains.set(bus, gain);
    }
    this.updateMix();
  }

  private updateMix(): void {
    const master = this.masterGain;
    if (!master) return;
    master.gain.value = this.enabled ? this.preferences.masterVolume : 0;
    const setGain = (bus: BusName, value: number) => {
      const gain = this.busGains.get(bus);
      if (gain) gain.gain.value = value;
    };
    setGain('sfx', this.preferences.sfxVolume);
    setGain('pet', this.preferences.sfxVolume * 0.846);
    setGain('notification', this.preferences.notifications ? this.preferences.sfxVolume * 0.692 : 0);
    setGain('music', this.preferences.music ? this.preferences.musicVolume : 0);
    setGain('ambience', this.preferences.ambience ? this.preferences.ambienceVolume : 0);
  }

  private startLegacyFallback(id: AudioId, voiceId: string): void {
    const context = this.context;
    const voice = this.voices.get(voiceId);
    if (!context || !voice) return;
    const kind = id === 'ui-tap' ? 'tap' : id === 'answer-correct' ? 'success' : 'hint';
    const tone = TONES[kind];
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const cue = getAudioCue(id);
      const output = cue ? this.busGains.get(busFor(cue)) : null;
      if (!output) throw new Error('audio bus unavailable');
      const start = context.currentTime;
      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      oscillator.connect(gain);
      gain.connect(output);
      voice.source = oscillator;
      voice.gain = gain;
      oscillator.onended = () => this.voices.delete(voiceId);
      oscillator.start(start);
      oscillator.stop(start + tone.duration + 0.02);
    } catch {
      this.voices.delete(voiceId);
    }
  }

  private findPlayableRuntimeEntry(id: AudioId, preferredVariant: number): AudioManifestEntry | null {
    const preferred = this.manifest.get(`${id}:${preferredVariant}`);
    if (preferred && isPlayableRuntimeEntry(preferred)) return preferred;
    for (const entry of this.manifest.values()) {
      if (entry.id === id && isPlayableRuntimeEntry(entry)) return entry;
    }
    return null;
  }

  private async startRuntimeAsset(cue: AudioCue, entry: AudioManifestEntry, voiceId: string, generation: number, requestedAt: number): Promise<void> {
    const context = this.context;
    if (!context || !this.fetchImpl) return;
    try {
      const cacheKey = `${cue.id}:${entry.variant}:${entry.relativeUrl}`;
      let buffer = this.readCache(this.oneShotCache, cacheKey, this.now());
      if (!buffer) {
        const response = await this.fetchImpl(entry.relativeUrl);
        if (!response.ok) throw new Error(`audio fetch ${response.status}`);
        const encoded = await response.arrayBuffer();
        buffer = await context.decodeAudioData(encoded);
        this.writeCache(this.oneShotCache, cacheKey, buffer, this.now(), ONE_SHOT_CACHE_BUDGET_BYTES, 'one-shot');
      }
      if (!this.canCommit(generation, cue, requestedAt, voiceId)) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const output = this.busGains.get(busFor(cue));
      if (!output) throw new Error('audio bus unavailable');
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(output);
      const voice = this.voices.get(voiceId);
      if (!voice) return;
      voice.source = source;
      voice.gain = gain;
      source.onended = () => this.voices.delete(voiceId);
      source.start(context.currentTime);
    } catch {
      this.voices.delete(voiceId);
    }
  }

  private async startBedAsset(bus: 'music' | 'ambience', cue: AudioCue, entry: AudioManifestEntry, generation: number): Promise<void> {
    const context = this.context;
    if (!context || !this.fetchImpl) return;
    try {
      const cacheKey = `${bus}:${cue.id}:${entry.variant}:${entry.relativeUrl}`;
      let buffer = this.readCache(this.bedCache, cacheKey, this.now());
      if (!buffer) {
        const response = await this.fetchImpl(entry.relativeUrl);
        if (!response.ok) throw new Error(`bed fetch ${response.status}`);
        const encoded = await response.arrayBuffer();
        buffer = await context.decodeAudioData(encoded);
        this.writeCache(this.bedCache, cacheKey, buffer, this.now(), BED_CACHE_BUDGET_BYTES, 'bed');
      }
      const state = this.beds[bus];
      if (this.disposed || state.generation !== generation || state.id !== cue.id || this.documentHidden || !this.enabled) {
        if (state.generation === generation && state.id === cue.id && !state.source) {
          state.id = null;
        }
        return;
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      const output = this.busGains.get(bus);
      if (!output) throw new Error('audio bus unavailable');
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(output);
      state.source = source;
      state.gain = gain;
      source.start(context.currentTime);
    } catch {
      const state = this.beds[bus];
      if (state.generation === generation) {
        state.id = null;
        state.source = null;
        state.gain = null;
      }
    }
  }

  private canCommit(generation: number, cue: AudioCue, requestedAt: number, voiceId: string): boolean {
    if (!this.voices.has(voiceId) || this.disposed || this.generation !== generation || this.documentHidden || !this.enabled) {
      this.voices.delete(voiceId);
      return false;
    }
    if (cue.deadlineMs > 0 && this.now() - requestedAt > cue.deadlineMs) {
      this.voices.delete(voiceId);
      return false;
    }
    return true;
  }

  private stopOneShots(): void {
    for (const voiceId of Array.from(this.voices.keys())) this.stopVoice(voiceId, 30);
    this.voices.clear();
  }

  private stopBus(bus: BusName): void {
    for (const [voiceId, voice] of this.voices) {
      const cue = getAudioCue(voice.id);
      if (cue && busFor(cue) === bus) this.stopVoice(voiceId, 30);
    }
  }

  private stopVoice(voiceId: string, fadeMs: number): void {
    const voice = this.voices.get(voiceId);
    if (!voice) return;
    try {
      if (voice.gain && this.context) {
        const now = this.context.currentTime;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value || 0.0001, now);
        voice.gain.gain.linearRampToValueAtTime(0.0001, now + fadeMs / 1000);
      }
      voice.source?.stop((this.context?.currentTime ?? 0) + fadeMs / 1000);
    } catch {
      // Audio shutdown is best-effort; playback must not affect learning state.
    }
    this.voices.delete(voiceId);
  }

  private stopBed(bus: 'music' | 'ambience'): void {
    const state = this.beds[bus];
    state.generation += 1;
    try { state.source?.stop((this.context?.currentTime ?? 0) + 0.03); } catch { /* already stopped */ }
    state.id = null;
    state.source = null;
    state.gain = null;
  }

  private readCache(cache: Map<string, BufferCacheEntry>, key: string, now: number): AudioBuffer | null {
    const entry = cache.get(key);
    if (!entry) return null;
    entry.lastUsedAt = now;
    cache.delete(key);
    cache.set(key, entry);
    return entry.buffer;
  }

  private writeCache(cache: Map<string, BufferCacheEntry>, key: string, buffer: AudioBuffer, now: number, budget: number, kind: 'one-shot' | 'bed'): void {
    const bytes = estimateAudioBufferBytes(buffer);
    if (cache.has(key)) this.removeCacheEntry(cache, key, kind);
    if (bytes > budget) return;
    cache.set(key, { buffer, bytes, lastUsedAt: now });
    this.addCacheBytes(kind, bytes);
    while (this.cacheBytes(kind) > budget) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.removeCacheEntry(cache, oldestKey, kind);
    }
  }

  private removeCacheEntry(cache: Map<string, BufferCacheEntry>, key: string, kind: 'one-shot' | 'bed'): void {
    const entry = cache.get(key);
    if (!entry) return;
    cache.delete(key);
    this.addCacheBytes(kind, -entry.bytes);
  }

  private clearCache(cache: Map<string, BufferCacheEntry>, kind: 'one-shot' | 'bed'): void {
    cache.clear();
    if (kind === 'one-shot') this.oneShotCacheBytes = 0;
    else this.bedCacheBytes = 0;
  }

  private cacheBytes(kind: 'one-shot' | 'bed'): number {
    return kind === 'one-shot' ? this.oneShotCacheBytes : this.bedCacheBytes;
  }

  private addCacheBytes(kind: 'one-shot' | 'bed', bytes: number): void {
    if (kind === 'one-shot') this.oneShotCacheBytes += bytes;
    else this.bedCacheBytes += bytes;
  }
}

export { AUDIO_CATALOG };
