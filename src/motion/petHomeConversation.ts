export type PetHomeDialogueTone = 'encouraging' | 'playful' | 'curious' | 'moody' | 'joyful' | 'serious';

export type PetHomeDialogue = {
  text: string;
  tone: PetHomeDialogueTone;
};

export const PET_HOME_DIALOGUES: readonly PetHomeDialogue[] = [
  { text: 'Tớ có bản đồ, cậu có tò mò — cả đội sẵn sàng rồi!', tone: 'encouraging' },
  { text: 'Chậm một nhịp cũng được, tớ sẽ cùng cậu bước tiếp nhé.', tone: 'encouraging' },
  { text: 'Cậu làm tốt hơn cậu nghĩ đấy. Tớ nhìn thấy mà!', tone: 'encouraging' },
  { text: 'Tớ tin một manh mối nhỏ hôm nay có thể mở ra cả kho báu ngày mai.', tone: 'encouraging' },
  { text: 'Tớ đứng về phía cậu, kể cả lúc câu hỏi trông hơi tinh quái.', tone: 'encouraging' },
  { text: 'Nếu tớ giấu chiếc la bàn, cậu có tìm ra không nhỉ?', tone: 'playful' },
  { text: 'Suỵt… tớ vừa nghe thấy một mẩu lịch sử đang cười khúc khích.', tone: 'playful' },
  { text: 'Đuôi tớ đang quẫy theo nhịp khám phá của cậu đây!', tone: 'playful' },
  { text: 'Tớ tuyên bố hôm nay là ngày săn manh mối siêu hạng!', tone: 'playful' },
  { text: 'Cậu nhìn thấy ba lô của tớ không? Nó đang đầy ắp chuyện vui đấy.', tone: 'playful' },
  { text: 'Nếu được du hành thời gian, cậu sẽ ghé nơi nào đầu tiên?', tone: 'curious' },
  { text: 'Tớ tự hỏi lối đi này đã chứng kiến bao nhiêu câu chuyện rồi nhỉ?', tone: 'curious' },
  { text: 'Cậu thử nhìn kỹ thêm một lần nhé, chi tiết nhỏ thường rất thú vị.', tone: 'curious' },
  { text: 'La bàn chỉ về phía trước, còn trí tò mò của cậu thì chỉ khắp nơi!', tone: 'curious' },
  { text: 'Tớ muốn biết điều gì làm cậu bất ngờ nhất hôm nay.', tone: 'curious' },
  { text: 'Hôm nay tớ hơi chậm một chút, nhưng vẫn muốn đồng hành cùng cậu.', tone: 'moody' },
  { text: 'Có những ngày tớ và cậu chỉ cần hoàn thành một việc nhỏ cũng đáng tự hào rồi.', tone: 'moody' },
  { text: 'Tớ đang nghe đây. Cậu cứ suy nghĩ thật bình tĩnh nhé.', tone: 'moody' },
  { text: 'Uống một ngụm nước, thở sâu cùng tớ, rồi cậu thử lại từ từ.', tone: 'moody' },
  { text: 'Tớ cũng từng bối rối trước manh mối khó. Cậu không phải tự xoay xở đâu.', tone: 'moody' },
  { text: 'Yay! Tớ muốn nhảy một vòng quanh chiếc la bàn quá!', tone: 'joyful' },
  { text: 'Có tiến bộ rồi! Tớ và cả đội thám hiểm đang vui lây với cậu.', tone: 'joyful' },
  { text: 'Hôm nay ánh mắt cậu sáng như kho báu mới tìm thấy vậy!', tone: 'joyful' },
  { text: 'Tớ muốn lưu khoảnh khắc này vào nhật ký phiêu lưu cùng cậu!', tone: 'joyful' },
  { text: 'Tớ nghe tiếng chuông chiến thắng rồi — leng keng!', tone: 'joyful' },
  { text: 'Muốn đi xa thì cậu đọc kỹ, nghĩ kỹ và kiểm tra thật cẩn thận.', tone: 'serious' },
  { text: 'Cậu cứ suy nghĩ thật kỹ, không cần chạy đua với ai.', tone: 'serious' },
  { text: 'Tớ luôn nhớ: manh mối tốt cần một đôi mắt quan sát thật kỹ.', tone: 'serious' },
  { text: 'Nếu cậu chưa chắc, hãy quay lại tư liệu và kiểm chứng nhé.', tone: 'serious' },
  { text: 'Tớ sẽ nhắc cậu: hiểu bài quan trọng hơn trả lời thật nhanh.', tone: 'serious' },
] as const;

export function pickPetHomeDialogue(previousIndex = -1, randomValue = Math.random()): { index: number; dialogue: PetHomeDialogue } {
  const safeRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999) : 0;
  let index = Math.floor(safeRandom * PET_HOME_DIALOGUES.length);
  if (index === previousIndex) index = (index + 1) % PET_HOME_DIALOGUES.length;
  return { index, dialogue: PET_HOME_DIALOGUES[index] };
}
