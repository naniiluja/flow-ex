# Video hoạt hình vẽ bằng code (claude-animation-base, series "Việt sử")

Bài học rút từ series lịch sử 91 cảnh (2026-10-22/23). Áp cho mọi video dựng bằng engine p5 của
`.claude/skills/claude-animation-base` (mã nằm trong skill, quy tắc nằm ở đây). Kịch bản và giọng đọc vẫn theo
`script-writing.md`, `script-review.md`, `voice-tuning.md`.

## Quy trình làm việc với người dùng

- **Tra internet trước khi vẽ bất cứ vật thể lịch sử nào** (trang phục, cờ, trống đồng, thuyền, nhà, rồng): ghi điểm chính và nguồn
  trong comment đầu file, ghi rõ chỗ "suy đoán" khi không có tư liệu. Người dùng nhắc thẳng "nhớ tham khảo internet trước khi vẽ".
- **Đưa tờ mẫu hình tĩnh cho người dùng duyệt TRƯỚC khi render cả video** (dàn nhân vật, đạo cụ, con vật, nhà cửa). Render 91 cảnh
  mất khoảng 64 phút (`--jobs=6`), ghép 5 phút; một lần render hỏng là mất hơn một tiếng.
- Khi người dùng đổi yêu cầu giữa chừng, dừng lần render đang chạy thay vì để nó chạy ra một bản sẽ bị bỏ.
- Tự chấm mỗi tờ mẫu bằng mắt VÀ nói thẳng chỗ chưa đạt kèm cách sửa; người dùng đánh giá rất kỹ ("thấy rõ mà không làm").
- "Y hệt mẫu" nghĩa là đo ảnh mẫu bằng số (lưới ô, bảng màu, độ dày viền) rồi so từng ô; ước chừng bằng mắt bị chê ba lần.
- Bản quyền: ảnh người dùng gửi thì dùng được cho bài thử; tranh người khác vẽ mà đưa vào video công khai phải hỏi; nguồn mở được
  dùng là Noto Emoji (Apache 2.0, ghi nguồn trong file dữ liệu).

## Phong cách đã duyệt: búp bê ghép (paper doll)

- Một thân trắng (đầu tròn to, thân con nhộng, chân ngắn) mặc từng món đồ; viền đen dày, mỗi món một tông bóng phẳng, vẽ bằng p5
  thường, đỉnh hình rung theo boil, đặt trên nền giấy hạt của engine. Người dùng đã thử và bỏ: Đông Hồ cọ, anime nét sạch, pixel.
- Thứ tự lớp của món đồ: `back` sau thân (khiên), `mid` giữa thân và đầu (áo, nếu không cổ áo đè lên cằm), còn lại vẽ sau đầu.
- Đổi cả video sang phong cách mới bằng một lớp chuyển đổi gán đè các hàm cũ CÙNG tham số (`vs_dolladapt.js`), không sửa tay 91 cảnh.
  Búp bê cao 8,4u chứ không 9,05u vì đầu to hơn: người đứng cạnh nhau sẽ đè lên nhau.
- Mặt búp bê để trống nên diễn bằng thân: hô thì nhún theo nhịp, ngạc nhiên thì giật nảy rồi rướn, nói thì gật nhẹ, mỗi người lệch
  pha một chút; một `mouth:` mà không đổi gì trên hình là lệnh chết.
- Bàn tay phải có cánh tay nối về vai, nếu không trông như bàn tay lơ lửng.

## Chiều sâu và thứ tự vẽ

- Engine vẽ theo thứ tự gọi hàm, nên người nhỏ đứng trước bị người to gọi sau đè lên, thuyền gần bị thuyền xa đè. Cách sửa: hàng đợi
  chiều sâu, người/lính/thuyền vẽ theo y chân (xa trước); hàng đợi xả trước mọi lệnh vẽ khác hoặc khi đổi phép biến đổi
  (push/pop/translate), để những lớp cảnh đã cố ý xếp vẫn giữ nguyên.
- p5 2.x khoá hàm toàn cục trên `window` (gán đè im lặng không có tác dụng): hook phải vá `p5.prototype` lúc file nạp, trước khi p5 khởi tạo.
- Người trên thuyền là chính búp bê của dàn nhân vật (không vẽ hình giản lược), vẽ TRƯỚC thân thuyền để mạn thuyền che chân, và vẽ
  trong khung thuyền để nghiêng theo khi thuyền chìm.
- Người cưỡi ở các cảnh cỡ ~0,2 lần con vật; con vật chibi phải to hơn chỗ ngồi (~1,3 lần) để không bị người đầu to lấn.

## Thứ phát ra từ tay hay từ vật

- Hạt giống, vuốt rùa, mũi tên... lấy điểm xuất phát từ hàm trả vị trí bàn tay (`nguoiHand`, `vsNguoiBow`), không đoán toạ độ;
  người dùng bắt lỗi "rải hạt không bắt nguồn từ tay" và "mũi tên ra từ nách".
- Cung: đầu cung cong VỀ phía người bắn khi kéo; dây cung màu xám nâu, không trắng (dây trắng cắt ngang mặt).

## Chuyển động và dựng phim (theo ANIMATION_GUIDE của skill)

- Mọi chỗ nối cảnh có chuyển cảnh: đổi chương dùng vệt cọ màu chương, các chỗ khác xoay vòng iris / mờ qua giấy / vệt cọ giấy;
  mỗi clip render riêng nên cảnh trước vẽ nửa đầu, cảnh sau vẽ nửa sau. Bản cũ chỉ có 21/90 chỗ nối có chuyển cảnh.
- Rung camera nửa giây sau các từ va chạm trong lời đọc (nổ, pháo, vỡ, húc, chém...), lấy từ thời gian từng chữ của whisper.
- Kết video: camera lùi, iris đóng về hình mở đầu (ngôi sao trống đồng), kèm một câu Vbee ngắn cùng giọng và thông số; câu chữ
  theo `script-writing.md` (ví dụ: "Câu chuyện của chúng ta đến đây là hết. Cảm ơn bạn đã nghe đến cuối.").
- Rồng "bay lên" phải lên hẳn trời (khoảng 1,35 lần cỡ rồng), không sà sát mặt đất.

## Bẫy kỹ thuật đã gặp

- p5.brush hoãn nét đến cuối khung nên đè lên mọi thứ vẽ sau nó: `flushBrush()` sau mỗi lớp trước khi vẽ miếng che (mắt nhắm).
- `paint({fill})` trộn màu như bột màu: tay áo đen tô loang thành xám; mảng màu phẳng dùng p5 thường, cọ chỉ cho nét mực.
- p5 2.x: `splineVertex` thay `curveVertex`; `bezierVertex` gọi 3 lần một điểm cho mỗi đoạn cubic; WEBGL không có gradient của
  `drawingContext`.
- Khi cắt một bộ phận ra để vẽ lại (cánh tay), vá phần thân nó từng che, nếu không lúc cử động sẽ lộ lỗ.
- Đổi lời thì mọi `cue(S, từ, n, fb)` âm thầm rơi về `fb`: chạy bộ kiểm cue sau `build-times.mjs`.
- ffmpeg: `apad` + `-shortest` trong `filter_complex` treo vô hạn; dùng `apad=whole_dur=<giây>` + `-t`.
- Chạy nền mà pipe qua `grep` thì dòng tiến độ bị đệm, file output trống: đếm file kết quả hoặc `pgrep` để biết tiến độ.
- Kiểm tra chuyển cảnh bằng `render.mjs --sheet=<các mốc quanh chỗ nối>`; soát cả video bằng `viet-su/sheet.mjs` theo nhóm 4 cảnh.
