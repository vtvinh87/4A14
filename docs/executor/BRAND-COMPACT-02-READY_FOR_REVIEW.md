# BRAND-COMPACT-02 — READY_FOR_REVIEW

Date: 2026-09-11  
Coordinator: `01a090e4-181d-7682-81f5-9db0db71b9b2`  
Executor: `01a08b45-8019-7a33-8761-b6d05450f6af`  
Status: SOURCE_READY — TEMPORARY_ORIGINALS_INTEGRATED / FINAL_ART_PENDING

## Scope delivered

- `TopHud` now references `/art/brand-plaque-4a14.png` with alt text `4A14 VUI VẺ — Lịch sử & Địa lí 4`.
- The brand plaque is removed from the HUD flex flow and offset from the transformed `.top-hud` using the computed HUD edge, so only the upper-left anchor reaches the viewport edge. The right-side controls retain their existing markup, sizes, and right alignment.
- Lessons, Reward, Collection, Pet, and Parent use compact parchment title tags with semantic `h1` text: `Bài học`, `Hộ chiếu`, `Bộ sưu tập`, `Cáo Nhỏ`, and `Góc phụ huynh`.
- Journey launch title and Lesson hero are compacted while keeping the real lesson title, progress/status, source, instructions, and actions.
- Reward passport HTML copy and stamp lines were removed. The cover now references `/art/reward/passport-cover-lettered.png` with meaningful alt text `Hộ chiếu Cáo Nhỏ`.
- Reward artwork regression coverage was updated in `src/views/RewardView.test.ts`; the offline contract in `src/pwa/offline.test.ts` now expects `passport-cover-lettered`.
- `vite.config.ts` allowlists the two new asset URLs and fingerprints the exact files currently present. Existing original assets were not deleted.

## Verification evidence

| Check | Result |
| --- | --- |
| `npx vitest run src/views/RewardView.test.ts` | PASS — 1 test |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — 66 modules; existing Three.js chunk-size warning only |
| `npx vitest run` | PASS — 17 files / 70 tests |
| Production preview HTTP smoke | PASS — `/`, manifest, brand target, and passport target all returned HTTP 200 |

## Required parent handoff before full acceptance

The following target paths now exist, but they are temporary copies of the previous artwork, not the final generated replacements:

- `public/art/brand-plaque-4a14.png` — SHA-256 `6d19c3a248bc59778cb70db253a0deee6dda187952b6a4a490cf0c9154c3f5d4`
- `public/art/reward/passport-cover-lettered.png` — SHA-256 `d0c5934611a3de0caa45cc71c7474b5cf995eee3fb61ac4ab5b24074662f306c`

After the parent receives permission to process the generated artwork and supplies final alpha-clean files:

1. Replace these temporary hashes in `LOCAL_ART_VERSIONS` with the final SHA-256 values.
2. Run the full test suite, typecheck, production build, and HTTP/offline manifest smoke checks again. Parent visual QA remains required at 390, 820, and 1440px widths.

The current test/build pass proves source wiring and offline registration only; it does not constitute final artwork or visual acceptance.

No dependency, gameplay, image, Git, deployment, or Brain_Vault changes were made by this executor packet.
