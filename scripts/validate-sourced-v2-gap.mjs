import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSourcedV2Gap } from './sourced-v2-contract.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const catalogPath = path.join(root, 'design/audio/audio-catalog.json');
const runtimePath = path.join(root, 'src/audio/runtime-manifest.generated.ts');
const baselineRuntimePilotPath = path.join(root, 'design/audio/qa/sourced-v1-runtime-pilot.json');
const outputPath = path.join(root, 'design/audio/qa/sourced-v2-full.json');
const provenancePath = path.join(root, 'design/audio/provenance/sourced-v2-full.jsonl');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readRuntimeManifest(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/AUDIO_RUNTIME_MANIFEST[^=]*=\s*(\[[\s\S]*?\])\s*;/);
  if (!match) throw new Error(`could not find AUDIO_RUNTIME_MANIFEST in ${filePath}`);
  return JSON.parse(match[1]);
}

const catalog = readJson(catalogPath);
const activeRuntimeEntries = readRuntimeManifest(runtimePath);
const baselineRuntimePilot = readJson(baselineRuntimePilotPath);
const baselineRuntimeEntries = baselineRuntimePilot.assets ?? [];
const gap = buildSourcedV2Gap(catalog, baselineRuntimeEntries, 67);

if (baselineRuntimeEntries.length !== 6 || gap.missingTargetCount !== 61) {
  throw new Error(
    `sourced-v2 baseline mismatch: expected 6 runtime entries and 61 missing, got ${baselineRuntimeEntries.length} and ${gap.missingTargetCount}`,
  );
}
if (![6, 67].includes(activeRuntimeEntries.length)) throw new Error(`unexpected active runtime entry count: ${activeRuntimeEntries.length}`);
if (activeRuntimeEntries.length === 67) {
  const activeGap = buildSourcedV2Gap(catalog, activeRuntimeEntries, 67);
  if (activeGap.missingTargetCount !== 0) throw new Error(`full active runtime still has ${activeGap.missingTargetCount} missing target(s)`);
}

const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  revision: 'sourced-v2-full',
  status: 'gap-locked',
  generatedAt,
  sourcePolicy: 'free CC0/public-domain sources only; no account, payment, donation, API, or new credential',
  ...gap,
  activeRuntimeCount: activeRuntimeEntries.length,
  activeRuntimeStatus: activeRuntimeEntries.length === 67 ? 'full-local-pilot' : 'baseline-v1-pilot',
  deferredEvents: [
    'landmark-open',
    'item-unlock',
    'class-milestone',
    'ambience-evening',
  ],
  runtimePromotion: false,
  productionAcceptedEntries: 0,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(provenancePath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
fs.appendFileSync(
  provenancePath,
  `${JSON.stringify({
    revision: 'sourced-v2-full',
    generatedAt,
    operation: 'gap-lock',
    catalogPath: 'design/audio/audio-catalog.json',
    runtimeManifestPath: 'src/audio/runtime-manifest.generated.ts',
    baselineRuntimePilotPath: 'design/audio/qa/sourced-v1-runtime-pilot.json',
    catalogTargetCount: gap.catalogTargetCount,
    currentRuntimeCount: gap.currentRuntimeCount,
    activeRuntimeCount: activeRuntimeEntries.length,
    missingTargetCount: gap.missingTargetCount,
    laneCounts: gap.laneCounts,
    costUsd: 0,
    runtimePromotion: false,
  })}\n`,
);

console.log(
  JSON.stringify(
    {
      outputPath: path.relative(root, outputPath),
      catalogTargetCount: gap.catalogTargetCount,
      currentRuntimeCount: gap.currentRuntimeCount,
      missingTargetCount: gap.missingTargetCount,
      laneCounts: gap.laneCounts,
    },
    null,
    2,
  ),
);
