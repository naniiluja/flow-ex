# Phim sprite pixel trong cảnh lemo-opuscar `hd-2d`

Áp cho phim có nhân vật sprite đặt trong cảnh 3D của lemo-opuscar (phim "Từ số không", 2026-10-24). Quy trình kịch bản
theo `~/lemo-opuscar/DIRECTOR.md` cộng `reports/Viết kịch bản phong cách HD 2D.md`; STYLE.md của style giữ nguyên.

## Nhân vật trong cảnh

- Sprite là billboard ĐƯỢC CHIẾU SÁNG trong scene three.js (`MeshLambertMaterial`, `alphaTest` 0,5, xoay quanh trục Y về
  camera), có `customDepthMaterial` + `customDistanceMaterial` cùng map để bóng đổ đúng hình người, và depth-test để
  đạo cụ che được người. Vẽ sprite lên canvas 2D phủ trên cảnh thì trông phẳng, không "3D".
- Không làm tròn số pixel mỗi ô (`Math.round` px/ô): khi camera dịch, người to nhỏ giật cục.
- Hướng sprite chọn theo vector di chuyển, đủ 8 hướng; chỉ có mặt trước thì đi ngang trông như đi lùi.
- Idle và walk dùng chung một tỉ lệ thân (`walk_idle_body`); trộn idle chibi gốc với walk từ ảnh Flow thì người nhảy cỡ.
- Tư thế ngồi/quỳ cao khoảng 0,72 lần lúc đứng, đo trên sprite, không đoán.
- Mọi tên trạng thái sprite mà kịch bản gọi phải tồn tại trong `manifest.json`; thiếu khung là lỗi dừng build, KHÔNG có
  fallback âm thầm sang khung khác (fallback `LOWER` từng cho Subaru đứng trong cả đoạn phải ngồi).
- Sau build, máy kiểm từng shot: tư thế đúng tên (log mẫu), độ nét của người đang nói (0 khung mờ).

## Camera và lấy nét

- Camera nghiêng 20-30°, FOV 32-45; DOF/tilt-shift tính lại tiêu điểm MỖI khung theo người đang nói.
- Khung chữ không đè lên chân sprite: đặt khung hình theo vị trí hộp thoại.

## Lời thoại

- Phim kiểu game dùng khung chữ gõ dần + tiếng blip riêng mỗi nhân vật, KHÔNG lồng tiếng Vbee trừ khi người dùng yêu cầu.
- Giữ chữ theo DIRECTOR.md §7: mỗi hộp ≥1,8 s và ≥ thời gian gõ + 0,6 s, title card ≥4 s; chạy `core/render/readcheck.mjs`.

## Sprite từ Flow (0 credit)

- Ref nhiều hướng/tư thế: 3 tab Chrome, mỗi tab một project Flow riêng, batch x4 (12-16 ảnh/phút, không trùng ảnh).
  Trước mỗi lần submit xoá chip ảnh tham chiếu đã tích lại; dán prompt thay vì gõ.
- Ảnh -> sprite: bảng màu k-means trọng số màu bão hoà, mỗi ô lấy màu đa số, nền tách bằng flood fill, khoá bảng màu
  chung cho mọi hướng của một nhân vật; mặt sau kiểm bằng máy màu tóc/áo (không còn mặt hay áo trước).
- Mỗi đạo cụ (giỏ, táo, cổng, đèn...) cũng lấy từ Flow; đạo cụ vẽ bằng code lệch phong cách với sprite.

## Ghép và render

- Không dùng `core/render/mux.sh` với ffmpeg 4.4 của `@ffmpeg-installer`: look-ahead 3 s của loudnorm làm nó báo nhầm
  "truncated audio". Mux riêng: loudnorm hai lượt -14 LUFS / TP -1,2, libx264 crf 16, AAC 192k, `-shortest`.
- Render 1080p30 tốn khoảng 2 s mỗi 1 s phim (`video.mjs --workers 5`); thử nhanh bằng 960x540 hoặc render một đoạn.
- Báo xong bằng tiếng: `say -v Linh "<câu>"` + `afplay /System/Library/Sounds/Glass.aiff`.
