import type { Progress } from '../content/types';
import { createDefaultProgress } from '../progress/storage';
import type { StudentProfilePatch, StudentProfileView } from '../../shared/account-contracts';

export type FeatureFixture = {
  student: StudentProfileView;
  sibling: StudentProfileView;
  progress: Progress;
  parentGrant: { accountId: string; token: string };
};

export type OwnedUiState = {
  avatarId: string | null;
  birthDate: string | null;
  dashboard: unknown | null;
  parentProfile: unknown | null;
  celebration: unknown | null;
};

export function createFeatureFixtures(): FeatureFixture {
  const progress = createDefaultProgress();
  return {
    student: { accountId: 'student-a', username: 'bebao', displayName: 'Bé Bảo', avatarId: 'fox-scout', birthDate: '2016-09-14', birthdayWishesEnabled: false },
    sibling: { accountId: 'student-b', username: 'behan', displayName: 'Bé Hân', avatarId: 'fox-leaf', birthDate: null, birthdayWishesEnabled: false },
    progress,
    parentGrant: { accountId: 'student-a', token: 'synthetic-parent-grant-a' },
  };
}

export function applySyntheticProfilePatch(profile: StudentProfileView, patch: StudentProfilePatch): StudentProfileView {
  return { ...profile, ...patch };
}

export function clearOwnedUiState(): OwnedUiState {
  return { avatarId: null, birthDate: null, dashboard: null, parentProfile: null, celebration: null };
}

export function isFreshAccountResponse(currentAccountId: string | null, currentEpoch: number, responseAccountId: string, responseEpoch: number): boolean {
  return currentAccountId === responseAccountId && currentEpoch === responseEpoch;
}
