# Audio listening review — A1/A2

Status: `PENDING_HUMAN_LISTENING`

Đây là review record chưa hoàn tất. Không có human/device listening evidence trong session này; không chấm 90-point rubric, không đánh dấu `accepted`, không encode/publish runtime asset.

## Audition surface

- Local page: `design/audio/audition.html`
- Serve from repo root để tránh policy chặn `file://`:
  `python3 -m http.server 4173 --directory /Volumes/Pictures/Projects/Hoc_Vui`
- Mở: `http://127.0.0.1:4173/design/audio/audition.html`
- Organic pilot mới: `http://127.0.0.1:4173/design/audio/audition.html?revision=organic-v2`
- Có thể dùng `afplay design/audio/masters/...wav` cho spot-check; command thành công vẫn không thay thế reviewer evidence.
- Trang không autoplay, có stop/volume/loop count, hiển thị candidate status và nhắc rằng metadata không phải listening pass.

## Pilot matrix

| Cue | Candidate evidence | Raw/mix listening | Decision |
| --- | --- | --- | --- |
| `ui-tap` | candidate-a/b cho mỗi 3 variant | Chưa review | pending |
| `answer-correct` | candidate-a/b cho mỗi 3 variant | Chưa review | pending |
| `answer-retry` | candidate-a/b cho mỗi 2 variant | Chưa review | pending |
| `stamp-press` | candidate-a/b cho mỗi 2 variant | Chưa review | pending |
| `pet-fox` | candidate-a/b cho mỗi 3 variant | Chưa review | pending |
| `music-home` | candidate-a/b | Chưa review; loop seam chưa được nghe | pending |

Full inventory: 67/67 master có file và manifest metadata hợp lệ; tất cả đang `pending-human-listening`. Master hiện là bản copy cơ học của `candidate-a`, không phải lựa chọn nghe duyệt.

## Organic-v2 pilot matrix

Đây là revision thử nghiệm mới sau khi batch legacy bị reviewer reject vì cảm giác quá cũ. Mỗi logical cue hiện có một representative variant v01 và ba candidate để A/B/C; không suy rộng kết quả này cho các variant còn lại.

| Cue | Candidate evidence | Raw/mix listening | Decision |
| --- | --- | --- | --- |
| `ui-tap` | candidate-a/b/c · material contact/felt/resonance/room | Chưa review | pending |
| `answer-correct` | candidate-a/b/c · warm resonance/felt/room | Chưa review | pending |
| `answer-retry` | candidate-a/b/c · paper/felt/resonance/room | Chưa review | pending |
| `stamp-press` | candidate-a/b/c · pressure/contact/paper/resonance/room | Chưa review | pending |
| `pet-fox` | candidate-a/b/c · felt/resonance/air/room | Chưa review | pending |
| `music-home` | candidate-a/b/c · stereo air/brush/percussion/resonance/room | Chưa review; loop seam chưa được nghe | pending |

Organic manifest: `design/audio/qa/organic-v2-pilot.json`; actual WAVs nằm dưới `design/audio/candidates/organic-v2/` và master so sánh dưới `design/audio/masters/organic-v2/`. Không có organic-v2 file trong `public/audio` và không có URL runtime.

Technical browser evidence: local `organic-v2` page rendered six cues and 18 candidate buttons; explicit Play showed a real WAV playing and Stop showed `Đã dừng`. This verifies the audition harness only, not sound quality or human listening.

## Sourced-v1 pilot matrix

Đây là revision tải từ nguồn bên ngoài sau khi organic-v2 bị reviewer reject vì cảm giác quá tệ/lạc hậu. Mỗi cue có ba candidate thật; các bản gốc và bằng chứng license nằm dưới `design/audio/sourced-v1/source-packs/`. User đã chọn một candidate cho mỗi cue; đây mới là pilot selection, chưa phải runtime acceptance.

| Cue | Candidate evidence | Raw/source listening | Decision |
| --- | --- | --- | --- |
| `ui-tap` | Kenney click · OpenGameArt UI click · Dustyroom SFX | User chọn candidate B; device/mix chưa review | selected |
| `answer-correct` | Kenney confirmation x2 · Dustyroom SFX | User chọn candidate A; device/mix chưa review | selected |
| `answer-retry` | Kenney question x3 | User chọn candidate B; punitive-character gate vẫn mở | selected |
| `stamp-press` | Dustyroom tactile candidates x2 · Kenney drop | User chọn candidate C; stamp identity gate vẫn mở | selected |
| `pet-fox` | Kenney pluck x2 · Dustyroom SFX | User chọn candidate B; nonverbal-personality gate vẫn mở | selected |
| `music-home` | OpenGameArt calm theme · simple loop · calm track, each excerpted to 48s | User chọn candidate B; loop seam chưa được nghe đủ | selected |

Sourced audition: `http://127.0.0.1:4173/design/audio/audition.html?revision=sourced-v1`. Candidate manifest: `design/audio/qa/sourced-v1-pilot.json`. Source/license manifest: `design/audio/qa/sourced-v1-source-manifest.json`. Tại checkpoint lựa chọn ban đầu chưa có sourced-v1 file trong `public/audio` và chưa có URL runtime; sau đó local pilot đã được nối theo addendum bên dưới.

Sourced-v1 technical smoke has verified file existence/metadata and explicit browser Play/Stop routing. User selection is the listening decision for this six-cue pilot, but it does not establish final loudness, device coverage, loop-seam quality, full-catalog suitability, or runtime acceptance.

Selection record: `design/audio/qa/sourced-v1-selection.json`; selected pilot masters: `design/audio/masters/sourced-v1/`; provenance: `design/audio/provenance/sourced-v1-selection.jsonl`.

## Reviewer record cần bổ sung

Mỗi candidate/variant cần ghi: reviewer, UTC timestamp, browser/device, output path, raw vs in-app mix, rubric điểm 1–5 cho identity/mood/clarity/click-free/loudness/fatigue, loop boundary với bed, và decision `accepted`/`reject`/`revise` cùng lý do. Không được suy ra decision từ peak/duration/hash.

Các gate đặc biệt:

- One-shot: không click, không tail bị cắt, không harsh transient, không punitive/error-shaming.
- Bed: nghe ít nhất hai vòng, kiểm tra seam và mệt tai; không claim seamless từ sample statistics.
- Mix: master volume, SFX, music/ambience, notification; music/ambience/notification phải giữ opt-in.
- Accessibility: mute phải im lặng tức thì; hidden/background không resume stale sound; offline không làm hỏng learning flow.

## Current decision

`legacy accepted=0/67`, `organic-v2 accepted=0/18`, `sourced-v1 pilot-selected=6/18`, `runtime accepted=0`, `mobile listening=NOT VERIFIED`. Các trường `peakDbTP`, `measuredLufs` và loop sample boundaries còn null có lý do trong manifest, không điền giá trị đoán.

## Local runtime pilot addendum — 2026-09-20

The six user-selected sourced-v1 masters are now wired into the local game runtime for user testing only. Runtime files and provenance are recorded in `design/audio/qa/sourced-v1-runtime-pilot.json` and `design/audio/provenance/sourced-v1-runtime-pilot.jsonl`; all six remain `pending-human-listening`, and `design/audio/manifest.json` remains `acceptedEntries=0`.

The local test must still provide the missing listening evidence: in-game identity/clarity and non-punitive retry tone, master/SFX/music balance, mute immediacy, background/return invalidation, offline-after-first-load, and at least two music loop passes. Technical fetch/decode/build evidence does not substitute for those observations.

## Sourced-v2 full coverage — 2026-09-20

Audition: `http://127.0.0.1:4173/design/audio/audition.html?revision=sourced-v2-full`.

The full sourced revision contains `67` candidate entries across `38` cues. It is organized into the UI/learning, reward/social/Pet, and music/ambience lanes; the source map also records the eight missing variants for the six previously selected pilot cues. The source pack/license evidence is in `design/audio/qa/sourced-v2-source-manifest.json`; per-target provenance is in `design/audio/provenance/sourced-v2-asset-provenance.jsonl`.

| Lane | Candidate entries | Human/device listening | Decision |
| --- | ---: | --- | --- |
| UI / learning | 35 | Chưa review | pending |
| Reward / social / Pet | 22 | Chưa review | pending |
| Music / ambience | 10 | Chưa review; loop seam chưa nghe | pending |
| Full revision | 67 | Chưa review | pending |

The full lane counts above include the four existing core-cue selections, the Fox selection in the Pet lane and the home-music selection in the bed lane. The *missing-gap* counts remain 25 core UI/learning, 19 reward/social/Pet, 9 music/ambience and 8 existing-pilot variants. All rows use explicit Play/Stop and source/license links; the page does not autoplay. `design/audio/qa/sourced-v2-selection.json` is the resume ledger and currently has `selectedEntries=0`.

High-risk listening gates remain explicit: generic UI files must not sound interchangeable or harsh; the `winfretless` CC0 jingle is only a candidate for complete/milestone/birthday and may be rejected for retro or overly triumphant character; creature files must be child-safe and non-scary; `ambience-coast` uses a short wave source repeated to the target audition length and therefore requires two-pass seam review; music/ambience beds remain opt-in/off by default.

Technical browser evidence is not a listening pass: before the first explicit click the audio element was paused with no source; representative SFX, reward, Pet, notification and bed candidates reached `readyState=4`; Stop paused and cleared the source. No reviewer score or accepted status is inferred from that evidence.

## Sourced-v2 full local runtime pilot — 2026-09-20

The user authorized the complete sourced-v2 candidate set to be available in the game on `http://127.0.0.1:8888` for local testing. This is not a listening acceptance: all `67/67` entries remain `pending-human-listening`, and `design/audio/manifest.json` remains at `acceptedEntries=0`.

The runtime contains the six previously selected sourced-v1 outputs plus 61 newly encoded sourced-v2 MP3s. The local pilot manifest is `design/audio/qa/sourced-v2-runtime-pilot.json`; output/source hashes and license/cost provenance are in `design/audio/provenance/sourced-v2-runtime-pilot.jsonl`. Technical HTTP evidence confirms every URL returns non-empty `audio/mpeg` bytes on port 8888, but it says nothing about identity, fatigue, mix, loop seams or device playback quality.

Human review still needs to cover the actual game flow, especially retry tone non-punitiveness, Pet personality, generic UI differentiation, notification opt-in, music/ambience opt-in, mute immediacy, hidden/background return, and at least two passes of each bed. Safari/iOS/iPadOS and physical speakers remain unverified. No acceptance status should be changed from this pilot integration alone.

## 2026-09-20 silent localhost diagnosis

Follow-up user evidence: the user explicitly reported “Tôi đã test thử âm thanh đã ok rồi.” This confirms audible local playback after the lifecycle fix. It does not by itself supply a per-variant/device/mute/background/offline/loop-seam review, so production acceptance fields remain unchanged.

The first user test of the full local pilot was silent despite enabled settings. This was an app lifecycle defect, not evidence that the sourced files were absent: React StrictMode replay disposed the `AudioManager` before the settings preview could fetch/decode the selected MP3. The fix is covered by an App-level StrictMode regression test and the local runtime was retested after the fix.

The retest proves the browser reached an unlocked `AudioContext`, selected a real v2 MP3 and completed the manager's fetch/decode/start path in the same browser session. It still does not constitute human listening evidence. The user must confirm audible output and separately review cue identity, retry tone non-punitiveness, mix/volume, mute immediacy, background/return, offline-after-first-load, device output and at least two passes of each bed loop. Keep all 67 entries at `pending-human-listening` and keep production accepted count at `0` until that review is recorded.
