import type { AccountProgressSnapshot } from '../../shared/learning-contracts';
import { CONTENT_VERSION } from '../../shared/learning-contracts';
import type { Progress } from '../content/types';

export const ACCOUNT_PROGRESS_CACHE_KEY = 'hoc-vui-account-progress-v1';

function storageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

function cacheKey(studentId: string): string {
  return `${ACCOUNT_PROGRESS_CACHE_KEY}:${studentId}`;
}

export function createAccountProgressSnapshot(studentId: string, progress: Progress, revision = 0, generation = 0, updatedAt = progress.updatedAt): AccountProgressSnapshot {
  return { studentId, schemaVersion: 1, revision, generation, contentVersion: CONTENT_VERSION, progress, updatedAt };
}

export function loadAccountProgressSnapshot(studentId: string): AccountProgressSnapshot | null {
  if (!studentId) return null;
  try {
    const raw = storageOrNull()?.getItem(cacheKey(studentId));
    if (!raw) return null;
    const value = JSON.parse(raw) as AccountProgressSnapshot;
    if (value?.studentId !== studentId || value.schemaVersion !== 1 || !value.progress || value.progress.schemaVersion !== 1 || typeof value.revision !== 'number' || typeof value.generation !== 'number') return null;
    return value;
  } catch { return null; }
}

export function saveAccountProgressSnapshot(snapshot: AccountProgressSnapshot): boolean {
  if (!snapshot.studentId || snapshot.schemaVersion !== 1) return false;
  try { storageOrNull()?.setItem(cacheKey(snapshot.studentId), JSON.stringify(snapshot)); return Boolean(storageOrNull()); } catch { return false; }
}

export function removeAccountProgressSnapshot(studentId: string): void {
  try { storageOrNull()?.removeItem(cacheKey(studentId)); } catch { /* best effort */ }
}
