export const HEARTBEAT_INTERVAL_MS = 15_000;
export const INTERACTION_WINDOW_MS = 60_000;

export type ActivityHeartbeat = {
  receivedAt: string;
  visible: boolean;
  interactive: boolean;
};

/** Estimates active time only between visible, recently interactive heartbeats. */
export function estimateInteractiveSeconds(samples: readonly ActivityHeartbeat[]): number {
  const ordered = samples
    .filter((sample) => sample.visible && sample.interactive)
    .map((sample) => Date.parse(sample.receivedAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let seconds = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    const gap = ordered[index] - ordered[index - 1];
    if (gap > 0 && gap <= INTERACTION_WINDOW_MS) seconds += gap / 1000;
  }
  return seconds;
}
