# Học Vui — Full Sourced Audio Coverage Design

**Date:** 2026-09-20  
**Status:** Approved design; implementation in progress only after this checkpoint  
**Revision:** `sourced-v2-full`

## Goal

Bổ sung đầy đủ audio còn thiếu trong catalog Học Vui bằng các asset nguồn công
khai có license và chi phí rõ ràng, giữ sáu pilot `sourced-v1` đang chạy được,
để có một local runtime pilot đủ 67 entry mục tiêu mà không làm thay đổi
progress-map, learning data, permission data hoặc business logic học tập.

## Baseline and scope

- Catalog hiện có 38 cue logic và 67 entry/variant mục tiêu.
- `sourced-v1` đang có 6 runtime pilot entry: `ui-tap`, `answer-correct`,
  `answer-retry`, `stamp-press`, `pet-fox`, `music-home`, mỗi cue mới có v01.
- Cần thêm 61 file để phủ đủ catalog: 32 cue logic còn thiếu và các variant
  còn thiếu của sáu pilot.
- `design/audio/manifest.json` vẫn là production design manifest với
  `acceptedEntries=0`; runtime pilot không được đổi số accepted.
- Các cue chỉ được nối vào event đã tồn tại và đã xác minh. Cues không có event
  thật vẫn được source/audition/provenance nhưng phải ghi `deferred`, không tạo
  feature hoặc trigger mới.

## Architecture

`sourced-v2-full` là một revision immutable riêng, gồm source-pack registry,
candidate derivatives, selected masters, QA manifest và JSONL provenance. Các
asset đã được hash/probe và được user duyệt nghe có thể được encode vào local
pilot runtime với `runtimeMode: "pilot"`; chúng không được coi là production
accepted cho đến khi có listening/device evidence và license sign-off.

The runtime keeps the existing `AudioManager.play('tap'|'success'|'hint')`
compatibility layer, semantic cue IDs, master/SFX/music/ambience buses,
fail-closed fetch/decode behavior, hidden-tab invalidation and device-local
preferences. Music, ambience and notification remain opt-in/off by default.

## Asset lanes

| Lane | Cues | New files | Runtime policy |
| --- | --- | ---: | --- |
| Core UI/learning | `ui-confirm`, `ui-back`, `page-turn`, `map-unfold`, `map-select`, `landmark-open`, `answer-select`, `learning-hint`, `match-connect`, `lesson-complete`, `collection-open`, `lesson-start`, `ui-toggle` | 25 | Enable only at verified UI/lesson transitions |
| Reward/social/Pet | `item-unlock`, `challenge-submit`, `class-milestone`, `reaction-positive`, `message-send`, `message-receive`, `pet-elephant`, `pet-owl`, `pet-dragon`, `birthday` | 19 | Keep notifications opt-in; defer absent backend/event paths |
| Music/ambience | `music-map`, `music-focus`, `music-cooperate`, `ambience-garden`, `ambience-mountain`, `ambience-coast`, `ambience-forest`, `ambience-river`, `ambience-evening` | 9 | Optional beds; never block learning; `ambience-evening` remains deferred if Pet rest state is absent |
| Existing pilot variants | missing v02/v03 for the six sourced-v1 cues | 8 | Preserve the user-selected v01 choices and source records |

## Source and licensing strategy

1. Mine the already audited Kenney, Dustyroom and OpenGameArt source packs before
   downloading duplicate material.
2. Add only source pages/archives whose license evidence is explicit. CC0 is the
   default; CC-BY is allowed only when attribution is captured in the manifest
   and delivery notes. No account, API key, paid service, donation or trial.
3. Preserve the original archive/file, URL, retrieval date, archive SHA-256,
   source SHA-256, license text/page and transform command.
4. Reject files with unclear provenance, recognizable copyrighted melodies,
   voices, harsh/punitive feedback, 8-bit/retro character, or poor fit. A
   source-gap is reported rather than filled with a synthetic beep.

## Candidate and runtime flow

```text
source audit → download/hash/license ledger → normalize/probe
    → candidate manifest + audition page → human selection
    → selected masters → local pilot runtime → technical/device QA
```

The audition page remains explicit-play/no-autoplay and shows cue, variant,
source, license, transform and pending/selected status. Candidate metadata,
waveforms, peak and duration never count as listening evidence.

## QA and acceptance

- Asset QA: every target file exists, is non-empty, hash-stable, AppleDouble-free,
  decodes with `ffprobe`, matches bus/channel/sample-rate targets and has a
  provenance record.
- Candidate QA: correct semantic identity, safe retry tone, no harsh transient,
  no dead air/tail cut, no copyrighted melody, and loop seam checked over at
  least two loops before any selected bed is called usable.
- Runtime QA: six existing pilots remain functional; newly selected entries are
  fetchable over localhost, fail closed on offline/decode failure, respect mute,
  master/bus volume, hidden/background transitions and optional preferences.
- Product boundary: no progress-map, learning, permission or unrelated dirty
  file changes; no commit/push/deploy in this work session.
- Final human/device evidence must still cover laptop, phone/headphones,
  repeated one-shots, low-volume fatigue, mute, background/return, offline
  after first load and music/ambience loop behavior.

## Recovery

Resume from `design/audio/qa/execution-ledger.md`,
`design/audio/qa/sourced-v2-full.json` and
`design/audio/provenance/sourced-v2-full.jsonl`. Never overwrite `sourced-v1`
selection or runtime records. If a source URL/license changes, create a new
revision and retain the old evidence.
