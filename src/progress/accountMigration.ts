import { ACCOUNT_BACKUP_KIND, CONTENT_VERSION, type AccountProgressBackup } from '../../shared/learning-contracts';
import type { Progress } from '../content/types';
import { BACKUP_MAX_BYTES, isProgress, readRawProgress } from './storage';
import type { AccountProgressSnapshot } from '../../shared/learning-contracts';

export type LocalMigrationPreview = {
  ownerId: string;
  source: 'legacy' | 'account';
  legacyImported: boolean;
  completedMissions: number;
  stamps: number;
  hasSession: boolean;
};

export type LocalParseResult = { ok: true; progress: Progress; source: 'legacy' | 'account'; legacyImported: boolean } | { ok: false; error: string };

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function parseAccountBackup(raw: string, ownerId: string): LocalParseResult {
  if (!raw || byteLength(raw) > BACKUP_MAX_BYTES) return { ok: false, error: 'Tệp sao lưu phải nhỏ hơn hoặc bằng 1 MB.' };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { ok: false, error: 'Tệp sao lưu không phải JSON hợp lệ.' }; }
  if (isProgress(value)) return { ok: true, progress: value, source: 'legacy', legacyImported: true };
  if (!record(value)) return { ok: false, error: 'Tệp sao lưu không đúng cấu trúc Học Vui.' };
  if (value.kind === ACCOUNT_BACKUP_KIND) {
    if (value.schemaVersion !== 1 || typeof value.ownerId !== 'string' || value.ownerId !== ownerId || value.contentVersion !== CONTENT_VERSION || !isProgress(value.progress)) return { ok: false, error: value.ownerId && value.ownerId !== ownerId ? 'Tệp sao lưu thuộc tài khoản học sinh khác.' : 'Tệp sao lưu tài khoản không đúng phiên bản.' };
    return { ok: true, progress: value.progress, source: 'account', legacyImported: Boolean(value.legacyImported) };
  }
  if (value.schemaVersion === 1 && typeof value.exportAt === 'string' && isProgress(value.progress)) return { ok: true, progress: value.progress, source: 'legacy', legacyImported: true };
  return { ok: false, error: 'Tệp sao lưu không đúng cấu trúc Học Vui.' };
}

export function previewAccountBackup(raw: string, ownerId: string): LocalMigrationPreview | { ok: false; error: string } {
  const parsed = parseAccountBackup(raw, ownerId);
  if (!parsed.ok) return parsed;
  return { ownerId, source: parsed.source, legacyImported: parsed.legacyImported, completedMissions: parsed.progress.completedMissions.length, stamps: parsed.progress.stamps.length, hasSession: Boolean(parsed.progress.session) };
}

export function previewUnownedLegacyProgress(ownerId: string): LocalMigrationPreview | null | { ok: false; error: string } {
  const raw = readRawProgress();
  if (!raw) return null;
  return previewAccountBackup(raw, ownerId);
}

export function createAccountBackup(snapshot: AccountProgressSnapshot, exportAt = new Date().toISOString()): string {
  const backup: AccountProgressBackup = { schemaVersion: 1, kind: ACCOUNT_BACKUP_KIND, exportAt, ownerId: snapshot.studentId, revision: snapshot.revision, generation: snapshot.generation, contentVersion: snapshot.contentVersion, progress: snapshot.progress, ...(snapshot.legacyImported ? { legacyImported: true } : {}) };
  const raw = JSON.stringify(backup);
  if (byteLength(raw) > BACKUP_MAX_BYTES) throw new Error('Bản sao lưu vượt quá giới hạn 1 MB.');
  return raw;
}
