import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCandidateRecords } from './sourced-v2-assets-contract.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const manifestPath = path.join(root, 'design/audio/qa/sourced-v2-candidates.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function hash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const records = (manifest.cues ?? []).flatMap((cue) =>
  (cue.candidates ?? []).map((candidate) => {
    const filePath = path.join(root, candidate.path);
    const exists = fs.existsSync(filePath);
    const stat = exists ? fs.statSync(filePath) : null;
    return {
      id: cue.id,
      variant: candidate.variant,
      outputPath: candidate.path,
      exists,
      bytes: stat?.size ?? 0,
      sha256: exists ? hash(filePath) : null,
      sourceSha256: candidate.sourceSha256,
      sampleRate: candidate.sampleRate,
      channels: candidate.channels,
      codec: candidate.codec,
      durationSeconds: candidate.durationSeconds,
      bus: cue.bus,
    };
  }),
);

validateCandidateRecords(records, { expectedCount: manifest.targetEntryCount });
console.log(JSON.stringify({
  revision: manifest.revision,
  targetEntryCount: manifest.targetEntryCount,
  verifiedFiles: records.length,
  newCandidateCount: manifest.newCandidateCount,
  reusedExistingCount: manifest.reusedExistingCount,
}, null, 2));
