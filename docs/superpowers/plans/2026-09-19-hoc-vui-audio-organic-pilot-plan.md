# Học Vui Organic Audio Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected procedural pilot with a revision-safe, locally generated Organic Modern six-cue pilot that is materially richer than the current 1990s-sounding batch while remaining candidate-only until human listening acceptance.

**Architecture:** Keep the existing legacy generator and artifacts intact for comparison. Add an `organic-v2` synthesis profile with material-first primitives, a revision-labelled output/provenance namespace, a six-cue pilot manifest, and an audition query mode that exposes three candidates per cue. Do not alter runtime integration, `public/audio`, progress-map data, learning data, or unrelated dirty files.

**Tech Stack:** Python 3.13, NumPy, stdlib `wave`/`json`/`hashlib`, ffprobe for technical inspection, static HTML/JavaScript audition page, existing local audio tooling only.

## Global Constraints

- No paid provider, registration, new credential, external audio API, or network audio generation.
- No claim of recorded foley when the source is locally synthesized.
- Preserve the existing legacy candidate/master batch as rejected comparison evidence.
- Generate exactly six pilot cues with three deterministic candidates each and six candidate-only masters.
- Keep all new outputs under revision-labelled paths; do not modify `public/audio` or `src/audio`.
- Do not modify progress-map data, learning data, auth/permissions, or unrelated dirty files.
- Preserve `PENDING_HUMAN_LISTENING`; metadata and browser playback do not constitute a listening pass.
- Do not commit, push, deploy, delete a branch, or remove a worktree.

---

## File map

- Modify: `design/audio/tools/generate-procedural-assets.py` — add the organic-v2 profile, revision-safe output, material-layer provenance, and pilot JSON export while retaining legacy defaults.
- Create: `design/audio/tools/test_generate_procedural_assets.py` — deterministic profile, material-layer, candidate-count, and revision-output tests.
- Modify: `design/audio/audition.html` — add `?revision=organic-v2` support and candidate A/B/C rendering without autoplay.
- Create: `design/audio/qa/organic-v2-pilot.json` — generated pilot inventory with measured file metadata and candidate paths; never an accepted runtime manifest.
- Create: `design/audio/candidates/organic-v2/{sfx,beds}/` — 18 candidate WAVs.
- Create: `design/audio/masters/organic-v2/{sfx,beds}/` — 6 candidate-only master WAVs selected from candidate A for comparison only.
- Create: `design/audio/provenance/organic-v2-asset-generation.jsonl` — one provenance record per candidate/master.
- Modify: `design/audio/qa/execution-ledger.md` — record the rejected legacy pilot and organic-v2 checkpoint, hashes/counts, and open listening gate.
- Modify: `design/audio/qa/listening-review.md` — add the organic-v2 six-cue matrix without marking any asset accepted.
- Do not modify: `design/audio/manifest.json`, `src/audio/runtime-manifest.generated.ts`, `public/audio/`, progress-map files, or unrelated dirty files.

## Task 1: Lock the organic-v2 generator contract with failing tests

**Files:**
- Create: `design/audio/tools/test_generate_procedural_assets.py`
- Modify: `design/audio/tools/generate-procedural-assets.py`

**Interfaces:**
- Test imports the generator module and relies on `ORGANIC_PROFILE = "organic-v2"`.
- The generator will expose `synthesize_organic(cue, rng) -> tuple[np.ndarray, list[str]]`.
- The generator will expose `candidate_names(cue_id, profile, count) -> list[str]`.
- `generate(..., profile, revision, candidate_count)` will return counts and the pilot manifest path.

- [x] **Step 1: Write failing tests for the new contract.**

  Add tests that assert:

  ```python
  def test_organic_synthesis_reports_material_layers():
      cue = catalog_by_id("ui-tap")
      signal, layers = module.synthesize_organic(cue, np.random.default_rng(11))
      assert signal.ndim == 1
      assert len(signal) == round(cue["durationSeconds"] * module.SAMPLE_RATE)
      assert {"contact", "resonance"}.issubset(layers)
      assert "pure-oscillator" not in layers

  def test_organic_pilot_has_three_distinct_candidate_names():
      assert module.candidate_names("ui-tap", module.ORGANIC_PROFILE, 3) == [
          "candidate-a", "candidate-b", "candidate-c"
      ]

  def test_legacy_candidate_contract_remains_two_for_pilot():
      assert module.candidate_names("ui-tap", "legacy", None) == [
          "candidate-a", "candidate-b"
      ]
  ```

- [x] **Step 2: Run the focused tests and verify the expected RED state.**

  Run:

  ```bash
  python3 -m unittest -v design/audio/tools/test_generate_procedural_assets.py
  ```

  Expected: failure because the organic profile interface does not yet exist.

- [x] **Step 3: Add only the public constants and candidate-name helper needed by the tests.**

  Keep the legacy `_candidate_names` behavior unchanged and add an explicit
  profile-aware helper. Do not change output paths or synthesis yet.

- [x] **Step 4: Run the focused tests and verify GREEN for the contract helpers.**

  Run the same unittest command; the synthesis test may remain the only failing
  test until Task 2, but helper tests must pass and the failure must be the
  expected missing organic synthesis behavior.

## Task 2: Implement material-first organic synthesis

**Files:**
- Modify: `design/audio/tools/generate-procedural-assets.py`
- Test: `design/audio/tools/test_generate_procedural_assets.py`

**Interfaces:**
- `synthesize_organic(cue, rng) -> tuple[np.ndarray, list[str]]` returns a mono
  one-shot or stereo bed plus the exact material layers used.
- `ORGANIC_PROMPT_PREFIX` records the local design prompt and prohibitions.

- [x] **Step 1: Add failing behavior tests for pilot identities.**

  Add tests that call `synthesize_organic` for all six pilot cues and assert:

  ```python
  assert set(layers).issubset({
      "contact", "pressure", "paper", "felt", "resonance",
      "air", "room", "brush", "percussion"
  })
  assert signal.shape[0] == round(cue["durationSeconds"] * module.SAMPLE_RATE)
  assert np.isfinite(signal).all()
  assert np.max(np.abs(signal)) > 0.001
  ```

  Add a deterministic test asserting two calls with the same seed are equal
  and different candidate seeds are not byte-identical.

- [x] **Step 2: Run tests and verify RED for the organic profile behavior.**

  Run:

  ```bash
  python3 -m unittest -v design/audio/tools/test_generate_procedural_assets.py
  ```

  Expected: failures for the unimplemented organic synthesis profile.

- [x] **Step 3: Implement the organic material primitives.**

  Add deterministic helpers that use NumPy and existing sample-rate constants:

  - filtered contact noise with a short asymmetric attack;
  - low-frequency pressure body with inharmonic resonant modes and varied
    damping, not a naked sine;
  - paper/felt brush textures with non-periodic smoothed noise;
  - short diffuse early-reflection taps for depth;
  - slow, non-periodic bed air and sparse acoustic-like gestures.

  Apply a gentle equal-power fade only where needed to prevent clicks, preserve
  cue onset, and keep one-shots mono. Build each pilot identity explicitly:

  - `ui-tap`: contact + felt + short resonance;
  - `answer-correct`: two warm resonance blooms + room, no three-note arpeggio;
  - `answer-retry`: paper/felt brush + neutral settling resonance;
  - `stamp-press`: pressure + rubber contact + paper release;
  - `pet-fox`: felt brush + two tiny resonant gestures + air;
  - `music-home`: evolving stereo air/room + sparse material gestures, no
    periodic harmonic pad and no final cadence.

- [x] **Step 4: Run focused tests and inspect spectral/peak sanity.**

  Run:

  ```bash
  python3 -m unittest -v design/audio/tools/test_generate_procedural_assets.py
  ```

  Expected: all focused unit tests pass. Also run a temporary read-only
  inspection that confirms no NaN/Inf, no clipping before headroom, and that
  each candidate has non-zero non-tonal contact energy; record observations in
  the implementation log, not as listening acceptance.

## Task 3: Add revision-safe generation, provenance, and pilot manifest

**Files:**
- Modify: `design/audio/tools/generate-procedural-assets.py`
- Create: `design/audio/qa/organic-v2-pilot.json`
- Create: `design/audio/candidates/organic-v2/{sfx,beds}/`
- Create: `design/audio/masters/organic-v2/{sfx,beds}/`
- Create: `design/audio/provenance/organic-v2-asset-generation.jsonl`
- Test: `design/audio/tools/test_generate_procedural_assets.py`

**Interfaces:**
- CLI:

  ```bash
  python3 design/audio/tools/generate-procedural-assets.py \
    --profile organic-v2 \
    --revision organic-v2 \
    --candidates 3 \
    --only ui-tap answer-correct answer-retry stamp-press pet-fox music-home
  ```

- Pilot JSON top-level fields: `schemaVersion`, `revision`, `status`,
  `acceptedEntries`, `cues`, and `generatedAt`.
- Each cue has `id`, `bus`, `durationSeconds`, `loop`, and `candidates`; each
  candidate has `name`, `path`, `masterPath`, `sha256`, `bytes`, measured
  duration/sample rate/channels/codec, `layers`, and
  `listeningStatus: "pending-human-listening"`.

- [x] **Step 1: Add failing tests for revision output and manifest shape.**

  Add a temporary-directory test that runs `generate` with the six pilot cue
  objects and asserts:

  ```python
  assert result["candidates"] == 18
  assert result["masters"] == 6
  assert result["revision"] == "organic-v2"
  assert manifest["status"] == "candidate-only"
  assert manifest["acceptedEntries"] == 0
  assert len(manifest["cues"]) == 6
  assert all(len(cue["candidates"]) == 3 for cue in manifest["cues"])
  ```

- [x] **Step 2: Run the test and verify RED for the new CLI/profile contract.**

  Run the focused unittest command and confirm the expected missing revision
  output failure.

- [x] **Step 3: Implement revision-aware paths and provenance.**

  Keep legacy defaults writing their existing paths. For `organic-v2`, write
  only under `candidates/organic-v2`, `masters/organic-v2`, and the separate
  provenance file. Select candidate A as a comparison master but mark it
  candidate-only. Record `profile`, `revision`, `layers`, local prompt text,
  command, seed, tool versions, cost `0`, and license
  `original procedural synthesis`.

- [x] **Step 4: Generate the six-cue organic-v2 pilot.**

  Run the exact CLI from the interface block. Confirm stdout includes
  `ARTIFACTS_READY_FOR_REVIEW`, `candidates=18`, `masters=6`, and
  `listeningStatus=pending-human-listening`.

- [x] **Step 5: Run tests and verify GREEN plus artifact counts.**

  Run:

  ```bash
  python3 -m unittest -v design/audio/tools/test_generate_procedural_assets.py
  find design/audio/candidates/organic-v2 -type f -name '*.wav' ! -name '._*' | wc -l
  find design/audio/masters/organic-v2 -type f -name '*.wav' ! -name '._*' | wc -l
  ```

  Expected: all tests pass, counts are 18 and 6, and no legacy file hash is
  changed.

## Task 4: Expose organic-v2 candidates in the local audition page

**Files:**
- Modify: `design/audio/audition.html`
- Modify: `design/audio/qa/organic-v2-pilot.json`
- Test: browser smoke against a local HTTP server

**Interfaces:**
- Default URL keeps current catalog audition behavior.
- `audition.html?revision=organic-v2` loads only
  `qa/organic-v2-pilot.json` and renders candidate A/B/C buttons.
- Every play button uses a real revision-relative WAV path, no autoplay, and
  the existing stop/volume/loop controls.

- [x] **Step 1: Add the generated pilot manifest reader and candidate renderer.**

  Render revision label, cue identity, candidate name, material layers, and
  pending status. Keep the existing catalog path untouched when no revision
  query parameter is present.

- [x] **Step 2: Start a local server and run browser smoke.**

  Run:

  ```bash
  python3 -m http.server 4173 --directory /Volumes/Pictures/Projects/Hoc_Vui
  ```

  Open:

  ```text
  http://127.0.0.1:4173/design/audio/audition.html?revision=organic-v2
  ```

  Verify six cues render, 18 candidate buttons exist, Play loads a real WAV,
  Stop silences it, and no page load starts playback. Do not call this a
  listening pass.

## Task 5: Technical QA and ledger checkpoint

**Files:**
- Modify: `design/audio/qa/execution-ledger.md`
- Modify: `design/audio/qa/listening-review.md`

- [x] **Step 1: Run file and metadata validation.**

  Check every organic-v2 WAV with `ffprobe` and the Python manifest data:
  48 kHz, 24-bit PCM, expected channel count, target duration tolerance,
  finite hashes, no missing files, and candidate A/B/C hashes distinct.

- [x] **Step 2: Run repository-safe regression checks.**

  Run only checks relevant to this write-set:

  ```bash
  git diff --check
  npm run validate:audio
  npm test -- --run --reporter=dot
  npm run typecheck
  npm run build
  ```

  The existing global audio validator must continue to pass with
  `acceptedEntries=0`; it must not be expanded to treat organic-v2 candidates
  as runtime assets.

- [x] **Step 3: Update the ledger and listening report.**

  Record the organic-v2 command, counts, manifest/provenance paths, SHA/count
  evidence, local-only/no-cost status, browser smoke result, and explicit open
  gate: human A/B listening on laptop/headphones/phone, ten repetitions for
  one-shots, ten loop cycles for `music-home`, mute/background/offline after
  any future integration, and no acceptance yet.

- [x] **Step 4: Final scope check.**

  Run:

  ```bash
  git status --short
  git diff --name-only
  ```

  Confirm no progress-map, learning-data, auth/permission, `public/audio`, or
  unrelated task-owned file changed. Leave the worktree uncommitted for user
  review and listening.
