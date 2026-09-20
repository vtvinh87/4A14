import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const selectionPath = resolve(root, 'design/audio/qa/sourced-v1-selection.json');
const selectionProvenancePath = resolve(root, 'design/audio/provenance/sourced-v1-selection.jsonl');
const catalogPath = resolve(root, 'design/audio/audio-catalog.json');
const outputRoot = resolve(root, 'public/audio/v1');
const runtimeManifestPath = resolve(root, 'src/audio/runtime-manifest.generated.ts');
const runtimePilotPath = resolve(root, 'design/audio/qa/sourced-v1-runtime-pilot.json');
const runtimeProvenancePath = resolve(root, 'design/audio/provenance/sourced-v1-runtime-pilot.jsonl');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readJsonl(path) {
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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

function removeAppleDoubleFiles(directory) {
  if (!existsSync(directory)) return;
  for (const name of readdirSync(directory)) {
    if (name.startsWith('._')) unlinkSync(resolve(directory, name));
  }
}

const selection = readJson(selectionPath);
const catalog = readJson(catalogPath);
const selectionRecords = readJsonl(selectionProvenancePath);
if (selection.status !== 'pilot-selected' || selection.runtimePromotion !== false) {
  throw new Error('sourced-v1 selection is not in the expected pilot-only state');
}

const assets = [];
for (const selected of selection.masters) {
  const cue = catalog.cues.find((item) => item.id === selected.cueId);
  if (!cue) throw new Error(`selected cue is missing from catalog: ${selected.cueId}`);
  const sourcePath = resolve(root, selected.masterPath);
  if (!existsSync(sourcePath)) throw new Error(`selected master is missing: ${selected.masterPath}`);
  if (sha256(sourcePath) !== selected.sha256) throw new Error(`selected master hash mismatch: ${selected.masterPath}`);

  const group = groupForBus(cue.bus);
  const filename = `${cue.id}__v01.mp3`;
  const relativeUrl = `/audio/v1/${group}/${filename}`;
  const outputPath = resolve(outputRoot, group, filename);
  mkdirSync(resolve(outputRoot, group), { recursive: true });

  const channels = cue.bus === 'music' || cue.bus === 'ambience' ? '2' : '1';
  const bitrate = cue.bus === 'music' || cue.bus === 'ambience' ? '192k' : '96k';
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', sourcePath,
    '-map_metadata', '-1',
    '-vn',
    '-codec:a', 'libmp3lame',
    '-b:a', bitrate,
    '-ar', '48000',
    '-ac', channels,
    outputPath,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`ffmpeg failed for ${selected.cueId}: ${result.stderr || result.error?.message || 'unknown error'}`);

  const metadata = probe(outputPath);
  const provenance = selectionRecords.find((record) => record.cueId === selected.cueId);
  assets.push({
    id: cue.id,
    variant: 1,
    relativeUrl,
    assetPath: `public${relativeUrl}`,
    sourceMasterPath: selected.masterPath,
    sourceMasterSha256: selected.sha256,
    outputSha256: sha256(outputPath),
    bytes: statSync(outputPath).size,
    codec: metadata.codec,
    sampleRate: metadata.sampleRate,
    channels: metadata.channels,
    durationMs: metadata.durationMs,
    listeningStatus: 'pending-human-listening',
    runtimeMode: 'pilot',
    sourceProvider: provenance?.sourceProvider ?? null,
    license: provenance?.license ?? null,
    licenseEvidenceUrl: provenance?.licenseEvidenceUrl ?? null,
    costUsd: provenance?.costUsd ?? 0,
  });
}

removeAppleDoubleFiles(resolve(outputRoot, 'sfx'));
removeAppleDoubleFiles(resolve(outputRoot, 'music'));
removeAppleDoubleFiles(outputRoot);

const runtimeEntries = assets.map(({ id, variant, relativeUrl, listeningStatus, runtimeMode }) => ({
  id,
  variant,
  relativeUrl,
  listeningStatus,
  runtimeMode,
}));

writeFileSync(
  runtimeManifestPath,
  `import type { AudioManifestEntry } from './manager';\n\nexport const AUDIO_RUNTIME_MANIFEST: readonly AudioManifestEntry[] = ${JSON.stringify(runtimeEntries, null, 2)};\n`,
  'utf8',
);

writeFileSync(runtimePilotPath, `${JSON.stringify({
  schemaVersion: 1,
  revision: 'sourced-v1',
  status: 'local-pilot-runtime',
  runtimePromotion: 'pilot-only; not production acceptance',
  listeningStatus: 'pending-human-listening',
  sourceSelectionPath: 'design/audio/qa/sourced-v1-selection.json',
  sourceManifestPath: 'design/audio/qa/sourced-v1-source-manifest.json',
  generatedAt: new Date().toISOString(),
  costUsd: 0,
  assets,
}, null, 2)}\n`, 'utf8');

writeFileSync(runtimeProvenancePath, `${assets.map((asset) => JSON.stringify({
  schemaVersion: 1,
  recordType: 'runtime-pilot-asset',
  revision: 'sourced-v1',
  generatedAt: new Date().toISOString(),
  cueId: asset.id,
  variant: asset.variant,
  runtimeMode: asset.runtimeMode,
  runtimeUrl: asset.relativeUrl,
  outputPath: asset.assetPath,
  outputSha256: asset.outputSha256,
  sourceMasterPath: asset.sourceMasterPath,
  sourceMasterSha256: asset.sourceMasterSha256,
  sourceProvider: asset.sourceProvider,
  license: asset.license,
  licenseEvidenceUrl: asset.licenseEvidenceUrl,
  costUsd: asset.costUsd,
  listeningStatus: asset.listeningStatus,
})).join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'local-pilot-runtime',
  assets: assets.length,
  totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
  runtimeManifestPath: 'src/audio/runtime-manifest.generated.ts',
  runtimePilotPath: 'design/audio/qa/sourced-v1-runtime-pilot.json',
  runtimeProvenancePath: 'design/audio/provenance/sourced-v1-runtime-pilot.jsonl',
  listeningStatus: 'pending-human-listening',
}, null, 2));
