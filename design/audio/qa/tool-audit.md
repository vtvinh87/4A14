# Audio tool audit — A0

Ngày kiểm tra: 2026-09-19 (Asia/Ho_Chi_Minh)

## Kết luận

`BLOCKED_GENERATION_TEXT_TO_AUDIO` đối với một text-to-SFX/music provider có thể gọi trực tiếp trong môi trường này: không tìm thấy CLI, SDK hoặc connector tạo audio đã xác thực mà không cần đăng ký/credential mới. Không gọi network, không dùng API key, không tạo tài khoản và không phát sinh phí.

Để không biến một tiếng beep thành sản phẩm âm thanh, lane asset dùng generator offline `design/audio/tools/generate-procedural-assets.py`. Đây là procedural synthesis gốc bằng Python + NumPy, có nhiều lớp vật liệu (wood/air/brush/thup/noise), không phải output của AI provider. Mọi record đều ghi `provider=local-procedural`, `license=original procedural synthesis`, `cost=0`, seed, command, tool version và `listeningStatus=pending-human-listening`.

## Tool evidence

| Tool | Evidence | Quyết định |
| --- | --- | --- |
| `ffmpeg` | `/opt/homebrew/bin/ffmpeg`, `8.1.1`; có WAV/MP3/Opus encoder và `anoisesrc`, `amix`, `loudnorm`, `volumedetect` | Dùng để inspect/export khi cần, chưa encode runtime vì chưa nghe duyệt |
| `ffprobe` | `/opt/homebrew/bin/ffprobe`, `8.1.1` | Dùng đo codec, sample rate, channel, duration |
| Python/NumPy | Python 3.13.3; NumPy 2.4.4 | Dùng cho generator offline tái lập |
| `afplay`/`ffplay` | Có local playback command | Chỉ là playback capability; không phải listening evidence của người thật |
| text-to-audio provider | Không có callable tool/CLI/SDK được xác thực | Không đăng ký, không gọi và không tự tạo phí |

## Output đã tạo

- 81 candidate WAV; pilot có tối thiểu 2 candidate cho `ui-tap`, `answer-correct`, `answer-retry`, `stamp-press`, `pet-fox`, `music-home`.
- 67 master WAV cho đủ 38 logical cue/67 variant; PCM 24-bit, 48 kHz; 148/148 candidate+master được generator kiểm tra bằng `ffprobe`.
- Reproducibility hash đã được lane generator kiểm tra; parent đã kiểm tra lại inventory, file type, manifest SHA và validator.
- Không có file nào được ghi vào `public/audio`; runtime promotion vẫn tắt.

## Guardrail

Không coi metadata, waveform, `ffprobe`, `afplay` hoặc `ffplay` là điểm nghe đạt. Chỉ reviewer nghe thật trên browser/device được chỉ định mới được chuyển `pending-human-listening` thành `accepted`.
