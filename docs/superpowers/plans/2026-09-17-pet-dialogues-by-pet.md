# Hội thoại riêng cho từng Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở rộng hội thoại ở khu “Pet của tôi” thành bốn catalog riêng, mỗi Pet có đúng 30 câu dùng xưng hô `tớ`/`cậu` và đúng tính cách.

**Architecture:** Giữ catalog trong module TypeScript thuần `src/motion/petHomeConversation.ts`, dùng map type-safe theo `PetId`, và giữ alias `PET_HOME_DIALOGUES` cho catalog Cáo Nhỏ. Selector nhận `PetId`; `PetView` chọn theo `activePet.id`, còn `JourneyView` truyền rõ `fox-orange` để giữ hành vi hiện tại ngoài trang Pet.

**Tech Stack:** React 18, TypeScript, Vitest, Vite, CSS hiện có.

## Global Constraints

- Giữ xưng hô `tớ`/`cậu` cho toàn bộ lời thoại.
- Có đúng bốn catalog theo `PetId`: `fox-orange`, `elephant-blue`, `owl-purple`, `dragon-jade`.
- Mỗi catalog có đúng 30 câu, tổng cộng 120 câu; cả 120 text không trùng nhau.
- Mỗi Pet có sáu sắc thái hiện có: `encouraging`, `playful`, `curious`, `moody`, `joyful`, `serious`; mỗi sắc thái có năm câu.
- Không thêm API, database, persistence, audio, dependency, asset hoặc thay đổi nội dung bài học.
- Giữ hành vi mở khóa hiện tại; Pet khóa chỉ hiển thị thông tin và không thay thế `activePet` trong khu đồng hành.
- `PET_HOME_DIALOGUES` tiếp tục là alias của catalog `fox-orange` để giữ compatibility cho các consumer/test hiện có.
- Không deploy, không push, không gọi Supabase/Firebase và không tự commit.

---

### Task 1: Mở rộng catalog và selector theo Pet

**Files:**
- Modify: `src/motion/petHomeConversation.ts`
- Test: `src/motion/petHomeConversation.test.ts`
- Read-only dependency: `src/content/pets.ts` for the canonical `PetId` order and personality copy

**Interfaces:**
- Consumes: `PetId` from `src/content/pets.ts`.
- Produces:
  - `PET_HOME_DIALOGUES_BY_PET: Readonly<Record<PetId, readonly PetHomeDialogue[]>>`.
  - `PET_HOME_DIALOGUES: readonly PetHomeDialogue[]`, aliased to `PET_HOME_DIALOGUES_BY_PET['fox-orange']`.
  - `pickPetHomeDialogue(petId: PetId, previousIndex?: number, randomValue?: number): { index: number; dialogue: PetHomeDialogue }`.

- [ ] **Step 1: Write the failing catalog-shape tests**

Replace the current single-catalog assertions in `src/motion/petHomeConversation.test.ts` with tests that exercise the four-Pet contract:

```ts
import { describe, expect, it } from 'vitest';
import { PETS } from '../content/pets';
import {
  PET_HOME_DIALOGUES,
  PET_HOME_DIALOGUES_BY_PET,
  pickPetHomeDialogue,
} from './petHomeConversation';

const toneNames = ['encouraging', 'playful', 'curious', 'moody', 'joyful', 'serious'] as const;

describe('home Pet dialogue catalog', () => {
  it('contains thirty unique lines for every Pet and five lines per tone', () => {
    const catalogs = PETS.map((pet) => PET_HOME_DIALOGUES_BY_PET[pet.id]);
    const allDialogues = catalogs.flat();

    expect(Object.keys(PET_HOME_DIALOGUES_BY_PET)).toEqual(PETS.map((pet) => pet.id));
    expect(catalogs.map((catalog) => catalog.length)).toEqual([30, 30, 30, 30]);
    expect(new Set(allDialogues.map((item) => item.text)).size).toBe(120);
    expect(new Set(allDialogues.map((item) => item.tone))).toEqual(new Set(toneNames));
    expect(allDialogues.every((item) => /tớ|cậu/i.test(item.text))).toBe(true);
    expect(allDialogues.map((item) => item.text).join(' ')).not.toMatch(/\b(mình|con|bạn)\b/iu);

    for (const catalog of catalogs) {
      for (const tone of toneNames) {
        expect(catalog.filter((item) => item.tone === tone)).toHaveLength(5);
      }
    }
  });

  it('keeps the existing fox export as the default catalog alias', () => {
    expect(PET_HOME_DIALOGUES).toBe(PET_HOME_DIALOGUES_BY_PET['fox-orange']);
  });
});
```

- [ ] **Step 2: Run the catalog tests and observe the expected RED result**

Run:

```bash
npx vitest run src/motion/petHomeConversation.test.ts
```

Expected: FAIL because the current module exposes one 30-item array and the selector does not accept a `PetId`.

- [ ] **Step 3: Write the selector regression tests**

Add the following behavior checks to the same test file before changing production code:

```ts
it('selects from the requested Pet catalog and skips the previous index', () => {
  const next = pickPetHomeDialogue('owl-purple', 0, 0);

  expect(next.index).toBe(1);
  expect(next.dialogue).toBe(PET_HOME_DIALOGUES_BY_PET['owl-purple'][1]);
});

it('clamps random input and falls back to the first line for non-finite values', () => {
  expect(pickPetHomeDialogue('dragon-jade', -1, -1).index).toBe(0);
  expect(pickPetHomeDialogue('dragon-jade', -1, 1).index).toBe(29);
  expect(pickPetHomeDialogue('dragon-jade', -1, Number.NaN).index).toBe(0);
  expect(pickPetHomeDialogue('dragon-jade', -1, Number.POSITIVE_INFINITY).index).toBe(0);
});
```

- [ ] **Step 4: Run the selector tests and observe the expected RED result**

Run the same command from Step 2. Expected: FAIL at the missing Pet-aware function signature or at the missing Pet-specific catalog, not at a malformed test import.

- [ ] **Step 5: Implement the four catalog map and selector**

In `src/motion/petHomeConversation.ts`:

1. Import `type PetId` from `../content/pets`.
2. Keep the existing `PetHomeDialogueTone` and `PetHomeDialogue` types.
3. Keep the existing 30 Fox lines in their six tone groups so the current Cáo Nhỏ voice remains recognizable.
4. Add five new lines per tone for each of Voi Núi Xanh, Cú Tím Thám Hiểm, and Rồng Ngọc. Every line must include `tớ` or `cậu`, avoid `mình`, `con`, and `bạn`, and be visibly distinct from all other 119 lines.
5. Use the personality anchors from the approved spec:
   - Voi: calm pacing, patience, memory, mountain paths, village sounds, and protecting the team; avoid turning the Pet into a teacher or giving a factual lesson claim.
   - Cú: careful observation, viewpoints from above, tiny details, old streets/roofs, questions, and deduction; avoid unsupported historical claims.
   - Rồng: courage, generosity, map-vault light, opening paths, shared wonder, and celebrating progress; avoid promising rewards or changing unlock rules.
6. Declare all four keys explicitly and make the map satisfy `Readonly<Record<PetId, readonly PetHomeDialogue[]>>`.
7. Export `const PET_HOME_DIALOGUES = PET_HOME_DIALOGUES_BY_PET['fox-orange'];`.
8. Implement `pickPetHomeDialogue` with the approved deterministic behavior:

```ts
export function pickPetHomeDialogue(
  petId: PetId,
  previousIndex = -1,
  randomValue = Math.random(),
): { index: number; dialogue: PetHomeDialogue } {
  const catalog = PET_HOME_DIALOGUES_BY_PET[petId];
  const safeRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999) : 0;
  let index = Math.floor(safeRandom * catalog.length);
  if (index === previousIndex) index = (index + 1) % catalog.length;
  return { index, dialogue: catalog[index] };
}
```

- [ ] **Step 6: Run the catalog and selector tests to verify GREEN**

Run:

```bash
npx vitest run src/motion/petHomeConversation.test.ts
```

Expected: all catalog, alias, selector, boundary, and non-repeat assertions PASS.

### Task 2: Wire the active Pet catalog into PetView and preserve JourneyView

**Files:**
- Modify: `src/views/PetView.tsx`
- Modify: `src/views/JourneyView.tsx`
- Test: `src/views/PetView.test.tsx`
- Test: `src/views/JourneyView.test.tsx` only if imports/assertions need the explicit map

**Interfaces:**
- Consumes: `PET_HOME_DIALOGUES_BY_PET` and `pickPetHomeDialogue` from Task 1; `activePet.id` from the existing PetView unlock fallback.
- Produces: `PetView` passes text/tone from the selected unlocked Pet; `JourneyView` continues to use `fox-orange`.

- [ ] **Step 1: Extend the PetView test double and write the failing multi-Pet test**

Update the mocked `Pet` in `src/views/PetView.test.tsx` so it exposes the requested Pet id and tone:

```tsx
vi.mock('../components/Pet', () => ({
  Pet: ({ message, messageTone, onTap, pet }: {
    message?: string;
    messageTone?: string;
    onTap: () => void;
    pet?: { id: string };
  }) => createElement(
    'button',
    {
      type: 'button',
      'data-test-pet-button': true,
      'data-pet-id': pet?.id ?? 'missing',
      'data-tone': messageTone,
      onClick: onTap,
    },
    message,
  ),
}));
```

Add this test:

```tsx
it('uses the selected unlocked Pet catalog for the home dialogue', () => {
  act(() => root.render(createElement(PetView, {
    petMood: 'idle',
    reducedMotion: false,
    onPetTap: vi.fn(),
    onOpenSettings: vi.fn(),
    stamps: ['stamp-lesson-09', 'stamp-lesson-19', 'stamp-lesson-29'],
  })));

  for (const petId of ['fox-orange', 'elephant-blue', 'owl-purple', 'dragon-jade'] as const) {
    act(() => mount.querySelector<HTMLButtonElement>(`[data-pet-card][data-pet-id="${petId}"]`)?.click());

    const petButton = mount.querySelector<HTMLButtonElement>('[data-test-pet-button]');
    const catalog = PET_HOME_DIALOGUES_BY_PET[petId];
    const dialogue = catalog.find((item) => item.text === petButton?.textContent);

    expect(petButton?.dataset.petId).toBe(petId);
    expect(dialogue).toBeDefined();
    expect(petButton?.dataset.tone).toBe(dialogue?.tone);
  }
});
```

Also update the existing tap test to assert against `PET_HOME_DIALOGUES_BY_PET['fox-orange']` explicitly, while retaining its no-immediate-repeat and callback assertions.

- [ ] **Step 2: Run the focused PetView tests and observe the expected RED result**

Run:

```bash
npx vitest run src/views/PetView.test.tsx
```

Expected: FAIL because the selector currently has no Pet argument and the mock receives the existing Fox catalog regardless of the selected Pet.

- [ ] **Step 3: Update PetView to select by `activePet.id`**

In `src/views/PetView.tsx`:

1. Initialize state with `pickPetHomeDialogue(activePet.id)`.
2. Make `chooseHomeDialogue` call `pickPetHomeDialogue(activePet.id, homeDialogueIndexRef.current)` and depend on `activePet.id`.
3. Keep the existing effect keyed to `activePet.id` so choosing an unlocked Pet selects a fresh line from that Pet’s catalog.
4. Keep `handlePetTap` ordering: choose the next Pet-specific line, then call `onPetTap()`.
5. Keep `pet={activePet}`, the unlock fallback, selected-card behavior, story copy, and all existing props unchanged.

The resulting core should remain equivalent to:

```tsx
const [homeDialogue, setHomeDialogue] = useState(() => pickPetHomeDialogue(activePet.id));
const homeDialogueIndexRef = useRef(homeDialogue.index);

const chooseHomeDialogue = useCallback(() => {
  const next = pickPetHomeDialogue(activePet.id, homeDialogueIndexRef.current);
  homeDialogueIndexRef.current = next.index;
  setHomeDialogue(next);
}, [activePet.id]);

useEffect(() => {
  chooseHomeDialogue();
}, [activePet.id, chooseHomeDialogue]);
```

- [ ] **Step 4: Make JourneyView explicit without changing its behavior**

In `src/views/JourneyView.tsx`, import `DEFAULT_PET_ID` from `../content/pets` and pass it to both selector calls:

```tsx
const [homeDialogue, setHomeDialogue] = useState(() => pickPetHomeDialogue(DEFAULT_PET_ID));

const next = pickPetHomeDialogue(DEFAULT_PET_ID, homeDialogueIndexRef.current);
```

Keep `JourneyView`’s existing `PET_HOME_DIALOGUES`-based test valid by switching its import to `PET_HOME_DIALOGUES_BY_PET` and checking the `fox-orange` catalog, or leave the alias assertion if no test change is needed. Do not introduce selected Pet state into JourneyView.

- [ ] **Step 5: Run focused integration tests to verify GREEN**

Run:

```bash
npx vitest run src/motion/petHomeConversation.test.ts src/views/PetView.test.tsx src/views/JourneyView.test.tsx src/components/Pet.test.tsx
```

Expected: all dialogue catalog, active-Pet routing, Journey compatibility, existing unlock behavior, and bubble tone tests PASS.

### Task 3: Fresh whole-project verification and scope audit

**Files:**
- No additional production files.
- Verify: all changed source/tests plus `docs/superpowers/specs/2026-09-17-pet-dialogues-by-pet-design.md` and this plan.

**Interfaces:**
- Consumes: the implementation from Tasks 1–2.
- Produces: fresh test, typecheck, build, and diff evidence for handoff.

- [ ] **Step 1: Run the complete Vitest suite**

Run:

```bash
npm test
```

Expected: exit code `0` with no failed tests.

- [ ] **Step 2: Run client typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code `0` with no TypeScript errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: exit code `0`; an existing chunk-size warning is acceptable if no new error appears.

- [ ] **Step 4: Audit the final diff and requirements**

Run:

```bash
git status --short
git diff --check
git diff --stat
rg -n "pickPetHomeDialogue|PET_HOME_DIALOGUES_BY_PET|PET_HOME_DIALOGUES" src
```

Confirm:

- The four catalogs contain 30 lines each and all 120 lines are unique.
- All dialogue text keeps `tớ`/`cậu` and the four personality anchors are represented.
- Locked Pet behavior, progress, lesson content, APIs, and persistence are unchanged.
- No deployment, push, or cloud files were modified.
- Changes remain uncommitted unless the user separately requests a commit.
