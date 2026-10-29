# Chấm kịch bản và giới hạn cảnh

Làm sau khi viết (`script-writing.md`) và TRƯỚC khi tạo project hoặc gen audio.

## Tự phản biện: 6 mục, mỗi mục kèm câu trích dẫn

Chấm "Có" mà không trích câu là chưa chấm (đã bị người dùng chê "không đúng ngữ pháp và quy định" vì chấm đạt bằng lời). Mục nào "Không" thì sửa rồi chấm lại.

1. Hook nêu cái gì đang bị đe doạ hoặc gây tò mò, không chỉ giới thiệu chủ đề.
2. Có ít nhất một chi tiết cụ thể (số, tên riêng, thời điểm) mỗi khoảng 15 giây.
3. Câu nào xoá đi mà nghĩa không đổi thì xoá; liệt kê câu đã xoá.
4. Kết vòng lại hook (payoff thật sự xuất hiện ở đoạn kết).
5. Đọc to có giống người nói: đếm khuôn câu AI, từ Hán Việt hoa mỹ, chỗ phải ngừng lấy hơi giữa câu.
6. Người chưa biết gì theo kịp: mỗi đại từ chỉ ra nó trỏ về ai, mỗi tên riêng chỉ ra câu giới thiệu nó.

Kiểm bằng máy được thì chạy máy: đếm từ, câu, độ dài câu, em-dash, chữ số, chuẩn NFC. Sau khi có audio, nghe hoặc đo `silencedetect` trước khi render cả video.

## Lỗi viết đã gặp

| Lỗi | Cách tránh |
|---|---|
| Từ mượn nước ngoài ("nữ hoàng" cho Lý Chiêu Hoàng) | Dùng thuật ngữ bản địa của thời đó |
| Đại từ trỏ nhầm ("sợ người ta nhớ đến ông": ông nào?) | Gọi tên hoặc chức danh |
| Quy chiếu không có gốc ("năm ấy" khi chưa nêu năm) | Nêu trước rồi mới "ấy", "đó" |
| Sai thì ("đang làm vua, rồi tự nhường") | "đã làm vua, rồi tự nhường" |
| Dấu phẩy chen ("chép, rằng") | "chép rằng" |
| Mâu thuẫn dữ kiện giữa cảnh (trường bỏ trống mười năm nhưng sổ ghi ngày trường đóng cửa) | Đọc liền các cảnh, soát hai câu có cãi nhau |
| Hai "vua" trong một truyện | Chỉ một người là "vua" |
| Kết kiểu khẩu hiệu đứng trơ | Nối lại về hook |

## Thời lượng lời nói

`số_từ / 3,85 + số_dấu_ngắt_câu × 0,62` giây (`estimateNarrationSeconds` trong `packages/shared-schemas/src/presets.ts` là nguồn duy nhất), sai số lớn nhất 1,3%, đo trên MỘT giọng. Một tỉ lệ từ/giây phẳng đã sai ba lần vì trộn thời gian đọc với thời gian nghỉ; đổi giọng hoặc `clientPause` thì đo lại bằng một đoạn thật. Hệ số được fit khi mặc định còn `speed` 0,85 và ngắt câu 0,9s (chưa fit lại từ khi đổi sang 0,95 và 0,4s): trên truyện ma 3.502 từ, 235 dấu ngắt, công thức cho 1.055s còn audio thật 975s (lệch +8%), nên coi kết quả là cận trên và đo một cảnh thật trước khi chốt số từ. Chỉ trích sai số trên dữ liệu mà phép fit chưa thấy. Khoảng nghỉ giữa cảnh nằm NGOÀI công thức.

## Giới hạn cảnh cho pipeline gen audio từng cảnh

Chỉ áp khi KHÔNG dùng một file audio liền (`voice-tuning.md`): `tiktok` mỗi cảnh 3-6 giây (7-18 từ), `youtube` 8-16 giây (26-57 từ), vì mỗi cảnh là một ảnh tĩnh và cảnh dài thì trông đơ; đoạn ý dài hơn thì tách thành hai cảnh với hai `imagePrompt`. Truyện kể một mạch thì cảnh dài 20-70 từ là bình thường.

## Soát bắt buộc trước khi đưa người dùng xem (người dùng yêu cầu, 2026-10-28)

Mỗi lần có kịch bản, storyboard hay video (kể cả do agent làm và reviewer đã chấm), tự soát rồi SỬA trước khi đưa:
1. Khoanh tròn: có nhiều quá không (tối đa một vòng mỗi nhịp, chỉ khi có vật cần chứng minh), có khoanh đúng vật
   mà lời đọc đang nói và đang thấy trong khung không (phóng to để xác nhận). Nhãn chữ trên hình soát cùng cách.
   Không nhãn/mũi tên giải thích câu đùa ("tư vấn đa cấp", "bậc thang", "ảnh thờ bỏ túi": người dùng chê "xàm",
   2026-10-29); hình tự nói được thì không chỉ. Chỉ giữ: tên nhân vật một lần, bằng chứng mà hình không tự nói được
   (bìa sách tiếng Nhật), một vòng cho payoff.
2. Chính tả: `check_script.py` rồi đọc tay theo bảng tự soát của vi-writing-guide, cả chữ trên hình.
3. Kịch bản có xàm, có nhạt không: móc 3 giây đầu, payoff thật, câu đùa khoảng 15 giây một lần, không khuôn câu AI.
   Nhạt thì viết lại, không đưa.
