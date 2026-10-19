---
name: write-video-script
description: >
  Viết kịch bản video ngắn (TikTok/YouTube Shorts, ~30-90 giây) để nạp trực tiếp vào flow-ex làm
  input `POST /api/projects`. Kích hoạt khi người dùng nói kiểu "viết kịch bản video", "viết script
  cho TikTok/Shorts", "làm nội dung video ngắn về chủ đề X", hoặc yêu cầu tạo file JSON script cho
  flow-ex. KHÔNG dùng cho kịch bản dài (>3 phút), bài viết/blog, hay khi người dùng đã có sẵn JSON
  script hợp lệ và chỉ muốn sửa nhỏ. Ép bước grill nhu cầu rồi 6 bước viết bắt buộc, không cho
  nhảy bước, để chống
  "AI slop" (kịch bản rời rạc, hook yếu, prompt ảnh là danh sách từ khoá vô hồn). Trước khi viết,
  bắt buộc dùng `grill-me` ở mode `video` để phỏng vấn nhu cầu còn thiếu từng câu một.
---

# Write Video Script

Kỹ năng này tạo ra kịch bản video ngắn CHẤT LƯỢNG CAO, đúng format JSON `scriptInputSchema` của
flow-ex (`packages/shared-schemas/src/index.ts`), để nạp thẳng vào `POST /api/projects`.

**Kỹ thuật viết và chỉnh giọng nằm trong `.claude/rules/` (nạp mọi phiên), không nằm trong skill này:** đọc
`script-writing.md`, `script-review.md` và `voice-tuning.md` trước khi viết.

**Quy tắc tối cao: không được nhảy bước hay gộp bước.** Mỗi bước có mục đích chống một lỗi cụ thể
(kịch bản hời hợt, hook yếu, scene rời rạc). Nếu người dùng giục làm nhanh, vẫn grill và đi đủ 6
bước viết nhưng có thể rút gọn output ở mỗi bước.

## Bước 0 — Grill nhu cầu (BẮT BUỘC trước khi nghiên cứu hoặc tạo project)

Gọi skill `grill-me` với mode `video`. Phỏng vấn **từng câu một**, chờ câu trả lời rồi mới chọn câu
tiếp theo; không gửi một bảng câu hỏi dài. Tự lấy các dữ kiện người dùng đã nói trong hội thoại và
chỉ hỏi những điểm còn thiếu hoặc mâu thuẫn. Với mỗi câu hỏi, đề xuất một phương án mặc định kèm
lý do ngắn để người dùng có thể xác nhận nhanh.

Phải chốt đủ các quyết định ảnh hưởng trực tiếp đến đầu ra: chủ đề/mục tiêu, thể loại, nền tảng và
tỉ lệ khung hình, thời lượng, khán giả, nhân vật/chủ thể bắt buộc, giọng kể và phong cách nội dung,
phong cách hình ảnh, nguồn hình (tạo mới hay lấy từ web), voice/ngôn ngữ, cùng các điều cấm hoặc
yêu cầu bắt buộc. Chỉ hỏi thêm CTA, nguồn tham khảo hay mức độ chính xác khi chúng thực sự liên
quan. Dừng phỏng vấn khi đã đủ dữ kiện để viết; tóm tắt ngắn các lựa chọn và xin người dùng xác
nhận trước khi sang bước 1.

Brief cũng phải chốt hướng tiêu đề đăng bài, mô tả và scene đại diện cho thumbnail. Nếu người dùng
không có yêu cầu riêng, tự chọn phương án bám sát hook thay vì hỏi thêm một câu ít giá trị.

Không được nghiên cứu, viết draft, tạo project hoặc render trong lúc đang grill. Nếu người dùng
đã cung cấp đầy đủ mọi quyết định trong một yêu cầu rõ ràng, vẫn trình bày bản tóm tắt để xác nhận
thay vì lặp lại các câu hỏi đã có câu trả lời.

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

Viết toàn bộ lời đọc thành **một đoạn văn xuôi liền mạch** rồi mới chia cảnh. Kỹ thuật viết nằm trong quy tắc
luôn được nạp, đọc trước khi viết: `.claude/rules/script-writing.md` (thứ tự bắt buộc, văn nói, văn kể chuyện, khuôn
câu AI cần tránh) và `.claude/rules/voice-tuning.md` (nhịp nghỉ, một file audio, nhấn nhá). Thời lượng ước tính theo
công thức trong `script-review.md`.

## Bước 4 — Tự phản biện (đánh giá TỪNG mục, kèm câu trích dẫn)

Chấm đúng 6 mục trong `.claude/rules/script-review.md` và liệt kê câu đã sửa. Không bỏ mục nào, không chấm "Có" mà
không trích câu.

## Bước 5 — Chia scene + viết `imagePrompt`

Chia đoạn văn xuôi (đã qua phản biện) thành các scene tự nhiên theo nhịp ý — mỗi scene là một đơn
vị hình ảnh/ý riêng biệt, KHÔNG cắt cơ học theo số câu cố định.

**Độ dài cảnh** (ràng buộc cứng khi gen audio từng cảnh; truyện kể một mạch thì không): xem mục "Giới hạn cảnh" trong `.claude/rules/script-review.md`. Đoạn ý quá dài thì tách thành hai cảnh với hai `imagePrompt`.

Với mỗi scene:

- `narration`: đoạn lời thoại tương ứng, giữ nguyên văn phong đã viết ở bước 3-4 (không viết lại
  thành câu cụt ngủn).
- `imagePrompt`: viết bằng **câu văn tường thuật liền mạch** (không phải danh sách từ khoá rời
  rạc kiểu "coffee shop, morning, warm light, 4k"). Phải nêu đủ: chủ thể + hành động + bối cảnh +
  ánh sáng + góc máy. Ví dụ đúng: "Một người phụ nữ trung niên đang cẩn thận xếp từng ổ bánh mì
  nóng lên kệ gỗ trong quán cà phê nhỏ, ánh đèn vàng ấm hắt qua lớp hơi nước còn bốc lên, máy quay
  đặt ngang tầm mắt, hơi nghiêng để lấy cả khung cửa kính mờ hơi sương phía sau."
- Phong cách ảnh do chính `imagePrompt` quyết định; `POST /api/projects` không tự gắn cụm phong cách nào.
  Mặc định khi người dùng không chọn: ảnh anime stylized, chuyện hài hước châm biếm, mỗi `imagePrompt` kết
  bằng ", anime stylized". Phong cách giấy cắt dán dùng skill `collage-broll`.
- `referenceIds`: nếu kịch bản có nhân vật/bối cảnh lặp lại nhiều scene, khai báo ĐỦ chúng ở
  `references[]` cấp project rồi liệt kê id tương ứng ở từng scene (ví dụ cần 10 nhân vật thì
  khai báo đủ 10, thiếu id nào `create_project` dừng ngay với `REFERENCE_NOT_DECLARED` nêu đúng
  id đó). Pipeline sẽ gen ảnh nhân vật
  đó MỘT LẦN rồi **upload lại đúng file ảnh đó** vào ô câu lệnh của mọi scene có khai báo
  (`.claude/rules/image-prompting.md`).

  Khi scene có `referenceIds`, mở `imagePrompt` bằng cách nói **theo vị trí ảnh đính kèm, KHÔNG
  gọi tên**, vì Flow không biết tên của ảnh được upload: "Using the attached character image, keep
  her face and hairstyle exactly as shown; ..." (hoặc "...the attached character image and the
  attached setting image..." khi có hai reference). Tuyệt đối không viết "the attached reference
  image of Cô Lan" — cách nói cũ đó thuộc cơ chế tra theo tên đã bị loại bỏ.

  Thứ tự `referenceIds` phải khớp thứ tự nhắc trong prompt (ảnh được upload theo đúng thứ tự
  trong mảng), ví dụ `["co-lan", "quan-cafe"]` thì prompt nói "character image" trước,
  "setting image" sau.

## Bước 6 — Xuất JSON đúng `scriptInputSchema`

Xem `references/schema.md` để lấy đúng schema hiện hành (copy-check field, KHÔNG bịa thêm field —
schema dùng `.strict()`, thêm field lạ sẽ bị Zod reject với `VALIDATION_ERROR`).

Trường bắt buộc: `title`, `voice`, một trong hai `preset` (`"tiktok"`/`"youtube"`) hoặc
`aspectRatio` (`"16:9"`/`"9:16"`), và `scenes`. Mỗi scene có `narration` + `imagePrompt`, thêm
`referenceIds` nếu dùng reference. `tts`, `reviewEnabled`, `references`, `publishing` là optional.

Khi tạo video hoàn chỉnh, luôn thêm `publishing` gồm `title`, `description` và
`thumbnailSceneIndex`. Đây là copy đăng bài, không phải ghi chú nội bộ: tiêu đề phải cụ thể, mô tả
phải tự nhiên và không nhồi từ khóa. Chọn scene có chủ thể chính rõ nhất; backend sẽ dùng ảnh scene
đó để thiết kế thumbnail YouTube 1280×720 và ghi `thumbnailFile` sau render.

Sau khi xuất JSON, nếu có quyền truy cập server flow-ex đang chạy, có thể `POST` thử lên
`/api/projects` để xác nhận không bị `400 VALIDATION_ERROR` — đây là cách kiểm chứng nhanh nhất
JSON đúng format, không thay thế cho việc tự đọc lại schema.

**Ghi chú tương thích tương lai:** nếu sau khi merge nhánh, `scriptInputSchema` có thêm field
`preset` (ví dụ `"tiktok"` / `"youtube"`), hãy thêm field đó vào ví dụ JSON tương ứng trong
`references/schema.md` (preset TikTok dùng `aspectRatio: "9:16"`, preset YouTube dùng
`aspectRatio: "16:9"`) — đừng bịa giá trị enum, đọc lại schema thật lúc đó.
