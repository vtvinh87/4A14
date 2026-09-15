import { beforeEach, describe, expect, it } from 'vitest';
import type { LearningEventInput } from '../../shared/learning-contracts';
import { acknowledgeLearningEvents, enqueueLearningEvent, listQueuedLearningEvents } from './eventQueue';

const event = (eventId: string, runId: string, sequence: number): LearningEventInput => ({ eventId, runId, sequence, type: 'heartbeat', lessonId: 'lesson-01', lessonVersion: 1, deviceId: 'tablet', generation: 0 });

describe('account-scoped offline event queue', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined });
  });

  it('keeps A and B isolated and makes duplicate enqueue idempotent', async () => {
    await enqueueLearningEvent('student-a', event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1));
    await enqueueLearningEvent('student-a', event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1));
    await enqueueLearningEvent('student-b', event('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 1));
    expect(await listQueuedLearningEvents('student-a')).toHaveLength(1);
    expect(await listQueuedLearningEvents('student-b')).toHaveLength(1);
    await acknowledgeLearningEvents('student-a', ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
    expect(await listQueuedLearningEvents('student-a')).toHaveLength(0);
    expect(await listQueuedLearningEvents('student-b')).toHaveLength(1);
  });
});
