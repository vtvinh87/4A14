# Hội thoại riêng cho từng Pet — thiết kế local

## Mục tiêu

Mở rộng khu “Pet của tôi” để cả bốn Pet đều có 30 câu thoại riêng, phù hợp với tính cách đã được khai báo trong catalog Pet. Khi học sinh mở khóa và chọn một Pet mới, lời thoại của Pet đó sẽ tạo cảm giác khác biệt và thú vị hơn.

## Quyết định đã duyệt

- Giữ xưng hô `tớ`/`cậu` cho toàn bộ lời thoại.
- Có đúng bốn catalog theo `PetId`: `fox-orange`, `elephant-blue`, `owl-purple`, `dragon-jade`.
- Mỗi catalog có đúng 30 câu, tổng cộng 120 câu; cả 120 text không trùng nhau.
- Mỗi Pet có sáu sắc thái hiện có: `encouraging`, `playful`, `curious`, `moody`, `joyful`, `serious`; mỗi sắc thái có năm câu.
- Nội dung phải bám tính cách hiện tại:
  - Cáo Nhỏ: nhanh nhẹn, tò mò, động viên; dùng hình ảnh bản đồ, la bàn, ba lô và manh mối.
  - Voi Núi Xanh: điềm tĩnh, kiên nhẫn, chở che; dùng hình ảnh bước chậm, ghi nhớ, đường núi và đồng đội.
  - Cú Tím Thám Hiểm: thông thái, quan sát kỹ, thích câu hỏi bất ngờ; dùng hình ảnh nhìn từ trên cao, chi tiết, phố cổ và suy luận.
  - Rồng Ngọc: dũng cảm, hào phóng, tin vào điều kỳ diệu; dùng hình ảnh ánh sáng, kho bản đồ, mở lối và ăn mừng hành trình.
- Câu đầu tiên chọn ngẫu nhiên; mỗi lần chạm Pet chọn câu khác câu vừa hiển thị; khi đổi Pet đang đồng hành, chọn lại từ catalog của Pet mới.
- Giữ hành vi mở khóa hiện tại: Pet bị khóa vẫn có thể được chọn để xem thông tin, nhưng Pet hiển thị và thoại trong khu đồng hành chỉ dùng Pet đang thực sự được mở khóa.
- Không thêm API, database, persistence, audio, dependency, asset hoặc thay đổi nội dung bài học.

## Kiến trúc và interface

Catalog và selector tiếp tục là module TypeScript thuần local tại `src/motion/petHomeConversation.ts`.

```ts
export type PetHomeDialogueTone =
  | 'encouraging'
  | 'playful'
  | 'curious'
  | 'moody'
  | 'joyful'
  | 'serious';

export type PetHomeDialogue = {
  text: string;
  tone: PetHomeDialogueTone;
};

export const PET_HOME_DIALOGUES_BY_PET: Readonly<Record<PetId, readonly PetHomeDialogue[]>>;

export const PET_HOME_DIALOGUES: readonly PetHomeDialogue[];

export function pickPetHomeDialogue(
  petId: PetId,
  previousIndex?: number,
  randomValue?: number,
): { index: number; dialogue: PetHomeDialogue };
```

`PET_HOME_DIALOGUES` tiếp tục là alias của catalog `fox-orange` để giữ compatibility cho các consumer/test hiện có. Selector kẹp giá trị random vào `[0, 0.999999]`, dùng `0` cho giá trị không hữu hạn, và chuyển sang index kế tiếp nếu ứng viên trùng `previousIndex`.

`PetView` truyền `activePet.id` cho selector, giữ index gần nhất bằng ref/state hiện có, và truyền text/tone vào component `Pet`. Component `Pet` và class bubble hiện tại được giữ nguyên nếu không cần thay đổi; không đổi contract của các caller compact trong màn học hoặc FloatingPet.

## Luồng hành vi

1. `PetView` khởi tạo thoại từ catalog của `activePet`.
2. Khi học sinh chạm Pet, selector lấy câu khác trong cùng catalog rồi gọi callback `onPetTap` hiện có.
3. Khi một Pet đã mở khóa được chọn, effect hiện có nhận diện `activePet.id` mới và đổi sang catalog tương ứng.
4. Khi chọn Pet bị khóa, `activePet` vẫn fallback về Cáo Nhỏ; phần thông tin Pet khóa tiếp tục hiển thị như hiện tại.

## Kiểm thử và tiêu chí nghiệm thu

- Test catalog xác nhận có đủ bốn key, mỗi key đúng 30 câu, cả 120 text unique, đủ sáu tone và toàn bộ text dùng quan hệ `tớ`/`cậu`.
- Test catalog xác nhận các nhóm có dấu hiệu nội dung phù hợp với từng Pet, không chỉ sao chép nguyên văn catalog Cáo Nhỏ.
- Test selector xác nhận chọn đúng catalog theo `PetId`, không lặp index ngay trước đó và xử lý random biên/không hợp lệ.
- Test `PetView` xác nhận:
  - thoại ban đầu thuộc catalog của Pet đang đồng hành;
  - chạm Pet đổi câu và vẫn gọi `onPetTap`;
  - lần lượt chọn các Pet đã mở khóa thì message/tone lấy từ đúng catalog.
- Chạy targeted tests, toàn bộ Vitest, `npm run typecheck` và `npm run build`.
- Kiểm tra diff chỉ chạm module hội thoại, PetView/test liên quan và spec/plan; không deploy, không push và không gọi Supabase/Firebase.

## Ngoài phạm vi

- Không viết lại personality/story/unlock rule của `src/content/pets.ts`.
- Không mở khóa Pet bằng code hoặc thay đổi tiến độ học.
- Không thêm hệ thống random theo thời gian, lưu lịch sử thoại lâu dài, giọng nói hoặc UI mới.
- Không thay đổi bubble compact của màn học trừ khi cần bảo toàn compatibility type/interface.
