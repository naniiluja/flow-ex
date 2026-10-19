# `scriptInputSchema` — schema hiện hành

Nguồn thật: `packages/shared-schemas/src/index.ts` (đọc lại trực tiếp trước khi dùng — schema có
thể đã đổi). Mọi cấp dùng `.strict()`: KHÔNG được thêm field ngoài danh sách dưới đây, Zod sẽ
reject với `400 VALIDATION_ERROR`.

```ts
export const aspectRatioSchema = z.enum(["16:9", "9:16"]);
export const presetSchema = z.enum(["tiktok", "youtube"]);

export const referenceSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: z.enum(["character", "setting"]),
    name: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
  })
  .strict();

export const sceneSchema = z
  .object({
    narration: z.string().trim().min(1),
    imagePrompt: z.string().trim().min(1),
    referenceIds: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const publishingInputSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    thumbnailSceneIndex: z.number().int().nonnegative().default(0),
  })
  .strict();

// + invariant: phải có ít nhất một trong `preset` / `aspectRatio`
// + invariant: mọi `scene.referenceIds` phải trỏ tới một `references[].id` đã khai báo
export const scriptInputSchema = z
  .object({
    title: z.string().trim().min(1),
    voice: z.string().trim().min(1),
    preset: presetSchema.optional(),
    aspectRatio: aspectRatioSchema.optional(),
    tts: ttsOptionsSchema.optional(),
    publishing: publishingInputSchema.optional(),
    reviewEnabled: z.boolean().default(false),
    references: z.array(referenceSchema).default([]),
    scenes: z.array(sceneSchema).min(1),
  })
  .strict();
```

`preset` quyết định khung hình, style phụ đề, tốc độ đọc Vbee (`packages/shared-schemas/src/presets.ts`):
`tiktok` → 9:16, phụ đề lớn giữa khung, speed 0.85; `youtube` → 16:9, phụ đề nhỏ dưới, speed 0.85.
`aspectRatio` ghi tường minh sẽ THẮNG mặc định của preset.

`suggestedSceneDurationSeconds` (task 025) là **độ dài lời thoại của MỘT scene**, ràng buộc cứng:
`tiktok` 3-6 giây, `youtube` 8-16 giây. Quy đổi sang số từ bằng `estimateNarrationSeconds`:
thời lượng = số_từ / 3,85 + số_dấu_ngắt_câu × 0,62s (fit trên 3 lần chạy thật, sai số lớn nhất
1,3%). Một tỉ lệ từ/giây phẳng đã sai ba lần vì nó trộn thời gian đọc với thời gian nghỉ ở dấu câu.5 cũ
đo trên audio trước task 022 nên vượt 43% thời lượng, và tốc độ còn phụ thuộc giọng). Mỗi scene chỉ là một ảnh tĩnh với Ken
Burns zoom 6%, nên scene dài hơn là scene trông đứng yên.

Mặc định đọc diễn cảm gồm ngắt câu 0.9 giây, ngắt đoạn 1.2 giây và nghỉ 600ms giữa các scene; có
thể ghi đè bằng `tts` khi cần. **Dấu câu là cần gạt nhấn nhá duy nhất còn tác dụng:** Vbee biến dấu
chấm thành một khoảng nghỉ thật, nên một câu dài lê thê sẽ bị đọc liền một mạch. `emphasisIntensity`
vẫn nằm trong schema nhưng KHÔNG BAO GIỜ được gửi đi: đo trực tiếp ngày 2026-09-20, tài khoản Vbee
này trả `400 BAD_REQUEST` với mọi giá trị hợp lệ trên cả 5 giọng đã thử
(`be/.claude/rules/vbee-tts.md`).

`voice`: chuỗi bất kỳ không rỗng ở tầng schema; giá trị hợp lệ thực tế phụ thuộc danh sách giọng
Vbee đang cấu hình (`be/.claude/rules/vbee-tts.md`) — dùng lại giá trị người dùng đã dùng trước đó
hoặc hỏi lại, đừng tự bịa mã giọng.

## Ví dụ — TikTok, không dùng reference

```json
{
  "title": "Quán cà phê 5 giờ sáng ở Hà Nội",
  "voice": "hn_female_ngochuyen_full_48k-fhg",
  "preset": "tiktok",
  "publishing": {
    "title": "Quán cà phê mở cửa trước cả thành phố",
    "description": "Một buổi sáng bắt đầu từ lúc phần còn lại của Hà Nội vẫn đang ngủ.",
    "thumbnailSceneIndex": 0
  },
  "reviewEnabled": false,
  "scenes": [
    {
      "narration": "5 giờ sáng, khi cả con phố còn chưa lên đèn, một quán cà phê nhỏ ở Hà Nội đã bật bếp.",
      "imagePrompt": "Một quán cà phê nhỏ nằm khuất trong con ngõ hẹp ở Hà Nội lúc rạng sáng, ánh đèn vàng duy nhất hắt ra từ cửa kính giữa trời còn tối, hơi nước bốc lên từ vỉa hè ẩm sương, máy quay đặt thấp ngang mặt đường, hơi ngước lên khung cửa sáng đèn."
    }
  ]
}
```

## Ví dụ — YouTube, có 1 nhân vật lặp lại xuyên suốt

Pipeline gen ảnh nhân vật MỘT LẦN từ `references[].prompt`, rồi **upload lại đúng file ảnh đó**
vào ô câu lệnh của mọi scene có khai báo `referenceIds`. Vì ảnh được đính kèm dạng upload (Flow
không biết tên nó), prompt phải nói theo vị trí: "the attached character image", KHÔNG gọi tên.

```json
{
  "title": "Người phụ nữ giữ quán cà phê 12 năm",
  "voice": "hn_male_manhdung_full_48k-fhg",
  "preset": "youtube",
  "references": [
    {
      "id": "ba-lan",
      "kind": "character",
      "name": "Bà Lan",
      "prompt": "Một người phụ nữ Việt Nam khoảng 55 tuổi, gương mặt phúc hậu nhiều nếp nhăn quanh mắt, tóc muối tiêu buộc gọn, mặc áo sơ mi xanh bạc màu, chụp bán thân chính diện, ánh sáng dịu tự nhiên, nền xám trơn."
    }
  ],
  "scenes": [
    {
      "narration": "Mười hai năm qua, bà Lan chưa nghỉ một buổi sáng nào.",
      "imagePrompt": "Using the attached character image, keep her face, hairstyle and outfit exactly as shown; bà đứng sau quầy gỗ cũ xay cà phê trong ánh đèn vàng ấm, hơi nước bốc lên từ ấm nước phía sau, máy quay cận cảnh ngang tầm tay.",
      "referenceIds": ["ba-lan"]
    },
    {
      "narration": "Khách đầu tiên trong ngày luôn là bác xe ôm đầu phố.",
      "imagePrompt": "Using the attached character image, keep her face exactly as shown; bà đưa ly cà phê đá cho một người đàn ông lớn tuổi ngồi trên ghế nhựa thấp trước quán lúc rạng sáng, ánh đèn đường vàng nhạt chiếu xiên từ phía sau, máy quay ngang tầm mắt ngồi.",
      "referenceIds": ["ba-lan"]
    }
  ]
}
```
