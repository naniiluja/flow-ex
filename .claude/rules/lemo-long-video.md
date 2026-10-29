# Phim dài lemo-opuscar dựng theo đoạn (Broadcast News + Montage)

Áp cho video dài nhiều hồ sơ/chương dựng bằng engine data-driven của lemo-opuscar (phim mẫu "Mười hồ sơ Araki bỏ
dở", `~/Developer/lemo-films/jojo-mysteries`, 2026-10-27). Kịch bản theo `script-writing.md`, giọng theo `voice-tuning.md`.

## Hình

- Nền là footage anime màu cắt 2-4 s theo vế câu, nhạc nền riêng cho từng hồ sơ; chỗ lộ ra chuyển sang montage cắt
  theo phách. Ảnh tĩnh + khung chữ (Visual Investigation) bị chê "AI slop", không dùng lại.
- Chữ: giấy xé mặc định, telop Nhật cho câu đấm, SFX katakana 2-3 lần mỗi hồ sơ; không hộp chữ nhật.
- Vòng khoanh nét bút (lực bút + đuôi văng) ôm đúng vật, lề 10-20 %, chỉ vẽ trên khung đã freeze. Đo toạ độ trên
  still có lưới ở đúng mốc freeze (`fit.mjs`), rồi xác nhận lại trên một khung cắt từ mp4 cuối. Mốc freeze phải rơi
  vào lúc vật đã hiện (ảnh Polaroid còn đen thì chưa khoanh); không thấy vật thì bỏ vòng, giữ ghi chú.

## Render song song theo đoạn

- Mỗi đoạn (hồ sơ) là một file phim riêng, render riêng ra `segments/<seg>.mp4` -14 LUFS, rồi ghép bằng concat
  `-c copy` (mọi đoạn cùng 1920x1080, 30 fps, AAC 48 kHz).
- Hai build không bao giờ chạy trong cùng một thư mục engine: `out/mix.wav`, `out/video.mp4`, `data/events.json` bị ghi
  đè. Chạy song song thì chép thư mục engine (bỏ `frames/`, `out/`, `work/`) và symlink `frames/` về bản gốc.
- Cache khung (`frames/`) đặt khoá theo id nguồn, không theo file: hai phim dùng chung cache thì id nguồn phải khác
  nhau (`meme04`, không `meme`), nếu không phim sau lấy nhầm khung của phim trước.
- Sau khi ghép: `blackdetect`, tờ ảnh mỗi 20 s, đo lại mốc chương từ độ dài thật của từng đoạn trước khi đăng.

## Bản dọc 9:16 cho Shorts

- Engine dọc nằm ở `~/Developer/lemo-films/pocoloco-short/engine` (W/H 1080x1920, `build.sh` có `--size 1080x1920`).
  Phụ đề tự xuống dòng ở y khoảng 1490, logo kênh và dòng nguồn ở góc trên phải (y 250 và 330).
- Ảnh tĩnh phải nằm trong thư mục engine (`assets/img/`): trang chỉ phục vụ thư mục đó, `../img` trả 404.
- `mix.py` đòi có `music.drive`: phim nào cũng khai báo một bản drive phủ các shot montage.
- Khung dọc cắt mất hai mép của footage 16:9: chữ hay vật nằm ngang (tờ báo, bảng) dùng ảnh tĩnh, đặt `f` cho
  shot có nhân vật ở mép.
- Lỗ meme hay clip chỉ đặt ở khoảng lặng cuối câu đo trên audio, rồi whisper hai phía của lỗ trước khi render.
- Nhạc nền liền mạch: dưới meme và clip thì hạ nhạc (khoảng -12 dB), không tắt; drive vào ra bằng crossfade khoảng 1 s;
  đổi nhạc thì crossfade 1,5-2 s ở chỗ nghỉ đoạn. Phim dài render theo đoạn thì trộn nhạc một lần trên cả timeline.
- Clip ngắn hơn shot thì hình đứng im ở khung cuối: đặt `rate = min(1, (dài clip - in) / dài shot × 0,97)` cho mọi shot
  và mọi nửa `split`, lấy độ dài shot từ bảng `tools/plan.mjs` in ra (cách làm trong `gyro-short`, 2026-10-28).
- `plan.mjs` ghi đè `data/plan.json` của film đang chạy: dựng ảnh bìa (`film/thumb.json`) chỉ SAU khi render xong.
- Mỗi Short đổi phong cách dựng (đã duyệt: Sports Telestrator `gyro-thay-stand`, Game Show `sandman-short`) và dùng nhạc
  CHƯA từng dùng ở phim nào (soát `~/Developer/lemo-films/*/music`), chọn theo bối cảnh truyện (SBR miền Tây 1890: western).
  Đưa tờ storyboard 6-10 khung dựng thật cho người dùng duyệt TRƯỚC khi gọi Vbee.
