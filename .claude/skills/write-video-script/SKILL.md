---
name: write-video-script
description: >
  Viết kịch bản video ngắn (TikTok/YouTube Shorts, ~30-90 giây) để nạp trực tiếp vào flow-ex làm
  input `POST /api/projects`. Kích hoạt khi người dùng nói kiểu "viết kịch bản video", "viết script
  cho TikTok/Shorts", "làm nội dung video ngắn về chủ đề X", hoặc yêu cầu tạo file JSON script cho
  flow-ex. KHÔNG dùng cho kịch bản dài (>3 phút), bài viết/blog, hay khi người dùng đã có sẵn JSON
  script hợp lệ và chỉ muốn sửa nhỏ. Ép quy trình 6 bước bắt buộc, không cho nhảy bước, để chống
  "AI slop" (kịch bản rời rạc, hook yếu, prompt ảnh là danh sách từ khoá vô hồn).
---

# Write Video Script

Kỹ năng này tạo ra kịch bản video ngắn CHẤT LƯỢNG CAO, đúng format JSON `scriptInputSchema` của
flow-ex (`packages/shared-schemas/src/index.ts`), để nạp thẳng vào `POST /api/projects`.

**Quy tắc tối cao: không được nhảy bước hay gộp bước.** Mỗi bước có mục đích chống một lỗi cụ thể
(kịch bản hời hợt, hook yếu, scene rời rạc). Nếu người dùng giục làm nhanh, vẫn đi đủ 6 bước nhưng
có thể rút gọn output ở mỗi bước.

## Bước 1 — Nghiên cứu (BẮT BUỘC dùng WebSearch thật)

1. Dùng `WebSearch` tra cứu **chủ đề + xu hướng** liên quan tới đề tài người dùng đưa ra, trong
   khoảng thời gian gần nhất tính tại lúc chạy skill (không dùng kiến thức cũ trong đầu — trend
   đổi liên tục).
2. Dùng `WebSearch` tra cứu **kỹ thuật kể chuyện thật** từ nguồn công khai: hook trong vài giây
   đầu, cấu trúc ba hồi, "open loop"/khoảng trống thông tin, nhịp beat kiểu Save the Cat. Xem
   `references/storytelling.md` (đã tổng hợp sẵn một lượt tra cứu thật, kèm link nguồn) — vẫn nên
   tra lại nếu chủ đề cần dữ liệu mới hơn.
3. **Ghi lại nguồn** (tiêu đề + URL) sẽ dùng để định hình hook/nhịp truyện trong kịch bản — nêu rõ
   trong phần trình bày cuối cùng cho người dùng.

## Bước 2 — Chốt góc nhìn (premise / hook / payoff)

Viết đúng BA câu, không hơn:

- **Premise** (1 câu): thế giới/tình huống nền của video là gì.
- **Hook** (1 câu): câu mở đầu sẽ nói gì trong 1-3 giây đầu để tạo "curiosity gap" hoặc nêu thứ
  đang bị đe doạ/gây tò mò (theo `references/storytelling.md`).
- **Payoff** (1 câu): kết thúc trả lời/khép lại hook như thế nào (nên vòng lại đúng hình ảnh/câu
  hỏi mở đầu).

Không tiến sang bước 3 nếu chưa chốt được ba câu này rõ ràng.

## Bước 3 — Draft thô (văn xuôi liền mạch, CHƯA chia scene)

Viết toàn bộ nội dung narration dưới dạng **một đoạn văn xuôi liền mạch** (như viết một bài tường
thuật ngắn), đúng độ dài lời thoại ước tính cho thời lượng video mong muốn (~2.5-3 từ/giây tiếng
Việt nói tự nhiên).

**Lý do bắt buộc bước này:** chia scene ngay từ đầu khiến mỗi scene bị viết thành một câu rời rạc,
vô hồn, không có nhịp — đây là dấu hiệu "AI slop" phổ biến nhất. Văn xuôi liền mạch buộc phải có
mạch cảm xúc và logic trước khi bị cắt khúc.

## Bước 4 — Tự phản biện (checklist cụ thể, đánh giá TỪNG mục, không được bỏ qua)

Tự chấm draft ở bước 3 theo đúng 4 mục sau, viết rõ Có/Không + lý do cho từng mục:

1. **Hook có nêu cái gì đang bị đe doạ/tò mò không?** (không phải chỉ giới thiệu chủ đề chung
   chung).
2. **Có ít nhất một chi tiết cụ thể (số, tên riêng, thời điểm) mỗi ~15 giây nội dung không?** Đếm
   theo số block ~15s trong tổng thời lượng.
3. **Câu nào xoá đi mà nghĩa không đổi thì xoá.** Rà từng câu, liệt kê câu bị xoá (nếu có) và sửa
   lại draft.
4. **Kết có vòng lại hook mở đầu không?** (payoff của bước 2 phải thực sự xuất hiện ở đoạn kết).

Nếu bất kỳ mục nào là "Không", phải sửa lại draft trước khi sang bước 5.

## Bước 5 — Chia scene + viết `imagePrompt`

Chia đoạn văn xuôi (đã qua phản biện) thành các scene tự nhiên theo nhịp ý — mỗi scene là một đơn
vị hình ảnh/ý riêng biệt, KHÔNG cắt cơ học theo số câu cố định.

Với mỗi scene:

- `narration`: đoạn lời thoại tương ứng, giữ nguyên văn phong đã viết ở bước 3-4 (không viết lại
  thành câu cụt ngủn).
- `imagePrompt`: viết bằng **câu văn tường thuật liền mạch** (không phải danh sách từ khoá rời
  rạc kiểu "coffee shop, morning, warm light, 4k"). Phải nêu đủ: chủ thể + hành động + bối cảnh +
  ánh sáng + góc máy. Ví dụ đúng: "Một người phụ nữ trung niên đang cẩn thận xếp từng ổ bánh mì
  nóng lên kệ gỗ trong quán cà phê nhỏ, ánh đèn vàng ấm hắt qua lớp hơi nước còn bốc lên, máy quay
  đặt ngang tầm mắt, hơi nghiêng để lấy cả khung cửa kính mờ hơi sương phía sau."

## Bước 6 — Xuất JSON đúng `scriptInputSchema`

Xem `references/schema.md` để lấy đúng schema hiện hành (copy-check field, KHÔNG bịa thêm field —
schema dùng `.strict()`, thêm field lạ sẽ bị Zod reject với `VALIDATION_ERROR`).

Trường bắt buộc: `title`, `voice`, `aspectRatio` (`"16:9"` hoặc `"9:16"`), `scenes` (mảng, mỗi
scene chỉ có `narration` + `imagePrompt`). `tts` và `reviewEnabled` là optional.

Sau khi xuất JSON, nếu có quyền truy cập server flow-ex đang chạy, có thể `POST` thử lên
`/api/projects` để xác nhận không bị `400 VALIDATION_ERROR` — đây là cách kiểm chứng nhanh nhất
JSON đúng format, không thay thế cho việc tự đọc lại schema.

**Ghi chú tương thích tương lai:** nếu sau khi merge nhánh, `scriptInputSchema` có thêm field
`preset` (ví dụ `"tiktok"` / `"youtube"`), hãy thêm field đó vào ví dụ JSON tương ứng trong
`references/schema.md` (preset TikTok dùng `aspectRatio: "9:16"`, preset YouTube dùng
`aspectRatio: "16:9"`) — đừng bịa giá trị enum, đọc lại schema thật lúc đó.
