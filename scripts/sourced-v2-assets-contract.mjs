function isHash(value) {
  return /^[a-f0-9]{64}$/i.test(value ?? '');
}

export function validateCandidateRecords(records, { expectedCount } = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('candidate records must contain at least one entry');
  }
  if (expectedCount !== undefined && records.length !== expectedCount) {
    throw new Error(`expected ${expectedCount} candidate records, got ${records.length}`);
  }

  const outputPaths = new Set();
  const keys = new Set();
  for (const record of records) {
    const key = `${record.id}#${record.variant}`;
    if (keys.has(key)) throw new Error(`duplicate candidate target: ${key}`);
    keys.add(key);
    if (typeof record.outputPath !== 'string' || !record.outputPath) {
      throw new Error(`${key} is missing outputPath`);
    }
    if (outputPaths.has(record.outputPath)) throw new Error(`duplicate output path: ${record.outputPath}`);
    outputPaths.add(record.outputPath);
    if (!record.exists) throw new Error(`${key} candidate file is missing`);
    if (!Number.isInteger(record.bytes) || record.bytes <= 0) throw new Error(`${key} has invalid bytes`);
    if (!isHash(record.sha256) || !isHash(record.sourceSha256)) throw new Error(`${key} is missing a valid sha256`);
    if (record.sampleRate !== 48000) throw new Error(`${key} must be 48 kHz`);
    const expectedChannels = ['music', 'ambience'].includes(record.bus) ? 2 : 1;
    if (record.channels !== expectedChannels) {
      throw new Error(`${key} must have ${expectedChannels} channel(s)`);
    }
    if (record.codec !== 'pcm_s24le') throw new Error(`${key} must be PCM s24le`);
    if (!(Number(record.durationSeconds) > 0)) throw new Error(`${key} has invalid duration`);
  }
  return true;
}

