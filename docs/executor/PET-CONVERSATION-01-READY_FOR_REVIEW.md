# PET-CONVERSATION-01 — READY_FOR_REVIEW

## Outcome

The compact lesson Pet now speaks in Vietnamese according to the learner's exact lesson state instead of showing one generic message:

- discovery: asks the learner to read the current mission's source material;
- choice: reacts to an empty or selected answer and preserves the current activity source;
- match: reports selected-card state and pair progress (`0/N`, `1/N`, complete);
- order: reacts after the learner moves a step;
- hint and feedback: keeps the guidance tied to the current activity;
- mission and lesson completion: gives the next action.

When a reviewed source exists, the Pet first shows a short readable instruction and then rotates to a separate source follow-up after 4.5 seconds. The source line keeps the exact reviewed reference format: printed page, PDF page, and locator.

Tapping the Pet temporarily switches to a warm or humorous Vietnamese greeting with `greet` mood for 0.9 seconds, then returns to the automatic cue. Existing drag behaviour is preserved; drag does not invoke the tap callback.

## Changed files

- `src/motion/petConversation.ts`
- `src/motion/petConversation.test.ts`
- `src/components/Pet.tsx`
- `src/components/FloatingPet.tsx`
- `src/components/FloatingPet.test.ts`
- `src/views/LessonView.tsx`
- `src/styles.css`
- `docs/superpowers/specs/2026-09-11-pet-conversation-design.md`
- `docs/superpowers/plans/2026-09-11-pet-conversation.md`

No new dependency, persistence field, audio asset, or answer-evaluation rule was added.

## Verification evidence

```text
npx vitest run src/motion/petConversation.test.ts src/components/FloatingPet.test.ts
2 files passed, 11 tests passed

npm test -- --run
15 files passed, 65 tests passed

npm run typecheck
passed

npm run build
passed
```

Production preview verification was performed at tablet dimensions on:

`http://127.0.0.1:4174/?pet-conversation=20260911-v2`

Observed behaviour:

1. The Pet initially showed a short cue for the current discovery/activity state.
2. After approximately 4.5 seconds it showed the exact current source reference, including `trang in`, `PDF`, and locator.
3. Tapping the Pet showed the state-specific wave greeting and returned to the automatic cue after approximately 0.9 seconds.
4. Moving an order card changed the Pet cue to acknowledge that exact interaction.
5. The browser runtime warning/error query returned no entries.

## Review notes / limitation

“Nói” in this implementation means an animated speech bubble. Voice synthesis/audio was intentionally not added because the bounded request did not define a voice UX, and the existing application audio contract should be expanded separately if spoken audio is desired.

The production build still reports the existing Three.js bundle-size warning; this change does not introduce it.
