# PIN 6 ô và PWA install surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay toàn bộ ô nhập PIN của Học Vui bằng giao diện sáu ô vuông chỉ nhận chữ số, đồng thời bổ sung manifest, install surface và bộ icon PWA/favicon dùng được trên thiết bị di động.

**Architecture:** Tách `PinField` thành component dùng một input semantic được che bằng CSS và sáu ô hiển thị dẫn xuất từ value, để giữ paste/autofill/backspace/accessibility ổn định. Giữ service worker tự viết hiện tại, thêm manifest/icon vào metadata và danh sách precache; một `PwaInstallCard` client-only xử lý `beforeinstallprompt`, `appinstalled` và hướng dẫn iOS mà không ảnh hưởng auth/progress.

**Tech Stack:** React + TypeScript, CSS hiện hữu, Vitest + jsdom, Vite custom build plugin/service worker, ImageGen cho master bitmap và `sips`/công cụ ảnh hệ thống để xuất các kích thước PNG.

## Global Constraints

- PIN dùng một input semantic cho mỗi trường và hiển thị sáu ô vuông; không đồng bộ sáu input độc lập.
- Input PIN giữ `type="password"`, dùng `inputMode="numeric"`, `pattern="[0-9]*"`, `maxLength={6}` và `autocomplete` phù hợp (`current-password` hoặc `new-password`).
- Luồng change/paste chỉ giữ ASCII `0–9`, giữ nguyên số `0` ở đầu và không tự submit khi đủ sáu số.
- Component PIN phải được dùng cho đăng nhập học sinh, đổi PIN học sinh, mở Góc phụ huynh, đổi PIN phụ huynh lần đầu và đổi PIN phụ huynh trong Dashboard; mật khẩu Admin vẫn là field password thông thường.
- Dùng service worker tự viết hiện tại; không thêm PWA plugin. Service worker chỉ đăng ký ở production.
- Manifest dùng `standalone`, `any` orientation, `scope: "/"`, `start_url: "/"`, tên/ngôn ngữ tiếng Việt và icon 192px/512px có maskable purpose.
- Manifest, favicon, Apple touch icon và PWA icons phải nằm trong precache hiện hữu; offline manifest không được có URL `/api/`.
- Icon master dùng cáo cam, khăn teal, compass vàng nhỏ, nền teal/navy đặc, không chữ/không watermark, subject nằm trong maskable safe zone; không thay thế artwork hiện hữu.
- Không thay đổi account/API/schema; PIN sáu số vẫn do server contract xác nhận.
- Không cloud deployment, native store packaging, signing, real-device acceptance hoặc P9; checkout hiện tại non-Git nên không commit/branch/worktree lifecycle.

---

### Task 1: Shared six-cell PIN field

**Files:**
- Create: `src/components/PinField.tsx`
- Create: `src/components/PinField.test.tsx`
- Modify: `src/views/AuthView.tsx`
- Modify: `src/views/AuthView.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces `sanitizePin(value: string): string`, which returns `value.replace(/[^0-9]/g, '').slice(0, 6)`.
- Produces `PinField({ id, label, value, onChange, autoFocus?, autoComplete? }: { id: string; label: string; value: string; onChange: (value: string) => void; autoFocus?: boolean; autoComplete?: 'current-password' | 'new-password' | 'one-time-code' })`.
- The rendered input keeps the supplied `id` and `name`, while the six visual cells expose `data-pin-cell="1"` through `data-pin-cell="6"` and remain `aria-hidden="true"`.
- Consumers continue reading form values by their existing names: `auth-pin`, `new-pin`, `confirm-pin`, `parent-pin`, `current-parent-pin`, `new-parent-pin`, and `confirm-parent-pin`.

- [x] **Step 1: Write the failing component tests.**

  Add tests that render `PinField` with `value="012"`, then assert exactly six cells, three filled cells, a password input, `inputmode="numeric"`, `pattern="[0-9]*"`, `maxlength="6"`, and the requested autocomplete value. Dispatch an input containing `12a3456` and assert the callback receives `123456`; render `value="012345"` and assert the leading zero is represented by the first filled cell. Also assert the label remains associated with the input through `for`/`id`.

  Add consumer assertions in `src/views/AuthView.test.tsx` that the student login, change-PIN view, parent unlock dialog and parent-PIN-change dialog expose the six-cell field and the correct `current-password`/`new-password` attributes. Keep the existing submit assertions for `012345` and matching replacement PINs.

- [x] **Step 2: Run the focused tests and verify the expected RED state.**

  Run:

  ```bash
  npx vitest run src/components/PinField.test.tsx src/views/AuthView.test.tsx --reporter=dot
  ```

  Expected result before implementation: the new component import/render assertions fail because `src/components/PinField.tsx` and the six-cell markup do not exist; existing unrelated tests must not be used to hide that failure.

- [x] **Step 3: Implement the smallest shared component.**

  In `src/components/PinField.tsx`, sanitize values at the change boundary and render one labelled password input over a visual six-cell row. Use this shape so the input remains the only semantic control:

  ```tsx
  const digits = sanitizePin(value);
  return (
    <label className="auth-field pin-field" htmlFor={id}>
      <span>{label}</span>
      <span className="pin-field-control">
        <span className="pin-cells" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span className={`pin-cell${index < digits.length ? ' is-filled' : ''}`} data-pin-cell={index + 1} key={index}>
              {index < digits.length ? '•' : ''}
            </span>
          ))}
        </span>
        <input
          id={id}
          name={id}
          className="pin-field-input"
          type="password"
          inputMode="numeric"
          autoComplete={autoComplete ?? 'current-password'}
          maxLength={6}
          pattern="[0-9]*"
          value={digits}
          onChange={(event) => onChange(sanitizePin(event.currentTarget.value))}
          autoFocus={autoFocus}
        />
      </span>
    </label>
  );
  ```

  Use `:focus-within` on `.pin-field-control` for the visible focus state. Keep the input stretched across the control with opacity/positioning only; do not use `display: none` or `visibility: hidden`, so keyboard, autofill and screen readers continue to target it.

- [x] **Step 4: Replace every AuthView-local PIN field with the shared component.**

  Import `PinField`, remove the local function, and pass explicit autocomplete values:

  ```tsx
  <PinField id="auth-pin" label="Mã PIN 6 số" value={secret} onChange={setSecret} autoComplete="current-password" />
  <PinField id="new-pin" label="Mã PIN mới" value={nextPin} onChange={setNextPin} autoComplete="new-password" autoFocus />
  <PinField id="confirm-pin" label="Nhập lại mã PIN mới" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
  <PinField id="parent-pin" label="Mã PIN phụ huynh" value={pin} onChange={setPin} autoComplete="current-password" autoFocus />
  <PinField id="current-parent-pin" label="PIN phụ huynh hiện tại" value={currentPin} onChange={setCurrentPin} autoComplete="current-password" autoFocus />
  <PinField id="new-parent-pin" label="PIN phụ huynh mới" value={nextPin} onChange={setNextPin} autoComplete="new-password" />
  <PinField id="confirm-parent-pin" label="Nhập lại PIN mới" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
  ```

  Leave the Admin password field unchanged. Keep form submit validation through `validatePin`, so incomplete values still receive the existing six-digit error and no PIN flow auto-submits merely because six cells are filled.

- [x] **Step 5: Add responsive PIN styling and run the focused GREEN check.**

  Add styles near the existing auth field rules: six equal cells with a minimum 44px touch-sized control, compact gaps at 390px, filled dots, a high-contrast focus ring, and no horizontal overflow. Then run:

  ```bash
  npx vitest run src/components/PinField.test.tsx src/views/AuthView.test.tsx --reporter=dot
  ```

  Expected result: all PIN component/consumer tests pass and the existing submit/leading-zero behavior remains green.

---

### Task 2: Browser install surface

**Files:**
- Create: `src/pwa/install.ts`
- Create: `src/pwa/install.test.ts`
- Create: `src/components/PwaInstallCard.tsx`
- Create: `src/components/PwaInstallCard.test.tsx`
- Modify: `src/components/SettingsDialog.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces `DeferredInstallPromptEvent`, `isStandaloneDisplay()`, and `isIosDevice()` from `src/pwa/install.ts`.
- `PwaInstallCard` listens for `beforeinstallprompt` and `appinstalled` only in an effect, exposes an install button only after a deferred prompt is captured, and never reports installation unless standalone mode or `appinstalled` is observed.
- SettingsDialog remains compatible for all current callers; it renders the install card without requiring auth/API callbacks.

- [x] **Step 1: Write the failing install tests.**

  In `src/pwa/install.test.ts`, test that `isStandaloneDisplay()` returns true for a matching `(display-mode: standalone)` media query and that `isIosDevice()` recognizes iPhone/iPad user agents without claiming a desktop browser.

  In `src/components/PwaInstallCard.test.tsx`, render the card in jsdom, dispatch a synthetic `beforeinstallprompt` event with `preventDefault`, `prompt`, and `userChoice`, then assert the install button appears and calls `prompt`. Dispatch `appinstalled` and assert the card changes to the installed state. Render with an iPhone user agent and assert the card says to use Share → Add to Home Screen; assert no “đã cài” text appears before either standalone detection or `appinstalled`.

- [x] **Step 2: Run the focused tests and verify RED.**

  Run:

  ```bash
  npx vitest run src/pwa/install.test.ts src/components/PwaInstallCard.test.tsx --reporter=dot
  ```

  Expected result before implementation: module/behavior assertions fail because the install helpers and card do not exist.

- [x] **Step 3: Implement platform detection and deferred prompt handling.**

  Define the browser event contract without adding a dependency:

  ```ts
  export type DeferredInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  };
  ```

  Implement `isStandaloneDisplay()` using `matchMedia('(display-mode: standalone)')` plus Safari’s `navigator.standalone`, and `isIosDevice()` using iPhone/iPad/iPod user-agent checks plus the touch-enabled iPadOS desktop-user-agent fallback. `PwaInstallCard` should call `event.preventDefault()`, retain the event, call `await event.prompt()` only from the button click, await `userChoice`, clear the retained event after the choice, and set installed only from `appinstalled`/standalone detection.

- [x] **Step 4: Mount the card in SettingsDialog and style all states.**

  Add `<PwaInstallCard />` below the existing settings list/status and before the logout button. Provide three honest states:

  ```tsx
  {installed && <p>Học Vui đã được cài trên thiết bị này.</p>}
  {!installed && promptEvent && <button type="button">Cài Học Vui</button>}
  {!installed && !promptEvent && isIos && <p>Trên iPhone/iPad: chạm Chia sẻ → Thêm vào Màn hình chính.</p>}
  {!installed && !promptEvent && !isIos && <p>Mở menu trình duyệt để chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.</p>}
  ```

  Keep the card keyboard accessible, ensure the button is at least 48px high, and make its text wrap at 390px. Do not show “offline ready” or “installed” merely because the browser lacks an install event.

- [x] **Step 5: Run install and settings tests GREEN.**

  Run:

  ```bash
  npx vitest run src/pwa/install.test.ts src/components/PwaInstallCard.test.tsx src/components/settings-dialog.test.ts --reporter=dot
  ```

  Expected result: detection, prompt, iOS fallback, honest installed-state and existing settings behavior all pass.

---

### Task 3: Web App Manifest, metadata and offline precache

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `src/pwa/manifest.test.ts`
- Modify: `index.html`
- Modify: `vite.config.ts`
- Modify: `src/pwa/offline.test.ts`

**Interfaces:**
- `public/manifest.webmanifest` is served at `/manifest.webmanifest` and contains the install contract consumed by browsers.
- `vite.config.ts` adds `LOCAL_PWA_URLS` and `LOCAL_PWA_VERSIONS`, includes the URLs in `precacheUrls`, and includes version entries in the versioned cache-name fingerprint.
- Existing `createServiceWorkerSource` semantics remain unchanged: production-only registration, versioned cache and no `skipWaiting`/reload behavior.

- [x] **Step 1: Write failing manifest and precache tests.**

  Add raw-source tests that parse the manifest and require:

  ```ts
  expect(manifest.name).toContain('Học Vui');
  expect(manifest.lang).toBe('vi');
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('any');
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
    expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
  ]));
  ```

  Also assert `index.html` links `/manifest.webmanifest`, `/icons/favicon-32.png` and `/icons/icon-180.png`, declares theme/mobile metadata, and the Vite source contains every PWA URL plus a 64-hex version entry. Extend `src/pwa/offline.test.ts` to build a worker with PWA URLs and assert the worker contains them and does not contain `/api/`.

- [x] **Step 2: Run the manifest tests and verify RED.**

  Run:

  ```bash
  npx vitest run src/pwa/manifest.test.ts src/pwa/offline.test.ts --reporter=dot
  ```

  Expected result before implementation: manifest import/field assertions and PWA precache assertions fail because the manifest, links and PWA allowlist do not yet exist.

- [x] **Step 3: Add the manifest and document metadata.**

  Create `public/manifest.webmanifest` with this exact contract:

  ```json
  {
    "id": "/",
    "name": "Học Vui – Lịch sử & Địa lí 4",
    "short_name": "Học Vui",
    "lang": "vi",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "orientation": "any",
    "theme_color": "#0d6f7a",
    "background_color": "#082f49",
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
  }
  ```

  Add to `<head>` in `index.html`: manifest link, 32px favicon, 180px Apple touch icon, matching `theme-color`, `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, and a Vietnamese description. Keep existing title/script links intact.

- [x] **Step 4: Register the PWA assets in the existing build plugin.**

  Add the exact PWA URL array in `vite.config.ts`:

  ```ts
  const LOCAL_PWA_URLS = [
    '/manifest.webmanifest',
    '/icons/favicon-32.png',
    '/icons/icon-180.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-512-maskable.png',
  ];
  ```

  Add one `LOCAL_PWA_VERSIONS` entry for each URL using the exact 64-character SHA-256 printed by `shasum -a 256` after Task 4 creates the assets, in the same `path:digest` format used by the existing art/font version arrays. Include `...LOCAL_PWA_URLS` in `precacheUrls` and `LOCAL_PWA_VERSIONS.join('|')` in the cache-name fingerprint. Keep the existing art/font arrays and lesson outputs unchanged.

- [x] **Step 5: Run the manifest/offline tests GREEN.**

  Run:

  ```bash
  npx vitest run src/pwa/manifest.test.ts src/pwa/offline.test.ts --reporter=dot
  ```

  Expected result: manifest fields, HTML metadata, icon URL registration, versioned precache and `/api/` exclusion all pass.

---

### Task 4: Học Vui favicon and launcher icon family

**Files:**
- Create: `public/icons/hoc-vui-icon-master.png`
- Create: `public/icons/favicon-32.png`
- Create: `public/icons/icon-180.png`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-512-maskable.png`
- Create: `public/icons/README.md`
- Modify: `vite.config.ts` (add the final PWA asset digests)

**Interfaces:**
- The master is the visual source of truth for all derived PNGs and is square, opaque, and safe for maskable cropping.
- All served icons are PNGs with exact dimensions matching their filenames; no generated icon contains text, watermark or checkerboard transparency.
- `icon-512-maskable.png` uses the same master artwork and safe-zone composition as the regular launcher icon; only the output filename/purpose differs.

- [x] **Step 1: Generate and inspect the master bitmap.**

  Use the image generation tool with a prompt equivalent to:

  ```text
  Square 1024x1024 mobile app icon for a Vietnamese children's learning adventure app named Học Vui. A friendly joyful orange fox mascot seen from the chest up, large expressive eyes, warm cream muzzle, teal explorer scarf, a tiny gold compass accent near the scarf, centered inside a generous circular safe zone. Solid deep teal-to-navy background with subtle soft radial lighting, polished toy-like 3D illustration, crisp silhouette at tiny sizes, premium but playful, no text, no letters, no watermark, no border, no UI button, no map or detailed scenery, subject fully inside the central 80 percent safe area.
  ```

  Save the result as `public/icons/hoc-vui-icon-master.png`, then inspect it at full size and at 32px. If the output has fake checkerboard transparency, text, clipping or an unsafe edge crop, regenerate before deriving sizes.

- [x] **Step 2: Derive the fixed-size PNGs from the accepted master.**

  Use an image tool that preserves the square crop and sRGB color profile (on this macOS checkout, `sips` is the default) to write all five derivatives. The source remains unchanged:

  ```bash
  sips -z 32 32 public/icons/hoc-vui-icon-master.png --out public/icons/favicon-32.png
  sips -z 180 180 public/icons/hoc-vui-icon-master.png --out public/icons/icon-180.png
  sips -z 192 192 public/icons/hoc-vui-icon-master.png --out public/icons/icon-192.png
  sips -z 512 512 public/icons/hoc-vui-icon-master.png --out public/icons/icon-512.png
  sips -z 512 512 public/icons/hoc-vui-icon-master.png --out public/icons/icon-512-maskable.png
  ```

  Confirm dimensions and file type with `sips -g pixelWidth -g pixelHeight -g format` for every derivative. Visually inspect `favicon-32.png`, `icon-192.png` and both 512px files; the fox must remain centered and recognizable with no changed artwork between variants.

- [x] **Step 3: Record the asset contract and hashes.**

  Add `public/icons/README.md` documenting the master/derived relationship, exact dimensions, maskable safe-zone intent and that the master is not a replacement for existing `public/art` assets. Calculate SHA-256 for the six PWA-served files and write those six digests into `LOCAL_PWA_VERSIONS` in `vite.config.ts`.

- [x] **Step 4: Run the icon contract tests.**

  Run:

  ```bash
  npx vitest run src/pwa/manifest.test.ts src/pwa/offline.test.ts --reporter=dot
  ```

  Expected result: all URL/version, manifest and precache assertions pass using real icon files.

---

### Task 5: Cross-surface verification and audit checkpoint

**Files:**
- Create: `docs/executor/PIN-PWA-ICONS-AUDIT.md`
- Modify: `docs/superpowers/specs/2026-09-14-pin-pwa-icons-design.md` (set approved/implemented status only after evidence)

**Interfaces:**
- The audit records commands, exit status, test count, browser viewport evidence, icon dimensions, manifest HTTP status, service-worker/offline boundary and explicit limitations.
- No audit statement may claim real-device installation, production signing, cloud deployment or P9.

- [x] **Step 1: Run focused and full automated verification.**

  Run the focused suite first:

  ```bash
  npx vitest run src/components/PinField.test.tsx src/views/AuthView.test.tsx src/pwa/install.test.ts src/components/PwaInstallCard.test.tsx src/components/settings-dialog.test.ts src/pwa/manifest.test.ts src/pwa/offline.test.ts --reporter=dot
  ```

  Then run the full suite and both typechecks:

  ```bash
  npm test -- --reporter=dot
  npm run typecheck
  npm run typecheck:server
  ```

  Record the actual file/test totals and all exit codes; do not copy historical counts from the accounts-dashboard audit.

- [x] **Step 2: Build and verify production PWA outputs.**

  Run `npm run build`, then assert the build contains `manifest.webmanifest`, `sw.js`, all six served PWA assets and `offline-manifest.json`. Scan `dist` for credential/database/hash strings and scan `dist/offline-manifest.json` plus `dist/sw.js` for `/api/`; both scans must be empty. Validate the icon dimensions again from `dist/icons/`.

- [x] **Step 3: Run localhost HTTP and browser checks.**

  With the existing local Netlify/Vite server, request `/`, `/manifest.webmanifest`, `/icons/favicon-32.png`, `/icons/icon-180.png`, `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-512-maskable.png` and `/offline-manifest.json`, recording HTTP 200 and content types. In the browser at 390×844 and a desktop viewport, inspect one login PIN field and one parent PIN dialog: six cells, numeric keyboard attributes, leading-zero display, focus ring, no horizontal overflow. Open Settings and verify the honest install fallback/prompt state without changing auth/progress.

- [x] **Step 4: Write the audit and update the approved checkpoint.**

  Record PASS/FAIL evidence in `docs/executor/PIN-PWA-ICONS-AUDIT.md`, including that service worker registration remains production-only and real-device acceptance is not covered. Only after all required checks pass, update the spec status to `IMPLEMENTED — local verification recorded`; otherwise record the exact gap and leave the status as an implementation checkpoint.

- [x] **Step 5: Final review without Git lifecycle actions.**

  Re-read the plan/spec against the changed files, ensure no source artwork outside `public/icons/` was overwritten, ensure no AppleDouble files were introduced in the new icon/test directories, and leave the local server available for user review. Do not commit, push, deploy or claim production acceptance.
