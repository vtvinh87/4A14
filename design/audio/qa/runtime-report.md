# Audio runtime QA report — A3/A4/A5

## Current runtime state

- `src/audio/manager.ts` giữ nguyên API `play('tap'|'success'|'hint')`, nhưng có semantic `playCue`, manifest-gated fetch/decode, bus gain, one-shot/bed tách riêng, event-key TTL/cooldown/priority policy, owner-generation và visibility invalidation.
- `src/audio/preferences.ts` lưu audio preferences device-local tách khỏi progress schema. Master/SFX giữ tương thích; music, ambience và notifications mặc định tắt.
- `src/audio/runtime-manifest.generated.ts` hiện có 6 entry local `runtimeMode=pilot`; production design manifest vẫn có 0/67 accepted. Đây là intentional safety gate: không có candidate nào tự động trở thành production acceptance.
- Khi entry được accepted và promotion hợp lệ, generated manifest sẽ đưa URL `/audio/v1/...` vào manager và Vite offline precache. Riêng local pilot hiện có 6 MP3 dưới `public/audio/v1/`, được tách trạng thái khỏi production acceptance.

## Semantic mapping implemented

- legacy `tap` → `ui-tap`, `success` → `answer-correct`, `hint` → `learning-hint`.
- lesson start → `lesson-start`.
- answer feedback → `answer-correct` hoặc `answer-retry` sau state transition, không phát khi answer invalid/poll/render.
- hint → `learning-hint` sau state transition.
- mission-complete → `lesson-complete` trên transition sang `lessonComplete`.
- birthday celebration → `birthday` với event key theo account.
- Settings preview → selected pilot `answer-correct` while sourced-v1 local pilot is active.
- Pet direct tap → motif theo selected Pet ID (`pet-fox`/`pet-elephant`/`pet-owl`/`pet-dragon`); idle speech/mood không phát motif.
- Friends conversation: `message-send` chỉ sau API send thành công; `message-receive` chỉ sau conversation rehydrate thấy message mới từ friend, không initial snapshot.
- Challenge: `challenge-submit` sau API save thành công; attempt result maps to correct/retry only when non-duplicate/non-practice/non-voided; positive reaction sau API confirmation.
- Các cue cần event verification trước mapping (`landmark-open`, `item-unlock`, `class-milestone`, `ambience-evening`) được ghi deferred trong provenance/manifest; không tự bịa trigger.

## Automated gates

- `npm run validate:audio`: PASS; 38 logical cue, 67 manifest entry, 0 accepted, 0 validation failure.
- Manager regression: legacy mute, hidden/dispose, slow decode invalidation, offline fetch fail-closed, bounded decoded cache, pending-bed invalidation.
- Browser audition smoke: local HTTP server loaded the page, showed 38 cues/67 pending entries, played a real `ui-tap__v01.wav` URL after an explicit click, reached `readyState=4`, and the stop button halted playback. This is runtime/browser evidence, not human listening evidence.
- `npm run typecheck`: PASS; `npm run typecheck:server`: PASS; `npm test -- --run --reporter=dot`: 134 files passed, 7 skipped; 626 tests passed, 10 skipped; `npm run build`: PASS; `git diff --check`: PASS.

## Known limits

- Không có listening evidence của người thật nên không claim audio quality, gapless loop, mix loudness hoặc 90-point pass.
- Safari iOS/iPadOS/device playback chưa verified trong session.
- Runtime offline/cache acceptance cho compressed public assets chưa thể chứng minh với 0 accepted asset; chỉ có code path và automated fail-closed test.
- Progress-map topic/landmark calls remain deferred because this audio task did not modify the other task's progress-map write-set; no new map trigger was invented.

## 2026-09-20 local sourced-v1 pilot runtime addendum

- At the user's explicit request, `src/audio/runtime-manifest.generated.ts` now contains six local entries marked `runtimeMode: "pilot"` and `listeningStatus: "pending-human-listening"`. The production design manifest remains at `0 accepted / 67 entries`; pilot runtime status is intentionally separate from production acceptance.
- Six real MP3 assets are served from `/audio/v1/` and included in the local offline cache contract: `ui-tap`, `answer-correct`, `answer-retry`, `stamp-press`, `pet-fox`, and `music-home`. `npm run build:audio-pilot-runtime` regenerates them from the selected sourced-v1 masters and writes `design/audio/qa/sourced-v1-runtime-pilot.json` plus runtime provenance.
- Current game mapping: legacy tap uses the selected `ui-tap`; answer feedback uses selected correct/retry; a newly granted stamp uses `stamp-press`; Fox direct tap uses `pet-fox`; settings preview uses selected `answer-correct`; home music uses `music-home` only when Journey is visible and the user has opted into music. The audio manager still fails closed for pending non-pilot entries, and existing learning/progress behavior is unchanged.
- Technical runtime checks passed: all six URLs returned `200` with `audio/mpeg` from `127.0.0.1:8888`; production build output contained all six files and all six offline URLs; full tests/typechecks/validator passed. This is transport/runtime evidence, not listening evidence.
- Human/device QA is still required for actual quality and behavior: listen in the game, check mute, tab background/return, first-load/offline after caching, music opt-in, volume balance and loop seam. Do not change `listeningStatus` or production accepted counts from this addendum alone.

## Sourced-v2 full candidate audition — 2026-09-20

- `design/audio/qa/sourced-v2-candidates.json`: `67/67` normalized candidates present; `61` are new target files and `6` are regenerated derivatives of the user's sourced-v1 selections.
- `design/audio/qa/sourced-v2-source-manifest.json`: `68` source/archive records, all `CC0`, all `costUsd=0`; no payment/account/API/credential path used.
- Browser audition at `127.0.0.1:4173` rendered `38/38` cues and `67` candidates, supports lane filtering, explicit Play/Stop, source/license labels, and pending status. A real candidate fetched/decode-loaded at `readyState=4`; it was stopped and cleared successfully.
- This is candidate/audition evidence only. Nothing from sourced-v2 is in `public/audio` or the runtime manifest yet; `design/audio/manifest.json` remains `acceptedEntries=0`. Runtime integration waits for human selection and then the mute/background/offline gates.
- No progress-map, learning-data, permission/auth or unrelated owner path was changed.

## Sourced-v2 full local runtime pilot — 2026-09-20

- Runtime builder: `scripts/build-sourced-v2-runtime.mjs`.
- Manifest: `src/audio/runtime-manifest.generated.ts` now contains the catalog's `67` unique `id:variant` entries in catalog order. Six entries retain their existing `/audio/v1/` URLs; the remaining `61` use real `/audio/v2/` MP3 outputs.
- Pilot QA: `design/audio/qa/sourced-v2-runtime-pilot.json`; provenance: `design/audio/provenance/sourced-v2-runtime-pilot.jsonl`. Every entry is `runtimeMode=pilot` and `listeningStatus=pending-human-listening`; production accepted count remains `0`.
- Offline integration: `vite.config.ts` reads both v1 and v2 local pilot manifests. The production accepted list still comes only from `design/audio/manifest.json`, and music/ambience/notifications remain opt-in/off by default in the existing preferences contract.
- Focused technical QA: runtime manifest, offline contract and manager regression tests pass (`25/25`). Live HTTP GET from `127.0.0.1:8888` checked all `67/67` URLs: `200`, `audio/mpeg`, non-empty response; total served bytes `8,469,063`. No AppleDouble sidecars are present in `public/audio/v2/`.
- Port 8888 browser smoke: the real game shell/login page is visible on `http://127.0.0.1:8888/`. Authentication was not attempted; therefore semantic in-game clicks and human listening still require the user to test with their local account.
- Mute/background/offline behavior remains technically guarded by the existing `AudioManager` tests: muted state stops voices, hidden state stops/suspends and invalidates stale decode, disposal stops all, and offline fetch fails closed. The dev server itself does not register the production Service Worker, so offline-cache acceptance requires a production preview after first load.

This report is a local integration handoff, not an audio-quality or release acceptance claim. No commit, push or deploy was performed.

## 2026-09-20 silent localhost diagnosis and fix

- Symptom: the local game at `127.0.0.1:8888` showed enabled sound preferences and non-zero volumes, but the user heard no cue from the settings preview.
- Root cause: `src/App.tsx` disposed the shared `AudioManager` in an effect cleanup. React StrictMode replays that cleanup during development while the component remains mounted, leaving the manager permanently disposed; `playCue()` and `unlockFromGesture()` then fail closed before fetching an MP3.
- Fix: cleanup now stops voices and removes listeners, while `dispose()` is reserved for `pagehide`. `src/App.test.ts` contains a regression test that renders `App` under `StrictMode` and asserts that the manager is not disposed during effect replay.
- Browser/runtime verification after the fix: settings showed feedback/music/ambience/notifications enabled with master `0.72` and SFX `0.71`; explicit `Nghe thử âm đã chọn` interaction was accepted by the live game. The pre-cleanup same-browser trace recorded `disposed=false`, `AudioContext.state=running`, and `/audio/v2/sfx/answer-correct__v03.mp3`; the standalone manager diagnostic recorded `200 audio/mpeg`, successful decode and an active voice. The app now runs without debug instrumentation.
- Current technical boundary: all `67/67` runtime URLs still return `200` non-empty `audio/mpeg` bytes, but browser/API evidence cannot prove that a human heard the output. Human confirmation and mute/background/offline/device checks remain open; production accepted entries remain `0`.
