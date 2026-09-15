# Đăng nhập và hội thoại Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cập nhật copy đăng nhập và làm Pet ở trang “Pet của tôi” có 30 lời thoại local ngẫu nhiên cùng bong bóng được thiết kế lại, chỉ áp dụng cho localhost:8888.

**Architecture:** Giữ nguyên contract xác thực và component `Pet`; thêm một module pure `petHomeConversation` để quản lý catalog và chọn câu không lặp ngay. `PetView` giữ chỉ số câu hiện tại, đổi câu khi khởi tạo/chạm/đổi Pet; `Pet` nhận thêm tone để tạo class CSS. CSS chỉ nâng lớp bubble trong khu Pet, không vượt modal.

**Tech Stack:** React 18, TypeScript, Vitest, Vite, CSS hiện có.

## Global Constraints

- Chỉ sửa local checkout `/Volumes/Pictures/Projects/Hoc_Vui`; không deploy Firebase, không push GitHub, không gọi Supabase CLI.
- Không đổi API, database, persistence, PIN six-cell, luồng xác thực hoặc nội dung bài học.
- Liên kết phải dùng chính xác `https://zalo.me/0948584429`, `target="_blank"`, `rel="noreferrer"`.
- Catalog phải có đúng tối thiểu 30 câu duyệt trong spec; không lặp câu vừa hiển thị.
- Lời thoại dùng quan hệ `tớ`/`cậu`; không tự động đổi theo thời gian.
- Bubble full-size cao hơn caption/background trong `.pet-room`, nhưng modal `z-index: 35+` vẫn cao hơn bubble.
- Viết test trước production code và phải chạy test đỏ trước khi triển khai mỗi hành vi.

---

### Task 1: Copy hỗ trợ trên màn hình đăng nhập

**Files:**
- Modify: `src/views/AuthView.tsx:36-52`
- Test: `src/views/AuthView.test.tsx`

**Interfaces:**
- Giữ nguyên props, callback, validation và DOM field names của `LoginView`.
- Chỉ thay phần copy hỗ trợ bên dưới form; dòng đầu `auth-lead` không được render trên LoginView.

- [ ] **Step 1: Viết test đỏ**

Thêm test vào `src/views/AuthView.test.tsx`:

```tsx
it('shows the concise Admin contact without the old login explanation', () => {
  act(() => root.render(createElement(LoginView, { onStudentLogin: vi.fn(), onAdminLogin: vi.fn() })));

  expect(mount.textContent).not.toContain('Nhập tên tài khoản và mã PIN 6 số mà Admin đã cấp cho con.');
  expect(mount.textContent).toContain('Liên hệ Admin để tạo tài khoản hoặc đặt lại mật khẩu.');

  const zalo = mount.querySelector<HTMLAnchorElement>('a.auth-admin-contact');
  expect(zalo?.textContent).toBe('Zalo: Thành Vinh');
  expect(zalo?.getAttribute('href')).toBe('https://zalo.me/0948584429');
  expect(zalo?.getAttribute('target')).toBe('_blank');
  expect(zalo?.getAttribute('rel')).toBe('noreferrer');
});
```

- [ ] **Step 2: Chạy test đỏ**

Run: `npx vitest run src/views/AuthView.test.tsx`

Expected: FAIL vì `auth-lead` cũ vẫn tồn tại và chưa có anchor contact.

- [ ] **Step 3: Sửa tối thiểu LoginView**

Trong `src/views/AuthView.tsx`:

```tsx
<h1 id="auth-title">Đăng nhập để bắt đầu chuyến đi</h1>
<div className="auth-mode-switch" role="tablist" aria-label="Loại đăng nhập">
```

Thay phần `auth-note` bằng:

```tsx
<div className="auth-note">
  <p>Liên hệ Admin để tạo tài khoản hoặc đặt lại mật khẩu.</p>
  <a className="auth-admin-contact" href="https://zalo.me/0948584429" target="_blank" rel="noreferrer">Zalo: Thành Vinh</a>
</div>
```

Không sửa `ChangePinView`, `ParentPinDialog` hoặc `ParentPinChangeDialog`.

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/views/AuthView.test.tsx`

Expected: toàn bộ test trong file PASS.

---

### Task 2: Catalog thoại và chọn câu không lặp

**Files:**
- Create: `src/motion/petHomeConversation.ts`
- Test: `src/motion/petHomeConversation.test.ts`

**Interfaces:**

```ts
export type PetHomeDialogueTone = 'encouraging' | 'playful' | 'curious' | 'moody' | 'joyful' | 'serious';

export type PetHomeDialogue = {
  text: string;
  tone: PetHomeDialogueTone;
};

export const PET_HOME_DIALOGUES: readonly PetHomeDialogue[];

export function pickPetHomeDialogue(previousIndex?: number, randomValue?: number): {
  index: number;
  dialogue: PetHomeDialogue;
};
```

- [ ] **Step 1: Viết test đỏ**

Tạo `src/motion/petHomeConversation.test.ts` với các kiểm tra:

```ts
import { describe, expect, it } from 'vitest';
import { PET_HOME_DIALOGUES, pickPetHomeDialogue } from './petHomeConversation';

describe('home Pet dialogue catalog', () => {
  it('contains thirty unique lines across all approved tones', () => {
    expect(PET_HOME_DIALOGUES).toHaveLength(30);
    expect(new Set(PET_HOME_DIALOGUES.map((item) => item.text)).size).toBe(30);
    expect(new Set(PET_HOME_DIALOGUES.map((item) => item.tone)).size).toBe(6);
    expect(PET_HOME_DIALOGUES.every((item) => /tớ|cậu/i.test(item.text))).toBe(true);
  });

  it('chooses a different line when the random candidate repeats the previous index', () => {
    const next = pickPetHomeDialogue(0, 0);
    expect(next.index).not.toBe(0);
    expect(next.dialogue).toBe(PET_HOME_DIALOGUES[next.index]);
  });
});
```

- [ ] **Step 2: Chạy test đỏ**

Run: `npx vitest run src/motion/petHomeConversation.test.ts`

Expected: FAIL vì module/catalog chưa tồn tại.

- [ ] **Step 3: Viết catalog và selector**

Tạo 30 object với text/tone đúng từng dòng trong `docs/superpowers/specs/2026-09-15-login-pet-dialogue-design.md`. `pickPetHomeDialogue` phải clamp giá trị random về `[0, 0.999999]`, chọn `Math.floor(random * length)`, và nếu index trùng `previousIndex` thì chuyển sang `(index + 1) % length`. Giá trị random không hữu hạn dùng `0`.

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/motion/petHomeConversation.test.ts`

Expected: 2/2 test PASS.

---

### Task 3: Tích hợp PetView và thiết kế bubble

**Files:**
- Modify: `src/views/PetView.tsx`
- Modify: `src/components/Pet.tsx`
- Modify: `src/styles.css:818-890, 2149-2196, 4756-4758`
- Test: `src/views/PetView.test.tsx`
- Test: `src/components/Pet.test.tsx`

**Interfaces:**
- `PetView` dùng `pickPetHomeDialogue` và giữ `{ index, dialogue }` trong state/ref.
- `Pet` nhận optional `messageTone?: PetHomeDialogueTone`; các caller khác không truyền prop và giữ hành vi cũ.
- `PetView` truyền `message={homeDialogue.dialogue.text}` và `messageTone={homeDialogue.dialogue.tone}`.

- [ ] **Step 1: Viết test đỏ cho PetView**

Mock `../components/Pet` để render một button chứa `message`, rồi kiểm tra render đầu và click:

```tsx
it('starts with a catalog line and changes it on each Pet tap', () => {
  const onPetTap = vi.fn();
  act(() => root.render(createElement(PetView, {
    petMood: 'idle', reducedMotion: false, onPetTap, onOpenSettings: vi.fn(), stamps: [],
  })));

  const petButton = mount.querySelector<HTMLButtonElement>('[data-test-pet-button]');
  const before = petButton?.textContent ?? '';
  expect(PET_HOME_DIALOGUES.some((item) => item.text === before)).toBe(true);

  act(() => petButton?.click());
  expect(onPetTap).toHaveBeenCalledOnce();
  expect(petButton?.textContent).not.toBe(before);
  expect(PET_HOME_DIALOGUES.some((item) => item.text === petButton?.textContent)).toBe(true);
});
```

- [ ] **Step 2: Chạy test đỏ**

Run: `npx vitest run src/views/PetView.test.tsx`

Expected: FAIL vì PetView vẫn dùng `activePet.cue` cố định.

- [ ] **Step 3: Viết test đỏ cho class bubble**

Tạo test `Pet` với `FoxPet2D5D` mock tối giản và kiểm tra `messageTone="playful"` tạo class `pet-bubble-tone-playful`, đồng thời bubble full có class `pet-bubble-full`.

Run: `npx vitest run src/components/Pet.test.tsx`

Expected: FAIL vì `messageTone` và class mới chưa có.

- [ ] **Step 4: Tích hợp state và click**

Trong `PetView`, khởi tạo bằng `pickPetHomeDialogue()`, dùng `useRef` lưu index cuối; `useEffect` chọn câu mới khi `activePet.id` đổi; handler click chọn câu mới trước rồi gọi `onPetTap()`. Truyền message/tone vào `Pet`, không dùng `activePet.cue` cho full-size PetView.

Trong `Pet`, thêm class `pet-bubble-full` khi `size === 'full'` và `pet-bubble-tone-${messageTone}` khi có tone; giữ nguyên message mặc định cho các caller khác.

- [ ] **Step 5: Thiết kế bubble bằng CSS**

Giữ compact lesson bubble hiện tại. Riêng `.pet-room`:

```css
.pet-room { isolation: isolate; }
.pet-room .pet-companion { position: relative; z-index: 10; }
.pet-room .pet-bubble { position: relative; z-index: 20; width: min(100%, 360px); }
.pet-room-caption { z-index: 2; }
```

Bubble full dùng nền gradient kem, border `3px solid #31577c`, border-radius bất đối xứng, inner highlight, shadow offset và tail cùng màu; tone đổi accent nhẹ qua `border-top-color`/`box-shadow` nhưng không làm mất tương phản. Modal hiện tại vẫn có z-index cao hơn.

Ở breakpoint mobile, giới hạn bubble còn `min(286px, calc(100% - 28px))`, font tối thiểu `0.86rem`, padding đủ rộng và không để text tràn ngang.

- [ ] **Step 6: Chạy targeted tests**

Run: `npx vitest run src/motion/petHomeConversation.test.ts src/views/PetView.test.tsx src/components/Pet.test.tsx`

Expected: toàn bộ test mới PASS.

---

### Task 4: Kiểm chứng local và bàn giao

**Files:**
- Không thay đổi production source ngoài Task 1–3.

- [ ] **Step 1: Chạy full test và typecheck**

Run: `npm test -- --run`, `npm run typecheck`, `npm run build`.

Expected: exit code `0`; build chỉ có warning chunk đã tồn tại nếu xuất hiện.

- [ ] **Step 2: Kiểm tra bản chạy local**

Mở `http://localhost:8888/`, xác nhận màn hình đăng nhập có đúng copy/link Zalo; đăng nhập local và mở “Pet của tôi”, xác nhận bubble nằm trên Pet/background, lời đầu tiên thuộc catalog, chạm Pet đổi câu và không lặp ngay. Kiểm tra cả chiều dọc/ngang và không mở modal/deploy.

- [ ] **Step 3: Kiểm tra phạm vi thay đổi**

Run `git diff --stat` và `git status --short`; xác nhận không có file Firebase/Supabase/deploy bị chạm và không chạy lệnh push.
