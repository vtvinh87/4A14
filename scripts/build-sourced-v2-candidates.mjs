import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildCatalogTargets, getLaneForCue } from './sourced-v2-contract.mjs';
import { validateCandidateRecords } from './sourced-v2-assets-contract.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const catalogPath = path.join(root, 'design/audio/audio-catalog.json');
const sourceManifestPath = path.join(root, 'design/audio/qa/sourced-v2-source-manifest.json');
const sourceMapPath = path.join(root, 'design/audio/qa/sourced-v2-source-map.json');
const candidatesRoot = path.join(root, 'design/audio/candidates/sourced-v2');
const manifestPath = path.join(root, 'design/audio/qa/sourced-v2-candidates.json');
const provenancePath = path.join(root, 'design/audio/provenance/sourced-v2-asset-provenance.jsonl');
const selectionPath = path.join(root, 'design/audio/qa/sourced-v2-selection.json');
const selectionProvenancePath = path.join(root, 'design/audio/provenance/sourced-v2-selection.jsonl');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
const sourceMap = JSON.parse(fs.readFileSync(sourceMapPath, 'utf8'));
const sourceRecords = new Map(sourceManifest.records.map((record) => [record.id, record]));
const sourceEntries = new Map(sourceMap.entries.map((entry) => [`${entry.id}#${entry.variant}`, entry]));
const catalogById = new Map(catalog.cues.map((cue) => [cue.id, cue]));
const generatedAt = new Date().toISOString();

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function probe(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name,sample_rate,channels,bits_per_sample:format=duration',
    '-of', 'json',
    filePath,
  ], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffprobe failed for ${filePath}: ${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0];
  const duration = Number(parsed.format?.duration);
  if (!stream || !Number.isFinite(duration)) throw new Error(`ffprobe returned incomplete audio metadata for ${filePath}`);
  return {
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
    bitsPerSample: stream.bits_per_sample == null ? null : Number(stream.bits_per_sample),
    durationSeconds: duration,
  };
}

function sourceProvider(sourceRecord) {
  if (sourceRecord.sourceUrl.includes('kenney.nl')) return 'Kenney';
  if (sourceRecord.sourceUrl.includes('dustyroom.com')) return 'Dustyroom';
  return 'OpenGameArt';
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function normalize(entry, cue, sourceRecord, outputPath, sourceDuration) {
  const isBed = cue.bus === 'music' || cue.bus === 'ambience';
  const targetDuration = Number(cue.durationSeconds);
  const args = ['-y'];
  if (isBed) args.push('-stream_loop', '-1');
  args.push('-i', path.join(root, sourceRecord.localPath));
  if (isBed) {
    args.push('-t', String(targetDuration));
  } else if (sourceDuration > targetDuration + 0.002) {
    args.push('-t', String(targetDuration));
    const fadeOutStart = Math.max(0, targetDuration - 0.008);
    args.push('-af', `afade=t=in:st=0:d=0.003,afade=t=out:st=${fadeOutStart}:d=0.008`);
  }
  args.push('-ac', isBed ? '2' : '1', '-ar', '48000', '-c:a', 'pcm_s24le', '-map_metadata', '-1', outputPath);
  const result = spawnSync('ffmpeg', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${entry.id}#${entry.variant}: ${result.stderr}`);
  return args.map(shellQuote).join(' ');
}

const targets = buildCatalogTargets(catalog);
if (sourceEntries.size !== targets.length) {
  throw new Error(`source map has ${sourceEntries.size} entries; catalog has ${targets.length}`);
}

const candidateRecords = [];
const provenance = [];
for (const target of targets) {
  const key = `${target.id}#${target.variant}`;
  const cue = catalogById.get(target.id);
  const mapping = sourceEntries.get(key);
  if (!cue || !mapping) throw new Error(`missing source mapping for ${key}`);
  const sourceRecord = sourceRecords.get(mapping.sourceId);
  if (!sourceRecord) throw new Error(`missing source record ${mapping.sourceId} for ${key}`);
  const subdir = cue.bus === 'music' || cue.bus === 'ambience' ? 'beds' : 'sfx';
  const fileName = `${cue.id}__v${String(target.variant).padStart(2, '0')}.wav`;
  const outputPath = path.join(candidatesRoot, subdir, fileName);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const sourcePath = path.join(root, sourceRecord.localPath);
  if (!fs.existsSync(sourcePath)) throw new Error(`missing source path ${sourceRecord.localPath}`);
  const sourceMetadata = probe(sourcePath);
  const transform = normalize(mapping, cue, sourceRecord, outputPath, sourceMetadata.durationSeconds);
  const metadata = probe(outputPath);
  const outputStat = fs.statSync(outputPath);
  const relativePath = path.relative(root, outputPath);
  const sourceIsReusedPilot = sourceRecord.origin === 'reused sourced-v1 selected master';
  const candidate = {
    name: `variant-${String(target.variant).padStart(2, '0')}`,
    variant: target.variant,
    path: relativePath,
    relativeUrl: `./${relativePath.replace(/^design\/audio\//, '')}`,
    bytes: outputStat.size,
    sha256: sha256(outputPath),
    codec: metadata.codec,
    sampleRate: metadata.sampleRate,
    channels: metadata.channels,
    bitsPerSample: metadata.bitsPerSample,
    durationSeconds: metadata.durationSeconds,
    sourceId: sourceRecord.id,
    sourceProvider: sourceProvider(sourceRecord),
    sourceFile: sourceRecord.localPath,
    sourceUrl: sourceRecord.sourceUrl,
    sourcePage: sourceRecord.sourcePage,
    licenseEvidenceUrl: sourceRecord.licenseEvidenceUrl,
    licenseEvidenceLocal: sourceRecord.licenseEvidenceLocal ?? null,
    credit: sourceRecord.credit,
    sourceSha256: sourceRecord.sha256,
    sourceBytes: sourceRecord.bytes,
    sourceMetadata,
    license: sourceRecord.license,
    costUsd: 0,
    selectionRationale: mapping.rationale,
    transform,
    loopSeamStatus: null,
    listeningStatus: 'pending-human-listening',
    accepted: false,
    selectionStatus: 'pending-human-listening',
    selectedBy: null,
    reviewedAt: null,
    reviewEvidence: null,
    masterPath: null,
    masterRelativeUrl: null,
    reusedFromRevision: sourceIsReusedPilot ? 'sourced-v1' : null,
  };
  candidateRecords.push({
    id: cue.id,
    variant: target.variant,
    outputPath: relativePath,
    exists: true,
    bytes: outputStat.size,
    sha256: candidate.sha256,
    sourceSha256: sourceRecord.sha256,
    sampleRate: metadata.sampleRate,
    channels: metadata.channels,
    codec: metadata.codec,
    durationSeconds: metadata.durationSeconds,
    bus: cue.bus,
  });
  provenance.push({
    revision: 'sourced-v2-full',
    operation: 'normalize-sourced-candidate',
    generatedAt,
    cueId: cue.id,
    variant: target.variant,
    lane: getLaneForCue(cue.id),
    outputPath: relativePath,
    outputSha256: candidate.sha256,
    sourceId: sourceRecord.id,
    sourcePath: sourceRecord.localPath,
    sourceSha256: sourceRecord.sha256,
    sourceUrl: sourceRecord.sourceUrl,
    license: sourceRecord.license,
    costUsd: 0,
    transform,
    listeningStatus: 'pending-human-listening',
  });
}

validateCandidateRecords(candidateRecords, { expectedCount: targets.length });

const cues = catalog.cues.map((cue) => ({
  id: cue.id,
  name: cue.name,
  bus: cue.bus,
  durationSeconds: cue.durationSeconds,
  variants: cue.variants,
  loop: cue.loop,
  priority: cue.priority,
  cooldownMs: cue.cooldownMs,
  intent: cue.intent,
  trigger: cue.trigger,
  prompt: cue.prompt,
  availability: cue.availability,
  candidates: targets
    .filter((target) => target.id === cue.id)
    .map((target) => candidateRecords.find((record) => record.id === target.id && record.variant === target.variant))
    .map((record) => {
      const candidate = candidateRecords.find((item) => item.id === record.id && item.variant === record.variant);
      const source = sourceRecords.get(sourceEntries.get(`${record.id}#${record.variant}`).sourceId);
      const output = path.join(root, record.outputPath);
      const metadata = probe(output);
      return {
        ...candidateRecords.find((item) => item.id === record.id && item.variant === record.variant),
        ...((() => {
          const sourceMapEntry = sourceEntries.get(`${record.id}#${record.variant}`);
          const sourceRecord = sourceRecords.get(sourceMapEntry.sourceId);
          const candidateFile = path.join(root, record.outputPath);
          const stat = fs.statSync(candidateFile);
          return {
            name: `variant-${String(record.variant).padStart(2, '0')}`,
            variant: record.variant,
            path: record.outputPath,
            relativeUrl: `./${record.outputPath.replace(/^design\/audio\//, '')}`,
            bytes: stat.size,
            sha256: sha256(candidateFile),
            codec: metadata.codec,
            sampleRate: metadata.sampleRate,
            channels: metadata.channels,
            bitsPerSample: metadata.bitsPerSample,
            durationSeconds: metadata.durationSeconds,
            sourceId: sourceRecord.id,
            sourceProvider: sourceProvider(sourceRecord),
            sourceFile: sourceRecord.localPath,
            sourceUrl: sourceRecord.sourceUrl,
            sourcePage: sourceRecord.sourcePage,
            licenseEvidenceUrl: sourceRecord.licenseEvidenceUrl,
            licenseEvidenceLocal: sourceRecord.licenseEvidenceLocal ?? null,
            credit: sourceRecord.credit,
            sourceSha256: sourceRecord.sha256,
            sourceBytes: sourceRecord.bytes,
            sourceMetadata: probe(path.join(root, sourceRecord.localPath)),
            license: sourceRecord.license,
            costUsd: 0,
            selectionRationale: sourceMapEntry.rationale,
            transform: provenance.find((item) => item.cueId === record.id && item.variant === record.variant).transform,
            loopSeamStatus: null,
            listeningStatus: 'pending-human-listening',
            accepted: false,
            selectionStatus: 'pending-human-listening',
            selectedBy: null,
            reviewedAt: null,
            reviewEvidence: null,
            masterPath: null,
            masterRelativeUrl: null,
            reusedFromRevision: sourceRecord.origin === 'reused sourced-v1 selected master' ? 'sourced-v1' : null,
          };
        })()),
      };
    }),
}));

const manifest = {
  schemaVersion: 1,
  revision: 'sourced-v2-full',
  status: 'candidate-only',
  generatedAt,
  sourcePolicy: 'free CC0/public-domain sources only; no account, payment, donation, API, or new credential',
  costUsd: 0,
  sourceManifestPath: 'design/audio/qa/sourced-v2-source-manifest.json',
  sourceMapPath: 'design/audio/qa/sourced-v2-source-map.json',
  targetEntryCount: targets.length,
  newCandidateCount: candidateRecords.filter((record) => {
    const source = sourceRecords.get(sourceEntries.get(`${record.id}#${record.variant}`).sourceId);
    return source.origin !== 'reused sourced-v1 selected master';
  }).length,
  reusedExistingCount: candidateRecords.filter((record) => {
    const source = sourceRecords.get(sourceEntries.get(`${record.id}#${record.variant}`).sourceId);
    return source.origin === 'reused sourced-v1 selected master';
  }).length,
  runtimePromotion: false,
  productionAcceptedEntries: 0,
  cues,
};

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.mkdirSync(path.dirname(provenancePath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(provenancePath, `${provenance.map((record) => JSON.stringify(record)).join('\n')}\n`);
const pendingSelectionEntries = targets.map((target) => {
  const candidate = manifest.cues.find((cue) => cue.id === target.id).candidates.find((item) => item.variant === target.variant);
  return {
    id: target.id,
    variant: target.variant,
    lane: getLaneForCue(target.id),
    candidatePath: candidate.path,
    candidateSha256: candidate.sha256,
    status: 'pending-human-listening',
    selectedBy: null,
    reviewedAt: null,
    listeningEvidence: null,
  };
});
fs.writeFileSync(selectionPath, `${JSON.stringify({
  schemaVersion: 1,
  revision: 'sourced-v2-full',
  status: 'pending-human-listening',
  generatedAt,
  selectedEntries: 0,
  targetEntryCount: targets.length,
  entries: pendingSelectionEntries,
}, null, 2)}\n`);
fs.writeFileSync(selectionProvenancePath, `${JSON.stringify({
  revision: 'sourced-v2-full',
  operation: 'initialize-pending-selection-ledger',
  generatedAt,
  targetEntryCount: targets.length,
  selectedEntries: 0,
  note: 'No candidate is selected automatically; human listening evidence is required.',
})}\n`);
console.log(JSON.stringify({
  manifestPath: path.relative(root, manifestPath),
  targetEntryCount: targets.length,
  newCandidateCount: manifest.newCandidateCount,
  reusedExistingCount: manifest.reusedExistingCount,
  candidatesRoot: path.relative(root, candidatesRoot),
  selectionPath: path.relative(root, selectionPath),
  costUsd: 0,
}, null, 2));
