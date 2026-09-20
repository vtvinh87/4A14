# Complete local integration and release plan

**Goal:** Integrate existing missing modes into the canonical checkout, run the full build on localhost:8888, then commit/push/deploy to the established Firebase/Supabase targets under the user's explicit authorization.

**Architecture:** Preserve newer progress-map/audio/read-performance code. Port persistent student login from its approved design without replacing newer auth projections. Serve a production frontend locally with the established Edge API so local PWA and Realtime use the same implementation as production.

**Constraints:** Preserve learner data, authorization, parent grant lifetime and unrelated dirty files. No database resets or speculative migrations. Keep secrets outside tracked files/browser bundles. Human audio confirmation is recorded; physical Safari/mobile coverage is not fabricated.

## Tasks and ledger

- [x] Auth lane: integrate rememberDevice through LoginView, App, apiClient, server routes and auth service; regression-test 30-day/full-only/student-only, normal/provisional/admin TTL, storage fallback and invalidation. Exact lane write-set recorded in the subagent brief.
- [x] Parent: audit remaining old-branch changes and classify each as integrated, superseded or required. Add remember checkbox CSS; verify audio assets/provenance are publishable and release includes real MP3s.
- [x] Parent: configure production local frontend on 8888 with PWA enabled and established Edge API/realtime. Verify explicit origin allowlist, deployment project/ref and cloud feature flags using read-only probes before mutations.
- [x] Parent: run full tests, client/server typecheck, Edge runtime check, Firebase/audio validation and production build; independently review auth diff.
- [x] Parent: commit only reviewed app/assets/docs, push current branch, deploy Edge then both Firebase Hosting sites, verify deployed hashes, protected unauthorized behavior, PWA assets and runtime version.
- [x] Parent: restart the existing localhost service onto the production preview; verify login UI, service-worker/cache behavior where tools permit, audio and feature readiness. Record gaps rather than claim unsupported device tests.

### Fresh recovery verification (2026-09-20)

- Full test suite: `141` files passed, `7` skipped; `672` tests passed, `10` skipped. The skipped cases require a separate database and are not counted as passing.
- Build/runtime gates: server typecheck, production build, Edge runtime check, Firebase config, progress-map, Fox GLB and audio validators all passed. Audio validator reports `38` logical cues, `67` runtime entries, `0` listening-accepted entries; this is asset/runtime validation, not a claim of full human listening approval.
- Local production preview: launchd service restarted with the production build on `127.0.0.1:8888`; all `221` precache URLs, including `67` MP3s, returned `200` and matched `dist` bytes. Browser smoke reached Hành trình, Bài học, Nhận dấu, Pet, Bộ sưu tập, Thách đố, Bạn bè and Settings; captured console errors/warnings were empty. Existing inactive QA account was not reactivated, so fresh authenticated login/logout remains unclaimed.
- Agent recovery: Darwin's auth/audio changes and Pascal's review findings were verified from the working tree and focused tests; no duplicate agent or regeneration was started. The audio cross-bed cancellation and remembered-session-through-parent-PIN fixes are included.
- Release status at checkpoint: commit/push/Edge deploy/Firebase Hosting deploy remain the next release actions. Unrelated untracked load-performance evidence and `tmp/` remain untouched.

### Release evidence (2026-09-20)

- Commit `166dce7` was pushed to `origin/codex/bang-tien-bo` (`5c31403..166dce7`). The release includes the full sourced-audio provenance/candidate set and `67` runtime MP3s; no file larger than the repository upload limit was introduced.
- Supabase Edge function `api` deployed to project `tvlpabqkternfvsxqovi`. Firebase Hosting released both `a14-82a69` (`https://a14-82a69.web.app`) and `4a14` (`https://4a14.web.app`) from the same `dist` build.
- Live verification: both sites returned index, deep-link `/challenge`, SW and sampled MP3 `200`; the served bundle `index-8BQF_8ed.js` matched local `dist` SHA-256 `b83580b5a3db033d40ac7bbb1c5d54846573d6bfce659b432350d92a53654d93`; SW returned `no-cache, no-store, must-revalidate`.
- Live Edge verification: the four configured origins returned CORS `204` and allowed `Authorization,Content-Type,X-Parent-Grant,Idempotency-Key`; an invalid origin returned `403`; unauthenticated `/auth/me` returned `401`.
- A follow-up ledger-only commit/push is still required to persist this post-deploy evidence. No learner data, progress-map work, unrelated load-performance evidence or `tmp/` files were changed.

## Recovery identity

### Quota interruption recovery

- Resumed from existing dirty checkout at `5c31403`; no reset, regeneration or duplicate agents.
- Darwin `01a0bdf0-3ddb-7383-bbcc-2c471a69a678`: persisted student-login implementation/tests and bfcache audio lifecycle changes exist on disk. Continue remaining summary-query port and focused verification, not a fresh implementation.
- Pascal `01a0bdf5-e5e1-7123-b963-5882750c96de`: read-only review was interrupted; no completed review verdict has been received.
- Parent already verified Firebase/progress-map/fox and 67 sourced candidate files; legacy manifest validation passed with zero listening-accepted entries (not a listening pass). AdminView test passed. Full final verification remains pending until agents finish.
- Supabase configuration was already updated: challenge mode on, progress board true, allowed origins preserve both Firebase sites and localhost plus 127.0.0.1:8888. Function code and Hosting have NOT yet been deployed.
- Local service still has listeners 57959/58051, using pre-restart Vite dev. Netlify production-preview config is saved but needs a fresh production build and restart. Existing synthetic QA account is inactive; do not reactivate or alter learner accounts just to claim a smoke pass.
- Remaining release gates: review/fix, full tests/typechecks/build, local production-preview smoke, scoped commit/push, explicit-target Edge/Hosting deploy and hash verification.

### Integration audit and checks after recovery

- Old branch `547c306`: persistent student auth ported without replacing newer credential-free session context; admin immediate result merge and public summary query ported. Old roster bootstrap is superseded by current `listRoster` plus explicitly separate dialog-open roster/presence/realtime lifecycles.
- `b051cc9` Idempotency-Key CORS fix ported; `dd32d83` JSONB binding already present; `a40b8a3` modal portal and mobile username normalization ported. No wholesale stale-branch merge.
- Production preview now runs on the existing launchd service; localhost responses for index, bundle, SW, offline manifest and selected MP3 matched dist byte-for-byte. All 221 precache URLs returned 200, including all 67 runtime MP3s. This verifies asset availability, not a physical disconnected-device test.
- Browser preview shows the 30-day checkbox and no captured console errors. Previous browser session/tab did not survive the interruption; authenticated end-to-end browser smoke is therefore still a gap, not a pass.
- Independent Pascal review found two P2 defects: cross-bed generation cancellation and remembered TTL through mandatory parent PIN change. Audio was reproduced RED then corrected to per-bed generations and reviewed again; auth correction routed back to Darwin for regression and review.
- Preliminary full run: 140 files passed / 7 skipped, 664 tests passed / 10 skipped. Final run after review fixes is required below. Build warning: pre-existing chunks exceed 500 kB.
- No learner state was cleared, synthetic inactive account was not reactivated, and no DB migration was applied. Vendor license text stays byte-preserved (its original CRLF/trailing whitespace is not reformatted).

- Checkout: /Volumes/Pictures/Projects/Hoc_Vui; branch codex/bang-tien-bo; starting HEAD 5c31403.
- Existing audio/UI work remains dirty and must be included after review; deno.lock and unrelated load-performance evidence/tmp files are preserved unless individually required and verified.
- Expected targets from repository: GitHub vtvinh87/4A14; Firebase a14-82a69, sites 4a14 and a14-82a69; Supabase tvlpabqkternfvsxqovi / api. Verify live before deployment.
