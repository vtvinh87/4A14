export type TimingSpan = 'auth' | 'data';
export type TimingStage =
  | 'challenge_snapshot'
  | 'challenge_preferences'
  | 'challenge_prepare'
  | 'challenge_rounds'
  | 'challenge_items'
  | 'challenge_attempts'
  | 'challenge_questions'
  | 'challenge_authors'
  | 'challenge_contributions'
  | 'challenge_reactions'
  | 'challenge_roster'
  | 'challenge_item_questions'
  | 'challenge_mine';
export type TimingClock = () => number;

export type RequestTiming = {
  measure<T>(span: TimingSpan, work: () => Promise<T> | T): Promise<T>;
  measureStage<T>(stage: TimingStage, work: () => Promise<T> | T): Promise<T>;
  finish(): void;
  header(): string;
};

function safeDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatDuration(value: number): string {
  return safeDuration(value).toFixed(2).replace(/\.00$/, '');
}

export function createRequestTiming(clock: TimingClock = () => performance.now()): RequestTiming {
  const startedAt = clock();
  const durations: Record<TimingSpan, number> = { auth: 0, data: 0 };
  const stageDurations = new Map<TimingStage, number>();
  let total: number | null = null;

  return {
    async measure<T>(span: TimingSpan, work: () => Promise<T> | T): Promise<T> {
      const started = clock();
      try {
        return await work();
      } finally {
        durations[span] += safeDuration(clock() - started);
      }
    },
    async measureStage<T>(stage: TimingStage, work: () => Promise<T> | T): Promise<T> {
      const started = clock();
      try {
        return await work();
      } finally {
        stageDurations.set(stage, (stageDurations.get(stage) ?? 0) + safeDuration(clock() - started));
      }
    },
    finish() {
      if (total === null) total = safeDuration(clock() - startedAt);
    },
    header() {
      if (total === null) total = safeDuration(clock() - startedAt);
      const entries = [
        `auth;dur=${formatDuration(durations.auth)}`,
        `data;dur=${formatDuration(durations.data)}`,
        `total;dur=${formatDuration(total)}`,
      ];
      for (const [stage, duration] of stageDurations) entries.push(`${stage};dur=${formatDuration(duration)}`);
      return entries.join(', ');
    },
  };
}

export function isTimedReadPath(method: string, path: string): boolean {
  if (method.toUpperCase() !== 'GET') return false;
  let pathname: string;
  try {
    pathname = new URL(path, 'http://hoc-vui.local').pathname;
  } catch {
    return false;
  }
  return pathname === '/api/me/friends'
    || pathname === '/api/me/progress-board'
    || pathname === '/api/me/challenge/today'
    || pathname === '/api/me/challenge/week';
}
