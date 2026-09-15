# PET-3D-HIFI-01 — READY_FOR_REVIEW

Ngày: 2026-09-11  
Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`  
Phạm vi: tìm và xác minh một fox 3D có chất lượng cao, license rõ ràng, tải được không cần login/purchase; chỉ tích hợp sau khi qua kiểm tra visual + GLB/rig/animation.

## Trạng thái

`READY_FOR_REVIEW — BLOCKED_ON_LAWFUL_ASSET_ACQUISITION`

Không có candidate nào vừa đạt visual identity đã duyệt, biped/rig/animation contract, và tải hợp pháp không cần login. Candidate tốt nhất là **KAI — The Little Fox Warrior (Animated)** trên Sketchfab, nhưng nút tải công khai mở modal login và API download trả HTTP `401` yêu cầu credentials. Không bypass WAF/login, không tạo account, không mua asset.

Runtime hiện tại không bị thay đổi trong packet này:

- Không tạo `public/art/fox-pet-hifi.glb`.
- Không ghi đè hoặc xoá `public/art/fox-pet.glb`.
- Không đổi `FoxPet3D`, `Pet`, offline allowlist hay mapping animation.
- PNG fallback và procedural GLB đã được duyệt kỹ thuật vẫn là đường chạy hiện tại.

## Tiêu chí candidate

Candidate phải đồng thời có:

- fox biped child-friendly, màu cam/kem, mắt/mõm/tai/chân/đuôi biểu cảm, gần concept đã duyệt;
- scarf teal, backpack teal và compass gold hoặc có attachment/pivot đủ rõ để bổ sung cục bộ;
- GLB/glTF tải trực tiếp được, khoảng 20k–150k triangles, texture tối đa 2K và material count có thể kiểm soát;
- skin/skeleton thật, chuyển động độc lập cho body/head/ears/arms/legs/tail;
- các clip có thể map vào `idle`, `greet`, `think`, `celebrate`, `rest`;
- license/attribution đủ rõ cho app giáo dục local/offline, kèm provenance và checksum.

## Candidate matrix

Các số `faces/vertices` của Sketchfab là số liệu platform công bố; các số GLB direct-download được parse local từ JSON chunk của GLB.

| Candidate và nguồn | Tác giả / license | Bằng chứng kỹ thuật | Kiểm tra visual / tải | Kết luận |
| --- | --- | --- | --- | --- |
| [KAI — The Little Fox Warrior (Animated)](https://sketchfab.com/3d-models/kai-the-little-fox-warrior-animated-aa56e447b578470b8d6b1b9587fd29ac) · [API metadata](https://api.sketchfab.com/v3/models/aa56e447b578470b8d6b1b9587fd29ac) | Realidad Aumentada Empezando Desde Cero · CC Attribution 4.0; commercial use allowed with attribution theo metadata | 49,872 faces; 24,938 vertices; 1 texture; 1 material; 8 clips: `Hello`, `Idle`, `Kick`, `Pray`, `Punch`, `Run`, `T-pose`, `Walk`; rigged | Biped, mắt xanh lớn, fox cartoon và armor fantasy có độ chi tiết phù hợp nhất. Public Download mở login; `https://api.sketchfab.com/v3/models/aa56e447b578470b8d6b1b9587fd29ac/download` trả `401 Authentication credentials were not provided` | **Không tích hợp: login-gated** |
| [Rigged Cute Fox character](https://sketchfab.com/3d-models/rigged-cute-fox-character-ab556b01e9be4163888a9c1ac05675db) · [API metadata](https://api.sketchfab.com/v3/models/ab556b01e9be4163888a9c1ac05675db) | Robetti · CC Attribution 4.0; commercial use allowed with attribution theo metadata | 1,127,936 faces; 564,628 vertices; 0 animations; 0 textures; 4 materials | Trang public cho biết downloadable, nhưng download API vẫn cần auth. Viewer/thumbnail là silhouette fox đơn giản, quá nặng và không có identity accessories | **Không đạt visual/animation/performance** |
| [fox-character-rigged](https://sketchfab.com/3d-models/fox-character-rigged-a6a1a9c234094f4aac3dd24bf8673317) · [API metadata](https://api.sketchfab.com/v3/models/a6a1a9c234094f4aac3dd24bf8673317) | atharv (`atharv.choughule`) · CC Attribution 4.0; commercial use allowed with attribution theo metadata | 231,936 faces; 116,207 vertices; 0 animations; 0 textures; 4 materials | Là silhouette cam/kem gần nhất trong shortlist nhưng untextured và không có animation metadata; public download cũng auth-gated | **Không đạt identity/animation** |
| [Cute Furry Fox](https://sketchfab.com/3d-models/cute-furry-fox-8b804a6ba36a47ce97fa70d1baa3dcb5) · [API metadata](https://api.sketchfab.com/v3/models/8b804a6ba36a47ce97fa70d1baa3dcb5) | EnotoButerbrodo · CC Attribution 4.0 theo metadata; attribution required | 33,744 faces; 17,153 vertices; 0 animations; 2 textures; 2 materials; mô tả ghi “rigged (here static mesh)” | Thumbnail là fox humanoid lông xanh kiểu VRChat, không khớp orange/cream pet; mô tả còn trỏ tới product page ngoài | **Không đạt identity/animation** |
| [Fox — Quaternius / Poly Pizza](https://poly.pizza/m/Bc97C66HKi) · [direct GLB](https://static.poly.pizza/e18e86df-1692-48d8-ac6e-1e25ab4ad574.glb) | Quaternius · Public Domain (CC0) trên trang asset; không cần attribution | 3,752 vertices; 1,848 triangles; 51 joints; 5 materials; 23 clip entries (gồm tên duplicate `AnimalArmature|...`) | Tải trực tiếp được, nhưng viewer cho thấy fox low-poly **bốn chân**, không phải biped pet; không có scarf/backpack/compass | **Không thay thế được** |
| [Fox — Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/Fox/README.md) · [direct GLB](https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb) | Model PixelMannen CC0; rig/animation của tomkranis và conversion của AsoboStudio/scurest CC BY 4.0, cần attribution theo README | 1 mesh; 1 skin; 24 joints; 1,728 vertices; 576 triangles; `Survey`, `Walk`, `Run`; 1 texture/material | Tải trực tiếp và license công khai, nhưng đây là fox **bốn chân** rất low-poly, không khớp approved biped identity | **Không thay thế được** |
| [Xenia The Linux fox 3D model](https://github.com/DynTylluan/xenia-the-linux-mascot-nickisdoge) · [FBX source](https://raw.githubusercontent.com/DynTylluan/xenia-the-linux-mascot-nickisdoge/main/source/xenia%20model%20final/xenia_model_35.fbx) | Model Nickisdoge; texture ZweiLuke; README yêu cầu full credit và nói character Xenia là CC0; repo hiển thị CC-BY-4.0 license | File tải trực tiếp là FBX, binary check thấy skin/deformer/cluster; không có GLB sẵn và chưa có bằng chứng clip animation đủ cho contract | Preview là fox đeo kính, áo đen kiểu Linux mascot; sai identity, màu và tone trẻ em; cần converter/authoring ngoài checkout | **Không đạt identity/pipeline** |

## Quyền sử dụng và blocker cụ thể

KAI là candidate duy nhất trong vòng này đồng thời có silhouette biped, visual cartoon đủ tốt, rig và nhiều animation. Trang public ghi tác giả, CC Attribution và 8 clip; license link là [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Tuy nhiên:

1. Click public `Download 3D Model` mở modal `Log in to Sketchfab`.
2. Endpoint download public trả HTTP `401` với `www-authenticate: Token`.
3. Direct page request qua CDN bị WAF challenge, không có file GLB công khai để tải từ page.

Việc lấy signed URL, scrape viewer internals hoặc dùng account để vượt login sẽ vi phạm boundary của packet. Vì vậy metadata/license không đủ để coi asset là đã acquired; không được đưa KAI vào build khi chưa có file và provenance hợp lệ.

## Checksum các file đã tải để loại trừ (temporary, không commit)

Các file dưới đây chỉ nằm trong `/tmp` để inspect và không được đưa vào app:

```text
/tmp/hoc-vui-poly-fox-quaternius.glb
  bytes: 960228
  sha256: 9917771e1414c46557b011cbaaee6de82a827605008227a364c3862f0be62ddc

/tmp/hoc-vui-khronos-fox.glb
  bytes: 162852
  sha256: d97044e701822bac5a62696459b27d7b375aada5de8574ed4362edbba94771f7

/tmp/hoc-vui-xenia.fbx
  bytes: 312444
  sha256: cc774e4b93f33ea2aa2ec5bae0f0c1f2a5c3d4a9f35ca398de394d3da40ef18f
```

Asset đang chạy được giữ nguyên và đã đối chiếu lại:

```text
public/art/fox-pet.glb
  bytes: 163172
  sha256: 73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40

public/art/fox-pet-hifi.glb: absent
```

## Asset brief cho lần unblock tiếp theo

Khi coordinator cung cấp file tải được hoặc một nguồn không yêu cầu login/purchase, packet tiếp theo dùng đúng contract này:

- file đích `public/art/fox-pet-hifi.glb` và sidecar `public/art/fox-pet-hifi-LICENSE-AND-ATTRIBUTION.txt`;
- orange/cream biped fox, big expressive eyes, muzzle, upright ears, paws, segmented tail;
- teal scarf, teal backpack và gold compass là mesh/material hoặc attachment pivots thực, không vẽ đè lên PNG;
- 20k–150k triangles, texture tối đa 2K, tối đa 8 materials;
- skeleton có root/pelvis/spine/chest/neck/head, ear L/R, arms, legs, tail segments và accessory pivots;
- clips có thể map thành `idle`, `greet`, `think`, `celebrate`, `rest`; nếu tên khác thì map bằng metadata/loader, không giả animation;
- provenance ghi source URL, tác giả, license, attribution text, ngày tải và SHA-256; validator kiểm tra GLB magic/version, skin attributes, joint ranges, clip targets và giới hạn tài nguyên;
- runtime vẫn lazy-load local Three.js, precache exact allowlist + hash, cleanup khi unmount, tôn trọng reduced-motion/visibility và giữ PNG fallback khi WebGL/loader fail.

## Verification của packet

```text
Direct asset inspection
  -> Quaternius GLB: parse OK; 1,848 triangles / 3,752 vertices / 51 joints; 5 materials; animated quadruped
  -> Khronos GLB: parse OK; 576 triangles / 1,728 vertices / 24 joints; Survey/Walk/Run; animated quadruped
  -> Xenia FBX: file type valid; skin/deformer/cluster strings present; no GLB or approved identity

Current app asset preservation
  -> public/art/fox-pet.glb SHA-256 unchanged: 73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40
  -> public/art/fox-pet-hifi.glb absent; runtime switch not attempted
```

Không có code/runtime change để đưa vào acceptance của packet này. Coordinator cần chọn một trong hai hướng unblock: cung cấp một asset file + license bundle đáp ứng brief, hoặc cho phép một nguồn download công khai khác; trong cả hai trường hợp vẫn phải review visual và chạy validator/build trước khi thay `fox-pet.glb`.

