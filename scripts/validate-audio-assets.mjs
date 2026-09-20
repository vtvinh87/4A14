import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const catalogPath = resolve(root, 'design/audio/audio-catalog.json');
const manifestPath = resolve(root, 'design/audio/manifest.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

function fail(message) {
  console.error(`audio validation: ${message}`);
  failures += 1;
}

function relativeToRoot(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('..')) return null;
  return resolve(root, path);
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function ffprobe(path) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels,duration', '-of', 'json', path], { encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  try {
    const stream = JSON.parse(result.stdout).streams?.find((item) => item.codec_name);
    if (!stream) return null;
    return {
      codec: stream.codec_name ?? null,
      sampleRate: Number(stream.sample_rate) || null,
      channels: Number(stream.channels) || null,
      durationMs: Number.isFinite(Number(stream.duration)) ? Math.round(Number(stream.duration) * 1000) : null,
    };
  } catch {
    return null;
  }
}

function measuredPeak(path) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const match = output.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  return match ? Number(match[1]) : null;
}

let failures = 0;
if (!existsSync(manifestPath)) {
  fail('design/audio/manifest.json is missing');
  process.exitCode = 1;
  process.exit();
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) fail('manifest schema must contain schemaVersion=1 and entries[]');

const expected = new Map(catalog.cues.flatMap((cue) => Array.from({ length: cue.variants }, (_, index) => [`${cue.id}:${index + 1}`, cue])));
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
const seen = new Set();
let acceptedCompressedBytes = 0;

for (const entry of entries) {
  const key = `${entry.id}:${entry.variant}`;
  if (!expected.has(key)) { fail(`unresolved or unexpected entry ${key}`); continue; }
  if (seen.has(key)) { fail(`duplicate entry ${key}`); continue; }
  seen.add(key);
  const cue = expected.get(key);
  const assetPath = relativeToRoot(entry.assetPath);
  const accepted = entry.listeningStatus === 'accepted';
  if (!['accepted', 'pending-human-listening', 'blocked'].includes(entry.listeningStatus)) fail(`${key} has invalid listeningStatus`);
  if (!assetPath) {
    if (!entry.blockReason) fail(`${key} has no safe assetPath or blockReason`);
  } else if (!existsSync(assetPath)) {
    fail(`${key} assetPath does not exist: ${entry.assetPath}`);
  } else {
    const stat = statSync(assetPath);
    if (entry.bytes !== stat.size) fail(`${key} bytes mismatch: manifest=${entry.bytes} actual=${stat.size}`);
    if (entry.sha256 !== hashFile(assetPath)) fail(`${key} sha256 mismatch`);
    const probe = ffprobe(assetPath);
    if (!probe) fail(`${key} ffprobe could not inspect ${entry.assetPath}`);
    else {
      if (entry.durationMs !== probe.durationMs) fail(`${key} durationMs mismatch: manifest=${entry.durationMs} actual=${probe.durationMs}`);
      if (entry.codec && entry.codec !== probe.codec) fail(`${key} codec mismatch: manifest=${entry.codec} actual=${probe.codec}`);
      if (entry.sampleRate !== probe.sampleRate) fail(`${key} sampleRate mismatch`);
      if (entry.channels !== probe.channels) fail(`${key} channels mismatch`);
      if (entry.peakDbTP !== null && entry.peakDbTP !== measuredPeak(assetPath)) fail(`${key} peakDbTP mismatch or not measured by ffmpeg volumedetect`);
      const toleranceMs = cue.loop ? (cue.bus === 'ambience' ? 1000 : Math.max(1000, cue.durationSeconds * 1000 * 0.05)) : cue.durationSeconds * 1000 * 0.15;
      if (entry.durationMs !== null && Math.abs(entry.durationMs - cue.durationSeconds * 1000) > toleranceMs) fail(`${key} duration outside catalog tolerance`);
    }
    if (accepted) {
      if (typeof entry.relativeUrl !== 'string' || !entry.relativeUrl.startsWith('/audio/v1/')) fail(`${key} accepted without a /audio/v1 relativeUrl`);
      acceptedCompressedBytes += stat.size;
    }
  }
  if (accepted && entry.measuredLufs === null && cue.loop) fail(`${key} accepted loop has no measuredLufs`);
  if (accepted && entry.listeningStatus !== 'accepted') fail(`${key} accepted invariant is inconsistent`);
}

for (const key of expected.keys()) {
  if (!seen.has(key)) fail(`missing inventory entry ${key}`);
}

if (acceptedCompressedBytes > 10 * 1024 * 1024) fail(`accepted compressed catalog exceeds 10 MiB: ${acceptedCompressedBytes} bytes`);
if (manifest.status === 'accepted' && entries.some((entry) => entry.listeningStatus !== 'accepted')) fail('manifest status=accepted while some entries are not accepted');

console.log(JSON.stringify({
  status: failures ? 'FAIL' : 'PASS',
  logicalCues: catalog.cues.length,
  expectedVariants: expected.size,
  manifestEntries: entries.length,
  acceptedEntries: entries.filter((entry) => entry.listeningStatus === 'accepted').length,
  acceptedCompressedBytes,
  failures,
}, null, 2));
if (failures) process.exitCode = 1;
