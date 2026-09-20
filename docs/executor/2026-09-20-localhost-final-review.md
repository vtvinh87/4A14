# Localhost final-review checkpoint — 2026-09-20

> Historical checkpoint below describes the earlier dev-only review. The user subsequently authorized full integration and release. Current execution/recovery state is in `docs/superpowers/plans/2026-09-20-complete-local-release.md`; do not treat the old no-deploy/persistent-login-pending statements below as current release status.

## Serving identity and version audit

- Canonical checkout: `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`, HEAD `5c31403a00dc6b612f78a9be4269d6097edf15e0` plus uncommitted audio and local-review changes.
- Read-only `git ls-remote --heads origin` confirms the remote branch is also at `5c31403`; remote main remains `20adcd5` and the older performance/session branch remains `a40b8a3`. No pull, merge, reset, commit, push or deployment was performed.
- One launchd service `com.hoc-vui.localhost` owns Netlify Dev on 8888 and its Vite child on 4173. Both processes have the canonical checkout as cwd. Restarted the existing service after updating local environment configuration; replacement listener PIDs at verification were 57959 (8888) and 58051 (4173).
- 4173 is the frontend development server and also serves the audio audition HTML. It is not a second independent game release. 8888 adds the local API proxy. Other worktrees exist on disk but are not the two serving processes.
- SHA-256 comparisons of HTTP responses from both ports matched for App, API client, ChallengeDialog, ProgressBoardDialog, runtime audio manifest and styles. All six returned 200. Runtime audio manifest still contains 67 entries.
- Served API client reports `DEV=true`, `PROD=false`, `VITE_API_BASE_URL=""`; requests use the same-origin Netlify API. The local API uses the already configured Supabase database. This is not an isolated test database.

## Fixes made

- Missing `HOC_VUI_CHALLENGE_MODE` caused backend rollout to default to off. Added `[context.dev.environment]` in `netlify.toml` with challenge `on`, progress board `true`, and empty public API override.
- Resolved the config using the installed Netlify config library: dev contains both enabled flags; production does not inherit the new challenge flag. Startup log confirms all three dev values were injected.
- Version audit found UI fixes from `a40b8a3` absent from the canonical checkout. Ported only the approval dialog portal/viewport scrolling/frosted backdrop, visible disabled button state, and mobile username normalization in login/admin inputs. Existing current audio/styles/progress changes were preserved.
- The older branch's persistent 30-day sign-in and other auth/performance behavior were not copied wholesale over newer server/read-loading changes. An optional user question about including persistent sign-in is pending; current sign-in remains unchanged.

## Verification

- Live authenticated browser: Thach do opens, Today loaded class progress 0/60 and the empty question state; Mine showed existing questions and the creation form. No question was submitted by the agent. Full weekly/parent approval and write-flow acceptance is not inferred from this smoke.
- Regression tests for the imported UI fixes first failed (portal parent and two CSS contracts), then passed after the port.
- Focused suite: 51 passed. Final full suite: 139 files passed / 7 skipped; 644 tests passed / 10 skipped. Production build (including client typecheck), server typecheck and diff whitespace check passed. Existing bundle size warning remains.
- User confirmed local audio is now audible and OK. This is local listening confirmation, not a per-asset full device/loop/mix acceptance record.

## Explicit remaining differences

- Local Realtime Broadcast lacks its full configuration and returns unavailable; chat retains its existing polling fallback. No server secret was copied or newly provisioned.
- Vite dev does not register the production Service Worker, so this URL does not validate installed-PWA/offline behavior. No browser cache or learner storage was cleared, and no claim about absence of previously registered workers is made.
- Persistent sign-in from the separate old branch is not included pending the user's preference. The current checkpoint must not be described as every historical branch merged together.
- No learning data, permission bypass, progress-map logic, database migration, commit, push or deploy was introduced by this checkpoint.
