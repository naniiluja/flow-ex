# Task 022 — Ngắt nghỉ đúng câu: gửi `clientPause` + `emphasisIntensity` tới Vbee

**Trạng thái:** in-review
**Predecessor:** 021
**discipline:** on
**Chi tiết đầy đủ:** xem "Task 022" trong `/Users/naniiluja/.claude/plans/t-m-hi-u-xem-h-woolly-snowglobe.md`

## Vấn đề

Người dùng báo: "hết câu thì nghỉ 1 tí, đây thì bạn đọc liền mạch luôn". Đây là bug thật, không phải
cảm nhận chủ quan.

`packages/shared-schemas/src/narration.ts:5-9` tính `clientPause.sentenceBreak: 0.9` và
`emphasisIntensity: 60`. `be/src/providers/select-providers.ts:65` gọi `resolveNarrationOptions` để
lấy chúng. Nhưng `be/src/providers/vbee/narration-request.ts:10-14` chỉ lấy ba trường:

```ts
const { speed, bitrate, sampleRate } = options;
return { speed, bitrate, sampleRate };
```

Hai trường nhấn nhá bị vứt trước khi vào body POST (`vbee-tts-provider.ts:137-143`). Toàn bộ lớp nhấn
nhá là cấu hình chết.

**Mâu thuẫn cần thử thật mới giải được:** `be/.claude/rules/vbee-tts.md:16` ghi Vbee CÓ nhận hai tham
số này; `narration-request.test.ts:31` lại khẳng định việc vứt là cố ý ("only sends options accepted by
the live Vbee endpoint"). Nghiên cứu best practice đã thử lấy tài liệu Vbee (api.vbee.vn, trang
Postman chính thức) và **không lấy được nội dung tham số**. Chỉ một lần gọi thật phân xử được.

## Files

- `be/src/providers/vbee/narration-request.ts` — `vbeeNarrationOptions` giữ `emphasisIntensity` và
  `clientPause`, chỉ loại `scenePauseMs` (trường này đúng là local, không thuộc API Vbee).
- `be/src/providers/vbee/narration-request.test.ts:31-37` — lật ngược assertion đang pin hành vi cũ.
- `be/src/providers/vbee/vbee-tts-provider.test.ts` — thêm case msw khẳng định body POST thật sự mang
  hai trường đó.
- `be/.claude/rules/vbee-tts.md` — chép số đo từ lần thử live vào, thay cho suy đoán.

## Test viết trước (đỏ)

1. `narration-request.test.ts`: đổi `expect(options).not.toHaveProperty("emphasisIntensity")` thành
   `expect(options).toMatchObject({ emphasisIntensity: 60, clientPause: { sentenceBreak: 0.9 } })`,
   giữ nguyên `not.toHaveProperty("scenePauseMs")`.
2. `vbee-tts-provider.test.ts`: một handler msw bắt body POST và assert nó mang `clientPause` đầy đủ
   bốn break cộng `emphasisIntensity`.

### Ma trận hợp đồng cho `vbeeNarrationOptions` (discipline: on)

| `options` đầu vào | Kỳ vọng |
|---|---|
| `undefined` | `{}` |
| chỉ có `speed` | `{speed}`, không có khoá nào khác có giá trị |
| đủ mọi trường kể cả `scenePauseMs` | mọi trường trừ `scenePauseMs` |
| `emphasisIntensity: 0` (biên dưới) | giữ `0`, không bị `??` nuốt thành mặc định |
| `clientPause` chỉ có `sentenceBreak` | giữ đúng một khoá đó, không tự độn khoá khác |

Biên `emphasisIntensity: 0` là điểm dễ sai nhất: `0` là giá trị hợp lệ theo
`emphasisIntensitySchema` nhưng falsy, nên một phép `||` sẽ âm thầm biến nó thành `60`.

## Thử live (đã được người dùng cho phép)

Hai request Vbee cùng một câu ~40 ký tự chứa 2 dấu chấm, một có `clientPause`, một không. Tải audio,
đo bằng `@ffprobe-installer/ffprobe`.

**Tiêu chí khách quan: bản có `clientPause.sentenceBreak: 0.9` phải DÀI HƠN bản không có**, vì khoảng
nghỉ cộng vào thời lượng. Không phán xét bằng tai.

## Hai kết quả đều hợp lệ

- **Vbee nhận:** nối dây, chép số đo thời lượng vào `vbee-tts.md`.
- **Vbee từ chối (400) hoặc thời lượng không đổi:** giữ nguyên cách narrow hiện tại, nhưng thay lời
  bình luận suông bằng bằng chứng thật trong `vbee-tts.md` và trong tên test. Sau đó mở một task riêng
  cho phương án B (tách narration theo câu, gọi TTS từng câu, nối audio). **Không làm phương án B chui
  trong task này.**

## Kết quả thử live (2026-09-20)

Kết quả **tách đôi** hai trường, điều mà không tài liệu nào nói ra và chỉ một lần gọi thật mới lộ.

### `clientPause` — Vbee THẬT SỰ áp dụng

Cùng văn bản `"Hết câu. Nghỉ một nhịp. Rồi đi tiếp."` (2 ranh giới câu), cùng giọng
`hn_female_ngochuyen_full_48k-fhg`, cùng `speed: 0.85`:

| `clientPause` | Thời lượng audio đo bằng ffprobe |
|---|---|
| mọi break = 0.1 (`paragraphBreak` 0) | **2,377s** |
| mọi break = 2.0 | **8,072s** |

Chênh lệch **+5,695s**. Vượt xa ngưỡng 0,3s đặt ra trong tiêu chí. Đây chính là thứ sửa đúng lời
phàn nàn "hết câu không nghỉ, đọc liền mạch".

### `emphasisIntensity` — tài khoản này KHÔNG dùng được

Vbee **biết** trường này (nó validate hình dạng), nhưng từ chối mọi giá trị hợp lệ:

| Giá trị gửi | Phản hồi |
|---|---|
| `1` | 400 `"Invalid number: must be a multiple of 10 at path emphasisIntensity"` |
| `0.6` | 400 `"Invalid input: expected int, received number at path emphasisIntensity"` |
| `"60"` | 400 `"Invalid input: expected number, received string at path emphasisIntensity"` |
| `0`, `10`, `50`, `60`, `100` | 400 `{"code":"BAD_REQUEST","message":"Bad Request"}` (không lý do) |

Thử lại `emphasisIntensity: 60` trên **cả 5 giọng** (`hn_female_ngochuyen`, `sg_female_thaotrinh`,
`hn_male_thanhlong`, `s_hochiminh_female_vyquangcao_advertise_vc`,
`n_hanoi_female_giangkienthuc..._education_vc`): **cả 5 đều 400.** Đây là giới hạn gói tài khoản,
không phải lỗi giá trị.

### Bẫy đã phát hiện: 201 KHÔNG chứng minh trường được dùng

Một khoá bịa hoàn toàn (`emphasis: 60`) vẫn trả **201**. Vbee **bỏ qua khoá lạ trong im lặng**, nên
chỉ kiểm status code là sẽ kết luận sai. Bắt buộc phải đo thay đổi thật ở đầu ra, như bảng thời
lượng phía trên. Ghi lại trong `be/.claude/rules/vbee-tts.md`.

### Quyết định

Gửi `clientPause`. **Không** gửi `emphasisIntensity`, kể cả khi kịch bản ghi tường minh, vì gửi đi
sẽ làm mọi scene hỏng `fatal`. Bỏ `emphasisIntensity` khỏi `NARRATION_DEFAULTS` để không còn cấu
hình chết; giữ trường trong `ttsOptionsSchema` phòng khi gói tài khoản thay đổi.

Không cần phương án B (tách câu gọi TTS rồi nối audio): `clientPause` đã giải quyết trọn vấn đề.

## Gate — ĐÃ XANH

- `npx vitest run --project be --project shared-schemas`: **43 file, 341 test, pass toàn bộ.**
- `npx eslint` trên các file đã sửa: **sạch.**
- `npx prettier --check` trên các file đã sửa: **đạt.**
- Số đo thời lượng live: xem bảng trên.

## Ngoài phạm vi, phát hiện thêm khi chạy gate

`pnpm lint` ở gốc **không chạy nổi**, chết vì `JavaScript heap out of memory` ở giới hạn 4GB của
V8. Nguyên nhân: `eslint.config.mjs` không ignore `.claude/worktrees/**` (7 bản sao đầy đủ của
repo, 6,4GB), nên ESLint với `projectService: true` type-check lại toàn bộ codebase 7 lần. Pattern
`chrome-profile/**` cũng neo ở gốc nên bắt hụt thư mục thật là `be/chrome-profile/`, khiến 438 file
`.js` của chính Chrome bị lint.

Đã sửa `eslint.config.mjs`: thêm `.claude/worktrees/**`, `.opencode/**`, và đổi
`chrome-profile/**` thành `**/chrome-profile/**`. Kết quả: từ crash → 470 lỗi → **còn 2**.

Hai lỗi còn lại thuộc việc đang dang dở của người dùng (task 019/021), **cố ý không sửa** theo quy
tắc "không chạm file của task khác":

- `fe/src/pages/dashboard-page.tsx:85` — `metric.tone.split(" ")[0]` là `string | undefined` dưới
  `noUncheckedIndexedAccess`, vi phạm `@typescript-eslint/restrict-template-expressions`. File đang
  ở trạng thái `M` (đã sửa, chưa commit).
- `be/mcp-full-flow.mjs` — script rời chưa nằm trong tsconfig nào, đang untracked (`??`).
