# Firebase Hosting Spark + Supabase Edge API Design

**Status:** Approved by the product owner on 2026-09-15.

## Goal

Deploy the Học Vui React/Vite PWA through Firebase Hosting on the Spark plan while moving the existing account, parent dashboard, profile, and learning API from the Netlify Function runtime to a Supabase Edge Function backed by the existing Supabase PostgreSQL database.

## Existing context

- The frontend is a Vite/React single-page application and already emits a versioned Service Worker and PWA assets during `npm run build`.
- The frontend currently calls relative `/api/*` paths from `src/auth/apiClient.ts`.
- The current production-shaped API entrypoint is `netlify/functions/api.ts`, which adapts a Netlify event to `server/app.ts`.
- `server/app.ts` owns the route contract, custom student/admin/parent session rules, cookie handling, profile routes, dashboard access, and learning synchronization.
- `server/auth/postgresRepository.ts` and `server/learning/postgresRepository.ts` read and write the private `hoc_vui_private` schema through a server-only PostgreSQL connection.
- The current checkout has no Firebase Hosting configuration and the Supabase CLI is not installed, while Deno is available locally.

## Decisions

### 1. Hosting and service boundaries

Firebase Hosting will serve only the built static application and PWA assets from `dist`. It will not host Firebase Functions, Cloud Run, Firestore, or Firebase Auth. The API will be available at the Supabase Edge Function endpoint:

```text
https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api
```

The application remains database-provider-neutral at the client boundary: the browser calls the API, and only the Edge Function talks to PostgreSQL. The browser never receives a database connection string, database password, service-role key, or runtime-role credential.

### 2. Edge Function runtime adapter

Create `supabase/functions/api/index.ts` with a Deno `fetch` handler. The adapter will:

1. Parse the incoming `Request` body as JSON when present.
2. Translate method, path, query string, headers, body, and bearer token into the existing `AppRequest` shape.
3. Call the existing `createApp` route dispatcher with the PostgreSQL repositories and learning service.
4. Translate `AppResponse` into a JSON `Response`, preserving status, cache, content type, and session headers.
5. Handle `OPTIONS` preflight requests before route dispatch.

The shared server modules will be changed only where required to run in both Node/Netlify and Deno: environment lookup, database client construction, and cryptography imports. Business rules and route paths remain in the existing server modules and continue to be covered by the current Vitest suite.

The Edge Function will use the Supabase-provided `SUPABASE_DB_URL` as a fallback and prefer a separately configured `HOC_VUI_DATABASE_URL` secret containing the least-privileged `hoc_vui_runtime` connection. The connection uses the transaction pooler, `sslmode=require`, `prepare=false`, and a small pool suitable for serverless invocations.

### 3. Authentication transport across origins

Firebase Hosting and the Supabase Function are different origins. The production browser transport will therefore use the existing opaque custom session token as a bearer credential:

- Successful student login, admin login, PIN/password change, and parent unlock responses include an `accessToken` field containing the newly created session token.
- `src/auth/apiClient.ts` stores that token in `sessionStorage` under `hoc_vui_session_token`, never in `localStorage`.
- Every API request sends `Authorization: Bearer <token>` when the session token exists.
- `X-Parent-Grant` remains page-memory-only and is never persisted.
- Logout, expired sessions, credential changes, and network-reset paths clear the browser session token.
- The existing HttpOnly cookie behavior remains available for same-origin local/Netlify development and backward compatibility, but Firebase production does not depend on third-party cookies.

The server already accepts bearer tokens through `sessionToken`; the change adds the response/client wiring and makes bearer behavior the portable production path. The custom session token is still hashed before database storage, and existing expiry, revocation, lockout, credential-version, parent-grant, and owner-scoping rules remain unchanged.

### 4. CORS and function authentication

The Edge Function will set CORS headers only for exact origins listed in the server-only `HOC_VUI_ALLOWED_ORIGINS` secret/config value. It will allow the methods used by the API and the headers `Authorization`, `Content-Type`, and `X-Parent-Grant`, and will return `Vary: Origin`.

Because Học Vui uses its own database-backed session rather than Supabase Auth JWTs, the function will set `verify_jwt = false` in `supabase/config.toml` and perform custom authentication inside `server/app.ts`. This is not an anonymous API: login routes are rate-limited by the existing credential lockout behavior, and every protected route still requires a valid custom session and the correct parent grant where applicable.

### 5. Firebase Hosting configuration

Add `firebase.json` with:

- `hosting.public = "dist"`;
- ignore rules for Firebase configuration, dotfiles, and `node_modules`;
- a fallback rewrite from unmatched paths to `/index.html` for SPA navigation;
- a no-cache header for `sw.js` so Service Worker updates are observed;
- long-lived immutable caching for hashed Vite assets.

The Firebase project ID will be supplied by the authenticated Firebase account at deployment time and will not be hardcoded into application code. A `.firebaserc` file may be generated only after the target project is confirmed.

### 6. Local and production configuration

`.env.example` will document:

- `VITE_API_BASE_URL` as a public, non-secret URL used by the browser;
- `HOC_VUI_ALLOWED_ORIGINS` as a server-only allowlist;
- `HOC_VUI_DATABASE_URL`, `HOC_VUI_COOKIE_SECURE`, and database pool settings as server/function configuration.

The public Firebase build must contain only the API URL and other non-secret build values. Supabase production secrets will be configured through Edge Function secrets management and never committed to Git.

### 7. Rollout and rollback

Rollout order:

1. Run all local tests and type checks.
2. Deploy the `api` Edge Function and configure its secrets.
3. Smoke-test login, bearer session refresh, logout, profile, parent unlock, dashboard, and one learning-event write using synthetic accounts only.
4. Build the frontend with the Supabase Function URL.
5. Deploy the Firebase Hosting release.
6. Verify PWA shell, Service Worker, API calls, and mobile-sized routes from the Firebase URL.

The current Netlify API remains intact during the first rollout. If the Edge API fails, roll back Firebase Hosting to its previous release or rebuild with the prior API base URL; no database reset or destructive rollback is part of this migration. Edge Function rollback uses the previously deployed function version or a redeploy from the last known-good commit.

## Acceptance criteria

- Firebase Hosting serves the production `dist` output and SPA routes without 404s.
- The PWA manifest, icons, Service Worker, local artwork, fonts, and lesson packages remain reachable over HTTPS.
- The browser uses the Supabase Edge Function URL for `/api/*` calls and sends a bearer token after login.
- Student, Admin, and parent-grant boundaries pass through the Edge adapter without accepting a client-supplied student ID.
- A page reload preserves the ordinary session through `sessionStorage`; closing the browsing context removes the token.
- Parent grant data remains memory-only and disappears after reload or logout.
- The Edge Function can connect to `hoc_vui_private` without exposing a credential to the client.
- `npm test`, `npm run typecheck`, `npm run typecheck:server`, `npm run build`, and Edge/Deno checks pass before deployment.
- No real child data is created, imported, or changed as part of deployment verification.

## Alternatives rejected

### Cross-origin HttpOnly cookies only

This keeps more of the current transport but relies on third-party cookie behavior between Firebase and Supabase, which is not reliable across Safari/iOS privacy settings and installed PWA contexts.

### Supabase Auth + Data API rewrite

This would provide a more platform-native JWT/RLS design but would require changing the custom six-digit student PIN, separate parent PIN, Admin flow, session semantics, and private-schema access model. It is outside this hosting migration.

