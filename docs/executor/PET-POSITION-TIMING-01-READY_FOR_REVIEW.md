# PET-POSITION-TIMING-01 — READY_FOR_REVIEW

## Outcome

The compact lesson Pet now starts at the upper-left area with its widget center aligned to one third of the viewport height. The child can still drag it anywhere inside the viewport, and the existing keyboard movement and bounds remain intact.

Pet dialogue timing was changed from the previous short timing to an 8-second minimum:

- automatic primary cue: 8 seconds;
- reviewed SGK follow-up cue: 8 seconds;
- tap greeting: 8 seconds before returning to the automatic cue.

The automatic rotation pauses while the tap greeting is active and restarts from the primary cue afterwards.

All Pet-authored dialogue now uses the requested “tớ – cậu” relationship. Existing textbook/activity strings and parent-facing UI copy were left unchanged because they are not Pet dialogue.

## Rationale for 8 seconds

There is no single universal duration standard for educational speech bubbles. W3C WCAG guidance requires enough time to read and use timed content and recommends eliminating or adjusting time limits where possible. Material Design snackbars use a 4–10 second range for temporary messages. For a Vietnamese grade-4 learner and a source line containing page/PDF/locator, this implementation chooses the conservative 8-second default inside that range.

Sources:

- https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable
- https://m2.material.io/go/design-snackbar

## Changed files

- `src/components/floatingPetPosition.ts`
- `src/components/floatingPetPosition.test.ts`
- `src/components/FloatingPet.tsx`
- `src/components/FloatingPet.test.ts`
- `src/motion/pet.ts`
- `src/motion/pet.test.ts`
- `src/motion/petConversation.ts`
- `src/motion/petConversation.test.ts`
- `docs/superpowers/plans/2026-09-11-pet-conversation.md`

No dependency, content fact, persistence field, or audio asset was added.

## Verification evidence

```text
npx vitest run src/components/floatingPetPosition.test.ts src/components/FloatingPet.test.ts src/motion/petConversation.test.ts src/motion/pet.test.ts
4 files passed, 17 tests passed

npm test -- --run
16 files passed, 67 tests passed

npm run typecheck
passed

npm run build
passed
```

Tablet preview verification:

`http://127.0.0.1:4174/?pet-placement-timing=20260911-final`

Observed:

1. Pet appears in the upper-left around the one-third-height line.
2. After tapping, the “tớ – cậu” greeting remains visible at approximately 6.5 seconds.
3. The greeting returns to the automatic cue after the 8-second minimum.
4. The next automatic cycle shows the exact reviewed source follow-up.
5. Runtime warning/error query returned no entries.

The speech remains a text bubble; voice audio is still a separate future enhancement.
