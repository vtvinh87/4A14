# Học Vui — Audio Production Bible
> Brief sản xuất cho GPT-5.6 Luna Max. Phiên bản 18/09/2026. Đây là mục tiêu thiết kế, chưa phải audio đã tạo hay đã nghe duyệt.

## 1. Ý tưởng chủ đạo: một người bạn đồng hành bằng âm thanh

Trò chơi của một lớp học: trẻ khám phá lịch sử, địa lí, bản đồ, nhận dấu, chăm Pet và chia sẻ câu đố. Âm thanh nên giống một cuốn sách phiêu lưu có sự sống: gỗ ấm, giấy mềm, tiếng gảy nhỏ, hơi sáo thoáng. Không giống máy trò chơi thưởng tiền, ứng dụng thông báo liên tục hay phim sử thi.

Ba tính từ phải giữ: **ấm áp — tò mò — dịu dàng**. Âm đúng là một nụ cười; âm thử lại là lời mời quan sát thêm. Không dùng âm để so sánh năng lực, thúc ép tốc độ hoặc phạt trẻ. Không phải hành động nào cũng cần âm: khoảng lặng là một phần thiết kế.

Màu nhạc cụ có thể gợi chất tre/gỗ và nhạc cụ gảy của Việt Nam; không khẳng định AI tái tạo chính xác đàn bầu, đàn tranh hay âm nhạc của một cộng đồng. Không sử dụng nhạc nghi lễ, chất giọng dân tộc hoặc khuôn mẫu vùng miền chỉ để trang trí.

## 2. Phạm vi, chi phí và điều kiện thực thi

38 cue logic, dự kiến **67 file accepted** nếu làm đủ biến thể: 57 one-shot và 10 loop. Đây không phải số lần gọi AI: mỗi pilot cần ít nhất 2 candidate; các cue còn lại tạo lại theo QA, không đặt ngân sách vô hạn.

Thứ tự:
1. Pilot sáu cue: ui-tap, answer-correct, answer-retry, stamp-press, pet-fox, music-home.
2. Core UI/learning: hoàn thành toàn bộ cue tác vụ học tập trước.
3. Rewards, Pet, social: chỉ nối vào event có thật.
4. Music/ambience: tùy chọn, tải sau, không cần cho chức năng học.
5. Nghe phối tổng thể, browser QA, bàn giao.

Executor phải kiểm tra công cụ thực tế có thể xuất audio. Tool tạo ảnh/TTS không mặc nhiên tạo được SFX/nhạc. Nếu thiếu công cụ: vẫn hoàn thiện prompt, manifest draft và audition harness; ghi rõ production blocked, không đổi oscillator tạm thành “AI asset hoàn thành”. Không tự đăng ký, trả phí, dùng API key mới hoặc gửi dữ liệu trẻ. Nếu cần, báo người dùng công cụ/ngân sách còn thiếu.

Chọn provider khi thực thi theo: năng lực xuất SFX không lời/nhạc instrumental; file tải được; quyền sử dụng rõ; chi phí hữu hạn; không bắt imitation nghệ sĩ. Lưu ngày kiểm tra điều khoản và bằng chứng quyền dùng. Prompt không đảm bảo quyền sử dụng; hậu kiểm similarity bằng nghe, không tuyên bố “bản quyền chắc chắn” chỉ vì AI tạo.

Các cue có event chưa tồn tại được sản xuất như asset dự phòng hoặc đánh dấu deferred, không tự xây tính năng mới. Đặc biệt class-milestone, landmark-open, pet-rest và item-unlock cần đối chiếu luồng hiện tại. Deferred phải nêu rõ trong báo cáo coverage; không tính như tích hợp xong.

## 3. Chỉ đạo âm sắc dùng chung

- Palette tonal đề xuất: D–E–F#–A–B; register chính D4–A5. Đây là brief sáng tác, phải kiểm tra đầu ra thực tế; không khai metadata đúng nốt/BPM nếu chưa đo/nghe.
- Gỗ: tròn, có thân low-mid, không gắt transient. Giấy: khô, ngắn, không lạo xạo kéo dài. Sáo: thoáng, nhỏ, không rít.
- Tránh chuông kim loại sắc, glitter cao chói, bass rung, tiếng nhai/thở gần tai, trẻ nói/cười hoặc animal distress.
- SFX mono để ổn định trên điện thoại. Bed stereo vừa phải, mono fold-down vẫn nghe bình thường. Không hard-pan, không di chuyển trái phải đột ngột.
- Reverb SFX cực ít: cảm giác phòng nhỏ, tail nằm trong thời lượng cue. Music ấm nhưng không wash dày; ambience không reverb nhân tạo lớn.
- Biến thể giữ cùng nghĩa, nhịp và loudness; thay nhẹ sắc gỗ/articulation. Không biến thể retry thành success; không random pitch tùy tiện tại runtime.
- Birthday là giai điệu gốc, không mượn bài quen thuộc. Không reference nhạc phim, nghệ sĩ, thương hiệu, bài hát hoặc trò chơi khác.

### Prompt nền bắt buộc (ghép trước prompt riêng)

```text
Create ONE original audio asset for a warm illustrated geography-and-history
learning game for primary-school children. Gentle, tactile, friendly and
comfortable under repeated listening. Follow the specific timing and materials
below. No spoken words, vocals, chanting, breaths, laughter, copyrighted melody,
recognizable branded notification, artist imitation or unrelated background.
No harsh transient, piercing high tone, alarm, frightening sound, exaggerated
bass or dramatic loudness rise. Output only the requested sound, not an
explanation or a compilation. For a one-shot: one event, onset immediately,
clean natural tail, no dead air or ambience. For a loop: continuous instrumental
or environmental texture as specified, no intro, outro or final fade; the edited
end must join the start without a click, pause or rhythmic interruption.
```

Công thức: prompt nền + toàn bộ prompt riêng bên dưới + yêu cầu variant. Nếu provider có ô negative prompt, chuyển các điều cấm vào đó nhưng vẫn giữ mục tiêu chính trong prompt. Nếu không hỗ trợ thời lượng chính xác, tạo dư đuôi rồi chỉnh, không cắt cụt cưỡng bức.

Variant suffix:
```text
Produce variation [01/02/03] of the SAME sound identity. Keep meaning, approximate
timing, register and perceived loudness unchanged. Vary only the soft material
resonance or articulation slightly. Do not add extra events or instruments.
```

## 4. Định dạng, loudness và xử lý hậu kỳ

Thông số dưới đây là **mục tiêu kỹ thuật của dự án**, không phải tuyên bố mức nghe an toàn theo dB SPL. Âm lượng thực phụ thuộc thiết bị/tai nghe; UI phải cho tắt và điều chỉnh dễ dàng.

| Nhóm | Master | Mục tiêu đo trước runtime gain | Bản web khởi điểm |
|---|---|---|---|
| UI/learning ngắn | WAV PCM 48 kHz, 24-bit, mono | peak khoảng -9 đến -6 dBTP; retry thấp hơn correct 2–3 dB cảm nhận | MP3 mono 96 kbps |
| Reward | như trên | ceiling -6 dBTP; không tăng loudness chỉ vì “phần thưởng lớn” | MP3 mono 96–128 kbps |
| Pet | như trên | ceiling -9 dBTP; mềm hơn reward | MP3 mono 96 kbps |
| Notification | như trên | ceiling -12 dBTP; phải nhỏ hơn UI | MP3 mono 96 kbps |
| Music | WAV PCM 48 kHz, 24-bit, stereo | -22 ±2 LUFS-I, true peak ≤ -3 dBTP | MP3 stereo 192 kbps |
| Ambience | như trên | -30 ±3 LUFS-I, true peak ≤ -6 dBTP | MP3 stereo 128 kbps |

- Không dùng LUFS-I để phán chất lượng cue chỉ dài 0.1 giây. Với one-shot dưới 3 giây, đo peak và so khớp loudness bằng nghe cùng runtime gain.
- Không upscale bit depth/sample rate rồi gọi là chất lượng gốc cao hơn. Giữ file raw và metadata gốc; resample một lần khi cần.
- Loại DC offset/click/noise không chủ ý. Fade 2–5 ms nếu cần chống click, giữ nguyên attack mong muốn. Tail phải nghe trọn; không để silence dài trước cue.
- Không normalize từng file đến 0 dBFS. Chừa headroom khi tối đa 4 SFX + beds; kiểm tra mix thực, không chỉ file đơn.
- MP3 là đề xuất baseline; kiểm tra browser thật. Padding encoder có thể phá loop: đo sample thực sau decode, ghi loopStartSample/loopEndSample, nghe 10 vòng. Có thể dùng codec khác nếu đã xác minh Safari/mobile; không claim “seamless” dựa prompt.
- Loop nhạc phải khớp bar; ambience nối ở đoạn ổn định, crossfade offline ngắn khi cần. Không để crossfade làm lệch nhịp/nhân đôi transient.
- Với stereo 48 kHz float32, 48 giây khoảng 18.4 MB decoded. Tuân thủ budget trong plan; không decode toàn bộ 10 beds cùng lúc.
- Lưu raw/master ngoài public. Chỉ accepted delivery files vào public. Không đóng gói candidate, sample hỏng hay log provider.

## 5. Catalog và prompt từng cue

Thời lượng là target, không phải metadata đo. One-shot dung sai ±15% nếu vẫn đủ tail; loop music theo số bar thực; ambience ±1 giây. Mỗi cue ghi trigger để executor không gắn tùy tiện vào mọi render.

### 01. ui-tap — Chạm nút

- Target: **0.1s**; 3 biến thể; bus `sfx`; one-shot.
- Trigger: Nút thông thường chưa có cue ngữ nghĩa.
- Priority 20; cooldown 80 ms. Cooldown không thay thế event dedupe.
- Tên master: `ui-tap__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A tiny rounded wooden bead touching a hollow bamboo surface. One soft attack at 0 ms, a warm body during 15–45 ms, and a clean decay ending by 100 ms. Almost unpitched, intimate and dry. It must feel tactile, not like a computer mouse, bubble pop or sharp finger snap.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 02. ui-confirm — Xác nhận

- Target: **0.28s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Xác nhận thao tác thành công hoặc bật master sound.
- Priority 30; cooldown 250 ms. Cooldown không thay thế event dedupe.
- Tên master: `ui-confirm__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
Two small warm plucked tones, D5 then A5, separated by 85 ms. The second is slightly quieter, with a soft felted attack and rounded wooden resonance. Resolve within 280 ms. Communicate a calm yes, not a victory. No glitter shower, notification ding or metallic ringing.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 03. ui-back — Quay lại

- Target: **0.18s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Đóng hộp thoại hoặc quay lại chủ động.
- Priority 30; cooldown 200 ms. Cooldown không thay thế event dedupe.
- Tên master: `ui-back__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A short soft brush over paper followed by one low wooden tick. Brush from 0–80 ms, tick around 75 ms, decay completely by 180 ms. Gentle inward motion, neutral emotional tone. Do not use a descending sad melody, suction effect, reverse cymbal or dramatic whoosh.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 04. page-turn — Lật trang

- Target: **0.4s**; 3 biến thể; bus `sfx`; one-shot.
- Trigger: Lật trang sách/hộ chiếu thực sự, không phát khi cuộn.
- Priority 30; cooldown 300 ms. Cooldown không thay thế event dedupe.
- Tên master: `page-turn__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
One small illustrated book page turned by hand. Soft paper lift at 0–80 ms, a close dry flutter from 80–230 ms, then a muted paper landing ending by 400 ms. Thin matte paper, not crumpled plastic or a giant parchment scroll. No fingers, breath, desk thump or background room noise.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 05. map-unfold — Mở bản đồ

- Target: **0.85s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Mở Bản đồ tiến bộ lần đầu mỗi lần điều hướng.
- Priority 30; cooldown 1000 ms. Cooldown không thay thế event dedupe.
- Tên master: `map-unfold__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A small cloth-backed illustrated map gently unfolding in two movements. Soft paper-cloth rustle at 0–220 ms, second lighter fold at 300–480 ms, then a single airy wooden-pluck D5 accent at 500 ms fading by 850 ms. Inviting and curious. No wind blast, cinematic riser, treasure fanfare or heavy fabric impact.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 06. map-select — Chọn vùng

- Target: **0.3s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Chọn một vùng mới; không phát lại khi chọn vùng đang mở.
- Priority 30; cooldown 180 ms. Cooldown không thay thế event dedupe.
- Tên master: `map-select__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A miniature wooden map marker settling into place, followed by a tiny mellow bamboo-pluck E5 resonance. Rounded click at 0 ms, pitched bloom at 45 ms, clean decay by 300 ms. Sound curious and precise, less celebratory than correct-answer feedback. No coin, GPS beep or sharp glass chime.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 07. landmark-open — Khám phá địa danh

- Target: **0.65s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Mở thông tin địa danh nếu UI có hành động này.
- Priority 30; cooldown 600 ms. Cooldown không thay thế event dedupe.
- Tên master: `landmark-open__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A soft small wooden latch opening, then two airy plucked notes D5 and E5 at 100 and 260 ms. A faint breathy flute color may support the second note without sounding like human breath. Finish by 650 ms. Express discovering a little story, not earning currency. No long sparkle, voice or magical explosion.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 08. answer-select — Chọn đáp án

- Target: **0.12s**; 3 biến thể; bus `sfx`; one-shot.
- Trigger: Chọn đáp án trước khi chấm; không tiết lộ đúng/sai.
- Priority 20; cooldown 100 ms. Cooldown không thay thế event dedupe.
- Tên master: `answer-select__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
One compact felted woodblock touch with a gentle low-mid body. Attack within 10 ms, short body around 30 ms, fully dry decay by 120 ms. All variants must have the same neutral emotional meaning and perceived loudness. No upward success melody, negative tone, electronic beep or ringing.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 09. answer-correct — Trả lời đúng

- Target: **0.72s**; 3 biến thể; bus `sfx`; one-shot.
- Trigger: Kết quả đúng đã được logic xác nhận; không cùng lesson-complete.
- Priority 80; cooldown 700 ms. Cooldown không thay thế event dedupe.
- Tên master: `answer-correct__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
Three mellow bamboo-pluck notes D5, F-sharp5, A5 at 0, 130 and 285 ms. Small warm wooden resonance, soft attacks, short natural tail ending by 720 ms. A friendly little smile rather than a jackpot. No applause, children shouting, coin cascade, bright bells or orchestral swell.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 10. answer-retry — Thử lại nhẹ nhàng

- Target: **0.38s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Kết quả cần thử lại; đi cùng hướng dẫn tích cực bằng hình/chữ.
- Priority 80; cooldown 650 ms. Cooldown không thay thế event dedupe.
- Tên master: `answer-retry__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
One cushioned wooden tap followed by a slightly lighter airy E5 pluck at 140 ms, ending by 380 ms. The feeling is a patient invitation to look again, not a verdict. Keep loudness lower than correct-answer feedback. Absolutely no buzzer, falling pitch, minor failure chord, rasp, alarm, sigh or sad character voice.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 11. learning-hint — Nhận gợi ý

- Target: **0.5s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Trẻ chủ động mở gợi ý, không tự phát khi trẻ chậm.
- Priority 60; cooldown 900 ms. Cooldown không thay thế event dedupe.
- Tên master: `learning-hint__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A small warm plucked D5 followed by an airy E5 at 170 ms, both soft and rounded. Let the second note bloom subtly as if a thought appears, then disappear by 500 ms. Gentle curiosity without urgency. No lightbulb electricity, high-frequency sparkle, voice, dramatic reveal or success fanfare.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 12. match-connect — Nối cặp

- Target: **0.22s**; 3 biến thể; bus `sfx`; one-shot.
- Trigger: Cặp được nối về mặt thao tác; nếu chấm ngay dùng outcome thay thế.
- Priority 20; cooldown 120 ms. Cooldown không thay thế event dedupe.
- Tên master: `match-connect__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
Two tiny smooth wooden pieces fitting together with a single rounded tok. A quiet contact at 0 ms and a faint sympathetic body at 35 ms, ending by 220 ms. Pleasing but emotionally neutral so it cannot reveal correctness prematurely. No magnet zap, click-clack rattle, metallic snap or triumphant note.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 13. lesson-complete — Hoàn thành bài

- Target: **2.2s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Chuyển trạng thái hoàn thành bài mới, không replay khi mở kết quả cũ.
- Priority 90; cooldown 3000 ms. Cooldown không thay thế event dedupe.
- Tên master: `lesson-complete__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A compact warm acoustic celebration in D major pentatonic. Felted wooden plucks play D5, E5, F-sharp5, A5 across the first 850 ms; a soft lower D4 supports the final resolution. One very gentle brushed percussion accent, then a clean tail ending by 2.2 seconds. Proud and peaceful, never competitive. No brass, crowd, applause, drums rolling or cinematic crescendo.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 14. stamp-press — Đóng dấu

- Target: **0.7s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Thao tác đóng dấu được xác nhận, không chỉ xem chi tiết dấu.
- Priority 90; cooldown 1000 ms. Cooldown không thay thế event dedupe.
- Tên master: `stamp-press__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A padded rubber stamp pressing onto thick paper. Gentle wooden handle movement at 0–80 ms, satisfying soft thup at 130 ms, light paper release at 240 ms, then a tiny mellow D5 pluck fading by 700 ms. Preserve the tactile stamp as the main sound. No gunshot-like transient, heavy slam, metal clang or coin sound.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 15. collection-open — Mở bộ sưu tập

- Target: **0.65s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Mở bộ sưu tập; không cho mọi render danh sách.
- Priority 30; cooldown 800 ms. Cooldown không thay thế event dedupe.
- Tên master: `collection-open__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A small friendly wooden keepsake box opening. Quiet latch at 0 ms, soft wood-and-cloth movement at 100–260 ms, one warm A4 pluck around 300 ms, ending by 650 ms. Well cared for and welcoming, not a pirate treasure chest. No creaking horror hinge, metal chain, gold coins or explosion.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 16. item-unlock — Nhận vật phẩm

- Target: **1.2s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Vật phẩm mới thực sự được cấp; không dùng cho mua ngẫu nhiên.
- Priority 90; cooldown 1800 ms. Cooldown không thay thế event dedupe.
- Tên master: `item-unlock__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A little gift revealed with a soft paper ribbon flutter, then three rounded plucks D5, E5, A5 at 180, 350 and 550 ms. A quiet wooden body supports the last note; tail ends by 1.2 seconds. Delight without extravagance. No casino coins, loot-box suspense, accelerating ticks, synthetic power-up or loud sparkle.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 17. challenge-submit — Gửi câu đố

- Target: **0.55s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Backend xác nhận gửi câu đố chờ duyệt; không ngụ ý đã được duyệt.
- Priority 30; cooldown 1000 ms. Cooldown không thay thế event dedupe.
- Tên master: `challenge-submit__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A small paper card sliding gently into a wooden mailbox, with a quiet rounded tap and one warm E5 pluck. Slide at 0–180 ms, tap at 210 ms, pluck at 270 ms, finish by 550 ms. Express safe delivery only, not correctness or approval. No swooshing rocket, success fanfare or mechanical machinery.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 18. class-milestone — Cột mốc chung của lớp

- Target: **2.5s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Cột mốc hợp tác có thật được công bố; dedupe theo milestone ID.
- Priority 90; cooldown 5000 ms. Cooldown không thay thế event dedupe.
- Tên master: `class-milestone__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A welcoming ensemble of three small acoustic colors: wooden pluck, airy flute and soft hand percussion. A shared D-major-pentatonic phrase grows gently over 1.5 seconds and resolves by 2.5 seconds. Balanced voices suggest working together, not a solo winner. No crowd cheering, victory march, podium music, brass, shouting or overpowering bass.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 19. reaction-positive — Gửi lời động viên

- Target: **0.25s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Reaction tích cực do trẻ gửi được xác nhận, không mọi reaction nhận.
- Priority 20; cooldown 500 ms. Cooldown không thay thế event dedupe.
- Tên master: `reaction-positive__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A soft felted wooden droplet with one short warm E5 resonance, like placing a small friendly sticker. Rounded onset, small bloom around 60 ms, dry finish by 250 ms. Kind and modest. No kiss, vocal laugh, squeaky toy, notification bell, liquid splat or candy-crush cascade.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 20. message-send — Gửi tin nhắn

- Target: **0.2s**; 2 biến thể; bus `notification`; one-shot.
- Trigger: Gửi tin thành công; chỉ khi notifications bật.
- Priority 40; cooldown 500 ms. Cooldown không thay thế event dedupe.
- Tên master: `message-send__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A short close paper whisper moving outward, ending with a very quiet rounded wooden tick. Whisper during 0–100 ms, tick at 110 ms, clean finish by 200 ms. More subtle than button feedback and emotionally neutral. No whistle, digital swoosh, phone notification imitation or rising high-pitched sweep.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 21. message-receive — Nhận tin nhắn

- Target: **0.32s**; 2 biến thể; bus `notification`; one-shot.
- Trigger: Tin mới của người khác khi app visible; không lịch sử/poll ban đầu.
- Priority 40; cooldown 5000 ms. Cooldown không thay thế event dedupe.
- Tên master: `message-receive__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
Two quiet felted wooden notes A4 then D5, spaced 110 ms apart, fading completely by 320 ms. A gentle invitation that does not demand immediate attention. Keep the second note softer than the first. No recognizable phone sound, bell ringing, urgency, vibrating buzz, alarm or repeating pattern.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 22. pet-fox — Cáo Nhỏ

- Target: **0.65s**; 3 biến thể; bus `pet`; one-shot.
- Trigger: Chạm Pet Cáo; motif không lời, không phát theo idle timer.
- Priority 60; cooldown 2500 ms. Cooldown không thay thế event dedupe.
- Tên master: `pet-fox__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A playful nonverbal musical personality for a tiny friendly fox: two nimble wooden plucks E5 and A5, a light soft brush, then a mellow D5 landing. Phrase across 400 ms with tail ending by 650 ms. Curious and quick but not hyperactive. No real fox scream, bark, speech, cartoon voice, squeal or child laughter.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 23. pet-elephant — Voi Núi Xanh

- Target: **0.8s**; 3 biến thể; bus `pet`; one-shot.
- Trigger: Chạm Pet Voi; xác minh ID thật trước mapping.
- Priority 60; cooldown 2500 ms. Cooldown không thay thế event dedupe.
- Tên master: `pet-elephant__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A gentle nonverbal musical personality for a small friendly elephant: two round low wooden tones D4 and A4, supported by a soft padded hand-drum touch. Spacious timing at 0 and 260 ms, ending by 800 ms. Calm, dependable and cuddly. No loud trumpet, sub-bass rumble, stomping impact, speech or realistic distressed animal.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 24. pet-owl — Cú Tím Thám Hiểm

- Target: **0.7s**; 3 biến thể; bus `pet`; one-shot.
- Trigger: Chạm Pet Cú; xác minh ID thật trước mapping.
- Priority 60; cooldown 2500 ms. Cooldown không thay thế event dedupe.
- Tên master: `pet-owl__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A thoughtful nonverbal musical personality for a friendly owl: two breathy bamboo-flute-like tones D5 and E5 with very soft wooden punctuation. First tone at 0 ms, second at 240 ms, clean finish by 700 ms. Curious, awake and reassuring. No ominous nocturnal hoot, human breath noise, ghost effect, speech or shrill whistle.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 25. pet-dragon — Rồng Ngọc

- Target: **0.9s**; 3 biến thể; bus `pet`; one-shot.
- Trigger: Chạm Pet Rồng; xác minh ID thật trước mapping.
- Priority 60; cooldown 2500 ms. Cooldown không thay thế event dedupe.
- Tên master: `pet-dragon__v01.wav` đến `__v03.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A warm nonverbal musical personality for a little jade dragon: mellow resonant wooden plucks D4, A4 and D5 with a faint airy flute halo. Notes at 0, 200 and 420 ms, resolving by 900 ms. Friendly wonder at a miniature scale. No roaring monster, fire blast, metallic gong, battle music, speech or thunder.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 26. birthday — Sinh nhật

- Target: **3s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Chỉ nút nghe/chúc mừng sinh nhật chủ động; không autoplay mỗi login.
- Priority 90; cooldown 5000 ms. Cooldown không thay thế event dedupe.
- Tên master: `birthday__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
An original three-second birthday greeting without vocals or any familiar birthday melody. Warm plucked wood leads a D-major-pentatonic phrase, supported by a soft airy flute answer and two restrained hand-percussion taps. Begin gently, brighten around 1.2 seconds and resolve warmly by 3 seconds. No crowd, clapping, shouting, party horn, copyrighted tune or dramatic crescendo.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 27. lesson-start — Bắt đầu bài

- Target: **0.65s**; 1 biến thể; bus `sfx`; one-shot.
- Trigger: Mở bài đã unlock thành công; thay ui-tap, không mở khóa nội dung.
- Priority 30; cooldown 800 ms. Cooldown không thay thế event dedupe.
- Tên master: `lesson-start__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A soft page touch followed by two inviting mellow plucks D5 and E5 at 100 and 280 ms. A faint wooden resonance fades by 650 ms. The feeling is opening a small adventure with enough calm to start reading immediately. No countdown, race-start whistle, battle cue, triumphant fanfare or long musical tail.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 28. ui-toggle — Đổi tùy chọn

- Target: **0.09s**; 2 biến thể; bus `sfx`; one-shot.
- Trigger: Đổi toggle khi master đang bật; tắt master phải im lặng.
- Priority 20; cooldown 150 ms. Cooldown không thay thế event dedupe.
- Tên master: `ui-toggle__v01.wav` đến `__v02.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
One tiny padded wooden switch movement with a rounded low-mid click and almost no resonance. Attack within 8 ms, body around 25 ms, fully finished by 90 ms. Quiet, precise and neutral for repeated settings adjustments. No electrical relay snap, sharp plastic click, tonal success cue or stereo movement.
```

Nghe duyệt: nghe 10 lần ở nhịp thao tác thực; attack không giật mình, tail không bị cắt và không lẫn với cue trái nghĩa.

### 29. music-home — Nhạc Hành trình

- Target: **48s**; 1 biến thể; bus `music`; loop.
- Trigger: Hành trình/Pet/Bộ sưu tập khi người dùng bật nhạc.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `music-home__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
An original seamless 16-bar loop in 4/4 at 80 BPM, exactly 48 seconds after editing. D major pentatonic, warm acoustic wooden plucks, sparse breathy flute answers and very soft brushed hand percussion. Bars 1–4 introduce a short two-bar motif; 5–8 answer quietly; 9–12 thin the arrangement; 13–16 return without a final cadence. Friendly Vietnamese landscape storybook mood, not an authentic traditional recording claim. No vocals, brass, cymbal crashes, big drums, sub-bass or cinematic rise. Constant gentle energy; leave silence between melodic gestures.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 30. music-map — Nhạc khám phá bản đồ

- Target: **48s**; 1 biến thể; bus `music`; loop.
- Trigger: Bản đồ tiến bộ khi bật nhạc.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `music-map__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
An original seamless 16-bar loop in 4/4 at 80 BPM, 48 seconds after editing, D major pentatonic. Airy flute fragments above sparse warm plucked-string and wooden tones, restrained soft percussion every few beats rather than a driving groove. Bars 1–4 invite looking around; 5–8 add a light answering motif; 9–12 leave more space; 13–16 reconnect naturally to bar one. A calm illustrated journey across land and sea. No adventure-film climax, ticking clock, vocals, ocean recordings or strong bass. Keep environmental sounds out for separate ambience mixing.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 31. music-focus — Nhạc tập trung

- Target: **53.333s**; 1 biến thể; bus `music`; loop.
- Trigger: Bài học khi bật nhạc; cực thưa, có thể tắt độc lập.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `music-focus__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
An original seamless 16-bar loop in 4/4 at 72 BPM, approximately 53.333 seconds after precise bar editing. D major pentatonic, soft felted plucks and a warm sustained acoustic texture. Only one short melodic gesture every two bars, no busy lead, no percussion pulse competing with reading. Stable harmony, low dynamic variation, no dramatic resolution at the boundary. Sound safe, attentive and unobtrusive. No vocals, whispered words, bright bells, arpeggio runs, ticking, nature effects or emotionally tense chords.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 32. music-cooperate — Nhạc cùng khám phá

- Target: **43.636s**; 1 biến thể; bus `music`; loop.
- Trigger: Thách đố khi bật nhạc; không lúc soạn câu hỏi.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `music-cooperate__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
An original seamless 16-bar loop in 4/4 at 88 BPM, approximately 43.636 seconds after precise editing. D major pentatonic. Two mellow acoustic plucked timbres exchange a short friendly motif; an airy flute occasionally joins and soft hand percussion stays restrained. Equal answering voices suggest classmates sharing discoveries, not competition. Bars 9–12 simplify before the opening texture returns. No race rhythm, countdown, victory chorus, tension build, vocals, applause or final-ending flourish. Keep energy gentle enough for reading questions.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 33. ambience-garden — Khu vườn

- Target: **24s**; 1 biến thể; bus `ambience`; loop.
- Trigger: Nền Hành trình hoặc đồng bằng theo routing.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `ambience-garden__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A seamless 24-second peaceful illustrated garden ambience. Continuous soft leaf movement and a very distant airy outdoor bed. Two or three tiny distant bird chirps across the whole loop, irregularly spaced and never near the seam. Close perspective is still and safe. No melody, human voices, footsteps, dogs, insects whining, loud birds, wind gusts or identifiable location claim. Keep the spectrum soft and the dynamics extremely even; no dramatic events.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 34. ambience-mountain — Miền núi

- Target: **24s**; 1 biến thể; bus `ambience`; loop.
- Trigger: Chọn miền núi phía Bắc.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `ambience-mountain__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A seamless 24-second quiet mountain morning atmosphere for a child-friendly illustrated landscape. Soft air moving through distant leaves, an extremely faint faraway bird once or twice, spacious but not cold. Continuous low-level texture with no distinct start or finish. No strong wind, thunder, animal cries, bells, village voices, music, cavernous echo or geographically specific authenticity claim. Avoid whistling frequencies and heavy low rumble; leave room for interface sounds.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 35. ambience-coast — Biển và đảo

- Target: **24s**; 1 biến thể; bus `ambience`; loop.
- Trigger: Bản đồ mặc định/duyên hải; không gắn đảo với nội dung chưa có.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `ambience-coast__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A seamless 24-second calm shoreline ambience: small rounded water laps arriving irregularly every few seconds over a quiet constant airy sea bed. Gentle shallow water, no close splashes or crashing surf. No seagull cries, boat engines, people, music, storms, wind buffeting or sharp foam hiss. Keep motion soft and steady, with matching texture at both ends for an invisible loop. A stylized peaceful sea, not a claimed recording of any specific island.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 36. ambience-forest — Rừng xanh

- Target: **24s**; 1 biến thể; bus `ambience`; loop.
- Trigger: Chọn Tây Nguyên.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `ambience-forest__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A seamless 24-second gentle green forest atmosphere. Soft broad-leaf rustling with a quiet diffuse outdoor air bed and at most two very distant mellow bird details. No dense tropical insect chorus, predator calls, monkeys, dramatic jungle sounds, tribal drums, people, melody or loud drops. Warm and welcoming, not mysterious or dangerous. Keep the texture even, soft in the high frequencies and unlocalized enough to loop invisibly.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 37. ambience-river — Sông nước

- Target: **24s**; 1 biến thể; bus `ambience`; loop.
- Trigger: Chọn Nam Bộ.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `ambience-river__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A seamless 24-second calm river atmosphere: slow shallow water ripples, a little soft reed movement and an airy distant background. Water remains smooth, without close pouring, gurgling or sudden splashes. No market voices, boat motors, horns, bells, birds calling nearby, music or regional documentary claims. A friendly quiet illustrated riverside. Keep low frequencies controlled, stereo width restrained and the start and end texturally continuous.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

### 38. ambience-evening — Pet nghỉ ngơi

- Target: **24s**; 1 biến thể; bus `ambience`; loop.
- Trigger: Chỉ trạng thái Pet nghỉ nếu thật sự có; nếu chưa có đánh dấu deferred, không tạo feature mới.
- Priority 0; cooldown 0 ms. Cooldown không thay thế event dedupe.
- Tên master: `ambience-evening__v01.wav`; delivery cùng basename, extension theo codec đã duyệt.

```text
A seamless 24-second restful evening garden atmosphere. Very soft slow leaf movement and a warm airy background; optionally one barely audible distant gentle cricket detail, never a repetitive high-pitched chorus. Quiet companionship rather than loneliness. No owl hoots, spooky drone, rainstorm, lullaby, speech, breathing, clock ticks or sudden events. Avoid making the child feel sleepy by force; this is an optional calm corner, not a sleep treatment.
```

Nghe duyệt: nghe riêng ít nhất 3 vòng rồi 10 vòng kiểm seam; nghe dưới SFX và đọc một đoạn bài học để phát hiện nền lấn át.

## 6. Quy trình sản xuất và chọn candidate

Mỗi lượt tạo lưu prompt thực tế, negative prompt, provider/model/version nếu có, seed nếu có, thời điểm, tham số, raw path, chi phí đã biết hoặc unknown. Không bịa seed/model/loudness khi tool không trả về.

1. Tạo tối thiểu hai cách thể hiện cho từng pilot, đặt tên candidate riêng.
2. Nghe A/B ở mức cảm nhận tương đương. Không chọn bản lớn tiếng hơn chỉ vì nghe “ấn tượng”.
3. Duyệt signature chung: gỗ/giấy mềm, success vui vừa đủ, retry không tiêu cực, Pet không gây giật mình.
4. Nếu có người dùng nghe thử, ghi feedback nguyên ý. Nếu chưa có, ghi “internal listening only”; không thay chủ sở hữu phê duyệt cảm nhận.
5. Freeze palette rồi tạo các cue còn lại. Worker phải dùng accepted pilots/reference audio nếu provider hỗ trợ; nếu không, dùng cùng brief và parent kiểm consistency.
6. Hậu kỳ nhẹ, export, đo metadata, hash SHA-256, đưa lên audition.
7. Nghe trên loa laptop, loa điện thoại và tai nghe ở mức thấp/vừa. Không yêu cầu mở lớn để nghe ambience.
8. Chỉ promote candidate được chấp nhận. Giữ rejected ngoài public để không bị dùng nhầm.

### Rubric nghe trên từng candidate (1–5)

- Đúng nghĩa hành động? Không nghe giống cảnh báo/thất bại khi chỉ quay lại.
- Đúng thế giới minh họa? Gỗ/giấy/sáo thống nhất, không lạc sang máy móc.
- Lặp dễ chịu? Không giật, chói, đuôi chồng thành hỗn loạn.
- Kỹ thuật sạch? Không click, clipping, artefact, nền rác, seam.
- Trong mix vẫn rõ mà không che nội dung? Không đánh giá chỉ bằng solo.

Nếu không có khả năng nghe qua công cụ trong phiên, chỉ đo file được; cột listening phải pending và bàn giao audition cho người thật. Không dùng waveform hoặc ffprobe làm bằng chứng cảm nhận tốt.

## 7. Kịch bản nghiệm thu phối âm

1. **60 giây thao tác nhanh:** 20 lần navigation/chọn đáp án, không phát 20 reward; cooldown đúng, một hành động chỉ một cue chính.
2. **Thử lại ba lần:** nghe retry xen gợi ý rồi correct; không có cảm giác bị mắng hay bị thúc ép.
3. **Kết thúc bài:** chỉ lesson-complete; không chồng correct + success legacy + reward. Đóng dấu sau thao tác riêng mới phát stamp.
4. **Bản đồ:** mở một lần, chọn 5 vùng; nhạc không restart mỗi lần, ambience crossfade mềm; mở detail không cộng thêm bed.
5. **Chat:** polling/khôi phục lịch sử im lặng. Tin mới hợp lệ phát một cue nhỏ theo gom nhóm/cooldown khi tùy chọn bật.
6. **Pet:** chạm nhanh 10 lần không thành chuỗi ồn; mỗi Pet có nhận diện riêng, không vocal.
7. **Mute trong lúc đang phát:** mọi bus tắt nhanh và không có đuôi/queue bật lại bất ngờ.
8. **Hide tab/offline/decode chậm:** không phát cue cũ khi quay lại. Học vẫn dùng được khi asset lỗi.
9. **15 phút đọc/chơi:** nhạc không cuốn người nghe ra khỏi nội dung; giảm mật độ nếu thấy mệt. Ghi device, mức gain, cues gây mệt và chỉnh sửa.
10. **Loop:** từng bed chạy 10 vòng; không click, pause, thay mức nền hoặc cadence làm lộ điểm nối.

Thử với trẻ chỉ khi có phụ huynh đồng ý; dùng câu hỏi đơn giản “âm nào làm con khó chịu?”, không thu âm/nhập dữ liệu cá nhân nếu chưa được phép. Không biến đánh giá nội bộ thành nghiên cứu hiệu quả học tập.

## 8. Hồ sơ bàn giao bắt buộc

- Inventory đối chiếu đủ 38 ID; 67 variants target hoặc ghi rõ deferred/blocked.
- Prompt log và provenance, không chứa khóa API.
- Master, delivery, manifest metadata đo được; license evidence.
- Audition page có từng cue/variant, play/stop, loop, volume và nút dừng tất cả; không autoplay.
- Listening report với accepted/rejected/pending, lý do, người/công cụ nghe, thiết bị.
- Test report runtime/browser và coverage event→cue.
- Execution ledger: file nào đã tạo, hash nào, gói nào đang làm; resume không tạo lại toàn bộ asset.
- Handoff nêu phần chưa nghe duyệt hoặc chưa hỗ trợ browser; không gọi “hoàn thành toàn bộ” nếu còn hard gate.

## 9. Giao việc cho AI tạo âm (packet mẫu)

```text
Bạn phụ trách CHỈ các cue được liệt kê trong packet, theo Audio Production Bible
và audio-catalog.json. Không sửa app, manifest chung, Brain_Vault hoặc Git.
Trước khi tạo: xác nhận có tool tạo audio và quyền sử dụng/chi phí trong phạm vi.
Ghép global prompt + prompt riêng + variant suffix. Không dùng TTS thay nhạc/SFX.
Ghi raw, candidate, prompt log trong thư mục write-set riêng; không ghi public.
Trả về ID, variant, absolute path, thời lượng đo được, thông số đo được hoặc
unknown, provenance, listening status và vấn đề. Không tuyên bố đã nghe nếu chưa.
Nếu không có tool, báo blocked và giao prompt sẵn sàng chạy, không file giả.
```

Parent duyệt rồi mới copy accepted assets và cập nhật manifest. Hai worker có thể chia SFX/Pet và Music/Ambience, nhưng không cùng sửa manager hoặc Settings. Nếu Luna đang là executor của Astra, không tự tạo subagent con; trả packet yêu cầu coordinator hỗ trợ.

Tài liệu companion: `docs/superpowers/plans/2026-09-18-hoc-vui-audio-luna-plan.md`. Danh mục máy đọc: `design/audio/audio-catalog.json`. Catalog là nguồn ID/target; metadata runtime phải được tạo từ file thực, không dùng target làm kết quả đo.
