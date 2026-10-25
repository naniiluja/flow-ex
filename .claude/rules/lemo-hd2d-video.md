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

- Viền trắng lem quanh sprite trong cảnh tối = nền trắng của Flow trộn vào nét viền (~32-38% pixel mép là màu sáng,
  trên nền xám xem trước không thấy). Bóc từng lớp pixel sáng ở mép tới nét viền đen (`subaru-moves/scripts/matte.py`
  `defringe`); đo tỉ lệ pixel sáng ở mép trước/sau, đừng chấm bằng mắt trên nền sáng. Ngưỡng 135 vẫn sót ~20% mép
  xám nhạt (85-135): bóc tới 85 rồi vẽ thêm vòng mực 1px (`ink_outline`, chỗ Flow thiếu viền như đế giày). Khe nền
  kẹp kín (giữa hai chân) khác mảng áo trắng ở độ phẳng: nền 67-90% pixel ≥250, áo có tô bóng 0-15% → gỡ khi >60%.
- Độ phân giải: sprite alpha-test bị phóng to thì mép thành bậc thang ("răng cưa rất to" lúc Subaru đứng sát camera,
  cao ~240px trên màn hình trong khi atlas chỉ 131px). Đóng atlas theo cỡ của shot GẦN NHẤT (đầu 84px, người ~260px),
  thu nhỏ LANCZOS + cắt alpha cứng, texture `LinearFilter` khi phóng và mipmap khi thu (sở thích người dùng thắng con
  số 30-60px của STYLE.md). Đo chiều cao nhân vật trên màn hình ở shot gần nhất trước khi chọn cỡ atlas.
- Cỡ và vị trí sprite lấy từ tờ dáng 3D, không đoán từ hình vẽ: đo "bề ngang đầu" làm vẫy tay nhỏ đi ~20% (tay lọt
  vào vùng đầu) và căn theo tâm đầu làm cả người giật 37px theo tay. Đúng: hệ số phóng của từng tờ dáng
  (`ref/guide-scale.json`), căn khung theo tâm ô lưới (gốc hình nhân đứng cố định ở đó), rồi đưa chân trung vị của
  mỗi động tác về cùng một cột để chuyển động tác không nhảy ngang. Kiểm bằng số: cỡ người và cột chân mỗi trạng thái.
- Flow có lúc giữ đúng CHIỀU CAO hình nhân nhưng vẽ lại TỈ LỆ (dáng buồn: đầu nhỏ hơn 7-16% ở mọi bản; idle chính
  diện: thấp hơn mà đầu to hơn) → người xem thấy "nhỏ đi"/"mập ra". Hai lớp bù: `fidelity.py` (cao Flow/cao hình nhân
  cùng ô) cho mọi tờ, và `HEAD_MATCH` (khớp cỡ mảng tóc với `talk` cùng hướng) chỉ cho dáng đứng yên, tay buông (sad,
  idle). Không khớp đầu cho dáng có tay giơ hay đầu ngửa (vẫy, cười): tay áo đen lọt vào dải đo.

## Camera và lấy nét

- Dải tilt-shift tính từ vị trí chiếu của nhân vật: gọi `cam.updateMatrixWorld()` TRƯỚC `project()`, nếu không dải nét
  bám camera của khung trước và nhân vật nhòe hẳn mỗi khi camera di chuyển (bị một lần, 2026-10-24).

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
- Bảng lưới (bảng miệng 3×3, tờ bộ phận): ngôi sao Gemini luôn nằm ở ô góc dưới phải, nên đừng lấy ô đó làm hình nền;
  `collage-broll/scripts/remove-image-watermark.mjs` chép mảng bên trái đè lên, chỉ đúng khi bên trái là nền trơn.
  Gỡ "khe nền trắng tinh bị kẹp" chỉ ở vùng dưới mặt: tròng trắng mắt và răng cũng trắng tinh, phẳng.
- Nhận diện ảnh mới bằng cách gắn cờ `data-old` lên mọi `flow-image-tile` TRƯỚC khi bấm gen, không bằng tập uuid:
  Flow tải ảnh cũ trễ khi cuộn, một lần script lưu nhầm 4 ảnh cũ của project (gen "xong" sau 17 giây là dấu hiệu).
  Cờ `data-old` vẫn chưa đủ (2026-10-25, lưu nhầm 16 ảnh cũ trong 2 lượt): lưới Flow ảo hoá, ảnh cũ cuộn lại vào tầm
  nhìn nằm trong phần tử tile MỚI không có cờ. `gen.mjs` giờ cuộn lưới lên đầu, chờ thấy tile "%" rồi hết, và chỉ lấy
  `batch` tile trên cùng theo vị trí. Sau mỗi lượt vẫn so md5 và xem tờ ảnh; ảnh tham chiếu tải lên cũng có thể bị lưu.
- **Chuỗi động tác (walk, chạy, nhảy...) không để Flow tự nghĩ dáng** (2026-10-24): Flow vẽ từng khung độc lập nên tay
  đánh cùng chiều chân, hai tay cùng giơ, cỡ người lệch ~12% ("nhún nhún"). Cách đã duyệt: khung xương Quaternius UAL
  (CC0) + Subaru low-poly gắn theo xương, render 8 dáng thành tờ 2×4 (`subaru-moves/rig`, `scripts/bake.mjs`,
  `guide_sheet.py`), đính kèm sau tờ tham chiếu và bảo Flow "redraw the second image... same cell, same pose". Flow bám
  dáng sát (4 bản lệch nhau vài px). Render 3D thẳng ra pixel thì chuyển động đúng nhưng người dùng chê "xấu".
- Hướng chính diện/sau lưng: dáng đi thật đặt hai bàn chân trên một đường, vẽ ra trông "tật". Dời cả chân sang ngang
  ~3,5 cm (`widen`, `Walk_Loop:front:8:0.035`) cho hai chân song song. Xoay đùi ra ngoài (đã thử 7°) làm bàn chân bè
  thành chữ V; kiểm bằng số đo: bề ngang mắt cá ≤ bề ngang gối. Đầu "giật" = Flow vẽ tóc to nhỏ khác nhau giữa các khung: đo bề
  ngang 30% trên của người qua cả chu kỳ, lệch quá ~5px (ở cỡ khung ~330px) thì loại bản đó. Sau khi cắt: đưa khung walk/idle về cùng cỡ, căn theo đầu, đo độ dạng chân để kiểm chu kỳ; khung Flow vẽ sai
  (thiếu tay, quay lưng, cụt đầu) ghi lý do vào `bad-frames.json`, không xoá im lặng.

## Ghép và render

- Không dùng `core/render/mux.sh` với ffmpeg 4.4 của `@ffmpeg-installer`: look-ahead 3 s của loudnorm làm nó báo nhầm
  "truncated audio". Mux riêng: loudnorm hai lượt -14 LUFS / TP -1,2, libx264 crf 16, AAC 192k, `-shortest`.
- Render 1080p30 tốn khoảng 2 s mỗi 1 s phim (`video.mjs --workers 5`); thử nhanh bằng 960x540 hoặc render một đoạn.
- Báo xong bằng tiếng: `say -v Linh "<câu>"` + `afplay /System/Library/Sounds/Glass.aiff`.
