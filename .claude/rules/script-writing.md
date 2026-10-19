# Viết kịch bản video (lời đọc tiếng Việt)

Áp cho mọi lời đọc của video (skill `write-video-script`, `collage-broll`). Schema nằm ở `packages/shared-schemas`
và `.claude/skills/write-video-script/references/schema.md`. Cách chấm bản viết: `script-review.md`.

## Thứ tự bắt buộc

- Viết CẢ câu chuyện thành văn xuôi liền mạch TRƯỚC, không nhìn số cảnh; cắt cảnh sau, ở dấu chấm, chỉ để gắn ảnh hoặc clip. Viết thẳng "mỗi cảnh một câu" đã bị chê "mỗi cảnh là 1 script không liền mạch" bốn lần.
- Độ dài giây không quan trọng với người dùng: không cắt truyện hay ép cảnh 3-6s chỉ để về 60s.
- Mỗi cảnh móc vào cảnh trước bằng từ nối ("và", "nên", "rồi", "nhưng chưa đủ", "còn", "ít lâu sau", "lại có", "vậy"). Đọc liền các cảnh thành một đoạn; nghe như danh sách câu độc lập thì viết lại.

## Văn nói, không phải văn viết

- Mỗi câu một ý, đủ chủ ngữ và vị ngữ; trạng ngữ đặt đầu câu. Câu cụt (thiếu vị ngữ) chỉ dùng để nhấn và tối đa một lần mỗi video.
- Từ thuần Việt, hằng ngày ("làm" thay "triển khai"); bỏ Hán Việt hoa mỹ ("tích luỹ", "khởi sắc", "hành trình") và danh từ trừu tượng ("giá trị", "động lực"). Mỗi ý phải có tên riêng, con số hoặc vật nhìn thấy được.
- Chọn MỘT giọng văn cho cả video: kể mộc như người bạn (mặc định), dứt khoát (kịch tính, châm biếm), hoặc trau chuốt (chỉ khi được yêu cầu, vì câu dài khó nghe). Không trộn.
- Nhịp nằm ở dấu ngắt: xen câu ngắn (3-6 từ) với câu 12-18 từ. Từ láy tối đa 1-2 chỗ mỗi cảnh.
- Người nghe không có trang giấy để đọc lại: nêu tên nhân vật chính ngay lần đầu và giữ MỘT cách gọi; lặp tên hoặc chức danh thay vì "ông", "bà", "người ấy" khi có hai người cùng giới. Tên riêng, địa danh, mốc thời gian chưa giới thiệu thì không dùng như đã biết. Một cảnh không quá một dữ kiện mới.
- Số và năm viết thành chữ theo cách nói ("tám trăm năm trước"); giọng đọc có thể đọc "1224" thành "hai mươi tư".
- Thuật ngữ bản địa của thời đại, không mượn từ nước ngoài: truyện Việt dùng "vua", "hoàng hậu", "triều đình", không "nữ hoàng", "lâu đài". Nói rõ "sử chép" và "người ta đồn"; không bịa chi tiết rùng rợn.

## Văn kể chuyện dài (học từ văn tiểu thuyết dịch)

- Câu kể 15-25 từ là chuẩn; khoảng 20-30% câu ngắn dưới 8 từ, đặt ở chốt đoạn hoặc ngay sau chuỗi câu dài, không rải đều.
- Dấu phẩy đặt đúng chỗ lấy hơi; dấu hai chấm chỉ trước lời nói hoặc điều sắp lộ ra.
- Giới thiệu nhân vật: mô tả trước, tên sau ("một ông cụ gầy, lưng còng, người xóm gọi là bác Tư").
- Chen MỘT câu nhận xét của người kể rồi quay lại mạch. Truyện ma: để dấu vết (dấu chân ướt, bàn ướt) lộ ra thay vì tả thẳng con ma, và kết bằng nỗi bất an.
- Một ẩn dụ đã nói ra phải có hình hoặc lời dựng trước đó.

## Khuôn câu của văn AI, gặp là viết lại

- "Không chỉ... mà còn", "Không phải A, mà là B", "Đừng hỏi A. Hãy hỏi B." (phản đề rồi chốt: tối đa MỘT lần cả video).
- "Hơn nữa", "Thêm vào đó", "Tóm lại", câu kết kiểu khẩu hiệu; ba vế song song; câu châm ngôn cuối mỗi đoạn; động từ ẩn dụ ("lặng lẽ lan thành mạng lưới").
- Không em-dash (—).
