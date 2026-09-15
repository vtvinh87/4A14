import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from './storage';
import { createAccountBackup, parseAccountBackup, previewAccountBackup } from './accountMigration';
import { createAccountProgressSnapshot } from './accountProgress';

const studentId = '11111111-1111-4111-8111-111111111111';

describe('account progress migration helpers', () => {
  it('previews bare legacy progress without inventing history', () => {
    const result = previewAccountBackup(JSON.stringify(createDefaultProgress()), studentId);
    expect(result).toEqual({ ownerId: studentId, source: 'legacy', legacyImported: true, completedMissions: 0, stamps: 0, hasSession: false });
  });

  it('round-trips owner-bound backups and rejects another owner', () => {
    const snapshot = createAccountProgressSnapshot(studentId, createDefaultProgress(), 4, 2, '2026-09-13T03:00:00.000Z');
    const raw = createAccountBackup(snapshot, '2026-09-13T03:00:01.000Z');
    expect(parseAccountBackup(raw, studentId)).toMatchObject({ ok: true, source: 'account', legacyImported: false });
    expect(parseAccountBackup(raw, '99999999-9999-4999-8999-999999999999')).toMatchObject({ ok: false, error: 'Tệp sao lưu thuộc tài khoản học sinh khác.' });
  });

  it('rejects malformed backups before any storage write', () => {
    expect(parseAccountBackup('{broken', studentId)).toMatchObject({ ok: false });
    expect(parseAccountBackup(JSON.stringify({ schemaVersion: 1, exportAt: new Date().toISOString(), progress: { schemaVersion: 1 } }), studentId)).toMatchObject({ ok: false });
  });
});
