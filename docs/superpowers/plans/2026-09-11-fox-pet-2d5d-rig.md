# Cáo Nhỏ 2D/2.5D Rig Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Thực thi tuần tự qua workflow Astra → Luna Max hiện có, mỗi lần chỉ một packet có write-set rõ ràng. Không spawn subagent, không tạo task mới, không tự khởi động phase sau và không chạy Git lifecycle command.

**Goal:** Xây dựng và tích hợp nhân vật Cáo Nhỏ 2D/2.5D rigged local bằng artwork PNG lông chi tiết hiện có, với chuyển động spring mềm mại, fallback an toàn và offline support trên tablet.

**Architecture:** Dùng một mesh textured được chia nhỏ từ toàn bộ public/art/fox-pet-alpha.png, điều khiển bởi anchor/weight map chuẩn hóa và motion controller thuần TypeScript. Renderer FoxPet2D5D lazy-load Three.js, dùng camera orthographic, cập nhật mesh theo spring motion và giữ Pet làm facade semantic/fallback. GLB cũ được giữ nguyên cho rollback nhưng chỉ bị bỏ khỏi active offline manifest sau khi phase cuối được nghiệm thu.

**Tech Stack:** React 18, TypeScript strict, Vite 5, Three.js 0.186.0, Vitest/jsdom, Service Worker offline allowlist, CUA browser walkthrough của coordinator.

## Global Constraints

- Artwork nguồn bắt buộc là public/art/fox-pet-alpha.png 1145x1373 RGBA; không ghi đè, vẽ lại hoặc giảm fidelity file này.
- Không dùng Rive, Live2D, Spine, Blender runtime, CDN, remote texture, tài khoản ngoài hoặc asset không rõ giấy phép.
- Pet giữ public API hiện tại: mood, reducedMotion, onTap, size.
- reducedMotion phải giữ pet ở pose tĩnh và feedback chữ; không chạy animation loop.
- Tab ẩn phải pause animation và không tích lũy delta lớn khi quay lại.
- Fallback PNG phải hoạt động khi WebGL, texture hoặc renderer lỗi.
- Không chạy CSS bounce/think trên toàn bộ avatar khi renderer 2D5D active.
- Không sửa gameplay, nội dung sách, progress schema hoặc Brain_Vault.
- GLB hiện tại và FoxPet3D.tsx không bị xóa trong các packet đầu; chỉ bỏ GLB khỏi active offline manifest ở phase 2D5D-03 sau acceptance.
- Mục tiêu runtime là tối thiểu khoảng 30 FPS trên tablet mục tiêu; nếu không đạt thì giảm subdivision/overlay trước khi giảm chất lượng artwork.
- Mỗi phase dừng ở READY_FOR_REVIEW; Luna không tự chạy phase kế tiếp.
- Checkout non-Git: không commit, push, merge, deploy, tạo branch hoặc xóa file.
- Executor duy nhất là task 01a08b45-8019-7a33-8761-b6d05450f6af, model gpt-5.6-luna, thinking max.

## File map và trách nhiệm

- Create: src/pet2d5d/types.ts — các type contract của rig, vertex, anchor, pose và controller.
- Create: src/pet2d5d/rig.ts — anchor table, grid topology, weight calculation và vertex deformation.
- Create: src/pet2d5d/rig.test.ts — kiểm tra deterministic topology, normalized weights và pose an toàn.
- Create: src/pet2d5d/motion.ts — state machine mood và spring integrator thuần, không phụ thuộc DOM/Three.
- Create: src/pet2d5d/motion.test.ts — kiểm tra transition, one-shot, reduced motion, visibility pause và continuity.
- Create: src/components/FoxPet2D5D.tsx — lifecycle Three.js, texture loading, render loop, resize và error boundary.
- Modify: src/components/Pet.tsx — trước hết thêm dev preview flag; sau đó đổi renderer chính ở packet integration.
- Modify: src/styles.css — stage/canvas sizing và tắt CSS whole-avatar motion cho renderer 2D5D.
- Modify: src/pwa/offline.ts — copy trạng thái offline dùng thuật ngữ pet artwork, không phụ thuộc GLB.
- Modify: vite.config.ts — chỉ ở phase cuối mới bỏ GLB URL/hash khỏi active precache.
- Create: docs/executor/PET-2D5D-01-READY_FOR_REVIEW.md, PET-2D5D-02-READY_FOR_REVIEW.md, PET-2D5D-03-READY_FOR_REVIEW.md — handoff evidence theo phase.
- Preserve: public/art/fox-pet-alpha.png, public/art/fox-pet.glb, src/components/FoxPet3D.tsx.

---

## Packet 2D5D-01 — Rig proof

Packet này tạo renderer độc lập và dev preview; production default vẫn dùng đường GLB cũ cho đến packet integration.

### Task 1: Định nghĩa rig contract và mesh topology

**Files:**
- Create: src/pet2d5d/types.ts
- Create: src/pet2d5d/rig.ts
- Test: src/pet2d5d/rig.test.ts

**Interfaces:**

- PetAnchorName là union gồm root, torso, head, ear-left, ear-right, wave-arm, compass-arm, tail-base, tail-mid, tail-tip, leg-left, leg-right.
- AnchorDefinition gồm x, y, influenceX, influenceY, maxRotation, maxScale, depth.
- FoxRigVertex gồm u, v, baseX, baseY, baseZ, và weights: Record<PetAnchorName, number>.
- FoxRigDefinition gồm columns, rows, vertices, indices, anchors.
- AnchorTransform gồm x, y, rotation, scale, z.
- FoxPose là Record<PetAnchorName, AnchorTransform>.
- Export createFoxRig(): FoxRigDefinition.
- Export createRestPose(rig: FoxRigDefinition): FoxPose.
- Export deformFoxVertices(rig: FoxRigDefinition, pose: FoxPose): Float32Array.
- Export weightsAreNormalized(rig: FoxRigDefinition, epsilon?: number): boolean.

Initial constants phải ghi rõ trong rig.ts:

- Grid: columns = 20, rows = 28; topology có (columns + 1) * (rows + 1) vertices và columns * rows * 6 indices.
- Anchor coordinates dùng normalized texture coordinates, y tăng từ trên xuống:
  - root = (0.56, 0.70);
  - torso = (0.57, 0.62);
  - head = (0.57, 0.25);
  - ear-left = (0.28, 0.16);
  - ear-right = (0.78, 0.12);
  - wave-arm = (0.86, 0.47);
  - compass-arm = (0.56, 0.62);
  - tail-base = (0.27, 0.69);
  - tail-mid = (0.14, 0.80);
  - tail-tip = (0.21, 0.90);
  - leg-left = (0.51, 0.92);
  - leg-right = (0.76, 0.92).
- Initial influence ellipse: torso/root 0.42/0.48, head 0.30/0.25, ears 0.18/0.14, arms 0.23/0.25, tail anchors 0.24/0.22, legs 0.19/0.18.
- Các giá trị chỉ được tune trong preview để bám asset; không đổi grid hoặc thêm anchor ngoài danh sách nếu chưa có correction packet.

- [ ] Step 1: Viết test RED cho topology và weight contract

    Tạo src/pet2d5d/rig.test.ts với các behavior sau:

    - createFoxRig() tạo đúng 609 vertices và 3360 indices theo grid 20x28.
    - Mỗi vertex có u/v trong 0..1, indices nằm trong range.
    - weightsAreNormalized(rig) trả true, mỗi weight không âm và tổng weight gần 1.
    - createRestPose(rig) tạo transform mặc định identity cho toàn bộ anchor.
    - deformFoxVertices(rig, restPose) trả mảng có độ dài vertices.length * 3 và không có NaN.

- [ ] Step 2: Chạy test RED

    Run: npx vitest run src/pet2d5d/rig.test.ts

    Expected: FAIL vì các module/type chưa tồn tại.

- [ ] Step 3: Viết type contract và deterministic grid

    Trong types.ts, khai báo các union/type nêu trên. Trong rig.ts, tạo grid UV đều từ (0,0) đến (1,1), triangulate mỗi cell theo hai triangle cố định và chuyển UV sang base position bằng công thức:

    baseX = (u - 0.5) * 2
    baseY = (0.5 - v) * 2 * (1373 / 1145)
    baseZ = 0

- [ ] Step 4: Viết weight calculation có fallback root

    Với mỗi vertex, tính contribution từ các anchor bằng smooth ellipse falloff. Normalize tổng contribution; nếu contribution bằng 0 thì gán root = 1. Không để weight âm và không làm tròn trước khi normalize.

    deformFoxVertices áp dụng transform quanh anchor pivot theo thứ tự translate → rotate → scale, sau đó blend theo weight. Clamp delta mỗi vertex vào giới hạn an toàn x/y <= 0.08 world unit và rotation <= 0.18 radian để tránh kéo rách artwork trong packet proof.

- [ ] Step 5: Chạy test GREEN và typecheck

    Run: npx vitest run src/pet2d5d/rig.test.ts

    Expected: PASS.

    Run: npm run typecheck

    Expected: exit 0.

### Task 2: Xây motion controller thuần

**Files:**
- Create: src/pet2d5d/motion.ts
- Test: src/pet2d5d/motion.test.ts

**Interfaces:**

- PetMotionController gồm:
  - setMood(mood: PetMood): void;
  - setReducedMotion(value: boolean): void;
  - setVisible(value: boolean): void;
  - advance(deltaSeconds: number): FoxPose;
  - getPose(): FoxPose;
  - isAnimating(): boolean.
- Export createPetMotionController(rig: FoxRigDefinition, initialMood: PetMood): PetMotionController.
- motion.ts chỉ import type từ motion/pet và pet2d5d/types; không import React, window, document hoặc Three.

Mood profile bắt buộc:

- idle: loop liên tục; torso y -0.012, root scale 1.006, tail rotations nối tiếp 0.035, 0.055, 0.075.
- greet: one-shot 0.84s; wave-arm rotation -0.14 rồi 0.12 rồi settle, head rotation -0.045, tail-tip 0.10.
- think: loop 1.6s; head rotation 0.055, ears 0.025, tail-mid 0.035.
- celebrate: one-shot 0.95s; root y -0.045, root scale 1.018, wave-arm -0.08, compass-arm 0.04, tail chain 0.10.
- rest: identity rest pose, isAnimating() === false.
- One-shot kết thúc phải settle về idle, trừ khi reducedMotion đang bật.

- [ ] Step 1: Viết test RED cho mood state

    Tạo test mô phỏng frame bằng advance(1 / 60):

    - Controller khởi tạo ở idle và pose hữu hạn.
    - setMood('greet') tạo pose khác rest trong thời gian one-shot.
    - Sau 90 frame, greet trở về idle thay vì giữ trạng thái one-shot.
    - setMood('celebrate') có root lift nhưng không vượt giới hạn profile.
    - setMood('think') tạo chuyển động lặp có dấu hiệu khác nhau ở hai mốc chu kỳ.

- [ ] Step 2: Viết test RED cho reduced motion và visibility

    - setReducedMotion(true) đặt mood hiệu dụng thành rest, trả pose tĩnh qua nhiều lần advance.
    - setVisible(false) làm isAnimating() false và advance không tích lũy thời gian.
    - setVisible(true) tiếp tục từ pose hiện tại, không tạo delta lớn.
    - Delta âm hoặc lớn hơn 0.05 giây bị clamp trong controller.

- [ ] Step 3: Chạy test RED

    Run: npx vitest run src/pet2d5d/motion.test.ts

    Expected: FAIL vì controller chưa tồn tại.

- [ ] Step 4: Implement spring integrator và mood profiles

    Mỗi transform có value và velocity; mỗi frame dùng:

    acceleration = (target - value) * stiffness - velocity * damping
    velocity += acceleration * delta
    value += velocity * delta

    Dùng stiffness = 170, damping = 22 cho thân/đầu/tay và stiffness = 110, damping = 16 cho chain đuôi. Clamp delta ở 0.05. Mood target được cập nhật theo profile; one-shot có elapsed time và chuyển về idle sau duration.

- [ ] Step 5: Chạy test GREEN

    Run: npx vitest run src/pet2d5d/motion.test.ts src/pet2d5d/rig.test.ts

    Expected: all tests PASS.

### Task 3: Tạo renderer 2D5D và dev-only preview

**Files:**
- Create: src/components/FoxPet2D5D.tsx
- Modify: src/components/Pet.tsx — chỉ thêm preview flag, không đổi production default.
- Modify: src/styles.css — thêm stage/canvas class cho preview.
- Test: dùng rig/motion tests từ Task 1–2; không tạo WebGL unit test giả.

**Interface của component:**

    type FoxPet2D5DProps = {
      mood: PetMood;
      reducedMotion: boolean;
      onReady: () => void;
      onError: () => void;
    };

    export function FoxPet2D5D(props: FoxPet2D5DProps): JSX.Element;

**Preview contract:**

- Pet.tsx đọc new URLSearchParams(window.location.search).has('pet-2d5d-preview') chỉ khi import.meta.env.DEV.
- Khi query pet-2d5d-error=1 xuất hiện cùng preview flag, component gọi onError trước khi tạo renderer để coordinator kiểm tra fallback PNG có chủ đích.
- Khi flag có mặt, render FoxPet2D5D; khi không có flag, giữ nguyên FoxPet3D.
- Preview không đổi mood API, button semantics, PNG loading fallback hoặc production build path.
- Không thêm query flag vào documentation/runtime URL sau khi phase integration đã thay default.

- [ ] Step 1: Tạo component skeleton và verify type failure boundary

    Tạo component nhận đúng props, trả canvas có class fox-pet-2d5d-canvas, gọi onError đúng một lần khi init fail và cleanup effect khi unmount.

    Trong DEV, nếu query pet-2d5d-error=1 tồn tại thì gọi onError đúng một lần trước khi dynamic import để tạo fallback harness; production build bỏ qua query này.

    Run: npm run typecheck

    Expected: component skeleton compile được nhưng chưa có render content.

- [ ] Step 2: Lazy-load Three và texture local

    Trong useEffect, dùng await import('three'), không import GLTFLoader. Tạo WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }), cap pixel ratio ở 1.5, set transparent clear color và SRGBColorSpace.

    Load duy nhất /art/fox-pet-alpha.png bằng TextureLoader. Đặt texture.colorSpace = THREE.SRGBColorSpace, material transparent: true, alphaTest: 0.02, depthWrite: false, side: THREE.DoubleSide.

- [ ] Step 3: Build geometry từ rig

    Tạo BufferGeometry với position, uv và index từ createFoxRig(). Mỗi frame lấy deformFoxVertices(rig, motion.advance(delta)) rồi ghi vào position attribute và gọi needsUpdate = true.

    Dùng THREE.MeshBasicMaterial; không thêm light, tone mapping, post-processing hoặc GLB loader. Camera orthographic phải giữ tỉ lệ texture 1145/1373 và căn giữa theo parent rect.

- [ ] Step 4: Implement lifecycle, resize và visibility

    - Dùng ResizeObserver trên parent stage.
    - Dùng document.visibilitychange để gọi controller.setVisible(!document.hidden).
    - Chỉ schedule RAF khi renderer sẵn sàng và controller.isAnimating().
    - Clamp frame delta trước khi gọi controller.
    - Cleanup ResizeObserver, listeners, RAF, geometry, material, texture, renderer và forceContextLoss nếu API tồn tại.
    - Mọi exception trong init/load/render gọi onError một lần.

- [ ] Step 5: Thêm preview stage nhưng giữ GLB default

    Trong Pet.tsx, thêm branch dev-only theo query flag. Đổi tên class stage mới thành fox-pet-2d5d-stage và class ready mới thành pet-avatar-2d5d-ready; giữ các class GLB cũ để default hiện tại không hồi quy.

    Trong styles.css, stage mới phải absolute inset 0, canvas display:block; width:100%; height:100%; pointer-events:none; PNG vẫn hiện trong lúc loading và bị ẩn sau onReady.

- [ ] Step 6: Chạy automated checks của packet

    Run: npx vitest run src/pet2d5d/rig.test.ts src/pet2d5d/motion.test.ts

    Expected: PASS.

    Run: npm run typecheck && npm run build

    Expected: cả hai exit 0.

- [ ] Step 7: Tạo handoff report và dừng

    Tạo docs/executor/PET-2D5D-01-READY_FOR_REVIEW.md gồm checkout, changed files, preview URL có query ?pet-2d5d-preview=1, commands/exit codes, known risks và xác nhận production default vẫn GLB. Không tự chạy packet 2D5D-02.

Checkpoint parent cho 2D5D-01:

- Kiểm tra diff/write-set thực tế.
- Chạy fresh tests, typecheck và build.
- Mở dev preview bằng CUA ở http://127.0.0.1:4173/?pet-2d5d-preview=1.
- Kiểm tra idle, tap/greet, think, celebrate, rest; desktop, tablet ngang/dọc và compact.
- Nếu seam/méo lông/mặt/la bàn hoặc error console, gửi correction vào cùng task Luna; chưa accept packet.

---

## Packet 2D5D-02 — Runtime integration

Chỉ giao sau khi parent accept PET-2D5D-01.

### Task 4: Đổi Pet facade sang 2D5D renderer

**Files:**
- Modify: src/components/Pet.tsx
- Modify: src/styles.css
- Preserve: src/components/FoxPet3D.tsx, public/art/fox-pet.glb

**Interfaces:**

- Pet vẫn nhận đúng PetProps hiện tại.
- FoxPet2D5D nhận mood, reducedMotion, onReady, onError.
- useFallback chỉ chuyển sang PNG khi onError; loading PNG vẫn được giữ cho đến onReady.

- [ ] Step 1: Viết integration checklist test bằng compile contract

    Xác nhận trong source rằng Pet.tsx import FoxPet2D5D, không import renderer GLB ở active path, vẫn có petMessage(visualMood), aria-label="Chạm vào Cáo Nhỏ" và fallback img src="/art/fox-pet-alpha.png".

    Run: rg -n "FoxPet3D|FoxPet2D5D|fox-pet-alpha|Chạm vào Cáo Nhỏ" src/components/Pet.tsx

    Expected: active render path là FoxPet2D5D; GLB component chỉ còn được giữ ở file legacy hoặc branch rollback rõ ràng.

- [ ] Step 2: Đổi renderer mặc định

    Bỏ dev-only decision khỏi đường runtime mặc định và render FoxPet2D5D trong stage chính. Chỉ giữ fallback PNG và is2D5DReady; không chạy đồng thời GLB canvas và 2D5D canvas.

- [ ] Step 3: Tách CSS whole-avatar motion khỏi 2D5D

    Thay các selector mood hiện tại bằng selector áp dụng cho legacy renderer hoặc selector không kích hoạt khi avatar có data-renderer="2d5d". 2D5D canvas tự điều khiển motion; PNG fallback ở reduced motion không bị bounce.

- [ ] Step 4: Chạy tests/typecheck/build

    Run: npm test -- --run

    Expected: all existing and new tests PASS.

    Run: npm run typecheck && npm run build

    Expected: exit 0.

- [ ] Step 5: Tạo handoff report và dừng

    Tạo docs/executor/PET-2D5D-02-READY_FOR_REVIEW.md với changed files, renderer path, fallback evidence, commands/exit codes, GLB còn giữ nguyên và risks. Không sửa Vite manifest để bỏ GLB ở packet này.

Checkpoint parent cho 2D5D-02:

- Walkthrough bằng CUA trên Journey, Lesson, Reward và PetView.
- Kiểm tra full và compact, tap, hint, correct, hidden tab, reduced motion.
- Kiểm tra PNG fallback bằng URL dev ?pet-2d5d-preview=1&pet-2d5d-error=1; không claim pass chỉ từ unit tests.
- Kiểm tra offline manifest vẫn hợp lệ và build production vẫn load artwork.
- Accept chỉ khi visual gate đạt; nếu chưa đạt, gửi correction vào cùng Luna.

### Task 5: Chuẩn hóa offline copy và active artifact contract

**Files:**
- Modify: src/pwa/offline.ts
- Modify: src/pwa/offline.test.ts
- Do not modify yet: vite.config.ts GLB allowlist/hash.

- [ ] Step 1: Viết test cho copy không phụ thuộc GLB

    Bổ sung test gọi offlineStatusCopy('checking') và offlineStatusCopy('ready'); expect detail chứa đúng chuỗi artwork pet và không chứa pet GLB.

- [ ] Step 2: Chạy test RED

    Run: npx vitest run src/pwa/offline.test.ts

    Expected: FAIL vì copy hiện tại còn ghi pet GLB.

- [ ] Step 3: Đổi copy offline

    Sửa hai detail string từ pet GLB thành đúng chuỗi artwork pet, giữ nguyên semantics cache shell/font/lesson. Không đổi status state machine.

- [ ] Step 4: Chạy test GREEN và regression

    Run: npx vitest run src/pwa/offline.test.ts

    Expected: PASS.

    Run: npm run typecheck

    Expected: exit 0.

- [ ] Step 5: Ghi evidence vào handoff

    Bổ sung vào PET-2D5D-02-READY_FOR_REVIEW.md rằng active manifest vẫn chứa GLB tạm thời để rollback và bước loại bỏ thuộc packet 2D5D-03.

---

## Packet 2D5D-03 — Polish và production QA

Chỉ giao sau khi parent accept PET-2D5D-02.

### Task 6: Polish spring/depth và remove GLB active precache

**Files:**
- Modify: src/pet2d5d/motion.ts
- Modify: src/pet2d5d/motion.test.ts
- Modify: src/styles.css
- Modify: vite.config.ts
- Modify: src/pwa/offline.test.ts
- Preserve: public/art/fox-pet.glb, src/components/FoxPet3D.tsx

- [ ] Step 1: Viết regression tests cho motion bounds

    Bổ sung test mô phỏng 10 giây idle và 2 lần greet/celebrate; assert pose không có NaN, abs(rotation) <= 0.18, abs(scale - 1) <= 0.03, root y không vượt 0.06, và reduced motion không thay đổi pose theo thời gian.

- [ ] Step 2: Chạy test RED nếu profile hiện tại vi phạm

    Run: npx vitest run src/pet2d5d/motion.test.ts

    Expected: PASS nếu profile đã đúng; nếu FAIL, dùng failure cụ thể để điều chỉnh profile, không nới bounds.

- [ ] Step 3: Tinh chỉnh mà không đổi artwork

    Điều chỉnh chỉ stiffness, damping, target transform và CSS stage/shadow. Không đổi texture, không thêm CSS whole-image animation, không thêm overlay khi chưa có bằng chứng seam-free.

- [ ] Step 4: Bỏ GLB khỏi active Vite allowlist

    Trong vite.config.ts:
    - xóa /art/fox-pet.glb khỏi LOCAL_ART_URLS;
    - xóa hash GLB khỏi LOCAL_ART_VERSIONS;
    - giữ lại PNG và font entries;
    - không xóa file GLB khỏi public/art/.

    Cập nhật offline assertion để production manifest không chứa /art/fox-pet.glb.

- [ ] Step 5: Chạy full automated verification

    Run: npm test -- --run

    Expected: all tests PASS.

    Run: npm run typecheck

    Expected: exit 0.

    Run: npm run build

    Expected: exit 0.

    Run: npm run validate:fox

    Expected: validator GLB cũ vẫn PASS nếu script còn được giữ; artifact legacy không bị hỏng chỉ vì đã bỏ khỏi manifest.

- [ ] Step 6: Tạo final handoff report và dừng

    Tạo docs/executor/PET-2D5D-03-READY_FOR_REVIEW.md gồm:
    - exact changed files;
    - test/typecheck/build/validator exit codes;
    - output dist/offline-manifest.json không có GLB;
    - GLB file vẫn tồn tại cho rollback;
    - open risks và giới hạn browser/tablet;
    - không có commit/push/deploy.

### Task 7: Parent-only final visual and runtime verification

Task này là checkpoint coordinator, không giao cho Luna như write task.

- Start production preview từ dist.
- Dùng CUA browser, không dùng Playwright/CDP/AppleScript.
- Kiểm tra desktop, tablet ngang, tablet dọc và mobile.
- Kiểm tra Journey full, Lesson compact, Reward compact, PetView full.
- Chụp/quan sát idle, greet, think, celebrate, rest.
- Bật reduced motion và xác nhận canvas pose tĩnh, feedback chữ còn nguyên.
- Chuyển tab ẩn/hiện và xác nhận không có jump lớn.
- Kiểm tra console không có error và offline manifest/artwork trả HTTP 200.
- Nếu lỗi, gửi correction vào cùng task Luna, ghi rõ repro, artifact và acceptance criterion bị fail; không tuyên bố MVP/pet complete trước khi re-verify.

## Coverage map

- Artwork preservation: Task 1, Task 3, Task 6.
- Rig anchors/weights/topology: Task 1.
- Spring mood behavior: Task 2, Task 6.
- WebGL renderer/lazy load/cleanup: Task 3.
- Pet API/fallback/touch/reduced motion: Task 4.
- Offline contract: Task 5, Task 6, Task 7.
- Responsive/visual quality: parent checkpoints after every packet, final Task 7.
- Rollback: GLB/PNG preservation in all packets; only active manifest changes in Task 6.
- Governance: packet handoff reports, no subagent, no Git lifecycle, same Luna task.
