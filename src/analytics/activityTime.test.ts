import { describe, expect, it } from 'vitest';
import { estimateInteractiveSeconds } from './activityTime';

describe('interactive heartbeat time', () => {
  it('counts only visible interactive heartbeat gaps', () => {
    expect(estimateInteractiveSeconds([
      { receivedAt: '2026-09-13T01:00:00.000Z', visible: true, interactive: true },
      { receivedAt: '2026-09-13T01:00:15.000Z', visible: true, interactive: true },
      { receivedAt: '2026-09-13T01:00:30.000Z', visible: false, interactive: true },
      { receivedAt: '2026-09-13T01:00:45.000Z', visible: true, interactive: false },
      { receivedAt: '2026-09-13T01:02:30.000Z', visible: true, interactive: true },
    ])).toBe(15);
  });
});
