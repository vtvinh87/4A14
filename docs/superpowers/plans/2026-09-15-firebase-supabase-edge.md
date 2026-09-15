# Firebase Hosting Spark + Supabase Edge API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the Học Vui Vite/PWA frontend from Firebase Hosting on the Spark plan and expose the existing account, parent-dashboard, profile, and learning API through one Supabase Edge Function backed by the existing private PostgreSQL schema.

**Architecture:** Firebase Hosting serves only `dist`; the browser calls `https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api` through a configurable `VITE_API_BASE_URL`; the Edge adapter translates Web `Request`/`Response` to the existing `createApp` contract; `server/app.ts` remains the source of route and authorization rules; the Edge function uses the least-privileged runtime database connection when configured and falls back to Supabase's server-provided database URL. The existing Netlify handler and local port 8888 path remain available for rollback.

**Tech Stack:** React 18, Vite 5, TypeScript 5, Vitest 2, Netlify Functions compatibility adapter, Deno/Supabase Edge Functions, `postgres` 3.4.9, Firebase Hosting configuration.

## Global Constraints

- Work only in `/Volumes/Pictures/Projects/Hoc_Vui/.worktrees/feat-firebase-supabase-edge` on branch `feat/firebase-supabase-edge`; do not modify the original checkout during implementation.
- Do not commit `.firebaserc` until an authenticated Firebase account and the exact target project have been confirmed.
- Never commit, print, or place a database password, connection URL containing a password, Supabase service-role/secret key, Firebase token, or real child data in the repository, browser bundle, test fixture, log, or deployment manifest.
- Keep `hoc_vui_private` server-only. The browser may receive only the opaque `accessToken` returned by the existing auth flow and public account/profile/dashboard data allowed by current routes.
- Preserve the current six-digit PIN rules, lockout/expiry/revocation/credential-version behavior, parent-grant scoping, and client-supplied-student-id rejection.
- Preserve `netlify/functions/api.ts`, `netlify.toml`, the local port-8888 LaunchAgent workflow, and same-origin cookie compatibility unless a test proves a shared runtime change is required.
- The public Firebase configuration may contain only `VITE_API_BASE_URL` and other non-secret build values. `HOC_VUI_DATABASE_URL`, `HOC_VUI_ALLOWED_ORIGINS`, cookie flags, and pool settings are function-side configuration.
- Every implementation task must add or update focused tests, run the smallest relevant test command, and leave the worktree inspectable for parent review. Subagents do not perform Git lifecycle actions.

## Task 1: Make the existing server contract runtime-neutral and add the Edge adapter

**Write set:** `server/runtime/env.ts`, `server/db/client.ts`, `server/app.ts`, `src/content/packages.ts`, `supabase/config.toml`, `supabase/functions/api/index.ts`, `supabase/functions/api/deno.json`, `supabase/functions/api/index.test.ts`, `server/app.test.ts`, `vite.config.ts`.

- [x] Add `getEnv(name: string): string | undefined` in `server/runtime/env.ts`. It must read `Deno.env.get` when running in Deno and `globalThis.process?.env` when running in Node, without evaluating an undeclared `process` identifier in Deno.
- [x] Update `server/db/client.ts` and `server/app.ts` to use `getEnv`. `databaseUrlFromEnv()` must resolve `HOC_VUI_DATABASE_URL`, then `DATABASE_URL`, then `DB_URL`, then `SUPABASE_DB_URL`; `createDbClient()` must keep `prepare: false`, pool max default `1`, `sslmode=require` detection, five-second connect timeout, and twenty-second idle timeout.
- [x] Add an exact-origin allowlist helper in `server/app.ts` using comma-separated `HOC_VUI_ALLOWED_ORIGINS`. `sameOrigin()` must continue accepting same-host/no-origin requests, accept a cross-origin write only when the complete origin is in that allowlist, and reject malformed or unlisted origins with the existing localized 403 response.
- [x] Add `accessToken: result.token` to successful student login, admin login, student PIN change, admin password change, parent unlock, and parent PIN change response bodies. Continue passing `publicSession()` so `session.token` and credential fields never appear. Do not add a token to `/api/auth/me`, dashboard, profile, learning, export, or reset responses.
- [x] Create `supabase/functions/api/index.ts` exporting named `handler(request: Request): Promise<Response>` and the Deno-supported default fetch contract `{ fetch: handler }`. It must parse JSON bodies, preserve query strings, lower-case/copy request headers, call `getDefaultApp().app.handle`, serialize the `AppResponse`, preserve `Set-Cookie` and `Cache-Control`, return JSON 503s without secrets on dependency failures, and close the app only when the adapter owns a disposable dependency. Do not call `Deno.serve` at module import because Vitest imports this module directly.
- [x] Handle `OPTIONS` in the adapter before route dispatch. Read `HOC_VUI_ALLOWED_ORIGINS`, return exact-origin CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Methods: GET,POST,PATCH,PUT,DELETE,OPTIONS`, `Access-Control-Allow-Headers: Authorization,Content-Type,X-Parent-Grant`, and `Vary: Origin`), and return 403 for an unlisted non-empty origin. A request without `Origin` remains usable for CLI/server smoke tests.
- [x] Add `verify_jwt = false` under `[functions.api]` in `supabase/config.toml`. Add the function-local Deno import map for `postgres` 3.4.9, use an explicit JSON import attribute in `src/content/packages.ts`, and make every reachable relative import strict-Deno compatible with explicit `.ts` extensions or narrowly scoped exact import-map entries. Do not enable `sloppy-imports` or rewrite tests/unrelated imports.
- [x] Add focused tests for the default fetch export contract, bearer authorization, token fields being present only in the intended auth responses, allowlisted/rejected origins, preflight headers, JSON body translation, query preservation, and error sanitization. Use memory repositories or fake app dependencies; do not connect to Supabase in unit tests.
- [x] Run `npm run typecheck:server`, `npm test -- --run server/app.test.ts`, and `deno check` against the Edge entrypoint with its import map. Resolve any Deno import/type issue without changing business rules.

## Task 2: Add cross-origin bearer transport to the browser client

**Write set:** `src/auth/apiClient.ts`, `src/auth/apiClient.transport.test.ts`, `src/vite-env.d.ts`.

- [x] Add the public `VITE_API_BASE_URL` lookup and join it with `/api/*` paths without producing a double slash. An empty/missing value must preserve relative local/Netlify requests.
- [x] Maintain a module-level `sessionToken` initialized from `sessionStorage.getItem('hoc_vui_session_token')` when available. Wrap storage access so privacy mode, SSR, and test environments do not throw.
- [x] On every request, send `Authorization: Bearer <sessionToken>` when present, retain `credentials: 'include'`, and send `X-Parent-Grant` only when a parent wrapper explicitly requests it. Never persist `parentGrantToken`.
- [x] When a successful response contains a string `accessToken`, replace the stored session token. Clear it on logout, credential-change calls, and the existing expired/forbidden `/api/auth/me` path; a network failure must not silently erase a valid token.
- [x] Preserve all exported wrapper signatures and result shapes used by the React app. Extend only the auth-result types needed to carry `accessToken`; keep `ClientSession` free of the raw token.
- [x] Add tests covering URL joining, bearer headers after login, session-storage reload behavior, parent-grant memory-only behavior, token replacement after PIN/password change or parent unlock, and logout/expired-session cleanup. Reset storage and mocked fetch between tests.
- [x] Run `npm test -- --run src/auth/apiClient.transport.test.ts src/auth/apiClient.profile.test.ts` and `npm run typecheck`.

## Task 3: Add Firebase Hosting configuration and a validation command

**Write set:** `firebase.json`, `scripts/validate-firebase-hosting.mjs`, `package.json`.

- [x] Add `firebase.json` with `hosting.public = "dist"`, ignores for `firebase.json`, dotfiles, and `node_modules`, a catch-all SPA rewrite to `/index.html`, a no-cache header for `/sw.js`, and immutable one-year headers for hashed `*.js` and `*.css` assets.
- [x] Do not add Firebase Functions, Firestore, Firebase Auth, a wildcard API rewrite, or a project id to the hosting config.
- [x] Add `scripts/validate-firebase-hosting.mjs` that parses `firebase.json`, asserts the public directory and SPA rewrite, checks that Service Worker and hashed-asset headers are present, and exits non-zero with a clear message for an invalid configuration. It must not require Firebase CLI or network access.
- [x] Add `validate:firebase` to `package.json` pointing to that script without changing existing scripts or dependencies.
- [x] Run `npm run validate:firebase` and inspect the resulting JSON/config diff.

## Task 4: Document safe environment, secrets, deployment, and rollback

**Write set:** `.env.example`, `README.md`, `docs/deployment/firebase-supabase-edge.md`.

- [x] Document `VITE_API_BASE_URL`, `HOC_VUI_ALLOWED_ORIGINS`, `HOC_VUI_DATABASE_URL`, `SUPABASE_DB_URL`, `HOC_VUI_COOKIE_SECURE`, and `HOC_VUI_DB_POOL_MAX` with placeholders only. State explicitly that `VITE_*` values are public and all database/auth secrets are function-side.
- [x] Document the deploy order: authenticate/select the Firebase project, deploy the Supabase `api` function with `verify_jwt=false`, set exact allowed origins and least-privilege database secret through Supabase secrets management, smoke-test synthetic accounts, build with the Firebase API URL, deploy Hosting, and verify HTTPS/PWA/mobile behavior.
- [x] Document checks for login, bearer session after reload, logout, profile update, parent unlock/grant, dashboard read, one synthetic learning-event write, Service Worker, manifest/icons, and SPA deep links.
- [x] Document rollback by redeploying the last known-good Edge function and Firebase Hosting release or rebuilding with the previous API base URL. Explicitly state that no reset, data import, or real child-data migration is part of this rollout.
- [x] Update the README's current-state wording so it no longer implies that Firebase/Edge configuration is absent, while keeping the local Netlify fallback instructions.
- [x] Run a repository search confirming no password-like value or production connection string was added.

## Task 5: Parent verification and deployment gates

**Owner:** parent task only; do not delegate external writes or Git lifecycle actions.

**Deployment-compatibility fix:** make the dependency graph reachable from `supabase/functions/api/index.ts` resolvable by strict Deno/Supabase bundling. Relative production imports in the approved server/shared/content/game/progress/analytics write set use explicit `.ts` extensions; no tests or unrelated graph are mechanically rewritten.

> Local implementation and verification are complete. Managed deployment is complete for the approved `4A14` projects: Supabase `api` is active and Firebase Hosting is live. The remaining operator action is a credentialed smoke with a known synthetic Admin credential; no credential guessing or real student-data operation was performed.

- [x] Review each task's diff against its write set and inspect all generated/config files.
- [x] Run fresh gates from the feature worktree: `npm test`, `npm run typecheck`, `npm run typecheck:server`, `npm run validate:firebase`, `npm run validate:fox`, and `npm run build`.
- [x] Run `deno check --config supabase/functions/api/deno.json supabase/functions/api/index.ts` and `npm run check:edge-runtime` without sloppy-import compatibility. The runtime smoke must start `deno serve` on the real Edge entrypoint with a dynamically selected localhost port, send an allowlisted `OPTIONS` that cannot initialize the database, assert HTTP 204 plus exact credentialed CORS headers, and terminate the exact child process with a non-zero result on startup, HTTP, or cleanup failure. If Supabase CLI authentication is available and deployment is separately authorized, deploy only the `api` function to project ref `tvlpabqkternfvsxqovi`; otherwise report the exact authentication/approval gate without weakening local verification.
- [x] If Firebase CLI authentication and an approved target project are available, run a preview/deploy of Hosting only. Otherwise leave `.firebaserc` uncommitted and report the exact project-selection gate.
- [x] Verify the built bundle contains the configured public API base URL but no database URL, password, service-role key, or runtime-role credential.
- [x] Record the final commit hash, test output summary, deployment URLs/status, and any remaining operator action. Keep Netlify/local 8888 rollback path available.

## Execution order

Implement Task 1 and Task 2 sequentially because they share the auth response contract. Task 3 can run in parallel with Task 1 because its write set is independent. Task 4 follows the final interfaces from Tasks 1–3. Task 5 is the parent-only review, verification, and deployment gate.
