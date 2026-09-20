import { describe, expect, it } from 'vitest';
import { AudioAdmissionPolicy, type AudioPolicyRequest } from './policy';

const request = (overrides: Partial<AudioPolicyRequest> = {}): AudioPolicyRequest => ({
  id: 'answer-correct',
  bus: 'sfx',
  category: 'outcome',
  priority: 80,
  cooldownMs: 700,
  nowMs: 0,
  ...overrides,
});

describe('AudioAdmissionPolicy', () => {
  it('deduplicates an event key for the TTL and bounds the key set', () => {
    const policy = new AudioAdmissionPolicy({ maxDedupeKeys: 2, dedupeTtlMs: 60_000 });
    expect(policy.admit(request({ eventKey: 'answer:1' })).accepted).toBe(true);
    expect(policy.admit(request({ eventKey: 'answer:1', nowMs: 10 })).accepted).toBe(false);
    expect(policy.admit(request({ eventKey: 'answer:2', nowMs: 20 })).accepted).toBe(false);
    expect(policy.admit(request({ eventKey: 'answer:3', nowMs: 30 })).accepted).toBe(false);
    expect(policy.dedupeSize()).toBeLessThanOrEqual(2);
    expect(policy.admit(request({ eventKey: 'answer:1', nowMs: 60_001 })).accepted).toBe(true);
  });

  it('rejects cooldown repeats but accepts after the cooldown expires', () => {
    const policy = new AudioAdmissionPolicy();
    expect(policy.admit(request()).accepted).toBe(true);
    expect(policy.admit(request({ nowMs: 699 })).accepted).toBe(false);
    expect(policy.admit(request({ nowMs: 700 })).accepted).toBe(true);
  });

  it('keeps one outcome and one pet, and lets a higher priority voice replace a lower one', () => {
    const policy = new AudioAdmissionPolicy({ maxVoices: 2 });
    const active = [
      { voiceId: 'outcome-1', id: 'answer-correct', bus: 'sfx' as const, category: 'outcome' as const, priority: 80, startedAt: 0 },
      { voiceId: 'pet-1', id: 'pet-fox', bus: 'pet' as const, category: 'pet' as const, priority: 60, startedAt: 0 },
    ];

    expect(policy.admit(request({ id: 'answer-retry', nowMs: 100 }), active)).toMatchObject({ accepted: false, reason: 'category-busy' });
    expect(policy.admit(request({ id: 'lesson-complete', category: 'reward', priority: 90, nowMs: 100 }), active)).toMatchObject({ accepted: true, evictVoiceId: 'outcome-1' });
    expect(policy.admit(request({ id: 'pet-fox', bus: 'pet', category: 'pet', priority: 60, nowMs: 200 }), active)).toMatchObject({ accepted: false, reason: 'category-busy' });
  });

  it('rejects a low-priority request when the one-shot budget is full', () => {
    const policy = new AudioAdmissionPolicy({ maxVoices: 2 });
    const active = [
      { voiceId: 'outcome-1', id: 'answer-correct', bus: 'sfx' as const, category: 'outcome' as const, priority: 80, startedAt: 0 },
      { voiceId: 'reward-1', id: 'lesson-complete', bus: 'sfx' as const, category: 'reward' as const, priority: 90, startedAt: 0 },
    ];
    expect(policy.admit(request({ id: 'ui-tap', category: 'other', priority: 20, nowMs: 10 }), active)).toMatchObject({ accepted: false, reason: 'voice-budget' });
  });
});
