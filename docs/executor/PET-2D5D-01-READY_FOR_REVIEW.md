# PET-2D5D-01 — READY_FOR_REVIEW

Ngày: 2026-09-11  
Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`  
Phase: rig proof 2D/2.5D bằng full-image weighted mesh; chưa tích hợp renderer mặc định.

## Trạng thái

`READY_FOR_REVIEW`

Phase này đã dựng rig, weight map, motion controller và renderer preview local trên nguyên texture `public/art/fox-pet-alpha.png`. Production default vẫn dùng `FoxPet3D` + `public/art/fox-pet.glb`; chưa sửa offline manifest và chưa chạy phase 2D5D-02.

## Changed files trong exact write-set

- `src/pet2d5d/types.ts` — anchor/type contract và `PetMotionController` interface.
- `src/pet2d5d/rig.ts` — grid, UV/base positions, 12 anchors, smooth ellipse weights, rest pose và weighted deformation.
- `src/pet2d5d/rig.test.ts` — topology, index range, weight normalization, rest pose và finite deformation.
- `src/pet2d5d/motion.ts` — pure TypeScript spring controller, không import DOM/React/Three.
- `src/pet2d5d/motion.test.ts` — mood transition, one-shot settle, bounds, reduced motion, visibility pause và delta clamp.
- `src/components/FoxPet2D5D.tsx` — lazy Three.js + local `TextureLoader`, orthographic camera, textured mesh, RAF/resize/visibility lifecycle và cleanup.
- `src/components/Pet.tsx` — chỉ thêm DEV query flags `pet-2d5d-preview=1` và `pet-2d5d-error=1`; không đổi renderer production mặc định.
- `src/styles.css` — stage/canvas class 2D5D và tắt whole-avatar CSS motion riêng cho preview.
- `docs/executor/PET-2D5D-01-READY_FOR_REVIEW.md` — handoff này.

Không sửa `public/art/fox-pet-alpha.png`, `public/art/fox-pet.glb`, `src/components/FoxPet3D.tsx`, `vite.config.ts`, `src/pwa/offline.ts`, `App.tsx`, `source/`, package/dependency hoặc `docs/superpowers/`.

## Rig contract

- Grid cố định `columns=20`, `rows=28` → `609 vertices`, `3360 indices`.
- UV lưu theo tọa độ top-down chuẩn hóa; renderer đảo trục V khi gắn texture để giữ đúng hướng artwork.
- Base position dùng tỷ lệ gốc `1145x1373`, không crop hoặc thay đổi PNG.
- Anchors: `root`, `torso`, `head`, `ear-left`, `ear-right`, `wave-arm`, `compass-arm`, `tail-base`, `tail-mid`, `tail-tip`, `leg-left`, `leg-right`.
- Mỗi vertex dùng smooth ellipse falloff và normalize tổng weight; vùng không có contribution fallback về `root=1`.
- Deformation là blend quanh anchor pivot với translation/rotation/scale/Z clamp an toàn để tránh kéo rách silhouette.

## Motion contract

- `idle`: thở nhẹ, root scale và tail chain có dao động nhỏ.
- `greet`: one-shot `0.84s`, wave arm/head/tail rồi settle về idle.
- `think`: loop `1.6s`, nghiêng đầu/tai và tail-mid nhẹ.
- `celebrate`: one-shot `0.95s`, root lift/scale và arm/tail response trong profile.
- `rest`: identity pose, `isAnimating() === false`.
- Reduced motion reset về pose tĩnh; hidden tab pause và không cộng dồn delta; delta âm/lớn được clamp `0..0.05s`.

## Renderer preview

`FoxPet2D5D` chỉ lazy-load `three`, không import `GLTFLoader`, không có lighting/post-processing và chỉ tải texture local `/art/fox-pet-alpha.png`.

- `WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })`.
- Pixel ratio cap `1.5`, clear trong suốt, `SRGBColorSpace`.
- `OrthographicCamera`, `MeshBasicMaterial`, `transparent`, `alphaTest=0.02`, `depthWrite=false`, `DoubleSide`.
- Một `BufferGeometry` textured với position/UV/index từ rig; một RAF khi controller đang animate.
- Resize qua `ResizeObserver` + window fallback; visibility listener dừng/tiếp tục loop; cleanup listener, observer, RAF, geometry, material, texture, renderer và context.
- Mọi init/load/render exception gọi `onError` một lần.

## Browser evidence

### 2D5D preview

URL: `http://127.0.0.1:4173/?pet-2d5d-preview=1`

CUA browser walkthrough:

- Journey render có `canvasCount=1`, class `pet-avatar pet-avatar-2d5d pet-avatar-2d5d-ready`, không còn `img.pet-image` khi canvas ready.
- Screenshot cho thấy nguyên artwork cáo cam/kem, khăn teal, ba lô và la bàn hiển thị đúng hướng trên nền cảnh.
- Tap button semantic `Chạm vào Cáo Nhỏ` hoạt động; unit motion controller kiểm tra greet/think/celebrate transitions.
- Console levels `error`/`warn`: `[]`.

### Forced error fallback

URL: `http://127.0.0.1:4173/?pet-2d5d-preview=1&pet-2d5d-error=1`

CUA DOM evidence: `canvasCount=0`, `imageCount=1`, class `pet-avatar`; alt text vẫn là `Cáo Nhỏ mặc khăn xanh teal, đeo ba lô và cầm la bàn`. Flag gọi `onError` trước dynamic import/renderer init.

### Production default

URL: `http://127.0.0.1:4174/`

CUA DOM evidence sau production build: `threeCanvasCount=1`, `twoDCanvasCount=0`, class `pet-avatar pet-avatar-3d pet-avatar-3d-ready`, stage `fox-pet-3d-stage`. Không có query flag thì `Pet` vẫn chọn `FoxPet3D`.

## Verification commands và exit codes

TDD RED trước implementation:

```text
npx vitest run src/pet2d5d/rig.test.ts src/pet2d5d/motion.test.ts
  -> exit 1; 2 suites fail ở import ./rig vì module chưa tồn tại
```

Sau implementation:

```text
npx vitest run src/pet2d5d/rig.test.ts src/pet2d5d/motion.test.ts
  -> exit 0; 2 files passed, 9 tests passed

npm run typecheck
  -> exit 0

npm test -- --run
  -> exit 0; 12 test files passed, 44 tests passed

npm run build
  -> exit 0; Vite 5.4.21
  -> dist/offline-manifest.json có 24 URL; build chỉ cảnh báo chunk Three.js lớn, không có build error

npm run validate:fox
  -> exit 0; legacy fox-pet.glb vẫn valid: 2148 vertices, 3140 triangles, 17 bones, 5 clips
```

HTTP smoke trên `http://127.0.0.1:4174/`:

```text
manifest URLs: 24
HTTP failures: 0
/art/fox-pet-alpha.png: 200, image/png
/art/fox-pet.glb: 200, model/gltf-binary
12 font URLs: 200, font/woff2
manifestHasGlb: true
manifestHasPng: true
```

## Protected artifact evidence

```text
public/art/fox-pet-alpha.png
  sha256: 0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3

public/art/fox-pet.glb
  sha256: 73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40

public/art/fox-pet-hifi.glb
  absent; no new 3D asset introduced
```

## Known risks / parent acceptance còn lại

- Weighted full-image mesh là rig proof; biên độ hiện cố ý nhỏ. Cần parent review seam, méo lông/mặt/la bàn và độ mềm ở `idle`, `greet`, `think`, `celebrate`, `rest` trên Journey full, Lesson/Reward compact, PetView full, tablet ngang/dọc và mobile.
- CUA đã xác nhận desktop dev preview, forced PNG fallback và production default; chưa coi đó là responsive/whole-branch acceptance.
- Renderer 2D5D đã được import vào app bundle nhưng Three vẫn nằm trong dynamic chunk; không có query flag thì không khởi tạo 2D5D và không thay active renderer.
- Offline manifest vẫn giữ GLB để rollback. Việc bỏ GLB khỏi allowlist thuộc phase 2D5D-03 sau khi 2D5D được nghiệm thu.
- Không có WebGL unit test giả; cần parent tiếp tục walkthrough browser thật nếu muốn chấp nhận visual gate.

Phase 2D5D-02 chưa được chạy. Không commit/push/merge/deploy, không tạo task/subagent và không xóa artifact rollback.

