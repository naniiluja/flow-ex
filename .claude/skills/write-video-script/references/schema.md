# `scriptInputSchema` — schema hiện hành (worktree task 012, chưa merge task 009)

Nguồn thật: `packages/shared-schemas/src/index.ts` (đọc trực tiếp trong worktree này lúc viết
skill, 2026-09-17). Schema dùng `.strict()` ở mọi cấp — KHÔNG được thêm field ngoài danh sách
dưới đây, Zod sẽ reject với `400 VALIDATION_ERROR`.

```ts
export const aspectRatioSchema = z.enum(["16:9", "9:16"]);

export const sceneSchema = z
  .object({
    narration: z.string().trim().min(1),
    imagePrompt: z.string().trim().min(1),
  })
  .strict();

export const scriptInputSchema = z
  .object({
    title: z.string().trim().min(1),
    voice: z.string().trim().min(1),
    aspectRatio: aspectRatioSchema,
    tts: ttsOptionsSchema.optional(), // xem be code cho các field con nếu cần dùng
    reviewEnabled: z.boolean().default(false),
    scenes: z.array(sceneSchema).min(1),
  })
  .strict();
```

Field bắt buộc: `title`, `voice`, `aspectRatio`, `scenes` (≥1 phần tử, mỗi phần tử chỉ có
`narration` + `imagePrompt`, không field nào khác). `tts` và `reviewEnabled` optional — bỏ qua
nếu không cần chỉnh.

`voice`: chuỗi bất kỳ không rỗng ở tầng schema này — giá trị hợp lệ thực tế phụ thuộc danh sách
giọng Vbee đang cấu hình (`be/.claude/rules/vbee-tts.md`), skill này không tự bịa mã giọng, dùng
giá trị mẫu người dùng đã dùng trước đó hoặc hỏi lại nếu chưa rõ.

## Ghi chú tương thích — field `preset` (task 009, đang chạy song song, worktree khác)

Task 009 (chạy song song trong worktree riêng) đang thêm field `preset` vào `scriptInputSchema`.
Field đó **không có** trong worktree hiện tại của skill này. Nếu sau khi hai nhánh merge,
`scriptInputSchema` có thêm `preset` (dự đoán giá trị kiểu `"tiktok" | "youtube"` hoặc tương tự):

- Thêm `preset: "tiktok"` vào ví dụ JSON 9:16 bên dưới.
- Thêm `preset: "youtube"` vào ví dụ JSON 16:9 bên dưới.
- KHÔNG đoán bừa tên field/giá trị enum — đọc lại `packages/shared-schemas/src/index.ts` thật ở
  thời điểm đó, vì tên và enum có thể khác dự đoán này.

## Ví dụ JSON hợp lệ — mô phỏng ý định TikTok (`aspectRatio: "9:16"`)

```json
{
  "title": "Quán cà phê 5 giờ sáng ở Hà Nội",
  "voice": "hn_female_ngochuyen_full_48k-fhg",
  "aspectRatio": "9:16",
  "reviewEnabled": false,
  "scenes": [
    {
      "narration": "5 giờ sáng, khi cả con phố còn chưa lên đèn, một quán cà phê nhỏ ở Hà Nội đã bật bếp.",
      "imagePrompt": "Một quán cà phê nhỏ nằm khuất trong con ngõ hẹp ở Hà Nội lúc rạng sáng, ánh đèn vàng duy nhất hắt ra từ cửa kính giữa trời còn tối, hơi nước bốc lên từ vỉa hè ẩm sương, máy quay đặt thấp ngang mặt đường, hơi ngước lên khung cửa sáng đèn."
    },
    {
      "narration": "Chủ quán, một người phụ nữ ngoài năm mươi, đã làm công việc này đúng mười hai năm, không nghỉ một buổi sáng nào.",
      "imagePrompt": "Một người phụ nữ trung niên đứng sau quầy gỗ cũ, tay thoăn thoắt xay hạt cà phê trong ánh đèn vàng ấm, gương mặt tập trung nhìn xuống chiếc cối xay, máy quay cận cảnh ngang tầm tay, hậu cảnh mờ là kệ ly xếp gọn."
    },
    {
      "narration": "Khách đầu tiên trong ngày là một bác xe ôm, gọi đúng một ly đen đá, không đường, như suốt mười năm qua.",
      "imagePrompt": "Một người đàn ông lớn tuổi mặc áo khoác cũ ngồi trên chiếc ghế nhựa thấp trước quán, hai tay ôm ly cà phê đá bốc hơi lạnh trong không khí se lạnh sáng sớm, ánh đèn đường vàng nhạt chiếu xiên từ phía sau, máy quay đặt ngang tầm mắt ngồi."
    },
    {
      "narration": "Khi thành phố bắt đầu ồn ào, quán cà phê ấy đã tỉnh giấc từ rất lâu rồi.",
      "imagePrompt": "Toàn cảnh con phố Hà Nội bắt đầu đông người và xe cộ dưới ánh nắng sớm, quán cà phê nhỏ vẫn sáng đèn giữa dòng người, máy quay đặt cao chếch xuống từ phía đối diện, ánh sáng chuyển dần từ vàng ấm sang trắng của ban ngày."
    }
  ]
}
```

## Ví dụ JSON hợp lệ — mô phỏng ý định YouTube (`aspectRatio: "16:9"`)

```json
{
  "title": "Bên trong một quán cà phê mở cửa lúc 5 giờ sáng",
  "voice": "hn_male_manhdung_full_48k-fhg",
  "aspectRatio": "16:9",
  "reviewEnabled": true,
  "scenes": [
    {
      "narration": "Trước khi thành phố thức dậy, đã có một nơi không bao giờ ngủ: quán cà phê nhỏ mở cửa lúc năm giờ sáng.",
      "imagePrompt": "Một con phố Hà Nội vắng lặng lúc rạng sáng với duy nhất một quán cà phê sáng đèn, sương mù nhẹ phủ trên mặt đường, máy quay góc rộng đặt từ xa cuối phố hướng về phía quán, ánh sáng vàng ấm nổi bật giữa nền trời xanh xám."
    },
    {
      "narration": "Người chủ quán tin rằng cà phê ngon nhất phải được pha khi phố còn yên tĩnh, không vội vã.",
      "imagePrompt": "Cận cảnh tay người pha cà phê rót nước nóng chậm rãi qua phin nhôm, từng giọt nâu sẫm nhỏ xuống ly thuỷ tinh, ánh đèn bàn vàng chiếu trực tiếp lên khói bốc, máy quay macro ngang tầm ly cà phê."
    },
    {
      "narration": "Và khi giọt cà phê cuối cùng rơi xuống, một ngày mới của thành phố cũng vừa bắt đầu.",
      "imagePrompt": "Toàn cảnh quán cà phê nhìn từ trong ra ngoài cửa kính lúc mặt trời vừa lên, ánh nắng vàng tràn vào không gian ấm cúng, một vài khách đã ngồi vào bàn, máy quay đặt trong quán hướng ra phố qua khung cửa."
    }
  ]
}
```
