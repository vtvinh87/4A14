# Progress Map visual review

Status: `NOT VERIFIED` for the required 95/100 viewport gate. The modal has been reviewed in the real local Vite app at all required CSS viewport sizes, but this session's CUA browser surface cannot persist screenshot bytes into the required QA files. No score is assigned.

## Evidence

- Browser: Codex In-app Browser, local Vite app at `http://127.0.0.1:5173/?progress-map-fixture=1`.
- Fixture: `src/components/progress/ProgressMapFixturePage.tsx`; synthetic local data only, no auth, cloud, credentials, or learner records.
- Zoom: browser default; exact CSS viewport was set for the correction sweep.
- Actual modal screenshots inspected inline: Kim Liên at `390×844`, `430×932`, `768×1024`, `1440×900`, `1180×700` and `844×390`; the short-landscape copy was then scrolled to verify the third fact and source link are reachable.
- Interaction smoke: all eight landmarks opened the matching small panel and modal; every modal image URL matched its dedicated `landmark-*.webp`, each had at least two facts, Escape returned focus to the image trigger, and the second Escape returned to the map without closing the board.
- Correction evidence: `Cố đô Hoa Lư` uses `landmark-hoa-lu.webp`, `Làng Sen Kim Liên` uses `landmark-kim-lien.webp`, `Phố cổ Hội An` uses `landmark-hoi-an.webp`; the Tây Nguyên and Mekong landmark hit areas are separated from their nearby topic markers.
- Modal geometry evidence: no horizontal overflow at any required viewport; image `object-fit: contain`; short landscape copy computed as `overflow-y: auto` with scroll height greater than its client height.

## Required screenshot matrix

Each row remains `NOT VERIFIED` until a real app screenshot is saved at the exact CSS viewport and the state is visually inspected.

| Viewport | Modal screenshot | Overflow | Modal/image geometry | Score |
|---|---|---|---|---|
| 390×844 | INLINE INSPECTED | PASS | modal 366×663; image 340×228 | NOT SCORED |
| 430×932 | INLINE INSPECTED | PASS | modal 406×640; image 381×254 | NOT SCORED |
| 768×1024 | INLINE INSPECTED | PASS | modal 745×451; image 372×249 | NOT SCORED |
| 1440×900 | INLINE INSPECTED | PASS | modal 900×398; image 456×305 | NOT SCORED |
| 1180×700 | INLINE INSPECTED | PASS | modal 900×369; image 466×270 | NOT SCORED |
| 844×390 | INLINE INSPECTED + copy scroll | PASS | modal 821×372; image 413×276; copy scrollable | NOT SCORED |

## Static and interaction gates already evidenced

- Map SHA-256 and intrinsic canvas: pass; `1840×1940`, hash `93bb877ea95e3cf02d8070f1b978f4772b471e430de3b1fb64a3e6e95eb785ba`.
- Supporting art: pass; 19/19 accepted ImageGen assets, alpha verified, runtime total `2,036,768` bytes.
- Functional suite: pass; latest full Vitest run `551 passed, 4 skipped`, with the four skips being existing DB integrations.
- Type/build: pass; client/server typecheck, production build, offline validation and `git diff --check` pass.
- Production boundary: pass; no cloud deployment or account mutation performed.

## Blocker

The available browser tool can set and inspect the six required CSS viewports, but it cannot persist the returned screenshot bytes as `design/progress-map/qa/<width>x<height>-<state>.png`; the installed workspace also has no Playwright/Puppeteer runner. Therefore this file deliberately does not assign 95/100 or `READY_FOR_REVIEW`.
