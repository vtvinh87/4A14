# PET-3D-GLB-01 — READY_FOR_REVIEW

Ngày: 2026-09-11  
Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`  
Phạm vi: author và tích hợp pet 3D local bằng GLB procedural, giữ fallback PNG, offline allowlist và kiểm tra runtime.

## Trạng thái

`READY_FOR_REVIEW` cho packet pet 3D. Đây là GLB thật có mesh, skin joints/weights và animation tracks; không phải PNG đặt trên plane, không dùng stock fox, và không gọi artwork PNG là 3D. Parent vẫn cần review chất lượng visual responsive ở `768x1024` và `390x844` trước khi chấp nhận.

## Capability và hướng đã chọn

Host/checkout không có Blender, `gltf-transform`, `gltfpack`, `obj2gltf`, Babylon CLI, Three.js, React Three Fiber hoặc package GLTF trước packet này; cũng không có asset `.glb`/`.riv` có sẵn. Vì vậy asset được tạo bằng generator thuần Node, không thêm tool authoring nặng hay account bên ngoài.

- Generator deterministic: [`scripts/generate-fox-glb.mjs`](../../scripts/generate-fox-glb.mjs).
- Validator độc lập: [`scripts/validate-fox-glb.mjs`](../../scripts/validate-fox-glb.mjs).
- Mesh là 37 primitive procedural, không có `images`/`textures`; mỗi primitive có `POSITION`, `NORMAL`, `JOINTS_0`, `WEIGHTS_0`.
- Runtime là Three.js direct, lazy-load local qua [`src/components/FoxPet3D.tsx`](../../src/components/FoxPet3D.tsx), pinned `three@0.186.0` và `@types/three@0.185.4`.

## Asset contract và stats

Asset: [`public/art/fox-pet.glb`](../../public/art/fox-pet.glb)

```text
container: glTF binary, version 2
size: 163172 bytes
sha256: 73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40
vertices: 2148
triangles: 3140
primitives: 37
bones/joints: 17
skinned meshes after GLTFLoader parse: 37
clips: idle, greet, think, celebrate, rest
materials: fox-orange, fox-cream, teal, teal-dark, compass-gold, compass-face, compass-needle
```

Identity elements are procedural orange/cream fox, pointed ears, muzzle/nose/eyes, teal neck scarf, teal backpack plus straps, gold compass with face/needle, and a segmented tail. Scene renderer uses alpha transparency so the existing approved world artwork remains the presentation background.

## Motion mapping

| Existing UI mood/event | GLB clip and visible tracks | Runtime behavior |
| --- | --- | --- |
| `idle` | body, head, `tail_base`, `tail_mid`, `tail_tip` | loop nhẹ |
| tap → `greet` | root bounce, head, `arm_r`, tail | one-shot; parent state timer returns to idle |
| hint/question → `think` | head, both ears, tail | loop nhẹ |
| correct → `celebrate` | root bounce, head, `arm_l`, `arm_r`, all tail segments | one-shot |
| `rest` / reduced motion / hidden tab | rest pose; no mixer update or RAF loop | still và accessible |

`Pet` giữ `aria-label="Chạm vào Cáo Nhỏ"`; canvas là `aria-hidden`, còn PNG approved vẫn hiện trong lúc GLB loading và được dùng nếu WebGL/loader lỗi. CSS animation whole-image bị tắt khi GLB path đang active để không trộn hai hệ motion.

## Offline và failure boundary

`vite.config.ts` đưa `/art/fox-pet.glb` vào `LOCAL_ART_URLS`, đưa SHA-256 vào cache fingerprint, và precache cả dynamic chunks `GLTFLoader`, `three.module`, app JS/CSS cùng asset. Build hiện có 24 URL explicit trong `offline-manifest.json`; smoke test toàn bộ trả HTTP `200`. Worker không có `skipWaiting` hoặc `location.reload` và không cache ngoài allowlist.

Nếu WebGL context không tạo được, GLTF load thất bại hoặc runtime throw, component chuyển về PNG đã duyệt; app vẫn dùng được và không báo pet 3D khi chưa load thành công.

## Verification evidence

```text
npm run generate:fox
  -> output public/art/fox-pet.glb; 2148 vertices; 3140 triangles; 17 bones; 5 clips

npm run validate:fox
  -> pass; skin attributes and joint/weight ranges valid; required materials/bones/clips present

Node GLTFLoader parse
  -> animations=[idle,greet,think,celebrate,rest], meshes=37, skinned=37

npm test -- --run
  -> 10 test files, 35 tests passed

npm run typecheck
  -> exit 0

npm run build
  -> exit 0; Vite 5.4.21
  -> dynamic local chunks: GLTFLoader 46.62 kB, three.module 746.94 kB minified / 191.81 kB gzip

HTTP smoke against http://127.0.0.1:4174/
  -> manifest 24/24 OK; fox-pet.glb Content-Type=model/gltf-binary
```

Visual runtime smoke trên `http://127.0.0.1:4174/?glb=4` ở desktop viewport đã render được model trong PetView; screenshot cho thấy thân/đầu/tay/chân/đuôi tách biệt, scarf teal, compass và tail ở hông. Tap vào pet đổi feedback và pose greet/bounce; bật “Giảm chuyển động” cho thấy pose rest đứng yên; `dev.logs()` không có console error. IAB harness không có viewport setter native, nên tablet/mobile là acceptance review còn lại của coordinator.

## Known limitations

- Đây là stylized low-poly procedural asset để thỏa contract 3D/skin/animation trong toolchain local, không có độ chi tiết lông/mesh sculpt như artwork 2D đã duyệt; không nên tuyên bố pixel-identical với PNG.
- 37 primitive/draw calls và Three runtime chunk khoảng 747 kB minified là trade-off của runtime local; GLB itself khoảng 159 kB. Runtime chỉ lazy-load khi pet component mount.
- Không có Rive authoring/runtime trong packet này; GLB là đường 3D được user phê duyệt riêng. Không thêm `.riv` giả.
- `npm install` báo 5 audit findings trong dependency tree (3 moderate, 1 high, 1 critical); packet không chạy `npm audit fix --force` để tránh thay đổi ngoài phạm vi.

## Files trong write-set

- `public/art/fox-pet.glb`.
- `scripts/generate-fox-glb.mjs`, `scripts/validate-fox-glb.mjs`.
- `src/components/FoxPet3D.tsx`, `src/components/Pet.tsx`, `src/styles.css`, `src/pwa/offline.ts`.
- `vite.config.ts`, `package.json`, `package-lock.json`, `README.md`.
- File handoff này trong `docs/executor/`.

Không sửa `design/`, `source/`, parent docs hoặc Brain_Vault; không tạo task/subagent, không Git lifecycle, không deploy.
