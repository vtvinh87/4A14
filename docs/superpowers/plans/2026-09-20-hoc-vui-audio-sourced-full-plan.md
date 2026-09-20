# Học Vui Full Sourced Audio Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auditable sourced candidates and a local pilot runtime path for all 67 catalog audio entries without changing learning/progress/permission data.

**Architecture:** Keep `sourced-v1` immutable. Build `sourced-v2-full` as a source registry → normalized candidate → selected master → pilot runtime pipeline. Runtime entries are explicitly marked `runtimeMode: "pilot"`; production acceptance remains controlled by `design/audio/manifest.json` and human listening evidence.

**Tech Stack:** TypeScript/React, Vite/Vitest, Node.js scripts, local `ffmpeg`/`ffprobe`, JSON/JSONL provenance, localhost:8888 runtime.

## Global Constraints

- Preserve `AudioManager.play('tap'|'success'|'hint')`, master setting, bus preferences and fail-closed behavior.
- Preserve `sourced-v1` assets, selection, hashes and listening status.
- Use only free/no-account/no-new-credential sources; prefer CC0 and record any required attribution.
- Do not use procedural beep/synthetic filler to claim source coverage.
- Do not modify progress-map, learning data, permissions, unrelated dirty owner files, or production accepted counts.
- Music, ambience and notifications remain opt-in/off by default.
- No commit, push, deploy, branch cleanup or worktree cleanup without a later explicit user request.
- Never claim listening quality from metadata, waveform or automated browser playback alone.

---

### Task 1: Lock the full-catalog gap and recovery ledger

**Files:**
- Create: `design/audio/qa/sourced-v2-full.json`
- Create: `design/audio/provenance/sourced-v2-full.jsonl`
- Create: `scripts/validate-sourced-v2-gap.mjs`
- Modify append-only: `design/audio/qa/execution-ledger.md`
- Test/verify: `design/audio/audio-catalog.json`, `design/audio/manifest.json`, `src/audio/runtime-manifest.generated.ts`

**Interfaces:**
- Consumes the 38-cue/67-entry catalog and current six-entry pilot manifest.
- Produces an exact 61-entry gap list grouped into the four lanes in the design.

- [x] **Step 1: Write a manifest-gap assertion** that fails unless catalog target entries equal 67, current pilot entries equal 6, and the generated gap equals 61.
- [x] **Step 2: Run the assertion** with `node scripts/validate-sourced-v2-gap.mjs`; expect RED until the new script exists.
- [x] **Step 3: Implement `scripts/validate-sourced-v2-gap.mjs`** to read the catalog, runtime manifest and existing pilot QA JSON without modifying them; emit deterministic JSON and exit non-zero on count/ID mismatch.
- [x] **Step 4: Run the assertion** and record the exact ID list, lane counts and current deferred events in `sourced-v2-full.json`.
- [x] **Step 5: Append the checkpoint** to `execution-ledger.md`, recording no progress-map/learning/permission paths changed.

### Task 2: Build the source/license registry without paid services

**Files:**
- Create: `design/audio/sourced-v2/source-packs/`
- Create: `design/audio/qa/sourced-v2-source-manifest.json`
- Create: `design/audio/provenance/sourced-v2-source-provenance.jsonl`
- Create/modify: `scripts/collect-sourced-v2-sources.mjs`
- Test: `scripts/validate-sourced-v2-source-manifest.mjs`

**Interfaces:**
- Consumes the gap list and audited source pages/archives.
- Produces source records with `sourceUrl`, `retrievedAt`, `archiveSha256`, `license`, `licenseEvidenceUrl`, `costUsd`, `attribution`, and exact local file paths.

- [x] **Step 1: Write the source-manifest validator** requiring every downloaded record to have a URL, local path, SHA-256, license evidence, `costUsd: 0`, and an allowed license (`CC0` or explicitly recorded attribution license).
- [x] **Step 2: Run the validator** on the empty/new registry and confirm it rejects incomplete records.
- [x] **Step 3: Add exact source records** for reused Kenney/Dustyroom/OpenGameArt packs and new CC0 candidates for UI, music and environmental beds; preserve original archives and license files.
- [x] **Step 4: Download only the listed public files** with `curl -L --fail --location`, calculate SHA-256, and record the retrieval date; do not create accounts or expose credentials.
- [x] **Step 5: Run the validator** and record any source gaps instead of silently substituting an unsuitable file.

### Task 3: Normalize 61 sourced candidates and provenance

**Files:**
- Create: `design/audio/candidates/sourced-v2/{sfx,beds}/`
- Create: `design/audio/masters/sourced-v2/{sfx,beds}/`
- Create: `scripts/build-sourced-v2-candidates.mjs`
- Create: `scripts/validate-sourced-v2-assets.mjs`
- Create: `design/audio/qa/sourced-v2-candidates.json`
- Create: `design/audio/provenance/sourced-v2-asset-provenance.jsonl`
- Test: `scripts/validate-sourced-v2-assets.test.mjs` or equivalent Node assertion

**Interfaces:**
- Consumes source-manifest records and catalog targets.
- Produces one normalized WAV candidate per target file, with optional additional comparison candidates for ambiguous/high-risk cues.

- [x] **Step 1: Write failing validation cases** for missing files, wrong channel count, invalid duration, missing source hash and duplicate output paths.
- [x] **Step 2: Run the validator** and confirm it fails on incomplete candidate output.
- [x] **Step 3: Implement deterministic normalization** using local `ffmpeg`: SFX mono 48 kHz PCM, beds stereo 48 kHz PCM, short fades only when needed, no arbitrary pitch/time synthesis, and no long leading silence.
- [x] **Step 4: Generate candidate/master metadata** with `ffprobe`, SHA-256, bytes, source mapping, transform command, license, bus, variant and `listeningStatus: "pending-human-listening"`.
- [x] **Step 5: Run the validator**; require the exact 61 new files plus the existing six pilot variant records, and remove only generated `._*` files inside the new sourced-v2 directories.

### Task 4: Extend the audition surface for the full sourced revision

**Files:**
- Modify: `design/audio/audition.html`
- Create: `design/audio/qa/sourced-v2-selection.json`
- Create: `design/audio/provenance/sourced-v2-selection.jsonl`
- Test: browser smoke via localhost:4173 and manifest JSON assertions

**Interfaces:**
- Consumes `sourced-v2-candidates.json`.
- Produces explicit user selection records; never changes runtime automatically.

- [x] **Step 1: Add a failing manifest/UI assertion** requiring the page to render all sourced-v2 targets with source/license labels and no autoplay.
- [x] **Step 2: Run the assertion/browser smoke** and confirm the new revision is absent before implementation.
- [x] **Step 3: Implement `?revision=sourced-v2-full`** with lane filters, cue/variant labels, Play/Stop, loop count, source/license/provenance display and selected/pending status.
- [x] **Step 4: Verify explicit playback** for representative SFX, reward/Pet, notification and each bed lane; browser smoke loaded real v2 files with `readyState=4`, then Stop cleared each source.
- [x] **Step 5: Keep selection records append-only** and wait for actual user choices before labeling a new asset selected.

### Task 5: Promote selected sourced-v2 assets to local pilot runtime

**Files:**
- Create: `scripts/build-sourced-v2-runtime.mjs`
- Modify: `src/audio/runtime-manifest.generated.ts`
- Modify: `vite.config.ts`
- Modify: `src/audio/runtime-manifest.test.ts`
- Modify: `src/pwa/offline.test.ts`
- Create/update: `public/audio/v2/`
- Create/update: `design/audio/qa/sourced-v2-runtime-pilot.json`
- Create/update: `design/audio/provenance/sourced-v2-runtime-pilot.jsonl`

**Interfaces:**
- Consumes the full sourced-v2 candidate ledger under the user's explicit local-pilot authorization, with verified candidate/source hashes. Human selection status remains pending.
- Produces local pilot URLs with `runtimeMode: "pilot"`; leaves `design/audio/manifest.json` at zero accepted.

- [x] **Step 1: Write failing runtime tests** requiring the full local-pilot v2 URLs to be present, all entries to remain pending/pilot-only, and offline precache to include the v1/v2 pilot outputs without changing production acceptance.
- [x] **Step 2: Run focused tests** and confirm RED.
- [x] **Step 3: Implement the v2 runtime builder** with source hash checks, `ffmpeg` encode targets, `ffprobe` output checks and deterministic output/provenance.
- [x] **Step 4: Implement manifest/offline integration** without changing legacy API, progress state, permissions or production accepted entries.
- [x] **Step 5: Run focused tests and live HTTP checks** for every generated URL; require `200`, `audio/*`, non-empty content and no AppleDouble sidecars.

### Task 6: Complete verified semantic mapping only where events exist

**Files:**
- Modify: `src/App.tsx`, `src/App.test.ts`, `src/audio/manager.test.ts`
- Do not modify: progress-map data/schema, learning event contracts, permission/auth data

**Interfaces:**
- Consumes existing event transitions and audio manager cue IDs.
- Produces cue playback for verified transitions; deferred events remain explicitly deferred.

- [ ] **Step 1: Add failing tests** for each new verified mapping, including event-key dedupe and no playback from initial snapshots/polling/render.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Add only the minimal mapping** for existing UI/lesson/reward/social/Pet events; keep notifications/music/ambience opt-in.
- [ ] **Step 4: Verify deferred cues** (`class-milestone`, absent Pet-rest/ambience routing, or any missing event) are not wired through invented triggers.
- [ ] **Step 5: Run focused and full tests** with the pre-existing dirty files preserved.

### Task 7: Runtime/listening QA and resumable handoff

**Files:**
- Modify append-only: `design/audio/qa/execution-ledger.md`
- Modify append-only: `design/audio/qa/listening-review.md`
- Modify append-only: `design/audio/qa/runtime-report.md`
- Verify: `design/audio/qa/sourced-v2-runtime-pilot.json`

- [x] **Step 1: Run technical gates:** `npm run validate:audio`, v2 source/candidate validators, focused Vitest, full `npm test`, `npm run typecheck`, `npm run typecheck:server`, `npm run build`, and `git diff --check`.
- [ ] **Step 2: Run runtime gates** on `127.0.0.1:8888`: every selected URL, settings preview, lesson correct/retry, Pet taps, reward/social paths, mute, hidden/background, offline-after-first-load and optional bed toggles.
- [ ] **Step 3: Record human listening evidence separately**; do not change accepted/passed status from technical evidence.
- [x] **Step 4: Record exact remaining gaps** if a source, event, license or listening gate is unresolved.
- [x] **Step 5: Stop before commit/push/deploy** and hand the user the local test URL and evidence paths.

**Execution note:** Task 5 is complete as a full local-pilot integration under the user's explicit request. Task 6 does not add new event triggers in this runtime pass: existing semantic mappings remain in `src/App.tsx`, while cues without verified event ownership remain deferred. Task 7 steps 2–3 stay open until the user performs authenticated in-game testing and human/device listening.

**Execution note addendum (2026-09-20):** The first localhost test exposed a React StrictMode lifecycle bug in `App` that disposed the live `AudioManager` during effect replay. The fix and regression test are complete; technical runtime verification is fresh, but Task 7 steps 2–3 remain open because browser transport evidence cannot substitute for the user's human listening and device/mute/background/offline checks.
