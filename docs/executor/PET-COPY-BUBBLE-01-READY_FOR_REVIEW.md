# PET-COPY-BUBBLE-01 — READY_FOR_REVIEW

## Outcome

The full-size Pet speech bubble now renders above the Pet on both the Journey home screen and “Pet của tôi”. The tail points down toward the Pet, so the dialogue no longer sits under the feet. Compact lesson Pet layout and drag behaviour remain unchanged.

The compact lesson Pet now has warmer, more varied Vietnamese dialogue tied to the learner’s state:

- discovery, hint, choice, match, order, feedback, mission-complete, and lesson-complete states have distinct cues;
- progress and completion use different emotional moods, including `think`, `greet`, and `celebrate`;
- match progress and selected-card states use more conversational language;
- tap responses include supportive, playful, and celebratory lines;
- Pet-authored dialogue keeps the requested `tớ – cậu` relationship.

“Xem trong sách” now shows only the printed textbook page, for example `SGK Lịch sử và Địa lí 4 · trang 9 · ...`; the PDF page is no longer shown.

## Changed files

- `src/styles.css`
- `src/motion/petConversation.ts`
- `src/motion/petConversation.test.ts`
- `src/motion/pet.ts`
- `src/views/LessonView.tsx`
- `src/components/FloatingPet.test.ts`
- `docs/superpowers/plans/2026-09-11-pet-conversation.md`

No dependency, persistence field, source fact, answer-evaluation rule, or audio asset was added.

## Verification evidence

```text
npx vitest run src/motion/petConversation.test.ts src/motion/pet.test.ts src/components/FloatingPet.test.ts
3 files passed, 14 tests passed

npm test -- --run
16 files passed, 68 tests passed

npm run typecheck
passed

npm run build
passed
```

Tablet preview verification:

`http://127.0.0.1:4174/?pet-copy-layout=20260911-final-v2`

Observed:

1. Home: full-size Pet speech bubble is above the Pet, with the tail pointing toward the Pet.
2. “Pet của tôi”: full-size Pet speech bubble is above the Pet and does not sit below the feet.
3. Lesson: the compact Pet remains draggable and shows state-specific dialogue; the tested match state uses conversational `tớ – cậu` copy.
4. Expanded “Xem trong sách” shows `trang 9` without `PDF` or `trang in`.
5. Browser accessibility/runtime inspection returned no new warning or error entries.

The production build still reports the existing Three.js bundle-size warning; this change does not introduce it.
