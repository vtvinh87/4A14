# Học Vui Sourced Audio Pilot Implementation Plan

> Scope: a new, candidate-only external-source pilot. This plan does not promote
> audio to `public/audio`, change `AudioManager`, or alter learning/progress data.

## Goal

Replace the rejected synthetic/organic pilot comparison with a small, auditable
pilot assembled from downloaded game-audio packs whose license evidence is
available at the source page or in the downloaded archive. The six pilot cues
remain `ui-tap`, `answer-correct`, `answer-retry`, `stamp-press`, `pet-fox`,
and `music-home`.

## Source and cost policy

- Download only free packs with an explicit CC0/public-domain or equivalent
  commercial-use statement.
- Do not create an account, call a paid API, accept a trial, make a donation,
  or add credentials.
- Keep the original archive/source files and their SHA-256 hashes.
- Do not redistribute a pack as a new standalone library. The candidate files
  are local review derivatives and remain outside `public/audio` until the
  project explicitly approves a license-safe delivery path.
- Treat license evidence and audio-quality evidence as separate gates.

## Selected source lanes

| Provider | Pack | Intended use | License evidence |
| --- | --- | --- | --- |
| Dustyroom | Free Casual Game Sounds | modern casual-game SFX alternatives | CC0 in the official page and archive license PDF |
| Kenney | Interface Sounds | named click/confirmation/question/pluck/drop alternatives | CC0 in the official page and downloaded `License.txt` |
| OpenGameArt / Robin Lamb | UI Sound Effects | a public-domain UI comparison candidate | CC0 on the item page |
| OpenGameArt / pebonius, polosik, pmiller | calm/menu music items | music-home comparison candidates | CC0 on each item page |

Sonniss is retained as a research lead for a later high-quality search, but its
large archive is not downloaded in this pilot. Freesound is not used because
license and attribution decisions are per file and are not needed to establish
this first no-cost lane.

## File map

- Create: `design/audio/sourced-v1/source-packs/` — downloaded archives,
  unpacked source files, and local license evidence.
- Create: `design/audio/candidates/sourced-v1/{sfx,beds}/` — 18 normalized
  review candidates; no runtime files.
- Create: `design/audio/qa/sourced-v1-pilot.json` — actual file metadata,
  source/license links, transforms, hashes, and pending listening states.
- Create: `design/audio/provenance/sourced-v1-asset-provenance.jsonl` — one
  provenance record per candidate plus source-pack records.
- Create: `design/audio/qa/sourced-v1-source-manifest.json` — downloaded
  archive inventory and license evidence.
- Modify: `design/audio/audition.html` — add `?revision=sourced-v1` with
  explicit source/provider/license labels and no autoplay.
- Modify: `design/audio/qa/execution-ledger.md` and
  `design/audio/qa/listening-review.md` — append-only checkpoint and open
  listening matrix.
- Do not modify: `design/audio/audio-catalog.json`, `design/audio/manifest.json`,
  `src/audio/`, `public/audio/`, progress-map/learning data, or unrelated dirty
  files.

## Acceptance gates

1. `curl` downloads succeed and each source has a captured URL, archive hash,
   license statement, and no-cost status.
2. The six cue identities have 3 candidates each (18 total) with actual
   `ffprobe` metadata and SHA-256 values.
3. Browser audition can explicitly play and stop every candidate without
   autoplay; refresh does not resume stale playback.
4. Every candidate remains `pending-human-listening`; no metadata or browser
   smoke test can mark it accepted.
5. Human review must still cover laptop/phone/headphones, low-volume fatigue,
   repeated one-shots, two music loops, mute/background/offline behavior, and
   license/attribution approval before runtime promotion.

## Recovery

Resume from `design/audio/qa/execution-ledger.md` and the sourced-v1 manifests.
If a source URL or license evidence changes, keep the downloaded artifact and
record a new revision instead of silently replacing the old candidate. If a
candidate is rejected by listening, keep it as rejected evidence and select a
new source file in a subsequent revision.

## Post-pilot selection checkpoint

After the initial pending-listening gate, the user selected one candidate per
pilot cue: `ui-tap=B`, `answer-correct=A`, `answer-retry=B`, `stamp-press=C`,
`pet-fox=B`, `music-home=B`. The selection is recorded in
`design/audio/qa/sourced-v1-selection.json` and six byte-identical pilot masters
are under `design/audio/masters/sourced-v1/`. This does not change the original
scope rule: `runtimePromotion=false`, `public/audio` remains untouched, and
device/mix/full-catalog/license gates remain open.
