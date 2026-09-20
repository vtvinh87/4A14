# Học Vui Organic Audio Pilot — Design Spec

## Status

Approved design direction: Organic modern / phương án A.

This spec replaces the current pilot for listening purposes only. Existing
generated candidates remain preserved as rejected comparison evidence; they are
not deleted, promoted, or silently overwritten.

## Problem

The current procedural batch is technically valid but sounds like a simple
1990s game. Its additive sine/harmonic layers, periodic bed texture, and
limited material modelling do not communicate the production bible's intended
wood/paper/felt tactility or modern warmth.

The next batch must improve perceived material, depth, and repeat comfort before
any catalog expansion or runtime promotion.

## Goal

Create a new six-cue pilot that feels organic, contemporary, warm, and suitable
for primary-school learning. The pilot must be strong enough for human A/B
listening review before the remaining 61 catalog variants are attempted.

## Non-goals

- No paid provider, registration, new credential, or external audio API.
- No claim of professional recorded foley if the source is locally synthesized.
- No changes to progress-map data, learning permissions, business logic, or
  unrelated task-owned files.
- No changes to production `src/audio` integration or `public/audio` until the
  pilot receives explicit listening acceptance.
- No deletion of the rejected legacy batch.

## Sound-design direction

The generator will be revised toward physically-informed, material-first sound:

- use short filtered contact transients rather than a dominant pure oscillator;
- use softly inharmonic resonant modes with varied damping to suggest wood,
  paper, felt, rubber, and small room reflections;
- use restrained micro-variation in articulation and resonance, not random
  runtime pitch changes;
- add only very short diffuse early reflections where they increase depth;
- remove fixed arpeggio behavior, periodic harmonic beds, hard-quantized note
  attacks, metallic glitter, harsh high tones, and obvious 8-bit signatures;
- keep one-shots mono-compatible and beds stereo only where it improves space;
- keep all layers quiet enough for repeated listening and preserve the existing
  master/music/ambience preference semantics.

## Pilot identity map

| Cue | Intended identity | Guardrail |
| --- | --- | --- |
| `ui-tap` | Tiny rounded wood/felt contact, nearly unpitched | No mouse click, bubble pop, or sharp snap |
| `answer-correct` | Two warm resonant tones with a natural bloom | Calm confirmation, not a victory jingle |
| `answer-retry` | Soft paper/cloth brush with a neutral settling gesture | Never punitive, alarming, or descending-sad |
| `stamp-press` | Rubber/wood pressure transient against paper | Weight without a bass thump or cartoon boing |
| `pet-fox` | Small soft brush/paw-like material movement | No animal vocalisation or distress |
| `music-home` | Sparse warm acoustic-like texture with evolving air | No 1990s loop, obvious arpeggio, or final fade |

Each pilot cue receives three deterministic candidates. Candidate identity,
timing, approximate loudness, prompt, seed, command, tool version, and source
classification are recorded in provenance. The batch remains candidate-only.

## Audition and acceptance flow

1. Generate the six pilot cues into a new dated/revision-labelled candidate
   namespace without destroying the existing batch.
2. Render matching masters and update the local audition surface with an
   explicit revision label and A/B comparison.
3. Do technical checks for file existence, duration, sample rate, channels,
   clipping, and hashes.
4. Human reviewer listens to raw and in-app mix on laptop speakers,
   headphones, and a phone where available. One-shots are repeated ten times;
   the bed is looped ten cycles. Mute, background/resume, and offline behavior
   remain required runtime checks after integration, not evidence of sound
   quality by themselves.
5. Record per-candidate identity, event clarity, repeat comfort, artifact/seam,
   loudness, child appropriateness, device, timestamp, and decision in the
   listening report.
6. Only after explicit pilot acceptance may the design be extended to the
   remaining catalog. No `accepted` manifest entry or runtime URL is created
   by this pilot alone.

## Write-set and preservation boundary

The implementation write-set is limited to:

- `design/audio/tools/`
- a new revision-labelled area below `design/audio/candidates/`
- a new revision-labelled area below `design/audio/masters/`
- `design/audio/provenance/`
- `design/audio/qa/`
- `design/audio/audition.html` only for pilot selection/labeling
- this spec and the follow-up implementation plan

The implementation must not modify progress-map files, learning data, auth or
permissions, the existing runtime manifest, `public/audio`, or unrelated dirty
files.

## Verification gates

The pilot is not complete when files merely exist. It is ready for human review
only when all of the following are true:

- every pilot cue has three candidates and provenance;
- the generator reports the material layers used for each cue;
- no candidate is a simple beep or a copied legacy master;
- technical validation passes without guessed metadata;
- audition page can play and stop every pilot candidate without autoplay;
- listening report clearly remains `PENDING_HUMAN_LISTENING` until a human
  supplies device-level evidence.

