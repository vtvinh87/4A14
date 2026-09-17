import type { ChallengeFailure, ChallengeRolloutConfig, ChallengeRolloutMode } from '../../shared/challenge-contracts.ts';
import { getEnv } from '../runtime/env.ts';

export const CHALLENGE_ROLLOUT_ENV = 'HOC_VUI_CHALLENGE_MODE' as const;
export const CHALLENGE_ROLLOUT_SCOPE = 'single-class' as const;

const VALID_MODES: readonly ChallengeRolloutMode[] = ['off', 'pilot', 'on'];

export function parseChallengeRolloutMode(value: string | undefined = getEnv(CHALLENGE_ROLLOUT_ENV)): ChallengeRolloutMode {
  const normalized = value?.trim().toLowerCase();
  return VALID_MODES.includes(normalized as ChallengeRolloutMode) ? normalized as ChallengeRolloutMode : 'off';
}

export function getChallengeRolloutConfig(value?: string): ChallengeRolloutConfig {
  const mode = parseChallengeRolloutMode(value);
  return { enabled: mode !== 'off', mode, scope: CHALLENGE_ROLLOUT_SCOPE };
}

export function challengeRolloutFailure(config: ChallengeRolloutConfig = getChallengeRolloutConfig()): ChallengeFailure {
  return {
    ok: false,
    code: 'unavailable',
    reason: 'rollout_disabled',
    message: config.mode === 'off'
      ? 'Tính năng Thách đố đang tạm đóng để chuẩn bị cho lớp.'
      : 'Tính năng Thách đố chưa sẵn sàng cho phiên này.',
  };
}

export function isChallengeRolloutEnabled(config: ChallengeRolloutConfig = getChallengeRolloutConfig()): boolean {
  return config.enabled;
}
