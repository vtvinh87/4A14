import type { ProgressBoardRolloutConfig } from '../../shared/progress-board-contracts.ts';
import { getEnv } from '../runtime/env.ts';

export const PROGRESS_BOARD_ROLLOUT_ENV = 'HOC_VUI_PROGRESS_BOARD_ENABLED' as const;

export type ProgressBoardRolloutFailure = {
  ok: false;
  code: 'unavailable';
  reason: 'rollout_disabled';
  message: string;
};

export function parseProgressBoardEnabled(value: string | undefined = getEnv(PROGRESS_BOARD_ROLLOUT_ENV)): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on';
}

export function getProgressBoardRolloutConfig(value?: string): ProgressBoardRolloutConfig {
  return { enabled: parseProgressBoardEnabled(value) };
}

export function isProgressBoardRolloutEnabled(config: ProgressBoardRolloutConfig = getProgressBoardRolloutConfig()): boolean {
  return config.enabled;
}

export function progressBoardRolloutFailure(): ProgressBoardRolloutFailure {
  return {
    ok: false,
    code: 'unavailable',
    reason: 'rollout_disabled',
    message: 'Bảng tiến bộ đang được mở dần cho lớp.',
  };
}
