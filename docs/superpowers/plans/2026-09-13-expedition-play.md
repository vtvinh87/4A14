# Expedition play implementation plan

**Goal:** Replace worksheet-like interactions with clear, tactile expedition games for nine-year-old learners, and audit actual play rather than accepting CSS hooks as evidence.

**Architecture:** Keep the deterministic session and reward engine. Extract the matching board into a dedicated measured SVG component. Redesign the lesson play surface around one task at a time, interactive discovery, a visible destination and collected progress. Keep offline assets and keyboard/touch support.

## Design and acceptance

- Matching: SVG curves must connect the exact chosen left/right ports, even for incorrect guesses. Different colors and numbered endpoints identify pairs; no correctness leak before submission. Recalculate on resize, font/text changes; permit unpair/re-pair. No disconnected decorative dashes. Tap pairing required; drag pairing with pointer cancellation and touch support is desirable if reliable.
- Exploration: reveal individual clue cards, use a mission goal and destination stamp illustration. Completion has a short finite reward animation and a clear next step. No countdown, lost lives or penalty for taking time.
- Choice: meaningful expedition decision cards with selected state and explicit confirmation; no unsolicited answer reveals.
- Order: build a route from an unplaced tile bank using taps, undo and accessible move controls. Preserve the existing order response contract.
- Select: collect several plausible clues into a visible satchel, support removing them. Distractors must be content-bearing, never the placeholder 'Manh mối của chặng khác'.
- Discovery/source: do not rebrand VBT page numbers as SGK. Preserve genuine provenance and use a verified SGK locator or a chapter/title lookup when exact SGK page is unverified. Strip internal authoring instructions from learner copy.
- Styling: parchment/map surfaces, meaningful ports, pockets and trail nodes, high-contrast legible Vietnamese, 44px+ controls; no endlessly wiggling ropes or competing decoration. Respect app and OS reduced motion. Preserve HUD, pet, passport and progress.

## Ownership and packets

- Luna Match: create only `src/components/games/MatchBoard.tsx`, `MatchBoard.css`, `MatchBoard.test.tsx`, optional `matchGeometry.ts` and test within same directory. Export MatchBoard with props `{ activity: Match; pairs: [string,string][]; selectedLeft: string|null; selectedRight: string|null; onLeft:(id:string)=>void; onRight:(id:string)=>void; onConnect?:(leftId:string,rightId:string)=>void }`. Import its own CSS. No LessonView/global CSS edits.
- Luna Play: own `src/views/LessonView.tsx`, its tests, new `src/views/lesson-play.css`, and new components under `src/components/expedition/`. Import MatchBoard from the agreed path. Do not touch MatchBoard files, content, storage, global CSS or Pet conversation. Preserve exported LessonView props and existing response contracts. Parent may follow with source formatting integration after handoff.
- Parent: content/packages, source formatting/pet copy, regression and migration audit, docs and final integration. No concurrent writes to agent-owned files.

## Execution

- [x] Match component: regression tests for arbitrary selected pairs, undo/re-pair and measured endpoints; implementation; targeted tests.
- [x] Play surface: discovery reveal state, route placement/undo, satchel select and feedback; tests for actual interactions.
- [x] Parent: replace repeated m4/m5 choice prompts with 54 evidence/application decisions; replace filler select distractors; correct SGK references; inspect legacy progress and preserve verified lesson 01/07 three-mission stamps. The m5 order exercise remains deliberate review of the earlier learning route.
- [x] Parent audit: review changes; run suite/typecheck/build; browser play at 1280x720 and 390x844 plus resize of connected ropes; test wrong/correct answers, undo/reconnect, order/select, no overflow, reduced motion, persistence.
- [x] Correct findings through the same executors. Record verified evidence and limitations here.

No Git lifecycle, deployment, external writes or Brain_Vault writes. User explicitly requested Luna Max assistants in this task; use subagents under the current tool policy, not separate sidebar tasks.


## Parent audit and recovery checkpoint — 2026-09-13

Two GPT-5.6 Luna Max assistants implemented and corrected disjoint packets. Coordinator resumed after quota interruption from files and the existing browser tab, without restarting the implementation.

Actual browser audit on isolated localhost:4173:
- Wrong selected pair draws a real curve, with identical pre-check treatment to correct pairs. Tap removes a pair; tapping again reconnects it to another card. Mouse drag between nature cards successfully creates a pair. Three-pair activity completed using both drag and tap.
- Connected board resized from 1280×720 to 390×844. Measured port centers match path coordinates within rounding (under 1px); document width remains 390px. No disconnected fake rope segments.
- Incorrect choice shows retry; retry and correct submission work. Confirmed correct answer position changes across activities and stays stable in a turn.
- Discovery requires all clue cards opened. Order starts empty with a non-answer-ordered bank; place/undo/move-up and complete submission verified. Satchel empty/one/two selected, remove/re-add, disabled incomplete submit and successful evaluation verified on both widths.
- Fox speech previously overlapped right-side cards: replaced by in-flow guide within lesson only. Landscape trail is horizontal at 901–1400px. At the page end all action buttons can be scrolled clear of the dock; existing fixed HUD/dock remain.
- Refresh after matching feedback restored the same lesson, evaluation and progress. App reduced-motion setting produced `animation: none; duration: 0s` on the reward mark; setting restored after audit.
- SGK chapter ranges were read from the supplied textbook TOC (printed pages 4–5, rendered source-check images). VBT provenance is retained in content; chapter references are not claims of exact fact-level SGK review.

Additional corrections from code audit:
- Hover transforms removed from matching cards to prevent endpoint drift. Touch uses tap + vertical scrolling; mouse/pen supports drag and a temporary pointer tether.
- New .test.tsx tests included in the standard test command.
- Satchel remove buttons and textbook summaries enlarged to 44px minimum.
- Neutral Pet copy avoids asserting correctness before grading.
- Legacy lesson 01/07 stamps retained with 3 completed missions, without inventing completion of m4/m5. Terminal old sessions are cleared only after successful replay against the explicit legacy lesson. Invalid imports remain rejected and raw data preserved.
- Updated generic choice feedback distinguishes the selected question/answer from the supporting fact, while persisted evaluation strings remain unchanged.

Limits: this is an engineering and visual audit, not a usability study with children. Existing content still includes review exercises; the change does not claim 29 unique game engines or a complete new curriculum. Legacy migration is scoped to the two verified original sample lessons. Physical touch-device behavior has unit coverage and responsive inspection; mouse drag was exercised in the browser. Existing large Three.js bundle warning remains.

Final parent verification: `npm test -- --reporter=dot` passed 31 files / 140 tests at 15:03 on 2026-09-13; `npm run build` passed TypeScript and Vite production build, emitting all 29 lesson JSON packages. The only build warning is the existing Three.js chunk size.

## User correction — restore companion and sequential access (2026-09-13)

Supersedes the text-only in-flow guide decision above. Restored animated Pet component with speech bubble in its own lesson region for every stage, contextual cue/follow-up and tap-triggered playful lines. The banner “LỜI NHẮC TRÊN ĐƯỜNG” is removed. Pet remains in layout to prevent covering activity cards. Verified actual fox and changing speech at 1280 and 390 widths.

Added shared sequential access policy: lesson 01 opens initially; each later lesson requires all five missions in the immediately previous lesson. Existing reward data is untouched. Applied catalog disabled controls + explanatory copy, journey shortcut, App entry/render guard (including restored navigation), and session-event guard. Tests cover all 28 transitions, 4/5 rejection, 5/5 unlocking and catalog reactive update.

Assistant reuse was attempted but rejected by the agent-thread limit; parent implemented the correction directly. Fresh production build passed after implementation. Final suite: 32 files / 143 tests passed.
