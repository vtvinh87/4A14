import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateSourceRecords } from './sourced-v2-source-contract.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const registryPath = path.join(root, 'design/audio/qa/sourced-v2-source-registry.json');
const manifestPath = path.join(root, 'design/audio/qa/sourced-v2-source-manifest.json');
const provenancePath = path.join(root, 'design/audio/provenance/sourced-v2-source-provenance.jsonl');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const registryRecords = [
  ...(registry.archives ?? []).map((record) => ({ ...record, kind: 'archive' })),
  ...(registry.files ?? []).map((record) => ({ ...record, kind: 'file' })),
];

if (registryRecords.length === 0) throw new Error('source registry is empty');
const shouldDownload = process.argv.includes('--download');
const retrievedAt = new Date().toISOString();

function absolute(localPath) {
  return path.join(root, localPath);
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ensureDownloaded(record) {
  const target = absolute(record.localPath);
  if (fs.existsSync(target)) return;
  if (!shouldDownload) {
    throw new Error(`missing source file ${record.localPath}; rerun with --download to fetch the listed public URL`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const result = spawnSync('curl', ['-L', '--fail', '--silent', '--show-error', '--connect-timeout', '20', '--max-time', '180', record.sourceUrl, '-o', target], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`curl failed for ${record.id}`);
}

const outputRecords = registryRecords.map((record) => {
  ensureDownloaded(record);
  const target = absolute(record.localPath);
  const stat = fs.statSync(target);
  if (!stat.isFile() || stat.size <= 0) throw new Error(`source path is not a non-empty file: ${record.localPath}`);
  return {
    ...record,
    sha256: sha256(target),
    bytes: stat.size,
    retrievedAt,
  };
});

const sidecars = outputRecords.filter((record) => path.basename(record.localPath).startsWith('._'));
if (sidecars.length) throw new Error(`AppleDouble sidecars are not allowed: ${sidecars.map((record) => record.localPath).join(', ')}`);

validateSourceRecords(outputRecords);

const output = {
  schemaVersion: 1,
  revision: 'sourced-v2-full',
  generatedAt: retrievedAt,
  status: 'downloaded-and-license-audited',
  costUsd: 0,
  sourcePolicy: registry.sourcePolicy,
  archives: outputRecords.filter((record) => record.kind === 'archive'),
  files: outputRecords.filter((record) => record.kind === 'file'),
  records: outputRecords,
};

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.mkdirSync(path.dirname(provenancePath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(output, null, 2)}\n`);
fs.appendFileSync(
  provenancePath,
  `${JSON.stringify({
    revision: 'sourced-v2-full',
    operation: shouldDownload ? 'download-and-verify' : 'verify-existing-downloads',
    generatedAt: retrievedAt,
    records: outputRecords.map((record) => ({
      id: record.id,
      kind: record.kind,
      localPath: record.localPath,
      sourceUrl: record.sourceUrl,
      sha256: record.sha256,
      bytes: record.bytes,
      license: record.license,
      costUsd: record.costUsd,
    })),
  })}\n`,
);

console.log(JSON.stringify({
  manifestPath: path.relative(root, manifestPath),
  recordCount: outputRecords.length,
  archiveCount: output.archives.length,
  fileCount: output.files.length,
  costUsd: output.costUsd,
}, null, 2));
