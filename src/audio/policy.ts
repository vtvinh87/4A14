import type { AudioBus, AudioCategory } from './catalog';

export type AudioPolicyRequest = {
  id: string;
  bus: AudioBus;
  category: AudioCategory;
  priority: number;
  cooldownMs: number;
  nowMs: number;
  eventKey?: string;
};

export type ActiveAudioVoice = {
  voiceId: string;
  id: string;
  bus: AudioBus;
  category: AudioCategory;
  priority: number;
  startedAt: number;
};

export type AdmissionDecision = {
  accepted: boolean;
  reason?: 'event-deduped' | 'cooldown' | 'category-busy' | 'voice-budget';
  evictVoiceId?: string;
};

type PolicyOptions = {
  maxVoices?: number;
  dedupeTtlMs?: number;
  maxDedupeKeys?: number;
};

function conflictGroup(category: AudioCategory): 'pet' | 'outcome' | null {
  if (category === 'pet') return 'pet';
  if (category === 'outcome' || category === 'reward') return 'outcome';
  return null;
}

export class AudioAdmissionPolicy {
  private readonly maxVoices: number;
  private readonly dedupeTtlMs: number;
  private readonly maxDedupeKeys: number;
  private readonly lastPlayed = new Map<string, number>();
  private readonly eventKeys = new Map<string, number>();

  constructor(options: PolicyOptions = {}) {
    this.maxVoices = options.maxVoices ?? 4;
    this.dedupeTtlMs = options.dedupeTtlMs ?? 60_000;
    this.maxDedupeKeys = options.maxDedupeKeys ?? 256;
  }

  admit(request: AudioPolicyRequest, activeVoices: readonly ActiveAudioVoice[] = []): AdmissionDecision {
    this.purgeEventKeys(request.nowMs);

    if (request.eventKey) {
      const seenAt = this.eventKeys.get(request.eventKey);
      if (seenAt !== undefined && request.nowMs - seenAt < this.dedupeTtlMs) return { accepted: false, reason: 'event-deduped' };
    }

    const lastPlayedAt = this.lastPlayed.get(request.id);
    if (lastPlayedAt !== undefined && request.nowMs - lastPlayedAt < request.cooldownMs) return { accepted: false, reason: 'cooldown' };

    let evictVoiceId: string | undefined;
    const group = conflictGroup(request.category);
    const conflictingVoice = group ? activeVoices.find((voice) => conflictGroup(voice.category) === group) : undefined;
    if (conflictingVoice) {
      if (request.priority <= conflictingVoice.priority) return { accepted: false, reason: 'category-busy' };
      evictVoiceId = conflictingVoice.voiceId;
    }

    const remainingVoices = activeVoices.filter((voice) => voice.voiceId !== evictVoiceId);
    if (remainingVoices.length >= this.maxVoices) {
      const quietest = [...remainingVoices].sort((left, right) => left.priority - right.priority || left.startedAt - right.startedAt)[0];
      if (!quietest || request.priority <= quietest.priority) return { accepted: false, reason: 'voice-budget' };
      evictVoiceId = quietest.voiceId;
    }

    this.lastPlayed.set(request.id, request.nowMs);
    if (request.eventKey) {
      this.eventKeys.set(request.eventKey, request.nowMs);
      while (this.eventKeys.size > this.maxDedupeKeys) {
        const oldest = this.eventKeys.keys().next().value as string | undefined;
        if (!oldest) break;
        this.eventKeys.delete(oldest);
      }
    }
    return { accepted: true, ...(evictVoiceId ? { evictVoiceId } : {}) };
  }

  dedupeSize(): number {
    return this.eventKeys.size;
  }

  private purgeEventKeys(nowMs: number): void {
    for (const [key, seenAt] of this.eventKeys) {
      if (nowMs - seenAt >= this.dedupeTtlMs) this.eventKeys.delete(key);
    }
  }
}
