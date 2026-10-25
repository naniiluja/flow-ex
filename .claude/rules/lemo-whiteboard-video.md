# Phim bảng trắng lemo-opuscar (`whiteboard`) có người kể

Áp cho phim kể chuyện trên bảng trắng (phim mẫu "Tin nhắn nhầm số", `~/Developer/lemo-films/scam-storytime`, 2026-10-25).
Quy trình bắt buộc theo lemo-opuscar (AGENTS.md, DIRECTOR.md, STYLE.md); kịch bản theo `script-writing.md`.

## Hình

- Hậu cảnh vẽ bằng code của style (chữ, biểu đồ theo lời), không dùng ảnh Flow; chỉ nhân vật mới gen bằng Flow.
- Nhân vật là nam châm sticker (STYLE.md chỉ cho nam châm di chuyển): viền giấy trắng, bóng đổ, trượt theo camera; khi
  camera lùi ra toàn bảng thì thu nhỏ vào lề trống.
- Font nét đơn không có dấu tiếng Việt: ghép NFD trong bản `engine/wb.js` của phim (sắc, huyền, ngã, mũ lấy từ á à ã â
  của font; hỏi, nặng, trăng, móc, gạch đ vẽ tay). Dấu móc (ư, ơ) dính cạnh chữ và quặp lại, không vươn lên như dấu sắc.
- Mọi khung quanh chữ đo theo `text().width`, chừa dấu phía trên và chân chữ phía dưới; không khung kích thước cố định.
- Mỗi hình vẽ neo vào chữ trong lời qua `at(đoạn, "cụm từ", lần)`; không tìm thấy thì báo lỗi, không lặng lẽ thay mốc.
  Thêm lời vào đoạn có sẵn thì soát lại chỉ số lần xuất hiện của mọi mốc trong đoạn đó.
- Trước khi giao, soát khung TOÀN BẢNG và từng vùng: không nhãn nào bị đường biểu đồ xuyên qua, vòng đánh số không đè
  hình, khoanh tròn chỉ ôm đúng dòng, không chữ ra khỏi khung hình, không gì nằm trong dải phụ đề (12% đáy).
- Hình đồ vật (con vật) vẽ đủ bộ phận để nhận ra; soát ở cỡ phóng to.

## Tiếng và phụ đề

- Nhạc gốc bằng `core/audio/sampler.py` (CC0), theo cue map; dừng hẳn trước cú lật.
- Tiếng bút (2,2-7,5 kHz) che phụ âm nhiều hơn nhạc: hạ cả tiếng bút và nhạc dưới lời; đo RMS nhạc TRƯỚC khi hạ.
- Soát bằng whisper TỪNG ĐOẠN trên bản trộn so với giọng mộc (chênh ≤ ~2 điểm); whisper cả file dài bỏ sót đoạn.
- Phụ đề: một câu một cue nếu ≤ 88 ký tự (2 dòng × 44), câu dài chia đều ưu tiên dấu phẩy; giữ ≥ max(1,8s, lời + 0,6s).

## Kỹ thuật

- ffmpeg của `@ffmpeg-installer` (4.1) khi ghép: thêm `aformat=sample_fmts=fltp:channel_layouts=stereo` sau `aresample`,
  không dùng `core/render/mux.sh`; `video.mjs` cần ffmpeg trên PATH (tạo symlink tới bản npm).
- Chú thích `//` chèn giữa một dòng code một dòng nuốt cả phần sau (lỗi "Unexpected end of input"): chạy `node --check`.
