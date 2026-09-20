import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const catalogPath = resolve(root, 'design/audio/audio-catalog.json');
const candidatePath = resolve(root, 'design/audio/qa/sourced-v2-candidates.json');
const selectionPath = resolve(root, 'design/audio/qa/sourced-v2-selection.json');
const sourceManifestPath = resolve(root, 'design/audio/qa/sourced-v2-source-manifest.json');
const legacyRuntimePilotPath = resolve(root, 'design/audio/qa/sourced-v1-runtime-pilot.json');
const outputRoot = resolve(root, 'public/audio/v2');
const runtimeManifestPath = resolve(root, 'src/audio/runtime-manifest.generated.ts');
const runtimePilotPath = resolve(root, 'design/audio/qa/sourced-v2-runtime-pilot.json');
const runtimeProvenancePath = resolve(root, 'design/audio/provenance/sourced-v2-runtime-pilot.jsonl');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function probe(path) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_name,sample_rate,channels,duration',
    '-of', 'json',
    path,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`ffprobe failed for ${path}: ${result.stderr || result.error?.message || 'unknown error'}`);
  const stream = JSON.parse(result.stdout).streams?.find((item) => item.codec_name);
  if (!stream) throw new Error(`ffprobe returned no audio stream for ${path}`);
  return {
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate) || null,
    channels: Number(stream.channels) || null,
    durationMs: Number.isFinite(Number(stream.duration)) ? Math.round(Number(stream.duration) * 1000) : null,
  };
}

function groupForBus(bus) {
  return bus === 'music' || bus === 'ambience' ? 'music' : 'sfx';
}

function keyOf(id, variant) {
  return `${id}:${variant}`;
}

function removeAppleDoubleFiles(directory) {
  if (!existsSync(directory)) return;
  for (const name of readdirSync(directory)) {
    if (name.startsWith('._')) unlinkSync(resolve(directory, name));
  }
}

function encode(inputPath, outputPath, bus) {
  const isBed = bus === 'music' || bus === 'ambience';
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', inputPath,
    '-map_metadata', '-1',
    '-vn',
    '-codec:a', 'libmp3lame',
    '-b:a', isBed ? '192k' : '128k',
    '-ar', '48000',
    '-ac', isBed ? '2' : '1',
    '-write_xing', '0',
    outputPath,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`ffmpeg failed for ${inputPath}: ${result.stderr || result.error?.message || 'unknown error'}`);
}

const catalog = readJson(catalogPath);
const candidates = readJson(candidatePath);
const selection = readJson(selectionPath);
const sourceManifest = readJson(sourceManifestPath);
const legacyRuntime = readJson(legacyRuntimePilotPath);

if (catalog.cues.reduce((total, cue) => total + cue.variants, 0) !== 67) throw new Error('catalog target count is not 67');
if (candidates.targetEntryCount !== 67 || candidates.newCandidateCount !== 61 || candidates.reusedExistingCount !== 6) throw new Error('sourced-v2 candidate counts are not the expected 67/61/6');
if (selection.targetEntryCount !== 67 || selection.entries.length !== 67 || selection.selectedEntries !== 0) throw new Error('sourced-v2 selection ledger is not the expected pending 67-entry ledger');
if (sourceManifest.costUsd !== 0 || sourceManifest.files.length !== 66) throw new Error('sourced-v2 source manifest is incomplete or non-zero cost');
if (sourceManifest.files.some((record) => record.license !== 'CC0' || record.costUsd !== 0)) throw new Error('sourced-v2 source manifest contains a non-CC0 or non-zero-cost source');

const legacyAssets = legacyRuntime.assets;
if (legacyAssets.length !== 6) throw new Error('sourced-v1 runtime must keep exactly six legacy pilot assets');
const legacyByKey = new Map(legacyAssets.map((asset) => [keyOf(asset.id, asset.variant), asset]));
const candidateByKey = new Map();
for (const cue of candidates.cues) {
  for (const candidate of cue.candidates) {
    const key = keyOf(candidate.id, candidate.variant);
    if (candidateByKey.has(key)) throw new Error(`duplicate sourced-v2 candidate: ${key}`);
    candidateByKey.set(key, { ...candidate, cue });
  }
}
const selectionByKey = new Map(selection.entries.map((entry) => [keyOf(entry.id, entry.variant), entry]));
const sourceByPath = new Map(sourceManifest.files.map((record) => [record.localPath, record]));

const assets = [];
const runtimeEntries = [];
const provenance = [];
const generatedAt = new Date().toISOString();

for (const cue of catalog.cues) {
  for (let variant = 1; variant <= cue.variants; variant += 1) {
    const key = keyOf(cue.id, variant);
    const candidate = candidateByKey.get(key);
    const selectionEntry = selectionByKey.get(key);
    if (!candidate || !selectionEntry) throw new Error(`missing sourced-v2 candidate or selection ledger entry: ${key}`);
    if (selectionEntry.candidatePath !== candidate.path || selectionEntry.candidateSha256 !== candidate.sha256) throw new Error(`selection hash/path mismatch: ${key}`);
    const candidatePath = resolve(root, candidate.path);
    if (!existsSync(candidatePath)) throw new Error(`sourced-v2 candidate is missing: ${candidate.path}`);
    if (sha256(candidatePath) !== candidate.sha256) throw new Error(`sourced-v2 candidate hash mismatch: ${candidate.path}`);
    const sourceRecord = sourceByPath.get(candidate.sourceFile);
    if (!sourceRecord || sourceRecord.sha256 !== candidate.sourceSha256) throw new Error(`source hash mismatch: ${key}`);
    if (sourceRecord.license !== 'CC0' || sourceRecord.costUsd !== 0) throw new Error(`source policy mismatch: ${key}`);

    const legacy = legacyByKey.get(key);
    if (legacy) {
      const legacyOutputPath = resolve(root, legacy.assetPath);
      if (!existsSync(legacyOutputPath) || sha256(legacyOutputPath) !== legacy.outputSha256) throw new Error(`sourced-v1 legacy output hash mismatch: ${legacy.assetPath}`);
      const asset = {
        id: cue.id,
        variant,
        relativeUrl: legacy.relativeUrl,
        assetPath: legacy.assetPath,
        sourceCandidatePath: candidate.path,
        sourceCandidateSha256: candidate.sha256,
        sourceMasterPath: legacy.sourceMasterPath,
        sourceMasterSha256: legacy.sourceMasterSha256,
        outputSha256: legacy.outputSha256,
        bytes: legacy.bytes,
        codec: legacy.codec,
        sampleRate: legacy.sampleRate,
        channels: legacy.channels,
        durationMs: legacy.durationMs,
        listeningStatus: 'pending-human-listening',
        runtimeMode: 'pilot',
        runtimeRevision: 'sourced-v1',
        reusedFromRevision: 'sourced-v1',
        sourceId: candidate.sourceId,
        sourceProvider: candidate.sourceProvider,
        license: sourceRecord.license,
        licenseEvidenceUrl: candidate.licenseEvidenceUrl,
        credit: candidate.credit,
        costUsd: sourceRecord.costUsd,
      };
      assets.push(asset);
      runtimeEntries.push({ id: cue.id, variant, relativeUrl: asset.relativeUrl, listeningStatus: asset.listeningStatus, runtimeMode: asset.runtimeMode });
      provenance.push({
        schemaVersion: 1,
        recordType: 'runtime-pilot-asset',
        revision: 'sourced-v2-full',
        generatedAt,
        selectionAuthorization: 'user-requested-full-local-pilot',
        selectionStatus: 'pending-human-listening',
        cueId: cue.id,
        variant,
        runtimeMode: 'pilot',
        runtimeRevision: 'sourced-v1',
        runtimeUrl: asset.relativeUrl,
        outputPath: asset.assetPath,
        outputSha256: asset.outputSha256,
        sourceCandidatePath: asset.sourceCandidatePath,
        sourceCandidateSha256: asset.sourceCandidateSha256,
        sourceProvider: asset.sourceProvider,
        license: asset.license,
        licenseEvidenceUrl: asset.licenseEvidenceUrl,
        credit: asset.credit,
        costUsd: asset.costUsd,
        listeningStatus: asset.listeningStatus,
        reusedFromRevision: 'sourced-v1',
      });
      continue;
    }

    const group = groupForBus(cue.bus);
    const filename = `${cue.id}__v${String(variant).padStart(2, '0')}.mp3`;
    const relativeUrl = `/audio/v2/${group}/${filename}`;
    const outputPath = resolve(root, `public${relativeUrl}`);
    mkdirSync(resolve(outputPath, '..'), { recursive: true });
    encode(candidatePath, outputPath, cue.bus);
    const metadata = probe(outputPath);
    if (metadata.codec !== 'mp3' || metadata.sampleRate !== 48000 || metadata.channels !== (group === 'music' ? 2 : 1)) throw new Error(`encoded output metadata mismatch: ${relativeUrl}`);

    const asset = {
      id: cue.id,
      variant,
      relativeUrl,
      assetPath: `public${relativeUrl}`,
      sourceCandidatePath: candidate.path,
      sourceCandidateSha256: candidate.sha256,
      sourceMasterPath: null,
      sourceMasterSha256: null,
      outputSha256: sha256(outputPath),
      bytes: statSync(outputPath).size,
      codec: metadata.codec,
      sampleRate: metadata.sampleRate,
      channels: metadata.channels,
      durationMs: metadata.durationMs,
      listeningStatus: 'pending-human-listening',
      runtimeMode: 'pilot',
      runtimeRevision: 'sourced-v2',
      reusedFromRevision: null,
      sourceId: candidate.sourceId,
      sourceProvider: candidate.sourceProvider,
      license: sourceRecord.license,
      licenseEvidenceUrl: candidate.licenseEvidenceUrl,
      credit: candidate.credit,
      costUsd: sourceRecord.costUsd,
    };
    assets.push(asset);
    runtimeEntries.push({ id: cue.id, variant, relativeUrl, listeningStatus: asset.listeningStatus, runtimeMode: asset.runtimeMode });
    provenance.push({
      schemaVersion: 1,
      recordType: 'runtime-pilot-asset',
      revision: 'sourced-v2-full',
      generatedAt,
      selectionAuthorization: 'user-requested-full-local-pilot',
      selectionStatus: 'pending-human-listening',
      cueId: cue.id,
      variant,
      runtimeMode: 'pilot',
      runtimeRevision: 'sourced-v2',
      runtimeUrl: relativeUrl,
      outputPath: asset.assetPath,
      outputSha256: asset.outputSha256,
      sourceCandidatePath: asset.sourceCandidatePath,
      sourceCandidateSha256: asset.sourceCandidateSha256,
      sourceProvider: asset.sourceProvider,
      license: asset.license,
      licenseEvidenceUrl: asset.licenseEvidenceUrl,
      credit: asset.credit,
      costUsd: asset.costUsd,
      listeningStatus: asset.listeningStatus,
      reusedFromRevision: null,
      encode: {
        codec: 'libmp3lame',
        bitrate: group === 'music' ? '192k' : '128k',
        sampleRate: 48000,
        channels: group === 'music' ? 2 : 1,
      },
    });
  }
}

removeAppleDoubleFiles(resolve(outputRoot, 'sfx'));
removeAppleDoubleFiles(resolve(outputRoot, 'music'));
removeAppleDoubleFiles(outputRoot);

if (runtimeEntries.length !== 67 || assets.length !== 67) throw new Error(`expected 67 runtime assets, got ${assets.length}`);
if (assets.filter((asset) => asset.runtimeRevision === 'sourced-v2').length !== 61) throw new Error('expected 61 newly encoded sourced-v2 assets');

writeFileSync(
  runtimeManifestPath,
  `import type { AudioManifestEntry } from './manager';\n\nexport const AUDIO_RUNTIME_MANIFEST: readonly AudioManifestEntry[] = ${JSON.stringify(runtimeEntries, null, 2)};\n`,
  'utf8',
);

writeFileSync(runtimePilotPath, `${JSON.stringify({
  schemaVersion: 1,
  revision: 'sourced-v2-full',
  status: 'local-pilot-runtime',
  runtimePromotion: false,
  promotionPolicy: 'local pilot only; no human listening acceptance',
  selectionAuthorization: 'user-requested-full-local-pilot',
  listeningStatus: 'pending-human-listening',
  sourceSelectionPath: 'design/audio/qa/sourced-v2-selection.json',
  candidateManifestPath: 'design/audio/qa/sourced-v2-candidates.json',
  sourceManifestPath: 'design/audio/qa/sourced-v2-source-manifest.json',
  generatedAt,
  costUsd: 0,
  catalogTargetCount: 67,
  assetCount: assets.length,
  reusedExistingCount: assets.filter((asset) => asset.runtimeRevision === 'sourced-v1').length,
  generatedSourcedV2Count: assets.filter((asset) => asset.runtimeRevision === 'sourced-v2').length,
  assets,
}, null, 2)}\n`, 'utf8');

writeFileSync(runtimeProvenancePath, `${provenance.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'local-pilot-runtime',
  revision: 'sourced-v2-full',
  assets: assets.length,
  reusedSourcedV1: assets.filter((asset) => asset.runtimeRevision === 'sourced-v1').length,
  encodedSourcedV2: assets.filter((asset) => asset.runtimeRevision === 'sourced-v2').length,
  totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
  runtimeManifestPath: 'src/audio/runtime-manifest.generated.ts',
  runtimePilotPath: 'design/audio/qa/sourced-v2-runtime-pilot.json',
  runtimeProvenancePath: 'design/audio/provenance/sourced-v2-runtime-pilot.jsonl',
  listeningStatus: 'pending-human-listening',
  productionAcceptedEntries: 0,
}, null, 2));
