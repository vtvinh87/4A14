# PIN 6 ô và PWA install surface — Design

Date: 2026-09-14  
Status: `IMPLEMENTED — local verification recorded`  
Scope: local Học Vui app; no cloud deployment, Git lifecycle or production acceptance.

## Goal

Make every Học Vui PIN flow feel like a short numeric code entry on mobile, while
preserving the existing account boundaries and server validation. Add the missing
browser install contract so the app can be installed as a PWA on Android and iOS,
with a small icon family that remains legible at favicon size and safe inside
maskable launcher crops.

## Chosen approach

### PIN input

Keep one semantic, controlled input per PIN field and render six square cells from
its value. This gives screen readers one labelled field, keeps paste/autofill and
backspace behavior predictable, and avoids synchronizing six independent inputs.
The native input remains `type="password"` so digits are not exposed on screen;
it uses `inputMode="numeric"`, `pattern="[0-9]*"`, `maxLength={6}`, and the
appropriate `autocomplete` value (`current-password` or `new-password`). The
change/paste path strips all characters outside ASCII `0–9` and preserves leading
zeroes. Existing submit buttons and server-side PIN rules remain the source of
truth; the UI does not auto-submit at six digits.

The six cells show an empty square or a masked filled dot, have a clear focus
state, and expose the existing Vietnamese label/error text. The component is used
unchanged by student login, student PIN change, parent unlock, first parent PIN
change, and parent PIN change.

### PWA installation

Use the existing custom production-only service worker; do not add a PWA plugin.
Add `public/manifest.webmanifest` with Vietnamese name/short name, `id`, `/`
scope/start URL, `standalone` display, `any` orientation, theme/background colors,
and 192px/512px icons including a maskable purpose. Link the manifest and favicon
from `index.html`, and add Android/iOS-capable metadata plus the 180px Apple touch
icon. Add the manifest and icon URLs to the existing offline precache list so the
install surface and launcher assets are local after a successful shell cache.

Expose a small install affordance in the existing settings/data surface: use the
browser `beforeinstallprompt` flow when available, show a concise iOS
“Share → Add to Home Screen” instruction when appropriate, and otherwise leave
the browser's native install menu as the fallback. The install helper is
client-only and must not affect login, progress or offline readiness.

### Icon family

Generate one square master bitmap in the established Học Vui direction: friendly
orange fox face, teal scarf, small gold compass accent, deep teal/navy solid
background, soft toy-like 3D lighting, no text, no watermark. Keep the subject
inside the maskable safe zone with generous padding. Derive, without changing the
art, the following local assets:

- `favicon-32.png` (and a 48px source if useful for browser tabs);
- `icon-180.png` for iOS;
- `icon-192.png` for the manifest;
- `icon-512.png` and `icon-512-maskable.png` for install/launcher variants.

The generated master is an app icon, not a replacement for the existing fox,
brand plaque or lesson artwork. Existing artwork and layout assets remain intact.

## Boundaries and failure handling

- No account/API/schema changes; a six-digit client value is still validated by
  the existing server contract.
- Non-numeric keyboard input, drag/drop and paste are sanitized before state is
  committed; leading zeroes are valid display values.
- A PIN shorter than six digits keeps the submit path disabled or returns the
  existing validation message, matching the current flow.
- If an install prompt is unavailable, no false “installed/offline” status is
  shown. iOS receives instructions rather than a synthetic prompt.
- The service worker stays production-only and versioned. The manifest and icon
  requests must not introduce `/api/` URLs into the offline manifest.
- Generated bitmap assets are visually inspected at large and small sizes before
  acceptance; no checkerboard/RGB transparency artifact is accepted.

## Verification plan

1. Add focused tests before implementation for six-cell rendering, numeric
   attributes, masking, non-numeric sanitization, leading zeroes and all PIN
   consumers.
2. Add manifest/install-contract tests for required fields, icon sizes/purposes,
   index metadata and service-worker precache registration.
3. Run targeted RED/GREEN tests, then the full Vitest suite, client/server
   typechecks and production build.
4. Run the localhost browser smoke at 390px and desktop widths; inspect PIN
   focus/error behavior and verify no horizontal overflow.
5. Inspect generated icon files, check dimensions/alpha/background consistency,
   request each manifest/icon URL over localhost, and confirm the offline
   manifest contains no API endpoint.

## Out of scope

Native store packaging, push notifications, background sync, cloud deployment,
real-device acceptance, production signing and any change to P9 remain out of
scope.
