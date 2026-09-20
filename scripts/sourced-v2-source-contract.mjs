const ALLOWED_LICENSES = new Set(['CC0', 'Public Domain']);

export function validateSourceRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('source registry must contain at least one record');
  }

  const ids = new Set();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id) {
      throw new Error('source record needs a non-empty id');
    }
    if (ids.has(record.id)) throw new Error(`duplicate source record id: ${record.id}`);
    ids.add(record.id);

    for (const field of ['localPath', 'sourceUrl', 'sourcePage', 'licenseEvidenceUrl']) {
      if (typeof record[field] !== 'string' || !record[field]) {
        throw new Error(`${record.id} is missing ${field}`);
      }
    }
    if (!ALLOWED_LICENSES.has(record.license)) {
      throw new Error(`${record.id} has unsupported license: ${record.license}`);
    }
    if (record.costUsd !== 0) throw new Error(`${record.id} must have costUsd=0`);
    if (!/^[a-f0-9]{64}$/i.test(record.sha256 ?? '')) {
      throw new Error(`${record.id} is missing a valid sha256`);
    }
    if (!Number.isInteger(record.bytes) || record.bytes <= 0) {
      throw new Error(`${record.id} is missing a positive byte count`);
    }
  }
  return true;
}

