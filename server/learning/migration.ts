import { hashToken } from '../auth/crypto.ts';
import { ACCOUNT_BACKUP_KIND, CONTENT_VERSION, type AccountProgressBackup, type MigrationPreview } from '../../shared/learning-contracts.ts';
import type { Progress } from '../../src/content/types.ts';
import { BACKUP_MAX_BYTES, isProgress } from '../../src/progress/storage.ts';
import type { LearningSnapshotRecord } from './types.ts';

type MigrationParseFailure = { ok: false; code: 'invalid' | 'forbidden'; message: string };
export type ParsedProgressBackup = {
  ok: true;
  fingerprint: string;
  progress: Progress;
  source: 'legacy' | 'account';
  legacyImported: boolean;
};

export type MigrationParseResult = ParsedProgressBackup | MigrationParseFailure;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function parseProgressBackup(raw: string, studentId: string): MigrationParseResult {
  if (typeof raw !== 'string' || byteLength(raw) > BACKUP_MAX_BYTES) return { ok: false, code: 'invalid', message: 'Tệp sao lưu phải nhỏ hơn hoặc bằng 1 MB.' };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { ok: false, code: 'invalid', message: 'Tệp sao lưu không phải JSON hợp lệ.' }; }

  if (isProgress(value)) return { ok: true, fingerprint: hashToken(raw), progress: value, source: 'legacy', legacyImported: true };
  if (!record(value)) return { ok: false, code: 'invalid', message: 'Tệp sao lưu không đúng cấu trúc Học Vui.' };

  if (value.kind === ACCOUNT_BACKUP_KIND) {
    if (value.schemaVersion !== 1 || typeof value.exportAt !== 'string' || typeof value.ownerId !== 'string' || typeof value.contentVersion !== 'string' || !Number.isInteger(value.revision) || (value.revision as number) < 0 || !Number.isInteger(value.generation) || (value.generation as number) < 0 || value.contentVersion !== CONTENT_VERSION || !isProgress(value.progress)) {
      return { ok: false, code: 'invalid', message: 'Tệp sao lưu tài khoản không đúng phiên bản nội dung.' };
    }
    if (value.ownerId !== studentId) return { ok: false, code: 'forbidden', message: 'Tệp sao lưu thuộc tài khoản học sinh khác.' };
    return { ok: true, fingerprint: hashToken(raw), progress: value.progress, source: 'account', legacyImported: Boolean(value.legacyImported) };
  }

  // The old browser backup wrapper has no owner. It is accepted only after
  // the already-authenticated parent gate identifies the target student.
  if (value.schemaVersion === 1 && typeof value.exportAt === 'string' && isProgress(value.progress)) {
    return { ok: true, fingerprint: hashToken(raw), progress: value.progress, source: 'legacy', legacyImported: true };
  }
  return { ok: false, code: 'invalid', message: 'Tệp sao lưu không đúng cấu trúc Học Vui.' };
}

export function createProgressBackup(snapshot: LearningSnapshotRecord, exportAt: string): string {
  const backup: AccountProgressBackup = {
    schemaVersion: 1,
    kind: ACCOUNT_BACKUP_KIND,
    exportAt,
    ownerId: snapshot.studentId,
    revision: snapshot.revision,
    generation: snapshot.generation,
    contentVersion: snapshot.contentVersion,
    progress: snapshot.progress,
    ...(snapshot.legacyImported ? { legacyImported: true } : {}),
  };
  const raw = JSON.stringify(backup);
  if (byteLength(raw) > BACKUP_MAX_BYTES) throw new Error('Bản sao lưu vượt quá giới hạn 1 MB.');
  return raw;
}

export function migrationPreview(parsed: ParsedProgressBackup, studentId: string, currentRevision: number, alreadyImported: boolean): MigrationPreview {
  return {
    fingerprint: parsed.fingerprint,
    studentId,
    source: parsed.source,
    legacyImported: parsed.legacyImported,
    completedMissions: parsed.progress.completedMissions.length,
    stamps: parsed.progress.stamps.length,
    hasSession: Boolean(parsed.progress.session),
    currentRevision,
    alreadyImported,
  };
}
