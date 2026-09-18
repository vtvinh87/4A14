# Bản đồ tiến bộ — modal chi tiết điểm dừng nhỏ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung modal phụ accessible cho ảnh của cả tám điểm dừng nhỏ, với ảnh dedicated phóng lớn và nội dung địa danh thân thiện, có nguồn, mà không thay đổi lesson progress, quyền truy cập hoặc bản đồ nền.

**Architecture:** `ProgressBoardDialog` sở hữu state/lifecycle/focus của modal phụ; `ProgressMapInfoPanel` chỉ render image trigger và phát sự kiện; `ProgressMapLandmarkImageModal` là component trình bày riêng. Nội dung fact nằm trong module typed riêng, còn tám landmark đều map tới asset dedicated runtime WebP.

**Tech Stack:** React 18/TypeScript, Vitest + React DOM test harness hiện có, CSS hiện hữu trong `src/styles.css`, built-in ImageGen, `sharp`, Vite offline precache, CUA local fixture.

## Global Constraints

- Phạm vi: đúng cả 8 điểm dừng nhỏ; không mở rộng sang gallery/carousel hoặc lesson flow.
- Giữ nguyên map master SHA256 `93bb877ea95e3cf02d8070f1b978f4772b471e430de3b1fb64a3e6e95eb785ba`, tỷ lệ/canvas/crop và hit-area đã được nghiệm thu.
- Không thay đổi business logic, dữ liệu lesson, quyền lesson, auth, API/server, cloud hoặc dữ liệu người học.
- Không dùng emoji, placeholder, chữ baked-in hoặc ảnh vùng gán thay cho ảnh dedicated của landmark.
- Kim Liên phải phân biệt Hoàng Trù là nơi sinh và cụm Làng Sen là nơi Người sống cùng gia đình 1901–1906; không viết sai hai địa điểm.
- Nội dung detail dùng xưng hô `tớ/cậu`, tối đa một đoạn dẫn 2–3 câu và ba fact bullets; mỗi entry có nguồn URL.
- Commit, push, deploy, PR và cleanup branch/worktree bị hoãn trong packet này; không thêm bước commit vào execution.
- Chỉ claim 95/100 hoặc `READY_FOR_REVIEW` sau screenshot app thật ở đủ `390x844`, `430x932`, `768x1024`, `1440x900`, `1180x700`, `844x390` và hard gates pass.
- Khi gián đoạn, đọc `design/progress-map/qa/execution-ledger.md`, `git status`, `git diff` và asset hashes trước; resume phase đầu tiên chưa hoàn thành, không regenerate asset đã accepted.

---

## File map trước khi sửa

- `src/components/progress/ProgressBoardDialog.tsx`: parent dialog, selection state, Escape ordering, focus trap.
- `src/components/progress/ProgressMapInfoPanel.tsx`: welcome/topic/landmark panel; hiện đang render landmark image trực tiếp.
- `src/components/progress/progressMapPresentation.ts`: asset registry, topic presentation và landmark-to-asset mapping.
- `src/components/progress/progressMapLandmarks.ts`: typed landmark ids/JSON-derived presentation.
- `src/components/progress/ProgressBoardDialog.test.tsx`: dialog lifecycle, focus, Escape, backdrop regression tests.
- `src/components/progress/ProgressMapInfoPanel.test.tsx`: panel branch and callback tests.
- `src/components/progress/progressMapPresentation.test.ts`: asset and landmark mapping tests.
- `src/components/progress/progressMapStyleContract.test.ts`: existing CSS/markup contract tests.
- `src/styles.css`: progress map panel/dialog responsive CSS.
- `src/pwa/offline.test.ts` and `vite.config.ts`: local art allowlist, hash and offline precache.
- `design/progress-map/supporting-art/`: ImageGen masters, candidates, manifest, generation log and contact sheet.
- `design/progress-map/qa/execution-ledger.md`: durable implementation/QA checkpoint.

## Interfaces produced for later tasks

Task 2 produces:

```ts
export type ProgressMapLandmarkDetail = {
  id: ProgressMapLandmarkId;
  lead: string;
  facts: readonly string[];
  sourceUrls: readonly string[];
};

export const PROGRESS_MAP_LANDMARK_DETAILS: readonly ProgressMapLandmarkDetail[];
export function getProgressMapLandmarkDetail(id: ProgressMapLandmarkId): ProgressMapLandmarkDetail;
```

Task 3 produces:

```ts
import type { RefObject } from 'react';

export type ProgressMapLandmarkImageModalProps = {
  landmark: ProgressMapLandmarkPresentation;
  detail: ProgressMapLandmarkDetail;
  modalRef: RefObject<HTMLElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};
```

Task 4 changes the panel callback to:

```ts
onOpenLandmarkImage: (landmarkId: ProgressMapLandmarkId, trigger: HTMLButtonElement) => void;
```

Task 5 consumes those interfaces and owns `landmarkImageOpen`, `landmarkImageTriggerRef`, `landmarkModalRef` and `landmarkModalCloseRef`.

---

### Task 1: Generate and register five missing dedicated landmark assets

**Files:**
- Create: `design/progress-map/supporting-art/masters/landmark-lung-cu.png`
- Create: `design/progress-map/supporting-art/masters/landmark-khue-van-cac.png`
- Create: `design/progress-map/supporting-art/masters/landmark-hue.png`
- Create: `design/progress-map/supporting-art/masters/landmark-tay-nguyen-rong-house.png`
- Create: `design/progress-map/supporting-art/masters/landmark-mekong-floating-market.png`
- Create: matching `candidates/*-v1.png` files when the ImageGen output is staged as a candidate.
- Create: matching `public/art/progress/support/*.webp` runtime files.
- Modify: `design/progress-map/supporting-art/generation-log.md`
- Modify: `design/progress-map/supporting-art/manifest.json`
- Modify: `design/progress-map/supporting-art/contact-sheet.png`

**Interfaces:**
- Consumes: accepted `desktop-concept.png`, map palette/material and existing supporting-art prompt contract.
- Produces: five accepted transparent RGBA masters and five 720×480 runtime WebP assets with manifest/hash records; Vite/offline registration is completed in Task 7.

- [ ] **Step 1: Stage the five exact ImageGen prompts before generating.**

Use one generation call per asset. Every prompt must include the existing shared constraints: warm hand-painted storybook atlas style, transparent alpha edges, 3:2 landscape composition, no text/logo/watermark/UI/map outline/emoji/child character, no invented hybrid landmark. Use these subject constraints:

| ID | Required recognizable subject | Explicit exclusions |
|---|---|---|
| `landmark-lung-cu` | Cột cờ Lũng Cú trên núi Rồng, green northern mountain slopes, restrained Vietnamese flag | no generic pagoda, no unrelated tower |
| `landmark-khue-van-cac` | Khuê Văn Các at Văn Miếu, red timber upper floor, pale supports, round openings, garden/lotus | no Huế gate, no Hoa Lư gate |
| `landmark-hue` | Ngọ Môn/imperial Huế gate, ochre/red roofs, quiet water/trees | no Khuê Văn Các, no Hội An shophouses |
| `landmark-tay-nguyen-rong-house` | high steep thatched roof of a communal nhà rông, Central Highlands plants and small gong accents | no generic stilt house, no caricature people |
| `landmark-mekong-floating-market` | Cái Răng-style floating market, two wooden boats, fruit, coconut palms, calm water | no land market, no city skyline |

- [ ] **Step 2: Generate each asset with built-in ImageGen and inspect it immediately.**

For each output, use `view_image` on the local result and reject/regenerate when the landmark is not recognizable, the alpha is fake, the edges are clipped, text appears, or an excluded landmark appears. Do not replace a rejected result with emoji or a CSS placeholder.

- [ ] **Step 3: Normalize masters and create runtime WebP.**

Keep accepted PNG masters in `design/progress-map/supporting-art/masters/`. Use the existing runtime contract: real alpha, 720×480 canvas, transparent painted edges, WebP output in `public/art/progress/support/`. Verify each with `sharp` metadata and `file` before registration.

- [ ] **Step 4: Add generation provenance and rebuild the contact sheet.**

Add five named sections to `generation-log.md` with references, prompt, acceptance result and output dimensions. Rebuild `contact-sheet.png` so all 19 accepted support assets are visible and labeled by the existing contact-sheet convention; inspect the result on `#fffbed`.

- [ ] **Step 5: Recalculate manifest bytes and hashes from files.**

Do not hand-invent values. Run the existing local metadata/hash routine or an equivalent Node + `sharp` check over all runtime files, then copy the measured `bytes`, `sha256`, `width`, `height`, `alphaVerified` and `status: "accepted"` records into `manifest.json`. Update `runtimeTotalBytes` from the measured sum and keep the existing 14 records unchanged except for the total if the new records are appended.

- [ ] **Step 6: Verify the asset packet before code mapping.**

Run:

```bash
node -e "const fs=require('fs'); const ids=['landmark-lung-cu','landmark-khue-van-cac','landmark-hue','landmark-tay-nguyen-rong-house','landmark-mekong-floating-market']; for (const id of ids) { if (!fs.existsSync('design/progress-map/supporting-art/masters/'+id+'.png') || !fs.existsSync('public/art/progress/support/'+id+'.webp')) process.exit(1); }"
git diff --check -- design/progress-map/supporting-art
```

Expected: exit 0, five masters and five runtime files present, no whitespace errors. Record the measured total/hash outcome in the ledger after the full packet passes.

---

### Task 2: Add source-backed detail data and map all eight landmarks to dedicated assets

**Files:**
- Create: `src/components/progress/progressMapLandmarkDetails.ts`
- Create: `src/components/progress/progressMapLandmarkDetails.test.ts`
- Modify: `src/components/progress/progressMapPresentation.ts`
- Modify: `src/components/progress/progressMapPresentation.test.ts`

**Interfaces:**
- Consumes: eight `ProgressMapLandmarkId` values from `progressMapLandmarks.ts` and five new runtime asset files from Task 1.
- Produces: complete `ProgressMapLandmarkDetail` registry and a presentation registry where every landmark has a `landmark-*` asset id.

- [ ] **Step 1: Write the failing content and mapping tests.**

Add tests with the exact eight IDs:

```ts
const landmarkIds = [
  'lung-cu', 'khue-van-cac', 'hoa-lu', 'kim-lien',
  'hue', 'hoi-an', 'tay-nguyen-rong-house', 'mekong-floating-market',
] as const;

it.each(landmarkIds)('has source-backed detail data for %s', (id) => {
  const detail = getProgressMapLandmarkDetail(id);
  expect(detail.id).toBe(id);
  expect(detail.lead.length).toBeGreaterThan(40);
  expect(detail.facts.length).toBeGreaterThanOrEqual(2);
  expect(detail.sourceUrls.length).toBeGreaterThanOrEqual(1);
});

it('keeps Kim Lien fact wording geographically precise', () => {
  const detail = getProgressMapLandmarkDetail('kim-lien');
  expect(detail.lead).toContain('quê hương');
  expect(detail.facts.join(' ')).toContain('1901–1906');
  expect(detail.facts.join(' ')).toContain('Hoàng Trù');
});

it('uses dedicated landmark art for all eight entries', () => {
  expect(PROGRESS_MAP_LANDMARK_PRESENTATIONS.map(({ assetId }) => assetId)).toEqual([
    'landmark-lung-cu', 'landmark-khue-van-cac', 'landmark-hoa-lu', 'landmark-kim-lien',
    'landmark-hue', 'landmark-hoi-an', 'landmark-tay-nguyen-rong-house', 'landmark-mekong-floating-market',
  ]);
});
```

- [ ] **Step 2: Run the focused tests to prove they fail for the missing registry/assets.**

Run:

```bash
npx vitest run src/components/progress/progressMapLandmarkDetails.test.ts src/components/progress/progressMapPresentation.test.ts --reporter=dot
```

Expected: FAIL because the detail module and five dedicated asset IDs do not exist yet.

- [ ] **Step 3: Implement the typed detail registry.**

Create `progressMapLandmarkDetails.ts` with eight entries and the following source-backed fact boundaries:

- Lũng Cú: núi Rồng, hoa văn trống đồng Đông Sơn, hồ Lô Lô.
- Khuê Văn Các: xây năm 1805, cửa tròn/tia sáng sao Khuê, biểu tượng văn chương/văn hiến Hà Nội.
- Hoa Lư: Đinh, Tiền Lê và Lý từng đóng đô; hệ thống đền/thành/dấu tích; di tích quốc gia đặc biệt.
- Kim Liên: Kim Liên là quê hương Bác; Hoàng Trù là nơi Người sinh ra; Làng Sen là nơi Người sống cùng gia đình 1901–1906 và ghi dấu hai lần về thăm quê.
- Huế: kinh đô Việt Nam thống nhất từ 1802; trung tâm chính trị, văn hóa, tôn giáo của triều Nguyễn đến 1945.
- Hội An: thương cảng Đông Nam Á được bảo tồn tốt từ thế kỷ XV–XIX; giao thoa văn hóa trong kiến trúc và quy hoạch.
- Nhà rông: ở nhiều buôn làng là không gian sinh hoạt cộng đồng; hình dáng khác nhau theo dân tộc; nơi gặp gỡ và giữ gìn truyền thống.
- Chợ nổi Cái Răng: chợ trên sông Cần Thơ; nông sản/trái cây; họp sớm; treo sản vật trên cây bẹo.

Lưu tám URL nguồn đã được phê duyệt trong spec vào `sourceUrls`; không fetch URL khi runtime render.

- [ ] **Step 4: Extend the asset union/registry and map every landmark.**

Add the five new `ProgressMapAssetId` values and five `PROGRESS_MAP_ASSETS` entries at 720×480, `decorative: true`. Change `LANDMARK_ASSET_IDS` so all eight values use dedicated `landmark-*` assets. Keep topic/region asset IDs unchanged.

- [ ] **Step 5: Run focused tests to prove the registry is green.**

Run the command from Step 2 again. Expected: PASS, including the existing Tây Nguyên hit-area separation regression.

---

### Task 3: Build the presentational landmark image modal

**Files:**
- Create: `src/components/progress/ProgressMapLandmarkImageModal.tsx`
- Create: `src/components/progress/ProgressMapLandmarkImageModal.test.tsx`
- Modify: `src/components/progress/progressMapStyleContract.test.ts` only for stable modal/trigger class contracts if the existing style tests require it.

**Interfaces:**
- Consumes: `ProgressMapLandmarkPresentation` from `progressMapPresentation.ts` and `ProgressMapLandmarkDetail` from Task 2.
- Produces: a `role="dialog"` modal subtree with stable attributes `[data-progress-map-landmark-modal]`, `[data-progress-map-landmark-modal-image]`, `[data-progress-map-landmark-modal-title]`, `[data-progress-map-landmark-modal-fact]` and a close button.

- [ ] **Step 1: Write the failing modal render/semantics tests.**

Test that the component renders:

```tsx
expect(mount.querySelector('[data-progress-map-landmark-modal]')?.getAttribute('role')).toBe('dialog');
expect(mount.querySelector('[data-progress-map-landmark-modal]')?.getAttribute('aria-modal')).toBe('true');
expect(mount.querySelector('[data-progress-map-landmark-modal-title]')?.textContent).toBe('Làng Sen Kim Liên');
expect(mount.querySelectorAll('[data-progress-map-landmark-modal-fact]')).toHaveLength(3);
expect(mount.querySelector<HTMLImageElement>('[data-progress-map-landmark-modal-image]')?.src).toContain('landmark-kim-lien.webp');
```

Also test `aria-labelledby`, the close button accessible name, and that clicking close calls `onClose` exactly once.

- [ ] **Step 2: Run the focused modal test and verify it fails.**

Run:

```bash
npx vitest run src/components/progress/ProgressMapLandmarkImageModal.test.tsx --reporter=dot
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the minimal modal markup.**

Use `forwardRef<HTMLElement, ProgressMapLandmarkImageModalProps>` so the parent can focus/trap the modal. Render a modal backdrop, a single dialog surface, the dedicated image with empty `alt` (the labelled dialog/title supplies context), kicker, title, `detail.lead`, fact list and close button. Use the exact accessible label `Đóng thông tin ${landmark.name}`.

- [ ] **Step 4: Run the focused modal test and verify it passes.**

Run the command from Step 2. Expected: PASS with no change to lesson data or selection state.

---

### Task 4: Make the small landmark image an accessible open trigger

**Files:**
- Modify: `src/components/progress/ProgressMapInfoPanel.tsx`
- Modify: `src/components/progress/ProgressMapInfoPanel.test.tsx`

**Interfaces:**
- Consumes: `onOpenLandmarkImage(landmarkId, trigger)` callback from Task 5.
- Produces: a focusable `[data-progress-map-landmark-image-trigger]` button around the existing landmark image; welcome/topic branches remain unchanged.

- [ ] **Step 1: Add a failing trigger callback test.**

Extend `baseProps` with a spy and render the `kim-lien` landmark. Click the trigger and assert:

```ts
expect(onOpenLandmarkImage).toHaveBeenCalledOnce();
expect(onOpenLandmarkImage.mock.calls[0][0]).toBe('kim-lien');
expect(onOpenLandmarkImage.mock.calls[0][1]).toBeInstanceOf(HTMLButtonElement);
expect(mount.querySelector('[data-progress-map-landmark-image-trigger]')?.getAttribute('aria-label'))
  .toBe('Xem ảnh lớn: Làng Sen Kim Liên');
```

- [ ] **Step 2: Run the panel test and verify it fails.**

Run:

```bash
npx vitest run src/components/progress/ProgressMapInfoPanel.test.tsx --reporter=dot
```

Expected: FAIL because the prop and trigger do not exist.

- [ ] **Step 3: Implement the trigger without changing the panel layout contract.**

Add the callback prop, wrap only the landmark image in a `button`, pass `event.currentTarget` to the callback, preserve the existing image `src`, dimensions and `data-progress-map-landmark-art`, and keep `onBack` unchanged.

- [ ] **Step 4: Run the panel tests and verify they pass.**

Run the command from Step 2. Expected: PASS for welcome, landmark, empty topic and image-trigger behaviors.

---

### Task 5: Integrate modal state, focus trap and Escape ordering into the board dialog

**Files:**
- Modify: `src/components/progress/ProgressBoardDialog.tsx`
- Modify: `src/components/progress/ProgressBoardDialog.test.tsx`
- Modify: `src/components/progress/ProgressMapInfoPanel.tsx` to pass the callback through the parent integration.

**Interfaces:**
- Consumes: modal component from Task 3 and trigger callback from Task 4.
- Produces: open/close lifecycle with selection preservation, modal-only Tab trap, focus return to trigger, and Escape order modal → landmark panel → board dialog.

- [ ] **Step 1: Add failing integration tests for open, selection preservation and Escape.**

In `ProgressBoardDialog.test.tsx`:

1. Click `[data-progress-map-landmark="kim-lien"]`.
2. Click `[data-progress-map-landmark-image-trigger]`.
3. Assert the modal is present, title is `Làng Sen Kim Liên`, the landmark panel remains selected and `aria-modal="true"`.
4. Dispatch document Escape and assert the modal is gone, panel remains, and `document.activeElement` is the image trigger.
5. Dispatch Escape again and assert the welcome panel appears without calling `onClose`.
6. Dispatch Escape a third time and assert `onClose` is called once.

- [ ] **Step 2: Add failing integration tests for modal-only focus trap and backdrop isolation.**

When the image modal is open, focus the first/last modal focusable and dispatch Tab/Shift+Tab; assert focus cycles inside the modal. Dispatch mousedown on the modal backdrop and assert only the modal closes; dispatch mousedown on the board backdrop while the modal is not open and assert the board close callback still works.

- [ ] **Step 3: Run the focused board tests and verify they fail.**

Run:

```bash
npx vitest run src/components/progress/ProgressBoardDialog.test.tsx --reporter=dot
```

Expected: FAIL because no modal state/markup or modal-specific focus handling exists.

- [ ] **Step 4: Implement parent-owned modal state and refs.**

Add:

```ts
const [landmarkImageOpen, setLandmarkImageOpen] = useState(false);
const landmarkImageOpenRef = useRef(false);
const landmarkImageTriggerRef = useRef<HTMLButtonElement | null>(null);
const landmarkModalRef = useRef<HTMLElement>(null);
const landmarkModalCloseRef = useRef<HTMLButtonElement>(null);
```

Store the trigger from `onOpenLandmarkImage`, set the modal open state only when `selection.kind === 'landmark'`, and focus `landmarkModalCloseRef` after open. Reset `landmarkImageOpen` in topic/landmark/back/close transitions. Render the modal after the content panel so it owns the top visual layer.

- [ ] **Step 5: Implement modal-first keyboard handling.**

At the top of the existing document keydown handler:

```ts
if (landmarkImageOpenRef.current) {
  if (event.key === 'Escape') {
    event.preventDefault();
    setLandmarkImageOpen(false);
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    cycleFocusWithin(landmarkModalRef.current, event.shiftKey);
    return;
  }
}
```

Define the local focus cycle with the existing helpers so the behavior is deterministic:

```ts
function cycleFocusWithin(container: HTMLElement | null, reverse: boolean) {
  if (!container) return;
  const focusable = getFocusableElements(container);
  if (!focusable.length) {
    container.focus();
    return;
  }
  const current = focusable.indexOf(document.activeElement as HTMLElement);
  const index = current === -1 ? (reverse ? 0 : focusable.length - 1) : current;
  focusable[getNextFocusIndex(index, focusable.length, reverse)]?.focus();
}
```

Do not let parent dialog buttons participate in the Tab cycle while the modal is open. On close, focus the stored trigger only if it is still connected; otherwise leave focus on the board close button.

- [ ] **Step 6: Implement backdrop and selection guards.**

The modal backdrop closes only `landmarkImageOpen`; stop propagation from the modal surface. The board backdrop continues to close the board only when its own current target is clicked and the modal is not open. If selection changes, close the modal before rendering new selection content.

- [ ] **Step 7: Run the focused board tests and verify they pass.**

Run the command from Step 3. Expected: all existing dialog regressions plus new modal open/close/focus tests PASS; lesson drawer/detail tests remain green.

---

### Task 6: Add responsive styling without disturbing the map canvas

**Files:**
- Modify: `src/styles.css` near the existing progress map info panel/dialog rules.
- Modify: `src/components/progress/progressMapStyleContract.test.ts` if the test asserts the required class/attribute contract.

**Interfaces:**
- Consumes: class names and data attributes emitted by Tasks 3–5.
- Produces: visual trigger affordance and responsive modal surface for desktop, tablet, mobile portrait and short landscape.

- [ ] **Step 1: Add a failing CSS contract test for the new selectors.**

Assert the stylesheet contains the trigger focus rule, modal backdrop/surface rule, modal image `object-fit: contain`, `overflow-y: auto`, and the mobile/short-landscape media queries used by the component. Keep the test structural; do not snapshot all CSS.

- [ ] **Step 2: Run the style contract test and verify it fails.**

Run:

```bash
npx vitest run src/components/progress/progressMapStyleContract.test.ts --reporter=dot
```

Expected: FAIL because the new selectors do not exist.

- [ ] **Step 3: Implement base modal/trigger styles.**

Add rules for:

- `.progress-map-landmark-image-trigger`: reset button chrome, full image box, pointer/focus affordance, existing rounded image background.
- `.progress-map-landmark-image-modal-backdrop`: fixed inset layer above board content, safe padding, centered layout, translucent warm backdrop.
- `.progress-map-landmark-image-modal`: cream surface, existing border/shadow/radius tokens, `max-width`, `max-height`, `overflow-y: auto`, `z-index` above panel foliage.
- `.progress-map-landmark-image-modal-image`: width 100%, height auto, `object-fit: contain`, no distortion.
- `.progress-map-landmark-image-modal-facts`: compact readable list with no emoji bullets.

- [ ] **Step 4: Add mobile and short-landscape overrides.**

At the existing mobile breakpoint, set modal width to `min(100%, calc(100vw - 24px))`, keep the close button at least 44px, and let copy scroll inside the surface. At the existing `min-width: 900px`/`max-height: 720px` rule, limit image height and modal max-height so the board has no document overflow. Do not alter `.progress-map-scene` intrinsic aspect ratio or map image dimensions.

- [ ] **Step 5: Run style and focused UI tests.**

Run the command from Step 2 plus:

```bash
npx vitest run src/components/progress/ProgressMapInfoPanel.test.tsx src/components/progress/ProgressBoardDialog.test.tsx --reporter=dot
```

Expected: PASS with the existing map/panel visual contracts intact.

---

### Task 7: Complete offline manifest, build, and ledger integration

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/pwa/offline.test.ts`
- Modify: `design/progress-map/qa/execution-ledger.md`

**Interfaces:**
- Consumes: five runtime WebP files and measured hashes from Task 1, typed mappings from Task 2.
- Produces: a 19-asset support pack that is precached and hash-verified offline without changing the original map hash.

- [ ] **Step 1: Add failing offline allowlist/hash expectations.**

Extend the existing support ID array in `src/pwa/offline.test.ts` with the five IDs and assert each corresponding URL is in the generated allowlist. Add a runtime-file existence/hash check using the same manifest paths already used by the existing test.

- [ ] **Step 2: Run offline tests and verify they fail before config update.**

Run:

```bash
npx vitest run src/pwa/offline.test.ts --reporter=dot
```

Expected: FAIL because the five URLs are not yet in `LOCAL_ART_URLS`/`LOCAL_ART_VERSIONS`.

- [ ] **Step 3: Add the five measured URLs and hashes to Vite/config.**

Append the five new WebP URLs to the local progress support list and append exact measured `path:sha256` records to `LOCAL_ART_VERSIONS`. Keep every existing URL/hash unchanged. Do not include masters, candidates, concept PNGs or contact sheets in the runtime allowlist.

- [ ] **Step 4: Run offline, build and validation gates.**

Run:

```bash
npx vitest run src/pwa/offline.test.ts --reporter=dot
npm run build
npm run validate:progress-map
git diff --check
```

Expected: all commands exit 0; build output contains all 19 progress support URLs; map validation still reports the original PNG/reference as valid.

- [ ] **Step 5: Record the checkpoint without claiming visual completion.**

Update the feature extension section in `design/progress-map/qa/execution-ledger.md` with the 19-asset count, measured runtime bytes, manifest/hash result, tests and current screenshot status. Keep original P5 `NOT VERIFIED`/limitation state until the real app screenshot matrix is captured.

---

### Task 8: Full verification and real-app screenshot QA

**Files:**
- Modify: `design/progress-map/qa/execution-ledger.md`
- Modify: `design/progress-map/qa/visual-review.md`
- Create: saved screenshot evidence files in the existing QA evidence directory, only if the local browser/tool surface supports persistent files.

**Interfaces:**
- Consumes: complete implementation and all automated gates from Tasks 1–7.
- Produces: evidence-backed pass/fail matrix for eight modal mappings, accessibility, responsive layout and hard gates.

- [ ] **Step 1: Run the complete automated suite.**

Run:

```bash
npm test -- --run --reporter=dot
npm run typecheck
npm run typecheck:server
npm run build
npm run validate:progress-map
git diff --check
```

Expected: full suite passes with only the repository’s known/skipped integration tests; both typechecks, build, map validation and diff check exit 0.

- [ ] **Step 2: Smoke-test every landmark in the real local app.**

Use the existing in-app browser tab at `http://127.0.0.1:5173/?progress-map-fixture=1`. For each of the eight landmark selectors, verify:

1. landmark panel title matches the selected id;
2. small trigger `aria-label` names the same landmark;
3. modal image `src` is the matching `landmark-*.webp` URL;
4. modal title and at least two facts are present;
5. Escape closes modal and returns focus to trigger;
6. second Escape returns to the map panel without closing the board.

- [ ] **Step 3: Capture each required viewport/state.**

At each viewport `390x844`, `430x932`, `768x1024`, `1440x900`, `1180x700`, `844x390`, capture the actual app with at least one landmark modal open. Use Kim Liên for the content/focus evidence and sample Cột cờ Lũng Cú, Hoa Lư, Huế, Hội An, Nhà rông Tây Nguyên, Chợ nổi miền Tây for asset mapping evidence. If the browser surface cannot persist PNGs, record the exact tool limitation instead of claiming screenshot completion.

- [ ] **Step 4: Check hard gates and score honestly.**

Verify no horizontal overflow, no map/topic hit-area regression, no modal backdrop leakage, no lesson/permission mutation, all eight dedicated asset mappings, and correct Kim Liên/Hoa Lư/Hội An images. Score each viewport only from saved screenshot evidence. Any missing screenshot or failed gate keeps the status below `READY_FOR_REVIEW` and is written as a blocker in `visual-review.md`.

- [ ] **Step 5: Update ledger with final evidence or exact blocker.**

Record commands, viewport matrix, screenshot paths/tool limitation, scores, remaining findings and next checkpoint. Do not write a 95/100 or `READY_FOR_REVIEW` claim without the evidence files.

## Completion handoff

After this plan is executed and verified, stop before commit/push/deploy. Report changed files, test/build evidence, screenshot evidence, any limitation and the exact next action. Git lifecycle remains user-controlled.
