import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const catalogPath = resolve(root, 'design/audio/audio-catalog.json');
const audioRoot = resolve(root, 'design/audio');
const mastersRoot = resolve(audioRoot, 'masters');
const candidatesRoot = resolve(audioRoot, 'candidates');
const provenancePath = resolve(audioRoot, 'provenance/asset-generation.jsonl');
const manifestPath = resolve(audioRoot, 'manifest.json');
const auditionPath = resolve(audioRoot, 'qa/audition-assets.json');
const runtimeManifestPath = resolve(root, 'src/audio/runtime-manifest.generated.ts');

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const provenance = readFileSync(provenancePath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

function groupForBus(bus) {
  return bus === 'music' || bus === 'ambience' ? 'beds' : 'sfx';
}

function keyOf(id, variant) {
  return `${id}:${variant}`;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function probe(path) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name,sample_rate,channels,bits_per_sample,duration',
    '-of', 'json',
    path,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(`ffprobe failed for ${path}: ${result.stderr || result.error?.message || 'unknown error'}`);
  }
  const stream = JSON.parse(result.stdout).streams?.find((item) => item.codec_name);
  if (!stream) throw new Error(`ffprobe returned no audio stream for ${path}`);
  return {
    codec: stream.codec_name ?? null,
    sampleRate: Number(stream.sample_rate) || null,
    channels: Number(stream.channels) || null,
    bitsPerSample: Number(stream.bits_per_sample) || null,
    durationMs: Number.isFinite(Number(stream.duration)) ? Math.round(Number(stream.duration) * 1000) : null,
  };
}

function recordsFor(id, variant) {
  return provenance.filter((record) => record.catalogId === id && record.variant === variant);
}

function buildEntry(cue, variant) {
  const group = groupForBus(cue.bus);
  const filename = `${cue.id}__v${String(variant).padStart(2, '0')}.wav`;
  const assetPath = `design/audio/masters/${group}/${filename}`;
  const absoluteAssetPath = resolve(root, assetPath);
  const candidateNames = existsSync(resolve(candidatesRoot, group))
    ? readdirSync(resolve(candidatesRoot, group))
      .filter((name) => name.startsWith(`${cue.id}__v${String(variant).padStart(2, '0')}__`) && name.endsWith('.wav'))
      .sort()
    : [];
  const candidatePaths = candidateNames.map((name) => `design/audio/candidates/${group}/${name}`);
  const records = recordsFor(cue.id, variant);
  const masterRecord = records.find((record) => record.assetRole === 'master');
  const missingReason = `Master is missing from ${assetPath}; generation/recovery is required before audition.`;

  if (!existsSync(absoluteAssetPath)) {
    return {
      id: cue.id,
      variant,
      prompt: cue.prompt,
      promptSourcePath: 'design/audio/audio-catalog.json',
      assetPath,
      candidateCount: candidatePaths.length,
      candidatePaths,
      relativeUrl: null,
      auditionUrl: null,
      listeningStatus: 'blocked',
      listeningStatusReason: missingReason,
      blockReason: missingReason,
      runtimeAccepted: false,
      generationProvider: 'local-procedural',
      generationTool: 'design/audio/tools/generate-procedural-assets.py',
      provenancePath: 'design/audio/provenance/asset-generation.jsonl',
      licenseRecordPath: 'design/audio/provenance/asset-generation.jsonl',
      selectedCandidate: masterRecord?.candidate ?? null,
      deferred: Boolean(masterRecord?.deferred),
      deferredReason: masterRecord?.deferredReason ?? null,
      cost: masterRecord?.cost ?? 0,
      license: masterRecord?.license ?? 'original procedural synthesis',
      bus: cue.bus,
      category: cue.category,
      priority: cue.priority,
      cooldownMs: cue.cooldownMs,
      loop: Boolean(cue.loop),
      durationSecondsTarget: cue.durationSeconds,
      trimDb: 0,
      peakDbTP: null,
      peakDbTPReason: 'Not measured: ffmpeg volumedetect is a sample-peak meter, not a true-peak meter.',
      measuredLufs: null,
      measuredLufsReason: 'Not measured before human listening and final mix approval.',
      loopStartSample: null,
      loopEndSample: null,
      loopBoundaryReason: cue.loop ? 'Pending human gapless-loop audition.' : null,
    };
  }

  const metadata = probe(absoluteAssetPath);
  const stat = statSync(absoluteAssetPath);
  const pendingReason = 'Master is a mechanically selected candidate-a copy; human listening evidence is not recorded.';
  return {
    id: cue.id,
    variant,
    prompt: cue.prompt,
    promptSourcePath: 'design/audio/audio-catalog.json',
    assetPath,
    candidateCount: candidatePaths.length,
    candidatePaths,
    selectedCandidate: masterRecord?.candidate ?? 'candidate-a',
    relativeUrl: null,
    auditionUrl: `./masters/${group}/${filename}`,
    listeningStatus: 'pending-human-listening',
    listeningStatusReason: pendingReason,
    runtimeAccepted: false,
    generationProvider: masterRecord?.provider ?? 'local-procedural',
    generationTool: 'design/audio/tools/generate-procedural-assets.py',
    provenancePath: 'design/audio/provenance/asset-generation.jsonl',
    licenseRecordPath: 'design/audio/provenance/asset-generation.jsonl',
    generatedAt: masterRecord?.timestamp ?? null,
    generatorVersion: masterRecord?.generatorVersion ?? null,
    seed: masterRecord?.seed ?? null,
    command: masterRecord?.command ?? null,
    license: masterRecord?.license ?? 'original procedural synthesis',
    cost: masterRecord?.cost ?? 0,
    deferred: Boolean(masterRecord?.deferred),
    deferredReason: masterRecord?.deferredReason ?? null,
    bus: cue.bus,
    category: cue.category,
    priority: cue.priority,
    cooldownMs: cue.cooldownMs,
    loop: Boolean(cue.loop),
    durationSecondsTarget: cue.durationSeconds,
    codec: metadata.codec,
    bitsPerSample: metadata.bitsPerSample,
    sampleRate: metadata.sampleRate,
    channels: metadata.channels,
    durationMs: metadata.durationMs,
    bytes: stat.size,
    sha256: sha256(absoluteAssetPath),
    trimDb: 0,
    peakDbTP: null,
    peakDbTPReason: 'Not measured: ffmpeg volumedetect is a sample-peak meter, not a true-peak meter.',
    measuredLufs: null,
    measuredLufsReason: 'Not measured before human listening and final mix approval.',
    loopStartSample: null,
    loopEndSample: null,
    loopBoundaryReason: cue.loop ? 'Pending human gapless-loop audition.' : null,
  };
}

const entries = catalog.cues.flatMap((cue) => Array.from(
  { length: cue.variants },
  (_, index) => buildEntry(cue, index + 1),
));

const manifest = {
  schemaVersion: 1,
  status: entries.every((entry) => entry.listeningStatus === 'accepted') ? 'accepted' : 'candidate-only',
  generatedAt: new Date().toISOString(),
  sourceCatalog: 'design/audio/audio-catalog.json',
  provenancePath: 'design/audio/provenance/asset-generation.jsonl',
  expectedLogicalCues: catalog.cues.length,
  expectedVariants: entries.length,
  acceptedEntries: entries.filter((entry) => entry.listeningStatus === 'accepted').length,
  listeningEvidence: 'none recorded; all generated masters remain pending-human-listening',
  runtimePromotion: 'disabled until per-variant listening evidence is recorded and status is accepted',
  entries,
};

const auditionAssets = Object.fromEntries(entries
  .filter((entry) => entry.auditionUrl)
  .map((entry) => [keyOf(entry.id, entry.variant), entry.auditionUrl]));

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
writeFileSync(auditionPath, `${JSON.stringify(auditionAssets, null, 2)}\n`, 'utf8');
const runtimeEntries = entries
  .filter((entry) => entry.listeningStatus === 'accepted' && typeof entry.relativeUrl === 'string' && entry.relativeUrl.startsWith('/audio/v1/'))
  .map(({ id, variant, relativeUrl, listeningStatus }) => ({ id, variant, relativeUrl, listeningStatus }));
writeFileSync(
  runtimeManifestPath,
  `import type { AudioManifestEntry } from './manager';\n\nexport const AUDIO_RUNTIME_MANIFEST: readonly AudioManifestEntry[] = ${JSON.stringify(runtimeEntries, null, 2)};\n`,
  'utf8',
);

console.log(JSON.stringify({
  manifestPath: 'design/audio/manifest.json',
  auditionPath: 'design/audio/qa/audition-assets.json',
  runtimeManifestPath: 'src/audio/runtime-manifest.generated.ts',
  logicalCues: catalog.cues.length,
  variants: entries.length,
  mastersPresent: entries.filter((entry) => entry.listeningStatus !== 'blocked').length,
  pendingHumanListening: entries.filter((entry) => entry.listeningStatus === 'pending-human-listening').length,
  accepted: entries.filter((entry) => entry.listeningStatus === 'accepted').length,
  blocked: entries.filter((entry) => entry.listeningStatus === 'blocked').length,
}, null, 2));
