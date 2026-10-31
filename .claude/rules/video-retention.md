# Giữ chân người xem (theo cách MrBeast, người dùng yêu cầu áp cho mọi video từ 2026-10-29)

Nguồn: bản tóm tắt người dùng gửi về công thức giữ chân ~70% của MrBeast. Áp cho kịch bản, storyboard và dựng; kịch bản
vẫn theo `script-writing.md`, `script-fan-voice.md`. Mốc giây ghi cho video dài; Short (≤3 phút) dùng mốc trong ngoặc.

## 5 giây đầu: đáp đúng lời hứa
- Câu đầu tiên của lời đọc nói lại đúng lời hứa của tiêu đề (cùng từ khoá, cùng câu hỏi).
- Khung đầu tiên trông giống ảnh bìa: cùng hình chính, cùng bảng màu, cùng chữ lớn. Khung 0 không được là nền trơn,
  màn đen hay hiệu ứng mở chưa có hình. Làm ảnh bìa từ chính khung mở đầu (hoặc ngược lại).

## 20 giây đầu (Short: 8-10 giây): hook đủ ba phần, rồi vào việc
- Bối cảnh (chuyện gì, ở đâu), cái giá hoặc phần thưởng (ai sống/chết, bí mật gì bị lộ), và một khoảng trống tò mò chỉ
  trả lời ở cuối ("tới cuối mới biết…").
- Vượt kỳ vọng bằng công sức thấy được: nói cụ thể đã làm gì ("mình đọc lại ba chương, so cả bản Nhật"), dựng dày.
- Vào nội dung chính chậm nhất giây 20 (Short: giây 8-10). Lời chào gói trong một câu ngắn, không chen giữa hook.
- Số thật kênh Chô li (Analytics 25-27/10/2026): Short 2:22 và 2:49 rơi từ ~97% ở giây 6 xuống ~47% ở giây 16-19;
  Short 1:06-1:07 còn 66-80% ở cùng mốc. Chỗ mất người nhiều nhất là giây 6-19: câu móc phải có khoảng trống tò mò.

## Thân video: giữ đường giữ chân phẳng
- Đa dạng hình ảnh: đổi khung, góc, cỡ cảnh hoặc chuyển động ít nhất mỗi 3-5 giây (Short: 2-3 giây). Không ảnh tĩnh
  đứng yên quá 5 giây.
- Tương phản đều đặn: xen hai mạch (truyện chính và một mạch phụ, footage và trang manga, cảnh căng và câu đùa) thay vì
  một mạch kéo dài.
- Nhịp theo chu kỳ năng lượng: mỗi luận điểm/trận mở bằng một nhịp cao (câu đấm, cú lộ, nhạc lên) rồi hạ xuống giải
  thích, rồi chu kỳ mới; chu kỳ đầu ngắn, càng về sau càng dài. Phần chậm, cảm xúc để ở 20% cuối.

## Kết: dừng ở cao trào
- Lộ phần thưởng lớn nhất (đáp án của khoảng trống tò mò) ở cuối, rồi kết ngay ở đỉnh: kịch tính, ấm, hoặc cú đùa đen.
- Câu cảm ơn/hẹn gặp lại ≤ 2 giây, đặt sau cú chốt, không kéo dài phần kết sau payoff.
- Số thật (cùng đợt đo): 8-10 giây cuối (cảm ơn + câu hỏi bình luận) mất 20-30 điểm giữ chân (Pocoloco 49% → 21%,
  Diego 38% → 10%). Câu hỏi bình luận để ở mô tả, không đọc trong video; kết ngay sau cú chốt.

## Soát trước khi đăng
- Xem lại cả bản dựng như người xem lạ: đánh dấu mọi chỗ có thể lướt đi (câu thừa, ảnh đứng lâu, giải thích lặp), cắt
  hoặc dựng lại. Ghi các chỗ đã cắt trong báo cáo.
- Kiểm bằng số: khung 0 có hình chính; câu đầu chứa từ khoá tiêu đề; không khoảng nào > 5 s (Short > 3 s) không đổi
  hình; vào nội dung chính trước mốc trên.
- Short: lời đọc tối đa ~220 chữ (250 chữ ra 72-88 s); hook nêu câu hỏi, đáp án chỉ lộ ở payoff và được hỏi lại ngay
  trước đó; "mình" chỉ dùng cho người kể, không bao giờ cho nhân vật.
- Hình chiếm trọn bề ngang và cao ≥ 1.250 px; không ô footage nhỏ giữa nền trống; ảnh bìa lấy từ khung 1 không có phụ đề.
- Trước khi đăng, cắt một khung mỗi shot từ mp4 cuối và xem: shot nào hình không khớp lời thì dựng lại.
- Đăng qua API với `containsSyntheticMedia: false` (mục "Sử dụng AI" = Không), rồi vào Studio bỏ tick "Địa điểm
  nổi bật" và "Tự động hiển thị khái niệm" (API để bật sẵn).

## Kênh và phân phối (báo cáo `reports/Chiến lược phát triển kênh Chô li nói.md`, 31/10/2026)
- Short có footage anime dài tối đa 59 s (Short trên 1 phút bị claim là chặn toàn cầu); meme 21-34 s.
- Chủ đề Short ưu tiên luật truyện và số phận nhân vật phần 3-5; SBR chỉ làm móc vào ngày ra tập mới.
- Nhịp mỗi tuần: 3-4 Short và 1 video dài 15-25 phút; video dài thuộc chuỗi có tên, tiêu đề kết bằng "| Nhớ sai #N".
- Mỗi video vào đúng một playlist chủ đề; Short gắn "Video có liên quan" tới video dài cùng chủ đề.
