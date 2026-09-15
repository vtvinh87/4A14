# Pet Conversation Cues Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with a test-first cycle. The coordinator reviews the production preview after all tasks.

**Goal:** Give the compact lesson Pet accurate, state-aware Vietnamese guidance and a warm animated response when tapped.

**Architecture:** A pure `petConversation` module maps reviewed lesson/session data and local answer progress to a deterministic cue. `LessonView` supplies that cue to `FloatingPet`; `FloatingPet` briefly overrides it with a `greet` cue on a real tap while preserving the existing drag contract. Automatic cues use a short primary message and, when a reviewed source exists, rotate to a separate exact `Xem trong sách` follow-up so the compact tablet bubble stays readable. Each cue stays visible for at least 8 seconds. The initial floating position places the widget center at one third of the viewport height on the left. `Pet` renders the supplied message and keeps its default for other surfaces.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, existing 2D/2.5D Pet motion runtime.

## Global Constraints

- Use only existing reviewed `SourceRef` data for textbook location guidance.
- Keep Vietnamese copy suitable for a 9-year-old and preserve the existing tablet-first layout.
- Do not add dependencies, audio, persistence fields, new content facts, or alter answer evaluation.
- A drag must not invoke the Pet tap callback; a tap must still invoke it.
- Respect reduced-motion settings: text remains available while animation is suppressed by the existing motion resolver.

### Task 1: Pure cue engine

**Files:**
- Create: `src/motion/petConversation.ts`
- Test: `src/motion/petConversation.test.ts`

**Interfaces:**
- `getLessonPetCue(context: LessonPetContext): PetCue`
- `getPetTapCue(context: LessonPetContext): PetCue`
- `PetCue = { key: string; mood: PetMood; message: string; followUpMessage?: string }`
- `LessonPetContext` contains `stage`, `mission`, optional `activity`, activity position, `hintUsed`, `evaluation`, selected choice text, match counts, whether a match card is selected, and whether an order was adjusted.

- [x] Write failing tests for exact reviewed source text, discovery guidance, answer guidance for choice/match/order, hint-used guidance, correct/incorrect feedback, mission/lesson completion, and warm tap copy.
- [x] Run `npx vitest run src/motion/petConversation.test.ts`; confirm failure because the module is absent.
- [x] Implement source formatting and the minimal deterministic cue mapping.
- [x] Run the targeted test again; confirm all cue cases pass.

### Task 2: Pet message and tap response

**Files:**
- Modify: `src/components/Pet.tsx`
- Modify: `src/components/FloatingPet.tsx`
- Test: `src/components/FloatingPet.test.ts`

**Interfaces:**
- `Pet` accepts optional `message?: string`.
- `FloatingPet` accepts `message?: string`, `followUpMessage?: string`, and `tapMessage?: string`.

- [x] Add a failing interaction test asserting the mocked Pet receives the automatic message initially, receives the tap message plus `greet` on click, and returns to the automatic message after the short timeout.
- [x] Run the targeted test and confirm the expected missing-prop/override failure.
- [x] Add the optional message rendering to `Pet` and a timer-backed tap override to `FloatingPet`; clear the timer on unmount and preserve drag suppression.
- [x] Add the small speech-bubble entrance animation keyed by message, disabled under reduced motion.
- [x] Add a separate source follow-up prop and an 8-second rotation so long references do not obscure the lesson activity.
- [x] Keep tap greetings visible for the same 8-second minimum and use only the tớ–cậu relationship in Pet-authored copy.
- [x] Run the targeted test and the existing floating-position tests.

### Task 3: Wire lesson state to cues

**Files:**
- Modify: `src/views/LessonView.tsx`

**Interfaces:**
- Build `LessonPetContext` from existing `lesson`, `mission`, `activity`, `session`, and local input state.
- Pass `cue.message` and `tapCue.message` to `FloatingPet`; pass `cue.mood` as its automatic mood.

- [x] Add a failing integration-level assertion or pure call-site test for the screenshot state: match activity with zero pairs must mention selecting one card from each column and the exact activity source references.
- [x] Run the targeted test and confirm the pre-wire failure.
- [x] Implement the context mapping without changing activity submission or persistence.
- [x] Run the cue, floating Pet, session, and full test suites.

### Task 4: Verify production behaviour

**Files:**
- Modify: `docs/superpowers/plans/2026-09-11-pet-conversation.md` with evidence.
- Create: `docs/executor/PET-CONVERSATION-01-READY_FOR_REVIEW.md`.

- [x] Run `npm run typecheck`, `npm test -- --run`, and `npm run build`.
- [x] Reload production preview at `http://127.0.0.1:4174/` and verify the lesson screenshot state, exact source guidance, tap greeting/wave, drag-versus-tap behavior, and no console errors at tablet dimensions.
- [x] Record commands, counts, changed files, and remaining limitations in the handoff report.

## Coordinator verification — previous checkpoint — 2026-09-11

- Targeted cue and FloatingPet tests: 11/11 passed.
- Full Vitest suite: 15 files, 65 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite emitted the existing Three.js chunk-size warning only.
- Tablet preview `http://127.0.0.1:4174/?pet-conversation=20260911-v2`: verified the initial state cue, exact source follow-up after approximately 4.5 seconds, tap greeting with `greet` mood, return to automatic cue after approximately 0.9 seconds, and a context update after an order interaction. Runtime warning/error log query returned no entries.
- The implementation remains text-bubble based; no voice audio was added in this bounded change.

## Coordinator verification — bubble placement, richer copy, and printed-page source — 2026-09-11

- Full-size Pet bubbles now use a reverse vertical layout so the bubble is above the avatar on Home and “Pet của tôi”; compact lesson bubbles retain their horizontal layout.
- Added warmer deterministic copy variants across discovery, hint, choice, match, order, feedback, mission completion, lesson completion, and Pet-tap states, with `think`, `greet`, and `celebrate` mood changes.
- Replaced source labels that exposed the PDF page with the learner-facing printed-page format `trang N` in both the Pet follow-up and the lesson “Xem trong sách” disclosure.
- Fresh targeted verification: 3 files, 14 tests passed; full Vitest suite: 16 files, 68 tests passed; `npm run typecheck` and `npm run build` passed. Tablet browser inspection is recorded in `docs/executor/PET-COPY-BUBBLE-01-READY_FOR_REVIEW.md`.

## Coordinator verification — position, timing, and pronouns — 2026-09-11

- Added `FLOATING_PET_TOP_THIRD`: the initial widget center is one third of the viewport height, left aligned with the existing edge gap; drag and keyboard bounds remain unchanged.
- Set the minimum automatic and tap cue duration to 8 seconds. The timer pauses its automatic rotation while the tap greeting is active, then restarts from the primary cue.
- Replaced Pet-authored `mình/con/bạn` copy with the requested `tớ/cậu` relationship. Textbook/content strings outside Pet dialogue were not rewritten.
- Targeted position, timing, and copy tests: 17/17 passed.
- Full Vitest suite: 16 files, 67 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; the existing Three.js chunk-size warning remains.
- Tablet preview `http://127.0.0.1:4174/?pet-placement-timing=20260911-final`: verified the Pet at the upper-right one-third position, tap greeting still visible at approximately 6.5 seconds, automatic return after 8 seconds, and source follow-up visible in the next 8-second cycle. Runtime warning/error query returned no entries.
