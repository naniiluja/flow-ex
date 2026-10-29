# Viết kịch bản video (lời đọc tiếng Việt)

Áp cho mọi lời đọc của video (skill `write-video-script`, `collage-broll`). Schema nằm ở `packages/shared-schemas`
và `.claude/skills/write-video-script/references/schema.md`. Cách chấm bản viết: `script-review.md`.

## Thứ tự bắt buộc

- Viết CẢ câu chuyện thành văn xuôi liền mạch TRƯỚC, không nhìn số cảnh; cắt cảnh sau, ở dấu chấm, chỉ để gắn ảnh hoặc clip. Viết thẳng "mỗi cảnh một câu" đã bị chê "mỗi cảnh là 1 script không liền mạch" bốn lần.
- Giao viết kịch bản cho agent thì dán NGUYÊN VĂN mọi luật viết và bản mẫu Caesar vào prompt (in bằng
  `~/Developer/lemo-films/style-refs/script-rules-bundle.sh`), không chỉ đưa đường dẫn file; reviewer phải viết lại quá
  vài câu thì trả về viết lại cả bài, không vá (người dùng chê bản vá "lủng củng, không giống người viết", 2026-10-29).
- Độ dài giây không quan trọng với người dùng: không cắt truyện hay ép cảnh 3-6s chỉ để về 60s.
- Mỗi cảnh móc vào cảnh trước bằng từ nối ("và", "nên", "rồi", "nhưng chưa đủ", "còn", "ít lâu sau", "lại có", "vậy"). Đọc liền các cảnh thành một đoạn; nghe như danh sách câu độc lập thì viết lại.

## Văn nói, không phải văn viết

- Mỗi câu một ý, đủ chủ ngữ và vị ngữ; trạng ngữ đặt đầu câu. Soát TỪNG vế: vế sau dấu phẩy cũng phải có chủ ngữ
  nếu chủ thể đổi hoặc không rõ ("Mẹ cậu là phụ nữ Nhật. Bà hay đi tiệc", không "..., hay đi tiệc"; "Mình là Chô li",
  không "Chô li đây"). Người dùng nhắc "các câu phải đầy đủ chủ vị đàng hoàng" (2026-10-29). Câu cụt (thiếu vị ngữ) chỉ dùng để nhấn và tối đa một lần mỗi video.
- Từ thuần Việt, hằng ngày ("làm" thay "triển khai"); bỏ Hán Việt hoa mỹ ("tích luỹ", "khởi sắc", "hành trình") và danh từ trừu tượng ("giá trị", "động lực"). Mỗi ý phải có tên riêng, con số hoặc vật nhìn thấy được.
- Video anime: giọng fan bình luận theo `script-fan-voice.md` (mặc định từ 2026-10-28). Video khác: chọn MỘT giọng văn cho cả video: kể mộc như người bạn, dứt khoát (kịch tính, châm biếm), hoặc trau chuốt (chỉ khi được yêu cầu, vì câu dài khó nghe). Không trộn.
- Nhịp nằm ở dấu ngắt: xen câu ngắn (3-6 từ) với câu 12-18 từ. Từ láy tối đa 1-2 chỗ mỗi cảnh.
- Người nghe không có trang giấy để đọc lại: nêu tên nhân vật chính ngay lần đầu và giữ MỘT cách gọi; lặp tên hoặc chức danh thay vì "ông", "bà", "người ấy" khi có hai người cùng giới. Tên riêng, địa danh, mốc thời gian chưa giới thiệu thì không dùng như đã biết. Một cảnh không quá một dữ kiện mới.
- Một phản diện nam duy nhất trong đoạn: sau lần giới thiệu gọi "hắn", chỉ giữ tên ở câu móc, câu lộ và câu hỏi
  nhắc lại trước payoff (người dùng chê "lặp DIO nhiều quá", Short quan tài Erina 2026-10-30).
- Số và năm viết thành chữ theo cách nói ("tám trăm năm trước"); giọng đọc có thể đọc "1224" thành "hai mươi tư".
- Viết cho tai, không cho mắt: tránh cụm nghe trùng tên riêng trong cùng video. Video lịch sử nói "nhà Trần, nhà
  Nguyên" thì "nhà mình" bị nghe thành "nhà Minh"; dùng "nước mình", "các cụ ta".
- Thuật ngữ bản địa của thời đại, không mượn từ nước ngoài: truyện Việt dùng "vua", "hoàng hậu", "triều đình", không "nữ hoàng", "lâu đài". Nói rõ "sử chép" và "người ta đồn"; không bịa chi tiết rùng rợn.
- Quan hệ họ hàng mà nguồn tiếng Anh không rõ thứ bậc ("sister", "brother") thì không đoán "em gái", "anh trai": dùng
  "chị em gái" hoặc gọi tên (người xem đã hỏi lại "em gái gì..." ở Short Sandman).

## Viết cho tai (nghiên cứu lời nói phát thanh, người dùng duyệt 2026-10-29)

Nguồn: Trương Thị Kiên (2011), luận án "Lời nói trong báo phát thanh Việt Nam hiện nay", Học viện Báo chí và Tuyên
truyền (khảo sát VOV); Chu Đình Kiên, Nguyễn Thị Ngọc Hân (2023), ĐHSP Đà Nẵng, đọc kể diễn cảm.
- Câu dưới 30 âm tiết, mỗi câu 1-2 ý; tách câu ghép nhiều ý thành câu đơn.
- Không "nhánh rẽ thông tin" (cụm giải thích chen giữa câu: "Jolyne, nữ chính phần sáu, cô..."): giới thiệu thành
  câu riêng đứng trước ("Cậu đấu với nữ chính phần sáu là Jolyne.").
- Nhắc lại ý chính trước khi trả lời (câu hỏi ở móc được nói lại ngay trước payoff), vì người nghe chỉ nghe một lần.
- Khẩu ngữ có văn hoá, bớt Hán Việt và thuật ngữ; tránh bị động mang nghĩa xấu khi đổi được sang chủ động.
- Đánh dấu chỗ chuyển nội dung và chỗ đổi giọng nhân vật trong bản cho Vbee (đặt khe nghỉ ở đó).

## Chính tả và cấu trúc câu (người dùng yêu cầu, 2026-10-25)

- Theo `.claude/skills/write-video-script/references/vi-writing-guide.md`: dấu thanh kiểu mới (hoà, khoá, tuỳ), y trong từ Hán Việt (tỷ, kỹ), mỗi câu tối đa một "thì", không "bởi", không mở câu bằng "Việc/Sự/Trong quá trình", không "một cách + tính từ".
- Máy soát bằng `python3 .claude/skills/write-video-script/scripts/check_script.py <story.md>`, sửa hết rồi cho MỘT agent review và tự sửa một lượt.
- Số: lời đọc viết bằng chữ; phụ đề và chữ trên hình viết bằng số (dấu chấm nghìn, dấu phẩy thập phân).
- Video kể chuyện có câu chào ngay SAU câu móc (giây đầu vẫn là móc) và đoạn kết cảm ơn, hẹn gặp lại.
- Chuyện dựng lại kể ngôi thứ nhất thì nói rõ là dựng lại ở đoạn kết; mỗi con số có nguồn trong `FACTS.md` của phim.

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
- Người dùng sửa tay Short con DIO (2026-10-29): lời đọc không dùng dấu hai chấm để giải thích ("có nghĩa là", "ghi
  rằng"); không câu rào kiểu liệt kê ("truyện không nói, và mình cũng không bịa") mà nói một vế ("truyện bỏ ngỏ");
  động từ phải đủ ý ("chưa kịp ra tay", không "chưa kịp"; "giúp ông lên thiên đường"); hành động lạ kể đủ nguyên nhân
  ("thấy cô tự đốt mình, cậu cũng dội xăng đốt theo", không "châm lửa vào người mà vẫn gục"); thích chữ đủ, khẩu ngữ
  đậm ("phản bội", "gương mặt", "dẫn dắt", "y hệt như ông bô nó").
