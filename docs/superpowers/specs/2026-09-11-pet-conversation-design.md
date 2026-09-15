# Pet conversation cues — design

## Goal

Make the compact Pet in lesson pages feel present and helpful without inventing textbook content. It should speak from the current lesson state, guide the child to the exact reviewed source, and react warmly when tapped.

## Behaviour

- The lesson derives one deterministic automatic cue from the current stage, mission, activity, local answer progress, hint state, and evaluation.
- Source guidance is formatted only from the existing reviewed `SourceRef` values. When an activity has multiple references, the cue names each reviewed location in the same order as the existing “Xem trong sách” disclosure.
- Choice, match, and order activities have distinct guidance. Match cues report the exact number of completed pairs; choice cues can echo the selected option; order cues distinguish untouched from rearranged state.
- Discovery, answer, feedback, mission-complete, and lesson-complete states each have a cue with a next action appropriate to that state.
- Tapping the compact Pet temporarily overrides the automatic cue with a warm or playful greeting and switches its motion to `greet` for the existing one-shot animation duration. After the short interaction window, the automatic cue returns.
- Reduced motion still suppresses the animation through the existing Pet motion contract while preserving the spoken text.
- The current drag interaction remains unchanged: a drag does not trigger the tap greeting; a tap still invokes the parent callback.

## Boundaries

- No new facts, source references, answer evaluation rules, persistence fields, audio dependency, or content schema are added.
- Full-size Pet surfaces retain their existing default messages unless an explicit message is supplied.
- The cue engine is a pure module so copy and source formatting are testable without rendering React.
- `Pet` accepts an optional message; `FloatingPet` owns the short-lived tap override because it already owns pointer/tap interaction.

## Verification

- Pure cue tests cover source fidelity, every session stage, all three activity types, progress counts, hint state, and tap copy.
- FloatingPet tests cover passing the automatic message, temporary greet override, return to the automatic message, and preserving the existing drag/tap contract.
- Existing motion, application, full test, typecheck, production build, and tablet browser smoke checks remain required.
