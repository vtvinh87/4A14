# Học Vui — Kế hoạch xây dựng bộ âm thanh cho Luna Max

> Executor: GPT-5.6 Luna, reasoning max. Dùng executing-plans theo các gói A0–A6. Đây là kế hoạch và brief sản xuất; chưa có file âm thanh nào được tạo hoặc nghe duyệt trong lần viết tài liệu này.

**Goal:** Bộ âm thanh nhận diện riêng cho trò chơi lịch sử/địa lí lớp 4: ấm, tò mò, đáng yêu, phản hồi rõ và có thể nghe lâu. Trẻ làm chưa đúng vẫn cảm thấy được khuyến khích; âm thanh luôn bổ trợ hình ảnh/chữ.

**Architecture:** Asset local được tạo offline, duyệt tai và tối ưu trước khi đóng gói. Một AudioManager duy nhất điều phối hiệu ứng, nhạc, ambience và pet; event học tập vẫn lấy từ logic hiện hữu. Không gọi dịch vụ AI khi trẻ đang chơi.

**Tech stack dự kiến:** TypeScript, Web Audio cho SFX và short loops; local audio files, Vite/PWA, Vitest; công cụ tạo nhạc/SFX thực sự có trong phiên thực thi; ffmpeg/ffprobe nếu đã được cài. Không thêm SDK AI vào client.

## 1. Đọc theo thứ tự

1. Tài liệu này: hệ thống, runtime, task, nghiệm thu.
2. `docs/design/hoc-vui-audio-production-bible.md`: ngôn ngữ âm thanh, mastering, tất cả prompt riêng.
3. `design/audio/audio-catalog.json`: danh mục ID, thời lượng, variants, priority, cooldown và trigger dự kiến; source of truth của inventory.

Workspace chuẩn `/Volumes/Pictures/Projects/Hoc_Vui`; đường dẫn tương đối bên dưới tính từ checkout thực tế. Không tự mở task mới chỉ vì tài liệu đề cập Luna. Khi bị gián đoạn: đọc ledger, kiểm tra hash/file thực tế rồi tiếp tục gói dở.

## 2. Hiện trạng đã khảo sát ngày 18/09/2026

- `src/audio/manager.ts`: ba oscillator cues `tap`, `success`, `hint`; toggle `enabled`, document visibility và dispose. Chưa có sample player, mixer, music/ambience hay dedupe.
- `src/audio/manager.test.ts`: hiện mới kiểm tra cờ documentHidden.
- `src/App.tsx`: navigation/openLesson/settings/setMood gọi audio; BirthdayCelebration gọi success. `setMood` hiện ghép animation và sound nên cần tránh âm trùng khi thêm outcome cụ thể.
- `src/progress/storage.ts`: AppSettings chỉ gồm `sound`, `reducedMotion`, mặc định sound=true; có serialization/backup/account state. Không thêm numeric volume vào callback boolean mà không đổi interface.
- `src/components/SettingsDialog.tsx`: một nút âm thanh phản hồi; `onChange(key,value:boolean)`.
- Không tìm thấy WAV/MP3/OGG/M4A/Opus trong public ở thời điểm khảo sát. Bộ âm hiện hữu là synthesis.
- Working tree có thay đổi triển khai progress-map khác đang dở. Chỉ sửa audio write-set; App.tsx, styles.css, vite.config.ts có thể trùng owner nên tích hợp tuần tự, không ghi đè công việc khác.

## 3. Phạm vi sản phẩm

Thiết kế ba lớp: phản hồi hành động rất ngắn; thành tựu ngắn có giai điệu; nền nhạc/không gian thưa. Nhạc dùng cảm hứng nhạc cụ gảy/gõ gỗ và sáo nhẹ, phù hợp cảnh quan Việt Nam, không tuyên bố âm AI là bản ghi nhạc cụ truyền thống xác thực.

V1 không đọc toàn bộ bài, không giọng nói trẻ em, không voice clone. Pet dùng motif không lời riêng cho mỗi pet. Lồng tiếng Việt chỉ là phase tương lai nếu người dùng yêu cầu; không tạo hàng trăm câu tự phát vì có thể sai nội dung và tăng tải.

Mặc định đề xuất: giữ `sound` hiện hữu; SFX bật khi master bật, nhạc và ambience tắt cho đến khi người dùng bật ở Settings. Pet nằm dưới SFX, notifications tùy chọn riêng. Không autoplay trước tương tác. Trên màn hình phụ huynh, đăng nhập, PIN và nhập câu hỏi dài: im lặng nền; chỉ feedback cần thiết, không âm mỗi ký tự.

Không countdown thúc ép, buzzer sai, tiếng khóc/la hét, fanfare thắng người khác, “game over”, âm hù dọa hoặc âm click kiểu quảng cáo. Không gắn pitch/volume với thứ hạng. Không dùng âm thanh làm kênh duy nhất báo thành công/lỗi.

## 4. Inventory và thứ tự sản xuất

Catalog chứa 38 logical cues: 28 one-shots và 10 beds (4 nhạc + 6 ambience). Variants là file khác của cùng cue, không tăng số event. Sản xuất core UI/learning trước, rewards/pet/social tiếp theo, music/ambience cuối. Tất cả cue trong catalog cần có file accepted hoặc trạng thái blocked có lý do; không tự đổi ID.

Không bắt buộc mọi nơi đều phát âm riêng. `ui-tap` là default; nếu action có semantic cue thì bỏ tap, ví dụ mở bản đồ chỉ `map-unfold`. Không thêm âm cho hover, scroll, polling, mỗi render hay focus bàn phím.

Routing nền:

| Ngữ cảnh | Nhạc khi bật | Ambience khi bật |
|---|---|---|
| Hành trình/Pet/Bộ sưu tập | music-home | ambience-garden |
| Bản đồ tiến bộ | music-map | ambience-coast; đổi vùng theo selection có debounce |
| Đọc/chơi bài học | music-focus | tắt trong lúc trả lời; không cản tập trung |
| Thách đố | music-cooperate | tắt |
| Bạn bè/Parent/Auth/Settings/composer | fade nền về im lặng | tắt |

Mapping vùng ambience: núi phía Bắc→mountain; đồng bằng Bắc Bộ/Địa phương em→garden; duyên hải→coast; Tây Nguyên→forest; Nam Bộ→river. `ambience-evening` chỉ dùng ở Pet nghỉ khi người dùng chủ động chọn trạng thái nghỉ, không tự dựa timezone hay giờ thật. Cùng một bed không restart khi mở/đóng detail. Đổi vùng debounce 400ms, crossfade 1200ms, không play lại cả nhạc khi chỉ đổi ambience.

## 5. Mix và event arbitration

- Priority: reward 90, outcome 80, pet 60, notification 40, navigation 30, tactile 20. Music/ambience là buses riêng.
- Tối đa 4 one-shot voices; cùng lúc chỉ một outcome/reward và một pet. Khi thiếu slot, bỏ cue mới có priority thấp; cue cao thay voice thấp với fade 20ms. Không queue click cũ để phát muộn.
- Một gesture/event chỉ một semantic sound. Kết thúc câu cuối và hoàn thành bài cùng lúc: lesson-complete thắng answer-correct. Nếu lesson + stamp cùng lúc: một lesson-complete, stamp chỉ phát khi thao tác đóng dấu thật sau đó; không tự xếp chuỗi fanfare.
- Cooldown theo catalog, tính monotonic time; eventKey dedupe session có TTL 60s + bounded max 256 keys. Outcome không replay do React StrictMode, polling hoặc network retry.
- Notification chỉ khi tab visible, master+notifications bật, tin nhắn mới thực sự, không thuộc snapshot initial/history, không tin của chính mình. Gộp burst 2s, cooldown 5s. Không đọc tên/nội dung tin.
- Master off: dừng sources đang chạy với fade ≤30ms, hủy scheduler và pending play, không chỉ chặn lần play kế tiếp. Mute không phát tiếng. Bật master: cue ui-confirm một lần sau gesture unlock; không replay backlog.
- Hidden/pagehide/logout: stop one-shots, cancel pending, pause beds; không chạy sample bị suspend rồi phát dồn khi resume. Visible không tự vượt autoplay restriction; chỉ khôi phục beds nếu đã unlock và settings vẫn bật.
- Decode/fetch bị trễ: UI cue quá 150ms thì bỏ, reward quá 500ms thì bỏ; không play sau khi route/owner đã đổi. Generation token cho async decode. File lỗi dùng silence hoặc synthesis fallback rõ ràng cho 3 legacy cues, không gây unhandled rejection.
- Duck music −8dB và ambience −5dB khi outcome/reward; attack 40ms, release 400ms. Không duck chồng khiến volume không hồi; đếm active reason hoặc tính gain theo active voices.
- Initial bus gains (đề xuất cần nghe lại): master .65, sfx .65, pet .55, notifications .45, music .28, ambience .22. Manifest per-cue trim mặc định 0dB sau mastering. Không normalize mọi cue lên cùng peak.
- Tổng mix có headroom; soft compressor/limiter cuối nếu cần và nghe kiểm tra pumping. Gain số không cam kết mức dB SPL tai nghe; không tự tuyên bố an toàn thính lực bằng LUFS file.

## 6. Interface và settings

Giữ API legacy `play('tap'|'success'|'hint')` trong migration, map lần lượt ui-tap/answer-correct/learning-hint. Chuyển callsite semantic dần; không đồng thời phát cả old và new.

```ts
type AudioPreferences = {
  version: 1; music: boolean; ambience: boolean; notifications: boolean;
  masterVolume: number; sfxVolume: number; musicVolume: number;
  ambienceVolume: number;
};
type PlayOptions = { eventKey?: string; ownerGeneration?: number };
// AudioId là union từ runtime manifest đã kiểm định.
// Bổ sung vào AudioManager, giữ setEnabled/setDocumentHidden/dispose:
// unlockFromGesture(): Promise<void>
// playCue(id: AudioId, options?: PlayOptions): void
// setBed(bus: 'music'|'ambience', id: AudioId|null): void
// setPreferences(preferences: AudioPreferences): void
// stopAll(): void
```

Preferences lưu riêng `hoc-vui-audio-preferences-v1`, không thay progress schema/backup chỉ để thêm sliders. `settings.sound` vẫn là master nguồn duy nhất, `AudioPreferences` không có enabled trùng. Mặc định music=false, ambience=false, notifications=false; volumes theo §5. Clamp finite số 0..1, dữ liệu hỏng dùng defaults, localStorage bị chặn vẫn dùng in-memory. Preference áp dụng thiết bị, ghi rõ trong UI; không upload child identity.

Settings thêm section Âm thanh: bật nhạc, bật không gian, bật báo tin nhắn, 4 sliders labeled, nút Nghe thử. Sliders dùng callback riêng `onAudioPreferencesChange(next)` không ép vào boolean `onChange`. Thay mô tả “do app tạo” bằng “Âm chạm và âm khám phá”. Nút HUD master hiện hữu tiếp tục tắt tất cả. Test playback button tôn trọng master, không bật âm ngầm.

Manifest mỗi file: id, variant, relativeUrl, codec, sha256, durationMs, bytes, channels, sampleRate, peakDbTP, measuredLufs|null, trimDb, priority, cooldownMs, bus, loopStartSample|null, loopEndSample|null, generationProvider, sourcePromptPath, licenseRecordPath, listeningStatus. Không fabricated metadata; không biết để null với lý do, không điền pass.

## 7. Runtime assets và offline

- Source WAV/master trong `design/audio/masters/`; candidates trong `design/audio/candidates/`; prompt/log/manifest/provenance ngoài public.
- Runtime accepted trong `public/audio/v1/{sfx,pet,music,ambience}/`. MP3 là baseline delivery đề xuất để kiểm tra trên Safari/Chrome; chỉ dùng Opus/WebM optimization khi có fallback và đã test platform.
- One-shot mono trừ cue cụ thể cần stereo; music/ambience stereo, mono-compatible. Mỗi SFX file riêng cho V1, chưa cần audio sprite.
- SFX decode cache bounded ≤12MiB; chỉ decode beds đang dùng và bed chuyển tiếp. Hai beds + transition tổng PCM budget mục tiêu ≤48MiB; evict bed cũ sau crossfade. Không decode cả catalog vào RAM.
- Precache core SFX đã accept, mục tiêu ≤1.5MiB. Toàn bộ compressed catalog ≤10MiB target. Nhạc/ambience lazy download, không kéo về khi master off hoặc trước gesture.
- Audio cache đặt version/hash, bounded ≤12MiB, evict least recently used; không chiếm cache lesson. Music offline chỉ có sau tải thành công, UI nói rõ “Nhạc đã tải trên thiết bị” nếu có chức năng này.
- Loop không chỉ dựa thuộc tính HTML loop trên MP3: encoder padding phải được đo sau decode; dùng loopStart/End sample đã verify trong AudioBuffer. Nếu không có điểm nối tốt thì crossfade theo hai buffer với memory budget; không tuyên bố gapless trước nghe 10 chu kỳ thật.

## 8. Gói triển khai

### A0 — preflight và demo nghe

- [ ] Đọc plan/catalog/bible và đọc lại các callsites vì code có thể đổi.
- [ ] Ghi checkout/SHA/dirty owners vào `design/audio/qa/execution-ledger.md`. Không chạm progress-map đang có owner khác.
- [ ] Discover công cụ text-to-SFX/music thực sự callable; xác nhận capability, duration, export, commercial-use/license, cost và consent trước gọi dịch vụ có phí. Không đoán tool schema hay dùng ImageGen tạo audio.
- [ ] Nếu không có tool: vẫn hoàn tất mixer harness/danh mục khi được triển khai, ghi BLOCKED_GENERATION cho asset; không lấy beep làm asset AI đã nghiệm thu. Người dùng chỉ đang yêu cầu tài liệu tại thời điểm viết plan.
- [ ] Tạo trang audition local riêng `design/audio/audition.html`: danh sách IDs/variants, play/stop, A/B, volume, loop count, status; chỉ file local, không secret hoặc data trẻ. Giữ ngoài production navigation.

### A1 — pilot sound identity

- [ ] Tạo trước ui-tap, answer-correct, answer-retry, stamp-press, pet-fox, music-home theo bible, mỗi cue ít nhất 2 candidate.
- [ ] Nghe raw và trong mix, chọn palette. Ghi candidate rejected và lý do. Một người nghe duyệt ít nhất pilot trước claim quality; waveform không thay tai nghe.
- [ ] Freeze accepted timbre references và prompt prefix; mở rộng cue còn lại dùng cùng palette, không đổi nhân vật âm thanh mỗi file.

### A2 — sản xuất toàn bộ catalog

- [ ] SFX worker tạo UI/learning/reward/social/pet; music worker tạo beds. Ghi prompts và license theo provider thực tế; không chỉ viết “AI generated”.
- [ ] Trim/fade/EQ/encode theo bible, tạo variant độc lập, tránh random pitch làm motif lệch hòa âm. Generate lại nếu sự kiện không đúng nghĩa.
- [ ] Produce `design/audio/manifest.json` và `design/audio/qa/listening-review.md`, không đăng ký candidate rejected vào runtime.
- [ ] Parent kiểm tra count ID/variants, hash, duration, true peak, loop boundary, nghe luồng 15 phút; sửa cue gây mệt.

### A3 — mixer và settings

Files: modify `src/audio/manager.ts`, `src/audio/manager.test.ts`; create `src/audio/catalog.ts`, `src/audio/preferences.ts`, `src/audio/preferences.test.ts`, `src/audio/policy.ts`, `src/audio/policy.test.ts`; modify SettingsDialog và App integration tuần tự.

- [ ] Implement prefs validator/storage, keep old sound master. Viết test legacy sound=false, corrupt JSON, NaN/out-of-range volumes, storage unavailable.
- [ ] Implement pure admission policy trước playback; test same eventKey lần hai không nhận, cooldown, burst, priority/preemption, bounded dedupe.
- [ ] Implement gesture unlock, fetch/decode cache, AudioBuffer voices và bus gain; pending tasks có generation invalidation.
- [ ] Test mock AudioContext: mute stops active voices; hidden không resume stale sources; dispose cleanup listeners/timers; decode resolves sau route đổi không phát; missing URL/decode lỗi không crash.
- [ ] Tích hợp settings controls và focus/keyboard labels. Không auto phát âm trên render/mount Settings.

### A4 — mapping event thật

Parent sở hữu `src/App.tsx`; đọc kết quả `setMood` trước khi thêm cue. Không phát sound từ effect theo mood chung nữa khi semantic event đã phát.

- [ ] Navigation/openLesson: route thay đổi thực phát một cue; chạm tab đang chọn im lặng.
- [ ] Correct/retry/hint: event answer được xử lý hợp lệ mới phát; rejected duplicate submission im lặng. MatchBoard/drop chỉ một outcome khi commit pair, không sound mỗi pointermove.
- [ ] Lesson complete/stamp/chest: chỉ transition thật, không mount reward view hay load history. Unlock cue chỉ sau authoritative confirmation.
- [ ] Map/landmark: chọn khác selection mới phát; opening detail chỉ map-select hoặc landmark-open theo catalog, không cả hai.
- [ ] Challenge: send-for-review confirmed, attempt result, class milestone mới; không nhận âm ăn mừng cho API fail hoặc pending.
- [ ] Friends: gửi thành công và tin mới qualified; không initial roster/polling. Settings notification mặc định off.
- [ ] Pet: chỉ direct tap, cooldown, đúng selected pet; idle speech bubble không phát pet motif. Birthday callback thay success bằng birthday, once guard giữ nguyên.
- [ ] Thêm test call counts cho App và component events quan trọng; preserve existing tests, không sửa assertions chỉ để che double-play.

### A5 — offline, devices, QA

Files: `vite.config.ts`, `src/pwa/offline.test.ts`, create `scripts/validate-audio-assets.mjs`, `src/audio/catalog.test.ts`; package.json chỉ thêm script validate:audio nếu cần.

- [ ] Validator thực kiểm hash/duration/file exist/variants, unresolved IDs, budget và manifest accepted flags. Dùng ffprobe nếu sẵn; nếu thiếu thì báo dependency, không đoán duration từ bytes.
- [ ] Browser test Chrome và Safari/macOS; Safari iOS hoặc iPadOS thật khi có thiết bị. Nếu chưa có thì ghi NOT VERIFIED, không giả “mobile pass”. Kiểm tra first gesture, background/resume, mute giữa fanfare, offline missing bed, rapid nav, slow decode.
- [ ] Nghe loa laptop + loa điện thoại + tai nghe ở mức nghe thoải mái; không max volume test. Mono fold, 10 loop seams, 15 phút play session, gõ câu hỏi với music tắt/đúng route.
- [ ] `npm run typecheck`, `npm run typecheck:server`, `npm test -- --run --reporter=dot`, `npm run build`, `git diff --check`; ghi rõ skipped tests.
- [ ] Dist chỉ accepted runtime assets, không source WAV/license secrets; API key không bao giờ bundle.

### A6 — bàn giao

- [ ] Ledger A0–A6, cue coverage, asset manifest, audition page, technical report, listening report, blocked/skipped evidence.
- [ ] Không tự chấm đạt vì tool đã xuất WAV. Nghiệm thu cần đủ cue, logic đúng, không double-play, không click/seam và listening review.
- [ ] Đóng gói diff theo write-set; commit/push/deploy theo quyền của task thực thi, không từ quyền của worker.

## 9. Subagent và recovery

Root Luna có thể dùng 2 worker: SFX (`design/audio/candidates/sfx/`, `masters/sfx/`, `public/audio/v1/sfx/`, `public/audio/v1/pet/`, log riêng) và beds (`candidates/beds/`, `masters/beds/`, music/ambience runtime, log riêng). Parent xử lý code + final manifest; workers không cùng ghi catalog/manifest/vite/App. SFX master pet đặt trong masters/sfx/pet để đúng write-set.

Brief worker: “Đọc production bible và catalog, chỉ tạo nhóm được giao; mỗi ID cần raw master, runtime, prompt/provenance, số đo và listening status. Không đổi ID/event, không ghi Brain_Vault, không external publish, Git hoặc descendants. Công cụ thiếu báo BLOCKED, không thay bằng asset khác loại. Trả ARTIFACTS_READY_FOR_REVIEW với path/sha và rejected candidates.”

Nếu Luna là executor của Astra thì không tự spawn: parent phân lane hoặc chạy tuần tự. Không tự đổi model. Sau gián đoạn kiểm ledger/hash, không tạo lại accepted asset; mọi thiếu phí/quota/tool ghi đúng blocker và tiếp tục phần độc lập.

## 10. Nghiệm thu và prompt khởi động

Rubric nghe 100: nhận diện thống nhất 20; nghĩa event rõ 20; dễ chịu khi lặp 25; chất lượng file/seam/mix 20; phù hợp trẻ/game 15. Mục tiêu ≥90, không mục nào <80% điểm nhóm; đây là đánh giá nghe cần evidence, không phép đo khách quan “90% giống”. Hard fail nếu sai motif retry thành âm phạt, clipping, speech giả, âm mute vẫn phát, loop click, mất lesson functionality hoặc giấy phép không xác định.

Prompt dùng với GPT-5.6 Luna Max:

```text
Hãy thực thi docs/superpowers/plans/2026-09-18-hoc-vui-audio-luna-plan.md.
Đọc cùng docs/design/hoc-vui-audio-production-bible.md và
design/audio/audio-catalog.json trước khi làm. Kiểm tra công cụ tạo audio
thực sự khả dụng và không tự tạo phí/đăng ký dịch vụ. Làm A0–A6,
giữ ledger để resume; nếu root có thể giao asset lane độc lập cho subagent.
Giữ dữ liệu/quyền học tập và các thay đổi progress-map của task khác.
Tạo file âm thanh thật, prompt/provenance/manifest; không chỉ thay beep
rồi báo hoàn tất. QA cả nghe lẫn runtime, mute/background/offline.
Nếu thiếu công cụ hoặc listening evidence, báo cụ thể thay vì tự chấm pass.
```
