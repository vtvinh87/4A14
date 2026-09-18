# Bản đồ AI minh họa Việt Nam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Thay thế artwork bản đồ tiến bộ hiện tại bằng một tranh bản đồ Việt Nam hoàn chỉnh duy nhất do AI hỗ trợ tạo, có biểu tượng địa danh vùng miền, giữ đúng hình thể lãnh thổ và Hoàng Sa/Trường Sa, đồng thời loại bỏ hoàn toàn đường tuyến màu vàng.

**Architecture:** AI tạo source illustration gồm toàn bộ canvas cảnh quan và tám biểu tượng địa danh; pipeline build cục bộ giữ nguyên canvas artwork, resize deterministic, dàn nhãn rồi flatten thành một PNG runtime duy nhất. SVG địa lý đã kiểm chứng chỉ là nguồn QA độc lập, không dùng làm alpha mask cắt ảnh. React chỉ tải PNG đó và đặt các control trong suốt cho sáu chặng học tập cùng tám vùng chạm landmark; không có lớp bản đồ địa lý thứ hai trong runtime và không có route polyline.

**Tech Stack:** React 18 + TypeScript, CSS hiện hữu, Vitest + jsdom, Vite custom service-worker plugin, ImageGen cho source artwork, Node.js + `sharp` dev-only cho resize/composite/label, `sips` cho kiểm tra kích thước/profile, CUA browser cho visual QA.

## Global Constraints

- Runtime phải hiển thị một artwork phẳng duy nhất: `public/art/progress/vietnam-progress-map-illustrated.png`.
- AI chỉ tạo phong cách, cảnh quan và landmark; không dùng AI output thô làm nguồn duy nhất để kết luận hình học bản đồ.
- Hình thể đất liền, đảo ven bờ, Hoàng Sa và Trường Sa phải được kiểm chứng bằng reference SVG và source ledger hiện tại.
- Hoàng Sa và Trường Sa phải là hai nhóm riêng biệt, ở vị trí tương đối đúng, không bị crop, che hoặc gộp.
- Nhãn “Hoàng Sa” và “Trường Sa” phải được dàn deterministic ở hậu kỳ; không lấy chữ do AI sinh.
- Không còn `progress-map-route`, `data-progress-map-route`, polyline route hoặc bất kỳ đường vàng nối chặng nào.
- Artwork v1 có đúng tám cụm landmark: Lũng Cú, Khuê Văn Các, Hoa Lư, Kim Liên, Huế, Hội An, Tây Nguyên và chợ nổi miền Tây.
- Landmark được tích hợp trong artwork; vùng chạm trong suốt chỉ phục vụ accessibility/tương tác và không vẽ thêm lớp hình ảnh nhìn thấy.
- Copy thẻ landmark ngắn, thân thiện, giữ xưng hô `tớ/cậu`, không có điểm, thứ hạng, so sánh hoặc dữ liệu học sinh.
- Không thay đổi API, database, Supabase Edge Function, feature flag, tiến trình học tập, Thách đố, chat, realtime hoặc Parent Dashboard.
- Asset runtime phải local-only, không remote URL, map tile, script nhúng hoặc dependency mạng.
- Không dùng dữ liệu trẻ thật để tạo fixture hoặc visual QA.
- Không commit, push, deploy, merge hoặc cleanup branch trong lúc lập plan; Git checkpoint trong plan chỉ chạy khi phiên triển khai có quyền Git tương ứng.

---

## File map

### Tài sản và pipeline

- Create: `design/progress-map/ai/vietnam-map-generation-prompt.md` — prompt, negative prompt, landmark brief và checklist.
- Create: `design/progress-map/ai/vietnam-map-ai-source.png` — source đã chọn từ ImageGen, không tải trực tiếp bởi app.
- Create: `public/art/progress/vietnam-progress-map-illustrated.png` — artwork phẳng cuối cùng được app tải.
- Create: `scripts/build-progress-map-art.mjs` — giữ trọn canvas source, resize, dàn nhãn và flatten artwork.
- Modify: `scripts/validate-progress-map-asset.mjs` — kiểm tra reference SVG và illustrated PNG.
- Modify: `package.json`, `package-lock.json` — thêm script build asset và `sharp` ở devDependencies.

### UI và tương tác

- Create: `src/components/progress/progressMapLandmarks.json` — tám landmark, anchor, hit area và copy ngắn.
- Create: `src/components/progress/progressMapLandmarks.ts` — type-safe loader/selector.
- Create: `src/components/progress/ProgressMapLandmarkCard.tsx` — thẻ chi tiết landmark.
- Create: `src/components/progress/ProgressMapLandmarkCard.test.tsx` — unit/regression test cho thẻ.
- Create: `src/components/progress/progressMapLandmarks.test.ts` — contract test metadata.
- Create: `src/components/progress/progressMapIllustratedAsset.test.ts` — contract test PNG runtime.
- Create: `src/components/progress/progressMapStyleContract.test.ts` — negative/positive CSS contract test.
- Modify: `src/components/progress/VietnamMapBase.tsx` — chuyển sang illustrated PNG và alt text.
- Modify: `src/components/progress/ProgressMapScene.tsx` — bỏ route/visible archipelago labels, thêm landmark hit areas/card.
- Modify: `src/components/progress/ProgressMapScene.test.tsx` — regression artwork, route removal, landmark và chặng.
- Modify: `src/styles.css` — xóa route/label CSS, thêm hit area/card/responsive layout.

### Offline và tài liệu

- Modify: `vite.config.ts` — precache illustrated PNG và bỏ presentation assets cũ khỏi active allowlist.
- Modify: `src/pwa/offline.test.ts` — kiểm tra URL/hash/cache contract mới.
- Modify: `src/components/progress/progressMapAsset.test.ts` — giữ kiểm tra reference geometry.
- Modify: `public/art/progress/README.md` — mô tả artwork runtime/reference.
- Modify: `docs/design/progress-map-source-ledger.md` — ghi source, prompt, output hash, kích thước và QA.
- Create: `docs/executor/PROGRESS-MAP-AI-ART-AUDIT.md` — evidence log sau verification.

Execution order: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7. Các task tuần tự vì cùng phụ thuộc vào một artwork contract duy nhất.

## Execution checkpoint — 18/09/2026

- Tasks 1–6 đã được triển khai và kiểm tra: artwork PNG, metadata/card, scene, CSS, offline allowlist/validator và provenance docs.
- Task 7 automated gates đã PASS: typecheck client/server, focused asset/offline tests 14/14, full suite 522 PASS với 4 integration test skip, production build, dist/security scan và HTTP smoke.
- CUA đã kiểm tra `577 × 814`, 8 landmark controls, 6 topic nodes, card/focus/Escape và route/polyline removal. Các viewport `390 × 844`, `1180 × 700`, `1440 × 900` chưa thể mở trong browser host hiện tại; chi tiết nằm trong `docs/executor/PROGRESS-MAP-AI-ART-AUDIT.md`.
- Commit `eaf3c5b` đã được push lên `origin/codex/bang-tien-bo`; Firebase Hosting đã deploy thành công tới `a14-82a69.web.app` và `4a14.web.app`. Các bước này là handoff sau triển khai, không thay đổi runtime/API/database.

### User follow-up correction — hiển thị toàn bộ artwork

- Runtime trước đó bị cắt theo alpha mask của reference SVG, nên chỉ còn phần hình đất liền trên nền biển phẳng.
- Pipeline hiện tại giữ nguyên toàn bộ canvas AI source (biển, trời, cảnh quan, đất liền và các cụm đảo), resize `fit: 'fill'` về 1840 × 1940 và chỉ hậu kỳ nhãn deterministic.
- Reference SVG vẫn được giữ để kiểm tra hình học/QA; không còn tham gia cắt pixel runtime. Contract test mới so sánh các điểm ở rìa và vùng biển của source với runtime output.

## Task 1: Tạo artwork AI và pipeline flatten có kiểm chứng

**Files:**

- Create: `design/progress-map/ai/vietnam-map-generation-prompt.md`
- Create: `design/progress-map/ai/vietnam-map-ai-source.png`
- Create: `scripts/build-progress-map-art.mjs`
- Create: `public/art/progress/vietnam-progress-map-illustrated.png`
- Modify: `package.json`, `package-lock.json`
- Test: `src/components/progress/progressMapIllustratedAsset.test.ts`

**Interfaces:**

- Inputs: `design/progress-map/ai/vietnam-map-ai-source.png`; `public/art/progress/vietnam-progress-map.svg` chỉ dùng cho QA/reference.
- Output: `public/art/progress/vietnam-progress-map-illustrated.png`, PNG 1840×1940 cùng tỷ lệ 920:970.
- CLI: `npm run build:progress-map-art`.
- Validation: `npm run validate:progress-map`.

- [ ] **Step 1: Viết failing asset contract test.**

Tạo helper đọc PNG header và test kích thước/giới hạn:

~~~ts
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(bytes: Buffer) {
  expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  expect(bytes.toString('ascii', 12, 16)).toBe('IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

it('contains the single illustrated progress-map runtime artwork', () => {
  const assetPath = resolve(process.cwd(), 'public/art/progress/vietnam-progress-map-illustrated.png');
  const bytes = readFileSync(assetPath);
  expect(statSync(assetPath).size).toBeLessThanOrEqual(2 * 1024 * 1024);
  expect(readPngDimensions(bytes)).toEqual({ width: 1840, height: 1940 });
});
~~~

Chạy `npx vitest run src/components/progress/progressMapIllustratedAsset.test.ts`. Expected: FAIL vì artwork chưa tồn tại.

- [ ] **Step 2: Thêm dependency build-only và entrypoint.**

Chạy `npm install --save-dev sharp`, thêm vào `package.json`:

~~~json
{
  "scripts": {
    "build:progress-map-art": "node scripts/build-progress-map-art.mjs"
  }
}
~~~

Không import `sharp` từ `src/`; dependency không được bundle vào client hoặc server runtime.

- [ ] **Step 3: Ghi prompt và negative prompt trước khi gọi ImageGen.**

Tạo prompt file với nội dung:

~~~text
Create one complete north-up 2D illustrated map artwork of Vietnam for a
warm, playful elementary-school history and geography game. Show the full
recognizable S-shaped mainland from north to south, coastal islands, Hoang Sa
and Truong Sa as two separate island groups in their geographically correct
relative positions. Integrate friendly storybook scenes at their approximate
real locations: Lung Cu flag tower, Khue Van Cac in Hanoi, Hoa Lu ancient
capital, Kim Lien lotus village, Hue imperial architecture, Hoi An old town,
a Central Highlands rong house with gongs, and a Mekong floating market.

Use the Hoc Vui A1 adventure-paper language: teal sea, fresh greens, rice
fields, soft mountains, forests, rivers, warm sunlight, hand-painted
children's atlas. Make it one integrated illustration, not a collage of
floating icons. Do not render any text; labels are added in post-processing.
~~~

Negative prompt:

~~~text
No invented coastline, no missing mainland, no missing Hoang Sa, no missing
Truong Sa, no merged island groups, no fantasy islands, no political border
lines, no maritime claim lines, no yellow route/path connecting locations,
no province labels, no dashboard, no infographic, no logo, no gibberish text,
no fake Vietnamese lettering, no 3D perspective that distorts geography.
~~~

- [ ] **Step 4: Tạo source bằng ImageGen và kiểm tra candidate.**

Trước khi gọi ImageGen, đọc đầy đủ `/Users/macbook/.codex/skills/imagegen/SKILL.md`. Dùng reference `public/art/progress/vietnam-progress-map.svg`; nếu tool yêu cầu raster, rasterize reference bằng `sharp` vào thư mục tạm ngoài `public/`. Dùng `view_image` để review candidate trước khi chọn.

Reject candidate nếu đất liền không đủ Bắc–Trung–Nam, Hoàng Sa/Trường Sa biến mất, landmark không nhận ra, hoặc xuất hiện đường vàng/chữ giả. Candidate chưa chọn không được đưa vào runtime.

- [ ] **Step 5: Viết script flatten deterministic.**

`scripts/build-progress-map-art.mjs` phải:

1. Đọc source AI và resize toàn bộ canvas về 1840 × 1940 bằng `fit: 'fill'`, không cắt theo mask.
2. Giữ nguyên biển, bầu trời, đất liền, đảo và các cảnh quan đã có trong source.
3. Dàn nhãn “Hoàng Sa” và “Trường Sa” bằng SVG text hậu kỳ; không đưa route hoặc đường nối vào output.
4. Ghi PNG palette tối ưu, compression level 9 ra đúng output path và giữ dưới giới hạn 2 MiB.

Core code:

~~~js
const WIDTH = 1840;
const HEIGHT = 1940;
const sourcePath = resolve('design/progress-map/ai/vietnam-map-ai-source.png');
const outputPath = resolve('public/art/progress/vietnam-progress-map-illustrated.png');

const fullArtwork = await sharp(await readFile(sourcePath))
  .resize(WIDTH, HEIGHT, { fit: 'fill' })
  .ensureAlpha()
  .png({ palette: true, colours: 256, compressionLevel: 9, dither: 0.5 })
  .toBuffer();

await sharp(fullArtwork)
  .composite([{ input: createLabelSvg(), blend: 'over' }])
  .png({ palette: true, colours: 256, compressionLevel: 9, dither: 0.5, adaptiveFiltering: true })
  .toFile(outputPath);
~~~

Thêm bước composite label SVG với font sans-serif dễ đọc; text source không do AI sinh. Ghi rõ nếu font game không chạy trong librsvg.

- [ ] **Step 6: Build và kiểm tra asset.**

~~~bash
npm run build:progress-map-art
sips -g pixelWidth -g pixelHeight -g format public/art/progress/vietnam-progress-map-illustrated.png
shasum -a 256 public/art/progress/vietnam-progress-map-illustrated.png
npx vitest run src/components/progress/progressMapIllustratedAsset.test.ts
~~~

Expected: PNG 1840×1940, giữ toàn bộ canvas source, không quá 2 MiB, test PASS. Dùng hash thực tế trong Task 5/6.

- [ ] **Step 7: Commit checkpoint khi phiên triển khai được cấp quyền Git.**

~~~bash
git add package.json package-lock.json design/progress-map/ai scripts/build-progress-map-art.mjs public/art/progress/vietnam-progress-map-illustrated.png src/components/progress/progressMapIllustratedAsset.test.ts
git commit -m "feat: create illustrated Vietnam progress map artwork"
~~~

## Task 2: Tạo metadata landmark và thẻ chi tiết ngắn

**Files:**

- Create: `src/components/progress/progressMapLandmarks.json`
- Create: `src/components/progress/progressMapLandmarks.ts`
- Create: `src/components/progress/progressMapLandmarks.test.ts`
- Create: `src/components/progress/ProgressMapLandmarkCard.tsx`
- Create: `src/components/progress/ProgressMapLandmarkCard.test.tsx`

**Interfaces:**

~~~ts
export type ProgressMapLandmarkId =
  | 'lung-cu' | 'khue-van-cac' | 'hoa-lu' | 'kim-lien'
  | 'hue' | 'hoi-an' | 'tay-nguyen-rong-house' | 'mekong-floating-market';

export type ProgressMapLandmark = {
  id: ProgressMapLandmarkId;
  name: string;
  description: string;
  anchor: { latitude: number; longitude: number };
  hitArea: { widthPercent: number; heightPercent: number };
};

export type ProgressMapLandmarkCardProps = {
  landmark: ProgressMapLandmark;
  reducedMotion: boolean;
  onClose: () => void;
};
~~~

- [ ] **Step 1: Viết metadata contract test trước implementation.**

Test đúng tám ID, ID unique, anchor nằm trong `PROGRESS_MAP_VIEWPORT`, description ≤120 ký tự và hit area dương:

~~~ts
it('contains exactly eight geographically anchored landmarks', () => {
  expect(PROGRESS_MAP_LANDMARKS).toHaveLength(8);
  expect(new Set(PROGRESS_MAP_LANDMARKS.map(({ id }) => id)).size).toBe(8);
  for (const landmark of PROGRESS_MAP_LANDMARKS) {
    expect(landmark.description.length).toBeLessThanOrEqual(120);
    expect(landmark.anchor.latitude).toBeGreaterThanOrEqual(PROGRESS_MAP_VIEWPORT.minLatitude);
    expect(landmark.anchor.latitude).toBeLessThanOrEqual(PROGRESS_MAP_VIEWPORT.maxLatitude);
    expect(landmark.anchor.longitude).toBeGreaterThanOrEqual(PROGRESS_MAP_VIEWPORT.minLongitude);
    expect(landmark.anchor.longitude).toBeLessThanOrEqual(PROGRESS_MAP_VIEWPORT.maxLongitude);
    expect(landmark.hitArea.widthPercent).toBeGreaterThan(0);
    expect(landmark.hitArea.heightPercent).toBeGreaterThan(0);
  }
});
~~~

Chạy `npx vitest run src/components/progress/progressMapLandmarks.test.ts`. Expected: FAIL vì module chưa tồn tại.

- [ ] **Step 2: Tạo JSON metadata tám landmark.**

Entries phải dùng anchor tham chiếu gần địa danh, không phải ranh giới hành chính:

~~~json
[
  { "id": "lung-cu", "name": "Cột cờ Lũng Cú", "description": "Cùng tớ ngắm lá cờ trên nóc nhà cực Bắc nhé!", "anchor": { "latitude": 23.358, "longitude": 105.315 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } },
  { "id": "khue-van-cac", "name": "Khuê Văn Các", "description": "Khuê Văn Các là biểu tượng thân quen của Văn Miếu – Quốc Tử Giám.", "anchor": { "latitude": 21.028, "longitude": 105.836 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } },
  { "id": "hoa-lu", "name": "Cố đô Hoa Lư", "description": "Hoa Lư kể chuyện kinh đô xưa giữa những núi đá vôi.", "anchor": { "latitude": 20.276, "longitude": 105.907 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } },
  { "id": "kim-lien", "name": "Làng Sen Kim Liên", "description": "Cùng tớ ghé làng Sen, nơi có hàng tre và hương sen thân thương.", "anchor": { "latitude": 18.823, "longitude": 105.577 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } },
  { "id": "hue", "name": "Cố đô Huế", "description": "Huế có thành quách, mái ngói và nét dịu dàng bên dòng Hương.", "anchor": { "latitude": 16.463, "longitude": 107.590 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } },
  { "id": "hoi-an", "name": "Phố cổ Hội An", "description": "Hội An rực rỡ đèn lồng bên những mái nhà cổ.", "anchor": { "latitude": 15.880, "longitude": 108.338 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } },
  { "id": "tay-nguyen-rong-house", "name": "Nhà rông Tây Nguyên", "description": "Nhà rông và tiếng cồng chiêng kể câu chuyện văn hóa Tây Nguyên.", "anchor": { "latitude": 14.342, "longitude": 108.009 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } },
  { "id": "mekong-floating-market", "name": "Chợ nổi miền Tây", "description": "Chợ nổi miền Tây nhộn nhịp với thuyền, trái cây và sông nước.", "anchor": { "latitude": 10.002, "longitude": 105.748 }, "hitArea": { "widthPercent": 5.4, "heightPercent": 5.4 } }
]
~~~

Đối chiếu tên/anchor với nguồn tham chiếu địa danh trước khi chấp nhận asset và ghi nguồn kiểm tra vào ledger.

- [ ] **Step 3: Viết failing card tests theo pattern test hiện hữu.**

~~~tsx
it('shows one short landmark story and an accessible close action', () => {
  act(() => root.render(createElement(ProgressMapLandmarkCard, {
    landmark,
    reducedMotion: true,
    onClose,
  })));
  expect(mount.querySelector('[role="dialog"]')).not.toBeNull();
  expect(mount.querySelector('h3')?.textContent).toBe(landmark.name);
  expect(mount.textContent).toContain(landmark.description);
  expect(mount.querySelector<HTMLButtonElement>('[aria-label="Đóng ' + landmark.name + '"]')).not.toBeNull();
  expect(mount.querySelector('[data-reduced-motion="true"]')).not.toBeNull();
  expect(mount.textContent).not.toMatch(/điểm|hạng|xếp/i);
});
~~~

- [ ] **Step 4: Implement loader and card.**

Expose:

~~~ts
export const PROGRESS_MAP_LANDMARKS: readonly ProgressMapLandmark[] = rawLandmarks;
export function getProgressMapLandmark(id: ProgressMapLandmarkId): ProgressMapLandmark {
  const landmark = PROGRESS_MAP_LANDMARKS.find((candidate) => candidate.id === id);
  if (!landmark) throw new Error('Unknown progress map landmark: ' + id);
  return landmark;
}
~~~

Render card với `role="dialog"`, heading, mô tả, nút `Đóng <tên>` và không có ảnh/icon thứ hai. Nút đóng dùng `autoFocus` khi card mount; card xử lý Escape bằng `preventDefault()` + `stopPropagation()` rồi gọi `onClose`.

- [ ] **Step 5: Chạy focused tests.**

~~~bash
npx vitest run src/components/progress/progressMapLandmarks.test.ts src/components/progress/ProgressMapLandmarkCard.test.tsx
~~~

Expected: PASS.

- [ ] **Step 6: Commit checkpoint khi được cấp quyền Git.**

~~~bash
git add src/components/progress/progressMapLandmarks.json src/components/progress/progressMapLandmarks.ts src/components/progress/progressMapLandmarks.test.ts src/components/progress/ProgressMapLandmarkCard.tsx src/components/progress/ProgressMapLandmarkCard.test.tsx
git commit -m "feat: add progress map landmark metadata and cards"
~~~

## Task 3: Tích hợp artwork và landmark controls vào scene

**Files:**

- Modify: `src/components/progress/VietnamMapBase.tsx:5-16`
- Modify: `src/components/progress/ProgressMapScene.tsx:1-101`
- Modify: `src/components/progress/ProgressMapScene.test.tsx:39-100`

**Interfaces:**

- Consumes: `PROGRESS_MAP_LANDMARKS`, `getProgressMapLandmark`, `projectProgressMapPoint`, `ProgressMapLandmarkCard`.
- Produces: `data-progress-map-landmark="<id>"` buttons, selected card và `data-progress-map-archipelago-summary`.
- Preserves: sáu `ProgressMapNode`, `onSelectLesson`, `onSelectTopic`, `reducedMotion` và drawer contract.

- [ ] **Step 1: Viết test contract mới.**

Đổi source assertion và thêm negative route assertions:

~~~ts
expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('src'))
  .toBe('/art/progress/vietnam-progress-map-illustrated.png');
expect(mount.querySelector('[data-progress-map-route]')).toBeNull();
expect(mount.querySelector('polyline')).toBeNull();
expect(mount.querySelector<HTMLImageElement>('[data-progress-map-base]')?.getAttribute('alt'))
  .toMatch(/Hoàng Sa.*Trường Sa|Trường Sa.*Hoàng Sa/);
~~~

Thêm interaction tests:

~~~ts
it('exposes eight landmark controls and opens a short card', () => {
  expect(mount.querySelectorAll('[data-progress-map-landmark]')).toHaveLength(8);
  const button = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hoa-lu"]')!;
  expect(button.getAttribute('aria-label')).toBe('Mở thông tin Cố đô Hoa Lư');
  act(() => button.click());
  expect(mount.querySelector('[data-progress-map-landmark-card="hoa-lu"]')).not.toBeNull();
});

it('closes the landmark card and returns focus to its trigger', () => {
  const button = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hue"]')!;
  act(() => button.click());
  act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng Cố đô Huế"]')?.click());
  expect(mount.querySelector('[data-progress-map-landmark-card="hue"]')).toBeNull();
  expect(document.activeElement).toBe(button);
});
~~~

Giữ nguyên tests sáu node, empty board, reduced motion và completed topic.

- [ ] **Step 2: Chạy test để xác nhận RED.**

~~~bash
npx vitest run src/components/progress/ProgressMapScene.test.tsx
~~~

Expected: FAIL ở source path, route tồn tại và landmark controls chưa tồn tại.

- [ ] **Step 3: Chuyển `VietnamMapBase` sang PNG duy nhất.**

~~~tsx
<img
  data-progress-map-base
  src="/art/progress/vietnam-progress-map-illustrated.png"
  alt="Bản đồ minh họa Việt Nam có Hoàng Sa và Trường Sa."
  decoding="async"
/>
~~~

Giữ wrapper hidden chỉ khi scene có semantic summary riêng; thêm visually-hidden summary nói rõ hai quần đảo nếu cần cho screen reader.

- [ ] **Step 4: Refactor `ProgressMapScene`.**

Xóa `ARCHIPELAGO_LABELS`, `routePoints`, SVG route và visible HTML archipelago labels. Thêm:

~~~tsx
const [selectedLandmarkId, setSelectedLandmarkId] = useState<ProgressMapLandmarkId | null>(null);
const landmarkTriggerRefs = useRef(new Map<ProgressMapLandmarkId, HTMLButtonElement>());

const landmarkEntries = PROGRESS_MAP_LANDMARKS.map((landmark) => ({
  landmark,
  position: projectProgressMapPoint(landmark.anchor, PROGRESS_MAP_VIEWPORT),
}));
const selectedLandmark = selectedLandmarkId ? getProgressMapLandmark(selectedLandmarkId) : null;
~~~

Render buttons:

~~~tsx
<div className="progress-map-landmark-layer" data-progress-map-landmarks>
  {landmarkEntries.map(({ landmark, position }) => (
    <button
      className="progress-map-landmark-hit-area"
      data-progress-map-landmark={landmark.id}
      key={landmark.id}
      type="button"
      aria-label={'Mở thông tin ' + landmark.name}
      aria-pressed={selectedLandmarkId === landmark.id}
      style={{
        left: position.left + '%',
        top: position.top + '%',
        '--landmark-hit-width': landmark.hitArea.widthPercent + '%',
        '--landmark-hit-height': landmark.hitArea.heightPercent + '%',
      } as CSSProperties}
      ref={(element) => {
        if (element) landmarkTriggerRefs.current.set(landmark.id, element);
        else landmarkTriggerRefs.current.delete(landmark.id);
      }}
      onClick={() => setSelectedLandmarkId(landmark.id)}
    />
  ))}
</div>
~~~

Render selected card trong canvas. Khi card mở, `autoFocus` đưa focus vào nút đóng; on close set ID về null và focus trigger. Thêm visually-hidden summary `data-progress-map-archipelago-summary` nói rõ “Hoàng Sa và Trường Sa”. Không thêm ảnh visible overlay.

- [ ] **Step 5: Xử lý Escape/focus.**

Card focus nút đóng khi mở. Handler đóng card trước khi dialog parent xử lý Escape:

~~~tsx
onKeyDown={(event) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  onClose();
}}
~~~

Escape khi không có card vẫn đóng toàn bộ `ProgressBoardDialog` như hiện tại.

- [ ] **Step 6: Chạy focused progress tests.**

~~~bash
npx vitest run src/components/progress/ProgressMapScene.test.tsx src/components/progress/ProgressBoardDialog.test.tsx src/components/progress/ProgressMapDrawer.test.tsx
~~~

Expected: PASS; sáu node/drawer/focus dialog không đổi và route selector không còn trong DOM.

- [ ] **Step 7: Commit checkpoint khi được cấp quyền Git.**

~~~bash
git add src/components/progress/VietnamMapBase.tsx src/components/progress/ProgressMapScene.tsx src/components/progress/ProgressMapScene.test.tsx
git commit -m "feat: integrate illustrated progress map and landmark hit areas"
~~~

## Task 4: CSS layout, safe zones và responsive card

**Files:**

- Modify: `src/styles.css:6676-6744`
- Modify: `src/styles.css:6750-7217`
- Test: `src/components/progress/progressMapStyleContract.test.ts`

**Interfaces:**

- Consumes: `data-progress-map-landmarks`, `data-progress-map-landmark`, `data-progress-map-landmark-card`, `data-reduced-motion`.
- Produces: hit area ≥44px, card không che node/đảo ở bốn breakpoint.

- [ ] **Step 1: Viết CSS negative test.**

Đọc `src/styles.css?raw` trong `progressMapStyleContract.test.ts`:

~~~ts
expect(styles).not.toContain('.progress-map-route');
expect(styles).not.toContain('[data-progress-map-route]');
expect(styles).toContain('.progress-map-landmark-hit-area');
expect(styles).toContain('.progress-map-landmark-card');
~~~

Expected trước implementation: FAIL vì route CSS đang tồn tại.

- [ ] **Step 2: Xóa route và visible archipelago label styles.**

Xóa block `.progress-map-route`, `.progress-map-route polyline`, `.progress-map-archipelago-labels`, `.progress-map-archipelago-label` và route selector trong reduced-motion. Giữ node layer/drawer styles.

- [ ] **Step 3: Thêm landmark layer/hit area không vẽ lại artwork.**

~~~css
.progress-map-landmark-layer {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}

.progress-map-landmark-hit-area {
  position: absolute;
  width: max(44px, var(--landmark-hit-width));
  height: max(44px, var(--landmark-hit-height));
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  pointer-events: auto;
  transform: translate(-50%, -50%);
}

.progress-map-landmark-hit-area:focus-visible {
  outline: 4px solid rgba(255, 193, 50, 0.98);
  outline-offset: 4px;
}
~~~

Không dùng background/border/pseudo-element để vẽ lại landmark.

`z-index: 5` đặt vùng chạm semantic lên trên node layer (`z-index: 4`) để click đúng landmark không bị node gần đó bắt trước; mỗi vùng chỉ rộng tối thiểu 44px nên không che toàn bộ node.

- [ ] **Step 4: Thêm card style.**

Desktop/tablet đặt card ở safe zone phía trên/phải; mobile đưa card vào flow ngay dưới canvas để không che node và để drawer phía sau có khoảng thở:

~~~css
.progress-map-landmark-card {
  position: absolute;
  z-index: 7;
  top: 12px;
  right: 12px;
  width: min(250px, calc(100% - 24px));
  padding: 12px 52px 12px 14px;
  border: 3px solid rgba(50, 112, 117, 0.38);
  border-radius: 17px 11px 16px 10px;
  background: rgba(255, 252, 238, 0.98);
  box-shadow: 0 6px 0 rgba(94, 72, 47, 0.16), 0 12px 22px rgba(8, 57, 77, 0.16);
}

.progress-map-landmark-card > button {
  position: absolute;
  top: 7px;
  right: 7px;
  min-width: 44px;
  min-height: 44px;
}

@media (max-width: 700px) {
  .progress-map-landmark-card {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    left: auto;
    width: auto;
    margin: 8px 8px 32px;
  }
}
~~~

- [ ] **Step 5: Rà lại collision và reduced motion.**

Giữ node offsets hiện có, kiểm tra hit areas không che node/nhãn đảo. Điều chỉnh anchor/hitArea hoặc node offset khi cần; không thêm connector. Trên mobile, bảo đảm card nằm trong flow dưới canvas và drawer không chồng lên card. Thêm card vào reduced-motion selectors để animation/transition bị tắt.

- [ ] **Step 6: Chạy CSS/scene tests.**

~~~bash
npx vitest run src/components/progress/ProgressMapScene.test.tsx src/components/progress/ProgressMapLandmarkCard.test.tsx
~~~

Expected: PASS.

- [ ] **Step 7: Commit checkpoint khi được cấp quyền Git.**

~~~bash
git add src/styles.css src/components/progress/ProgressMapScene.test.tsx
git commit -m "style: add responsive progress map landmark interactions"
~~~

## Task 5: Cập nhật offline manifest và validation

**Files:**

- Modify: `vite.config.ts:7-16,62-68`
- Modify: `src/pwa/offline.test.ts:93-107`
- Modify: `src/components/progress/progressMapAsset.test.ts`
- Modify: `scripts/validate-progress-map-asset.mjs`

**Interfaces:**

- Active art allowlist chứa illustrated PNG.
- Reference SVG vẫn tồn tại để QA nhưng không được precache/request bởi client runtime.
- `LOCAL_ART_VERSIONS` chứa hash thật của PNG.

- [ ] **Step 1: Viết offline test theo hash thực tế.**

Dùng hash parse từ config và so với bytes, tránh hardcode hash trước khi asset tồn tại:

~~~ts
const url = '/art/progress/vietnam-progress-map-illustrated.png';
const expectedHash = artVersions.match(new RegExp(url.replace(/\./g, '\\.') + ':([a-f0-9]{64})'))?.[1];
expect(artAllowlist).toContain("'" + url + "'");
expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
const bytes = readFileSync(resolve(process.cwd(), 'public', url.slice(1)));
expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash);
expect(artAllowlist).not.toContain("'/art/progress/vietnam-progress-map.svg'");
expect(artAllowlist).not.toContain("'/art/progress/adventure-paper-texture.png'");
~~~

- [ ] **Step 2: Sửa `vite.config.ts`.**

Trong `LOCAL_ART_URLS` xóa SVG/texture cũ, thêm:

~~~ts
'/art/progress/vietnam-progress-map-illustrated.png',
~~~

Trong `LOCAL_ART_VERSIONS`, ghi entry cho URL illustrated PNG; phần sau dấu `:` phải là đúng 64 ký tự hex do lệnh `shasum -a 256` ở Task 1 in ra, không được tự gõ hoặc dùng hash của candidate khác.

Không đổi fingerprint logic, service-worker schema hoặc asset không liên quan.

- [ ] **Step 3: Mở rộng validator CLI.**

`scripts/validate-progress-map-asset.mjs` kiểm tra:

1. Reference SVG có viewBox 920×970, ba `data-geo-feature`, không script/remote href.
2. Illustrated PNG có signature, width 1840, height 1940, không quá 2 MiB.
3. Hai file tồn tại; output thành công là `[progress-map] valid reference SVG and illustrated PNG`.

- [ ] **Step 4: Chạy offline/build gates.**

~~~bash
npm run validate:progress-map
npx vitest run src/pwa/offline.test.ts src/components/progress/progressMapAsset.test.ts src/components/progress/progressMapIllustratedAsset.test.ts
npm run build
~~~

Expected: `dist/offline-manifest.json` và `dist/sw.js` chứa illustrated PNG, không chứa SVG/texture presentation cũ; build exit 0.

- [ ] **Step 5: Commit checkpoint khi được cấp quyền Git.**

~~~bash
git add vite.config.ts src/pwa/offline.test.ts src/components/progress/progressMapAsset.test.ts scripts/validate-progress-map-asset.mjs
git commit -m "chore: precache illustrated progress map artwork"
~~~

## Task 6: Cập nhật ledger, README và provenance

**Files:**

- Modify: `public/art/progress/README.md`
- Modify: `docs/design/progress-map-source-ledger.md`
- Modify: `docs/superpowers/specs/2026-09-17-ban-do-ai-minh-hoa-viet-nam-design.md`

**Interfaces:**

- Ledger phân biệt reference geometry và một runtime illustrated output.
- Tài liệu không nói AI tạo authoritative coastline.
- Spec chỉ chuyển sang implemented sau Task 7.

- [ ] **Step 1: Ghi record illustrated asset.**

Ghi runtime path, PNG dimensions/bytes, SHA-256, prompt path, ngày tạo, ImageGen provenance, deterministic label note, bốn viewport QA và giới hạn quyền sử dụng.

- [ ] **Step 2: Cập nhật README.**

Nêu rõ illustrated PNG là file duy nhất child runtime tải; SVG chỉ là reference/QA; không route, province label hoặc external dependency; landmark hit areas là semantic React controls, không phải lớp artwork thứ hai.

- [ ] **Step 3: Kiểm tra tài liệu.**

~~~bash
rg -n "vietnam-progress-map-illustrated|vietnam-progress-map.svg|Hoàng Sa|Trường Sa|route|AI" public/art/progress/README.md docs/design/progress-map-source-ledger.md docs/superpowers/specs/2026-09-17-ban-do-ai-minh-hoa-viet-nam-design.md
git diff --check
~~~

Expected: tài liệu phân biệt runtime/reference, không có conflict marker.

- [ ] **Step 4: Commit checkpoint khi được cấp quyền Git.**

~~~bash
git add public/art/progress/README.md docs/design/progress-map-source-ledger.md docs/superpowers/specs/2026-09-17-ban-do-ai-minh-hoa-viet-nam-design.md
git commit -m "docs: record illustrated Vietnam progress map asset"
~~~

## Task 7: Full verification, visual QA và audit handoff

**Files:**

- Create: `docs/executor/PROGRESS-MAP-AI-ART-AUDIT.md`
- Modify: chỉ các file đã liệt kê ở Task 1–6 nếu fresh verification phát hiện lỗi; không mở rộng runtime scope.

**Interfaces:**

- Evidence phải là kết quả fresh của checkout hiện tại.
- Không claim hoàn tất chỉ từ unit tests; cần build, offline output, browser visual QA và ledger.

- [ ] **Step 1: Chạy automated gates.**

~~~bash
npm run typecheck
npm run typecheck:server
npm test -- --run
npm run validate:progress-map
npm run build
git diff --check
~~~

Expected: mọi command exit 0; không giảm test ngoài skip đã biết; build chỉ có warning chunk đã biết nếu xuất hiện.

- [ ] **Step 2: Kiểm tra dist/cache/security.**

~~~bash
node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('dist/offline-manifest.json','utf8')); console.log(m.urls.filter((url)=>url.includes('/art/progress/')))"
if rg -n "vietnam-progress-map.svg|adventure-paper-texture" dist/offline-manifest.json dist/sw.js dist/assets; then exit 1; fi
if rg -n "postgresql://|SUPABASE_SERVICE_ROLE_KEY|HOC_VUI_DATABASE_URL" dist; then exit 1; fi
~~~

Expected: dist có PNG mới, không có SVG/texture cũ trong runtime references và không có credential/database string.

- [ ] **Step 3: Chạy preview và HTTP smoke.**

~~~bash
npm run preview -- --host 127.0.0.1 --port 4174
curl -I http://127.0.0.1:4174/
curl -I http://127.0.0.1:4174/art/progress/vietnam-progress-map-illustrated.png
curl -I http://127.0.0.1:4174/offline-manifest.json
~~~

Expected: root, PNG và manifest HTTP 200; PNG content type là image/png.

- [ ] **Step 4: Visual QA bằng CUA ở bốn viewport.**

Mở `http://localhost:8888/` và kiểm tra 390×844, 577×774, 1180×700, 1440×900:

1. Trong ba giây đầu nhận ra một tranh bản đồ vui, không phải báo cáo chữ.
2. Xác nhận ảnh là PNG mới và DOM không có route SVG/polyline.
3. Dải đất Bắc–Trung–Nam không crop; Hoàng Sa và Trường Sa cùng hiện diện, tách biệt, nhãn đúng.
4. Tám landmark hòa vào tranh, không thành hàng icon và không che bờ biển/quần đảo.
5. Click landmark ở Bắc, Hà Nội, Trung, Tây Nguyên, Nam Bộ; card đúng tên/mô tả, đóng được bằng nút/Escape.
6. Tab qua landmark controls; focus rõ và hit area ≥44 CSS px.
7. Chọn sáu chặng; drawer/CTA/lesson strip hoạt động như cũ, không đường vàng.
8. Bật reduced motion; card/node không trượt/nảy.
9. Console không có error/warn mới.

Ghi screenshot path, viewport, trạng thái và PASS/FAIL vào audit.

- [ ] **Step 5: Kiểm tra DOM geometry read-only.**

~~~js
const selectors = ['[data-progress-map-node]', '[data-progress-map-landmark]', '[data-progress-map-landmark-card]'];
const rects = Object.fromEntries(selectors.map((selector) => [
  selector,
  [...document.querySelectorAll(selector)].map((node) => ({
    label: node.getAttribute('aria-label'),
    rect: node.getBoundingClientRect().toJSON(),
  })),
]));
console.table(rects['[data-progress-map-node]']);
console.table(rects['[data-progress-map-landmark]']);
console.log('route', document.querySelector('[data-progress-map-route]'));
~~~

Expected: route `null`; node/card nằm trong dialog bounds; hit areas không che text khi card đóng.

- [ ] **Step 6: Ghi audit và cập nhật trạng thái spec.**

Audit gồm commit/build context, asset hash/dimensions/bytes, command exit codes, offline findings, bốn viewport, landmark/focus/reduced-motion result, known warning và confirmation không đổi backend/schema/child data. Chỉ khi toàn bộ acceptance criteria PASS mới đổi spec thành `Đã triển khai — verification recorded`; nếu FAIL, ghi lỗi cụ thể và giữ checkpoint.

- [ ] **Step 7: Review và Git handoff khi được cấp quyền.**

Review các điểm: một runtime artwork, source SVG không quay lại allowlist/CSS, labels không phụ thuộc AI text, progress logic không đổi, không PII, positive/negative route tests đầy đủ.

~~~bash
git status --short
git diff --check
git commit -m "feat: ship AI illustrated Vietnam progress map"
~~~

Push/deploy không thuộc plan này nếu chưa có yêu cầu Git/hosting cụ thể trong phiên triển khai.

## Verification matrix

| Spec requirement | Task | Evidence |
| --- | --- | --- |
| Một artwork runtime, không map layer thứ hai | 1, 3, 5 | PNG test, DOM source assertion, offline manifest |
| Hình thể Việt Nam và Hoàng Sa/Trường Sa | 1, 6, 7 | SVG mask, visual QA, source ledger |
| Tám landmark vùng miền | 1, 2, 3, 7 | prompt, metadata test, hit areas, visual QA |
| Nhãn không do AI sinh | 1, 3, 6 | deterministic label composite, alt/summary, ledger |
| Xóa đường vàng | 3, 4, 5, 7 | DOM/CSS tests, screenshot, dist scan |
| Card landmark accessible | 2, 3, 4, 7 | card tests, focus/Escape QA, breakpoint QA |
| Responsive 390/577/1180/1440 | 4, 7 | CUA screenshots và geometry |
| Offline/local-only | 1, 5, 7 | hash, manifest/SW scan, HTTP smoke |
| Backend/data boundary không đổi | 3, 5, 7 | scope review, typecheck/server, dist scan |
| Ledger/provenance | 1, 6, 7 | prompt, ledger, audit |

## Self-review checklist trước triển khai

- [ ] Mọi bước đều có file cụ thể, interface hoặc command/code contract để thực thi.
- [ ] Mọi file mới/sửa đều có trong File map và ít nhất một task.
- [ ] Tên type/constant/card props nhất quán giữa Task 2 và Task 3.
- [ ] Tên `vietnam-progress-map-illustrated.png` nhất quán giữa asset, UI, offline và docs.
- [ ] Route được kiểm tra bằng DOM, CSS, test và dist.
- [ ] Hoàng Sa/Trường Sa được kiểm tra bằng geometry, image, label, alt và visual QA.
- [ ] Không task nào mở rộng sang backend, database, ranking, challenge hoặc dữ liệu học sinh.
