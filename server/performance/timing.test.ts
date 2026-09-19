import { describe, expect, it } from 'vitest';
import { createRequestTiming, isTimedReadPath } from './timing';

describe('request-local server timing', () => {
  it('records deterministic non-negative auth/data/total durations without sensitive labels', async () => {
    let tick = 0;
    const timing = createRequestTiming(() => ++tick);
    await timing.measure('auth', async () => undefined);
    await timing.measure('data', async () => undefined);
    timing.finish();

    const header = timing.header();
    expect(header).toMatch(/^auth;dur=\d+(?:\.\d+)?, data;dur=\d+(?:\.\d+)?, total;dur=\d+(?:\.\d+)?$/);
    expect(header).not.toContain('student-a');
    expect(header).not.toContain('opaque-token');
  });

  it('keeps accumulators request-local and records error-path work before rethrow', async () => {
    let firstTick = 0;
    let secondTick = 0;
    const first = createRequestTiming(() => ++firstTick);
    const second = createRequestTiming(() => ++secondTick);
    await expect(second.measure('data', async () => { throw new Error('expected'); })).rejects.toThrow('expected');
    second.finish();
    first.finish();

    expect(second.header()).not.toBe(first.header());
    expect(second.header()).toContain('data;dur=1');
    expect(second.header()).toContain('total;dur=3');
  });

  it('exposes only fixed challenge stage labels when stage timing is requested', async () => {
    let tick = 0;
    const timing = createRequestTiming(() => ++tick);
    await timing.measureStage('challenge_attempts', async () => undefined);
    timing.finish();

    expect(timing.header()).toMatch(/challenge_attempts;dur=\d+(?:\.\d+)?$/);
    expect(timing.header()).not.toContain('student-a');
    expect(timing.header()).not.toContain('opaque-token');
  });

  it('includes the weekly challenge read in protected timing coverage', () => {
    expect(isTimedReadPath('GET', '/api/me/challenge/week')).toBe(true);
    expect(isTimedReadPath('POST', '/api/me/challenge/week')).toBe(false);
  });
});
