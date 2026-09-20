import { describe, expect, it, vi } from 'vitest';
import { AudioManager, type AudioManifestEntry } from './manager';
import { DEFAULT_AUDIO_PREFERENCES } from './preferences';

describe('AudioManager', () => {
  it('keeps an in-flight music bed alive when disabled ambience or volume changes', async () => {
    let complete!: (buffer: AudioBuffer) => void;
    const pending = new Promise<AudioBuffer>((resolve) => { complete = resolve; });
    const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { connect: vi.fn(), gain: { value: 1, setValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), linearRampToValueAtTime: vi.fn() } };
    const context = { state: 'running', currentTime: 0, destination: {}, createGain: () => gain, createBufferSource: () => source, decodeAudioData: () => pending, close: async () => undefined } as unknown as AudioContext;
    const audio = new AudioManager(true, {
      contextFactory: () => context,
      fetchImpl: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }) as Response,
      manifest: [{ id: 'music-home', variant: 1, relativeUrl: '/audio/v1/music/music-home__v01.mp3', listeningStatus: 'accepted' }],
    });
    audio.setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, music: true, ambience: false });
    audio.setBed('music', 'music-home');
    audio.setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, music: true, ambience: false, masterVolume: 0.3 });
    complete({ length: 4800, numberOfChannels: 1 } as AudioBuffer);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(source.start).toHaveBeenCalledOnce();
    audio.dispose();
  });

  it('tracks document visibility so hidden pages do not play feedback', () => {
    const audio = new AudioManager();

    expect(audio.isDocumentHidden()).toBe(false);
    audio.setDocumentHidden(true);
    expect(audio.isDocumentHidden()).toBe(true);
    audio.setDocumentHidden(false);
    expect(audio.isDocumentHidden()).toBe(false);
  });

  it('stops active legacy voices immediately when the master is muted', () => {
    const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 1 }, connect: vi.fn() };
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => ({ type: 'sine', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
      createGain: vi.fn(() => gain),
      resume: vi.fn(async () => undefined),
      suspend: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const audio = new AudioManager(true, { contextFactory: () => context });
    audio.play('tap');
    audio.setEnabled(false);
    expect(audio.isEnabled()).toBe(false);
    expect(audio.activeVoiceCount()).toBe(0);
    expect(context.createOscillator).toHaveBeenCalledOnce();
  });

  it('plays a pending asset only when it is explicitly marked as a local pilot runtime entry', async () => {
    const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
    const gain = { gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => gain),
      decodeAudioData: vi.fn(async () => ({ length: 4800, numberOfChannels: 1 } as AudioBuffer)),
      resume: vi.fn(async () => undefined),
      suspend: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const fetchImpl = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }) as Response);
    const audio = new AudioManager(true, {
      contextFactory: () => context,
      fetchImpl,
      manifest: [{
        id: 'ui-confirm',
        variant: 1,
        relativeUrl: '/audio/v1/sfx/ui-confirm__v01.mp3',
        listeningStatus: 'pending-human-listening',
        runtimeMode: 'pilot',
      } as unknown as AudioManifestEntry],
    });

    audio.playCue('ui-confirm', { eventKey: 'pilot-preview' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchImpl).toHaveBeenCalledWith('/audio/v1/sfx/ui-confirm__v01.mp3');
    expect(source.start).toHaveBeenCalledOnce();
    audio.dispose();
  });

  it('keeps music and notifications opt-in and preserves the legacy master separately', () => {
    const audio = new AudioManager(true);
    expect(audio.getPreferences()).toEqual(DEFAULT_AUDIO_PREFERENCES);
    audio.setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, music: true, notifications: true, masterVolume: 0.4 });
    expect(audio.getPreferences()).toMatchObject({ music: true, notifications: true, masterVolume: 0.4 });
    audio.setEnabled(false);
    expect(audio.getPreferences().masterVolume).toBe(0.4);
  });

  it('does not resume hidden audio or pending sources after disposal', async () => {
    const audio = new AudioManager(true);
    audio.setDocumentHidden(true);
    await audio.unlockFromGesture();
    expect(audio.activeVoiceCount()).toBe(0);
    audio.dispose();
    expect(audio.activeVoiceCount()).toBe(0);
  });

  it('invalidates a slow accepted decode after stopAll and does not start stale audio', async () => {
    let resolveDecode!: (buffer: AudioBuffer) => void;
    const decodePromise = new Promise<AudioBuffer>((resolve) => { resolveDecode = resolve; });
    const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
    const gain = { gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => gain),
      decodeAudioData: vi.fn(() => decodePromise),
      resume: vi.fn(async () => undefined),
      suspend: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const fetchImpl = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }) as Response);
    const audio = new AudioManager(true, {
      contextFactory: () => context,
      fetchImpl,
      manifest: [{ id: 'ui-confirm', variant: 2, relativeUrl: '/audio/v1/sfx/ui-confirm__v02.mp3', listeningStatus: 'accepted' }],
    });

    audio.playCue('ui-confirm', { eventKey: 'slow-decode' });
    audio.setDocumentHidden(true);
    audio.stopAll();
    resolveDecode({} as AudioBuffer);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(context.createBufferSource).not.toHaveBeenCalled();
    expect(source.start).not.toHaveBeenCalled();
    expect(audio.activeVoiceCount()).toBe(0);
    audio.dispose();
  });

  it('fails closed when an accepted asset cannot be fetched offline', async () => {
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(),
      createGain: vi.fn(() => ({ gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() })),
      resume: vi.fn(async () => undefined),
      suspend: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const audio = new AudioManager(true, {
      contextFactory: () => context,
      fetchImpl: vi.fn(async () => { throw new Error('offline'); }),
      manifest: [{ id: 'ui-confirm', variant: 2, relativeUrl: '/audio/v1/sfx/ui-confirm__v02.mp3', listeningStatus: 'accepted' }],
    });

    audio.playCue('ui-confirm', { eventKey: 'offline' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(context.createBufferSource).not.toHaveBeenCalled();
    expect(audio.activeVoiceCount()).toBe(0);
    audio.dispose();
  });

  it('reuses decoded one-shot buffers without exceeding the cache contract', async () => {
    let clock = 0;
    const buffer = { length: 4800, numberOfChannels: 1 } as AudioBuffer;
    const sources: Array<{ buffer: AudioBuffer | null; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended: (() => void) | null }> = [];
    const gain = () => ({ gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() });
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => {
        const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
        sources.push(source);
        return source;
      }),
      createGain: vi.fn(gain),
      decodeAudioData: vi.fn(async () => buffer),
      resume: vi.fn(async () => undefined),
      suspend: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const fetchImpl = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }) as Response);
    const audio = new AudioManager(true, {
      contextFactory: () => context,
      fetchImpl,
      now: () => clock,
      manifest: [{ id: 'lesson-start', variant: 1, relativeUrl: '/audio/v1/sfx/lesson-start__v01.mp3', listeningStatus: 'accepted' }],
    });

    audio.playCue('lesson-start', { eventKey: 'lesson-start:1' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    audio.stopAll();
    clock = 1000;
    audio.playCue('lesson-start', { eventKey: 'lesson-start:2' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    expect(sources).toHaveLength(2);
    expect(sources[0].start).toHaveBeenCalledOnce();
    expect(sources[1].start).toHaveBeenCalledOnce();
    expect(audio.decodedCacheBytes()).toBe(4800 * 4);
    audio.dispose();
  });

  it('does not retain a pending bed identity when the page hides during decode', async () => {
    let resolveDecode!: (buffer: AudioBuffer) => void;
    const decodePromise = new Promise<AudioBuffer>((resolve) => { resolveDecode = resolve; });
    const source = { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
    const gain = { gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => gain),
      decodeAudioData: vi.fn(() => decodePromise),
      resume: vi.fn(async () => undefined),
      suspend: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const audio = new AudioManager(true, {
      contextFactory: () => context,
      fetchImpl: vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }) as Response),
      manifest: [{ id: 'music-home', variant: 1, relativeUrl: '/audio/v1/music/music-home__v01.mp3', listeningStatus: 'accepted' }],
    });
    audio.setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, music: true });
    audio.setBed('music', 'music-home');
    audio.setDocumentHidden(true);
    resolveDecode({ length: 4800, numberOfChannels: 2 } as AudioBuffer);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(source.start).not.toHaveBeenCalled();
    audio.setDocumentHidden(false);
    audio.setBed('music', 'music-home');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(source.start).toHaveBeenCalledOnce();
    audio.dispose();
  });
});
