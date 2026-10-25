# Hình do AI vẽ: tiêu chuẩn chống "slop"

Người dùng dùng AI (Flow) để vẽ vì không có chi phí thuê hoạ sĩ, nhưng không chấp nhận dấu hiệu "AI slop": hình méo,
hành động kỳ quặc, nhân vật đổi dáng, rung giật. AI vẽ; người làm phim chịu trách nhiệm từng khung. Áp cho mọi video
có nhân vật hay cảnh do Flow sinh (sprite hd-2d, sitcom 2D, collage...). Chi tiết kỹ thuật ở `lemo-hd2d-video.md`.

## Không bao giờ để AI tự nghĩ chuyển động

- Dáng lấy từ khung xương 3D (Quaternius UAL + keyframe trong `rig/custom.js`), AI chỉ vẽ lại nét theo tờ dáng.
  AI tự vẽ chuỗi động tác thì tay đánh cùng chiều chân, hai tay cùng giơ, cỡ người phình xẹp ~12%.
- Hội thoại 2D: một khuôn mặt cố định, chỉ thay mảng miệng/mắt (`sitcom-test/lipsync.py`); miệng theo âm tiết
  (whisper + chữ của kịch bản), mỗi hình giữ ≥ 2 khung. Mảng miệng lấy theo chênh lệch LỚN NHẤT của mọi ô so với
  mặt nghỉ, không theo độ lệch chuẩn: độ lệch chuẩn cắt mất đáy lưỡi/môi dưới của miệng há to (lộ bậc màu da).

## Kiểm bằng máy trước khi người dùng xem

- `qa.py`: đủ số khung, đầu không đổi cỡ (> ~5% chiều cao là loại), cỡ người không phình.
- `fidelity.py`: chiều cao nhân vật Flow / hình nhân cùng ô; lệch > 6% thì bù.
- Cỡ đầu và cột chân giữa các trạng thái (atlas), để chuyển động tác không nhảy cỡ, nhảy ngang.
- Bản đồ chênh lệch giữa các khung: chỉ vùng được phép cử động (miệng, mắt) được sáng.
- Viền: tỉ lệ pixel sáng ở mép ≈ 0 trên nền tối; không còn ngôi sao watermark.
- Hậu cảnh Flow (ảnh raster) KHÔNG boil: bẻ cong cả ảnh 1,7px/12fps bị chê "nhòe nhòe giật giật" (2026-10-25). Camera
  dịch dưới pixel, MỘT lần nội suy bicubic từ ảnh đã phóng 2x; đo thay đổi giữa hai khung liền ở vùng nền (4,3 → 1,4).
- Nhân vật raster cũng vậy (bị chê "nhòe, răng cưa"): không boil, không cắt alpha cứng sau khi phóng (đó chính là bậc
  thang), không phóng lại mỗi khung (thở = nhích 2px). Phóng MỘT lần Lanczos, alpha làm mờ 1,6px rồi kéo dốc lại;
  bỏ vòng `ink_outline` khi ảnh Flow đã có viền sạch (vòng 1px vẽ trên mặt nạ 341px ra viền răng cưa). Đo viền sáng
  trên mép (trừ mép cắt dưới đáy) trước khi bỏ: 0,14%.
- Phóng nét bằng AI (Real-ESRGAN `realesrgan-x4plus-anime`) khi ô nguồn nhỏ hơn cỡ hiển thị (ô bảng miệng 3x3 chỉ
  341 px, khung tròn 710 px): phóng MỘT mặt gốc rồi dán mảng miệng/mắt đã làm mờ mép. Phóng từng mặt riêng làm sắc độ
  quanh miệng lệch vài mức mỗi hình, 12 hình/giây thành "nháy sáng tối"; đo độ sáng nửa trên mặt qua các khung = 0.
  Mô hình xoá tàn nhang như nhiễu: trả lại trên vùng da chỗ bản Lanczos tối hơn.

## Soát bằng mắt (máy không bắt được)

- Tay đủ ngón, không thiếu tay/chân, không cụt đầu ở mép ô, mặt đúng hướng ở mọi khung (Flow có lúc vẽ quay lưng
  hay quay ngang giữa chuỗi).
- Nhân vật cùng một dáng người qua mọi động tác (đầu to/nhỏ, mập/gầy).
- Không có chữ lạ, logo, vật thể vô nghĩa trong nền.
- Bản bị loại ghi lý do vào `bad-frames.json`, không xoá im lặng; người dùng chọn bản cuối.

## Trung thực

- Video công khai dùng nhân vật dẫn GỐC của người dùng (Jolie, "Chô li kể"), không dùng nhân vật có bản quyền (Rem):
  vẽ lại nhân vật người khác là tác phẩm phái sinh, cần phép (Luật SHTT Điều 20); trích dẫn bình luận (Điều 25) chỉ
  che việc dùng ngắn tranh gốc có ghi nguồn. Prompt ghi "an original character, not based on any existing character".

- Hình do Flow sinh luôn mang SynthID: không bao giờ ghi "No AI" hay "vẽ tay". Định vị: hoạt hình Việt làm có hỗ
  trợ AI, kịch bản, nhân vật, đạo diễn, diễn hoạt là của người làm.
- Đăng thưa và chất: khảo sát 2026-10-24 (VN + Mỹ) cho thấy kênh làm kỹ, đăng thưa đạt hàng triệu view/video, kênh
  đăng hàng loạt rơi xuống vài nghìn.
