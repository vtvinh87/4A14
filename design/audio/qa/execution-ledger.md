# Học Vui audio execution ledger

Plan: `docs/superpowers/plans/2026-09-18-hoc-vui-audio-luna-plan.md`
Follow-up plan: `docs/superpowers/plans/2026-09-19-hoc-vui-audio-organic-pilot-plan.md`
Started: 2026-09-19 (Asia/Ho_Chi_Minh)

## Recovery identity

- Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`
- Branch: `codex/bang-tien-bo`
- Base SHA at A0: `5c31403a00dc6b612f78a9be4269d6097edf15e0`
- Scope rule: audio write-set only; preserve progress data, progress-map files and unrelated dirty files.
- Pre-existing dirty paths recorded before audio work:
  - `deno.lock`
  - `docs/executor/load-performance/cloud-snapshot-v24-smoke.json`
  - `docs/executor/load-performance/cloud-stage-http.json`
  - `docs/executor/load-performance/cloud-stage-smoke.json`
  - `tmp/translation/preview_tl1/page-01.png`
  - `tmp/translation/preview_tl1/page-02.png`
  - `tmp/translation/preview_tl2/page-01.png`
  - `tmp/translation/preview_tl2/page-02.png`
- No progress-map path was modified by this task at A0.

## Tool preflight (A0)

- `ffmpeg`: available at `/opt/homebrew/bin/ffmpeg`, version `8.1.1`; WAV/MP3/Opus encoders and synthesis/mix filters available.
- `ffprobe`: available at `/opt/homebrew/bin/ffprobe`, version `8.1.1`.
- `python3`: available at `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`.
- `numpy`: available (`2.4.4`).
- `afplay`/`ffplay`: available for local playback tooling, but this agent has no reliable human listening confirmation channel.
- No callable local text-to-SFX/music CLI, provider SDK or connected audio-generation tool was found.
- `GEMINI_API_KEY` exists in the environment by name only; it is intentionally not used. No registration, network call, payment or new credential was made.
- Asset status rule: any local procedural files are provenance-labeled `local-procedural`, not AI/provider output; runtime promotion and listening status remain pending until human listening evidence exists.

## Delegation

- Worker `01a0b989-c7ba-7e11-8bfd-1517ffa9622b` (`Nietzsche`): independent offline asset lane.
- Worker write-set: `design/audio/candidates/{sfx,beds}/`, `design/audio/masters/{sfx,beds}/`, `design/audio/provenance/asset-generation.jsonl`, `design/audio/tools/generate-procedural-assets.py`.
- Worker must not write `public/audio`, manifest, catalog, `src/`, Brain_Vault or Git; parent will verify every result.

## Phase status

- A0: `complete_with_blocker` — source docs, checkout/tool preflight, audition page and no-cost generation decision recorded; no callable text-to-audio provider.
- A1: `complete_with_listening_gate` — 81 candidates/67 masters generated and pilot matrix present; human listening still pending.
- A2: `complete_with_listening_gate` — 38/67 manifest built from actual ffprobe/SHA metadata; 0 accepted and no public promotion.
- A3: `complete` — mixer/preferences/policy/runtime manifest path and settings controls implemented; no progress schema change.
- A4: `complete_with_deferred_events` — semantic callsites mapped after state transitions, qualified friends/challenge confirmations and selected-pet taps; unverified events remain deferred.
- A5: `complete_with_unverified_devices` — validator/runtime tests/full repository gates/browser audition smoke pass; Safari iOS/iPadOS, physical speaker listening and human review remain unverified.
- A6: `complete_with_hard_gates_open` — ledger, coverage, manifest, audition page, technical/listening reports and blocked evidence are present; this is not an audio acceptance claim.

## Blockers and evidence rules

- `BLOCKED_GENERATION_TEXT_TO_AUDIO`: no local text-to-SFX/music provider is callable without adding a service/credential, which is out of scope.
- `LISTENING_PENDING_HUMAN`: local playback commands and waveform/ffprobe measurements are not listening evidence. Do not mark a candidate accepted or claim the 90-point listening rubric without a human/device review.
- `MOBILE_NOT_VERIFIED`: Safari iOS/iPadOS is not available in this session unless a real device/browser evidence is captured.

## Append-only updates

### 2026-09-19 A0 start

- Read plan, production bible and catalog in full.
- Confirmed catalog design state is still `design-not-generated` and all 38 cues are `planned`.
- Started parent runtime work only after recording the dirty owner boundary above.

### 2026-09-19 A0–A4 artifact checkpoint

- Worker returned `ARTIFACTS_READY_FOR_REVIEW`; parent closed the completed worker after inspecting the write-set.
- Generator audit: 81 candidate WAV + 67 master WAV; all provenance records label `local-procedural`, `cost=0`, original license, seed and command.
- Generated `design/audio/manifest.json` and `qa/audition-assets.json` from actual files. `npm run validate:audio` passed with 38 cues/67 entries/0 accepted.
- Generated `src/audio/runtime-manifest.generated.ts`; it is intentionally empty until human listening acceptance and public promotion.
- Added manager tests for slow decode invalidation and offline fetch failure; no candidate was marked accepted.

### 2026-09-19 A5–A6 verification checkpoint

- `npm run validate:audio`: PASS — 38 cues, 67 entries, 0 accepted, 0 failures.
- `npm run typecheck`: PASS; `npm run typecheck:server`: PASS; full test suite: 134 files passed/7 skipped, 626 tests passed/10 skipped; `npm run build`: PASS; `git diff --check`: PASS.
- Browser audition smoke used an explicit click on local `ui-tap` and observed the real WAV URL at `readyState=4`, then used Stop. No claim of human hearing quality was made.
- No `public/audio` file, progress-map path, or pre-existing dirty owner file was changed by the audio task; no commit/push/deploy was performed.
- Remaining hard gates: `LISTENING_PENDING_HUMAN`, `MOBILE_NOT_VERIFIED`, `BLOCKED_GENERATION_TEXT_TO_AUDIO`; map/landmark/class/item/pet-rest triggers remain deferred where ownership/event evidence is absent.

### 2026-09-19 organic-v2 pilot redesign checkpoint

- User rejected the first local-procedural batch as very poor/dated after trying the audition page; no legacy candidate was accepted.
- Approved direction: Organic Modern / phương án A. The new profile is material-first (filtered contact, inharmonic resonance, paper/felt brush, short room reflections, sparse non-periodic bed) and explicitly avoids fixed 8-bit-style oscillator/arpeggio behavior.
- Implementation plan: `docs/superpowers/plans/2026-09-19-hoc-vui-audio-organic-pilot-plan.md`; design spec: `docs/superpowers/specs/2026-09-19-hoc-vui-audio-organic-pilot-design.md`.
- Generator contract is covered by `python3 -m unittest -v design/audio/tools/test_generate_procedural_assets.py` — 6 tests passed.
- Organic pilot command:
  `python3 design/audio/tools/generate-procedural-assets.py --profile organic-v2 --revision organic-v2 --candidates 3 --seed 20260919 --only ui-tap answer-correct answer-retry stamp-press pet-fox music-home`
- Actual output: 18 candidate WAVs (3 per logical cue), 6 comparison masters (candidate A), all 48 kHz PCM24; sidecar `._*` files were verified as AppleDouble and removed only from the new organic-v2 directories.
- Manifest: `design/audio/qa/organic-v2-pilot.json`; provenance: `design/audio/provenance/organic-v2-asset-generation.jsonl`; status `candidate-only`, `acceptedEntries=0`.
- Audition smoke: `http://127.0.0.1:4173/design/audio/audition.html?revision=organic-v2` rendered 6 cues/18 buttons; explicit Play loaded a real organic-v2 WAV and showed `đang phát vòng 1/1`; Stop showed `Đã dừng`; reload did not autoplay.
- This browser smoke confirms routing/playback controls only. It is not human listening evidence; A/B listening, device coverage, repeat comfort and loop-seam review remain open.
- Fresh regression after the organic-v2 provenance refresh: Python audio tests 6 passed; Vitest 134 files passed/7 skipped and 626 tests passed/10 skipped; `npm run validate:audio`, `npm run typecheck`, `npm run typecheck:server`, `npm run build`, and `git diff --check` passed. Build retained the existing non-blocking chunk-size warning.

### 2026-09-20 sourced-v1 download and pilot checkpoint

- User rejected the generated/organic sound direction and requested real game-audio sources. A read-only source audit found no need for a paid provider or account: the selected downloads are Dustyroom Free Casual Game Sounds (CC0), Kenney Interface Sounds (CC0), OpenGameArt UI Sound Effects (CC0), and three OpenGameArt CC0 music items.
- Downloaded archives/original files are preserved under `design/audio/sourced-v1/source-packs/`; archive SHA-256, source URLs, license evidence, local Dustyroom PDF/Kenney license text, and `costUsd=0` are recorded in `design/audio/qa/sourced-v1-source-manifest.json` and `design/audio/provenance/sourced-v1-asset-provenance.jsonl`.
- Normalized 18 review derivatives (3 candidates each for `ui-tap`, `answer-correct`, `answer-retry`, `stamp-press`, `pet-fox`, and a 48-second `music-home` excerpt) under `design/audio/candidates/sourced-v1/`. SFX are PCM 48 kHz mono; music excerpts are PCM 48 kHz stereo. Original source files remain available for attribution/audit.
- Pilot manifest `design/audio/qa/sourced-v1-pilot.json` reports `status=candidate-only`, `acceptedEntries=0`, 18/18 candidates present, and all `listeningStatus=pending-human-listening`. No candidate was copied to `public/audio`; no runtime manifest/catalog, learning data, progress-map path, or permission data was changed.
- Audition route added: `http://127.0.0.1:4173/design/audio/audition.html?revision=sourced-v1`. It has explicit Play/Stop only, source/provider/license labels, and no autoplay. Browser playback remains harness evidence, not a listening pass.
- Research-only leads not downloaded: Sonniss GDC bundle (large archive; license reviewed) and Freesound (per-file license/attribution audit not needed for this pilot). No paid pack, registration, donation, API call, or new credential was used.
- AppleDouble/macOS archive sidecars created inside the new sourced-v1 download/candidate directories were removed only within those new directories; existing unrelated sidecars/worktree data were not touched.

Open sourced-v1 gates: human A/B selection, loop-seam review, device listening, mix/mute/background/offline checks, and final license/attribution approval. This checkpoint is not a quality or runtime acceptance claim.

### 2026-09-20 sourced-v1 user selection checkpoint

- User supplied the six pilot decisions from the audition page: `ui-tap=B`, `answer-correct=A`, `answer-retry=B`, `stamp-press=C`, `pet-fox=B`, `music-home=B`.
- `design/audio/tools/record-sourced-selection.py` recorded the decision as `pilot-selected`, updated `design/audio/qa/sourced-v1-pilot.json` with 6 selected entries and 12 not-selected comparison entries, and wrote the resumable decision record to `design/audio/qa/sourced-v1-selection.json` plus `design/audio/provenance/sourced-v1-selection.jsonl`.
- Created six selected pilot masters under `design/audio/masters/sourced-v1/{sfx,beds}/`; each master is byte/hash-identical to its selected candidate. This is a pilot master checkpoint only: `runtimePromotion=false`, runtime accepted entries remain `0`, and no file was copied to `public/audio`.
- Audition now shows `selected-by-user` / `not-selected` labels and keeps the source/license links. Fresh browser reload rendered all six selections; no autoplay or runtime promotion was introduced.

Remaining gates after selection: mix/loudness pass, full device listening, mute/background/offline regression, remaining catalog variants, and license/attribution sign-off.

### 2026-09-20 local sourced-v1 runtime pilot integration

- User explicitly requested integrating the six selected sourced-v1 pilots into the game for local testing, with commit/push/deploy deferred until the user reports the test is OK. This is a scoped override of the candidate-only runtime boundary for local pilot testing only; it does not promote any entry to production acceptance.
- Ran `npm run build:audio-pilot-runtime`. Six real MP3 files are present under `public/audio/v1/`: `ui-tap`, `answer-correct`, `answer-retry`, `stamp-press`, `pet-fox`, and `music-home`. The pipeline revalidates selected master hashes, encodes with local `ffmpeg`, probes with `ffprobe`, and writes runtime manifest, pilot QA manifest, and runtime provenance.
- Runtime manifest entries are explicitly marked `runtimeMode=pilot` and `listeningStatus=pending-human-listening`. `design/audio/manifest.json` remains unchanged at `acceptedEntries=0`; no production acceptance claim was made.
- Game integration is scoped to the six selected cues: legacy tap routing resolves to `ui-tap`; lesson feedback resolves to correct/retry after state transition; new stamp awards resolve to `stamp-press`; selected fox direct taps resolve to `pet-fox`; settings preview plays selected `answer-correct`; `music-home` starts only for an authenticated visible Journey view when sound and music are enabled. Music remains opt-in by default.
- Offline production build includes the six pilot URLs in `dist/offline-manifest.json`; the pilot remains device-local/test-only and is not a deploy or release artifact claim.
- Technical evidence: focused tests 34/34 passed; full Vitest 135 files passed / 7 skipped, 631 tests passed / 10 skipped; `npm run typecheck`, `npm run typecheck:server`, `npm run validate:audio`, `npm run build`, and `git diff --check` passed. Live `127.0.0.1:8888` returned HTTP 200 `audio/mpeg` for all six URLs.
- Human listening, device coverage, mute/background/offline behavior, mix/loudness and loop-seam review remain open. No progress-map, learning-data, permission or unrelated dirty owner file was changed; no commit/push/deploy was performed.

### 2026-09-20 sourced-v2-full source-and-audition checkpoint

- User approved the full sourced coverage direction (B). The implementation spec and plan are `docs/superpowers/specs/2026-09-20-hoc-vui-audio-sourced-full-design.md` and `docs/superpowers/plans/2026-09-20-hoc-vui-audio-sourced-full-plan.md`.
- Gap lock is verified by `node scripts/validate-sourced-v2-gap.mjs`: catalog `67` target entries, current local pilot `6`, missing `61`; lane counts are core UI/learning `25`, reward/social/Pet `19`, music/ambience `9`, and existing-pilot variants `8`.
- Source registry uses only public CC0 records with `costUsd=0`: `68` verified records (`2` archives + `66` files) in `design/audio/qa/sourced-v2-source-manifest.json`. New downloads are OpenGameArt beds/creature/UI sources; existing Kenney and selected sourced-v1 artifacts remain preserved. No account, payment, API, donation or new credential was used.
- `node scripts/build-sourced-v2-candidates.mjs` produced `67` normalized PCM s24le candidates at 48 kHz: `61` new targets plus `6` reused sourced-v1 selections. `node scripts/validate-sourced-v2-assets.mjs` verifies every file/hash/codec/channel record. AppleDouble sidecars were removed only under the new `design/audio/sourced-v2/` and `design/audio/candidates/sourced-v2/` directories.
- Candidate manifest/provenance/selection ledger: `design/audio/qa/sourced-v2-candidates.json`, `design/audio/provenance/sourced-v2-asset-provenance.jsonl`, `design/audio/qa/sourced-v2-selection.json`, and `design/audio/provenance/sourced-v2-selection.jsonl`. All `67` entries remain `pending-human-listening`, `selectedEntries=0`, runtime promotion is false, and production accepted entries remain `0`.
- Audition route: `http://127.0.0.1:4173/design/audio/audition.html?revision=sourced-v2-full`. Browser smoke showed `38/38` cues and `67` candidates, no autoplay (`paused=true`, no source before interaction), and explicit Play loaded real SFX (`ui-tap`), reward (`item-unlock`), Pet (`pet-fox`), notification (`message-send`) and bed (`music-home`) files with `readyState=4`; Stop cleared playback. This proves routing/transport only, not sound quality or human listening.
- No `src/audio/runtime-manifest.generated.ts`, `public/audio`, progress-map, learning-data, permission/auth path or unrelated dirty owner file was changed by sourced-v2. Full runtime promotion is intentionally held until user listening/selection evidence exists.

Open sourced-v2 gates: human listening and selection per candidate/variant, semantic fit for the reused generic SFX and creature voices, loop-seam/mix review for beds, device/mute/background/offline QA, and only then selected local runtime integration. `ambience-evening`, `landmark-open`, `item-unlock` and `class-milestone` remain event/deferred gates even though source candidates exist.

### 2026-09-20 sourced-v2-full local runtime integration checkpoint

- User explicitly requested the full sourced-v2 catalog be integrated into `localhost:8888` for local testing. This is an authorization for a local pilot only; it does not convert pending listening records into acceptance and does not alter the production audio manifest.
- Added `scripts/build-sourced-v2-runtime.mjs`. The builder rechecks every candidate hash, source hash, CC0/cost policy, encodes 61 new candidates with local `ffmpeg`, probes each output with `ffprobe`, and writes runtime hashes/provenance. The six sourced-v1 runtime outputs are reused byte-for-byte and revalidated rather than re-encoded.
- Runtime result: `67/67` catalog entries, `6` `/audio/v1/` legacy pilot outputs plus `61` `/audio/v2/` outputs, `8,469,063` total bytes. `design/audio/qa/sourced-v2-runtime-pilot.json` and `design/audio/provenance/sourced-v2-runtime-pilot.jsonl` record `runtimeMode=pilot`, `listeningStatus=pending-human-listening`, explicit user local-pilot authorization, and `costUsd=0`.
- `vite.config.ts` now combines sourced-v1 and sourced-v2 pilot manifests for the local/offline cache contract while keeping production accepted entries sourced only from `design/audio/manifest.json`. Production `acceptedEntries` remains `0`.
- Focused runtime/offline/manager tests pass: `25/25`. Live GET against `http://127.0.0.1:8888` returned `200`, `audio/mpeg`, and non-empty bytes for every `67/67` runtime URL (`6` v1 + `61` v2). No `._*` sidecars exist under `public/audio/v2/`. The browser tab at `localhost:8888` visibly loads the actual game login page; no credentials were entered.
- Existing App semantic routing remains the integration boundary: lesson/answer/hint/stamp/Pet/settings/friends/challenge/birthday paths use existing cue IDs where events are verified; deferred catalog cues remain deferred rather than gaining invented triggers. Mute, hidden/background invalidation, disposal and offline fetch fail-closed are covered by the existing manager regression suite.
- No progress-map, learning-data, permission/auth data, or unrelated owner file was changed by this runtime addendum. No commit, push or deploy was performed.

### 2026-09-20 localhost silent-playback diagnosis and lifecycle fix

- User reported that `http://127.0.0.1:8888/` remained silent even with sound settings enabled. The issue was reproduced against the authenticated local game shell and isolated before changing any learning, progress-map, permission or data path.
- Same-browser diagnostic evidence confirmed `AudioContext`, `fetch`, MP3 fetch (`200`, `audio/mpeg`), decode and an active `AudioManager` voice all work. The app-specific trace then showed React StrictMode effect replay running the old cleanup's `audio.dispose()` while `App` was still mounted; later preview/play calls observed `disposed=true` and returned before runtime fetch.
- Minimal fix: `App` cleanup now calls `audio.stopAll()` for StrictMode replay and registers `audio.dispose()` on real `pagehide`; the regression test `keeps the audio manager live through React StrictMode effect replay` is in `src/App.test.ts`.
- After the fix, a fresh localhost interaction reached `disposed=false`, resumed the context to `running`, and selected real v2 runtime entries. Temporary query-gated console tracing and the temporary diagnostic HTML page were removed before verification.
- Fresh technical gates: focused audio/App tests `36/36`; full Vitest `139` files passed / `7` skipped, `642` tests passed / `10` skipped; typecheck, server typecheck, audio validator and production build passed; all `67/67` local runtime URLs returned non-empty `audio/*` bytes (`8,469,063` total).
- This remains transport/runtime evidence, not human listening evidence. The user must confirm audible output, then perform mute, background/return, offline-after-first-load, lesson/Pet/social and bed-loop checks. No commit, push or deploy was performed.

Open gates after this checkpoint: human/device listening, in-game behavior review after the user signs in locally, mix/loudness and bed loop-seam review, Safari/mobile verification, and final decision on whether any pilot entry may later be promoted. The local dev server does not register the production Service Worker; offline cache behavior must be checked from a production preview/build after first load.
