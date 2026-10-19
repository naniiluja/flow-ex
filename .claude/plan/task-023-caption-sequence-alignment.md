# Task 023 — Căn chỉnh phụ đề theo kịch bản bằng Needleman-Wunsch

**Trạng thái:** in-review
**Predecessor:** 022
**discipline:** on
**Chi tiết đầy đủ:** xem "Task 023" trong `/Users/naniiluja/.claude/plans/t-m-hi-u-xem-h-woolly-snowglobe.md`

## Vấn đề, đo trên dữ liệu thật

`be/src/providers/whisper/align-captions-to-narration.ts:20` chỉ thay text của Whisper bằng kịch bản
gốc khi số token khớp tuyệt đối; lệch 1 token là cả câu bị vứt về nguyên văn Whisper nghe nhầm.

Quét 231 file caption thật trong `projects/*/assets/captions/` (8.263 từ kịch bản):

| Chỉ số | Hiện tại | Nguyên mẫu Needleman-Wunsch |
|---|---|---|
| Từ hiển thị đúng chính tả kịch bản | 4.255 (51,5%) | 7.914 (95,8%) |
| Scene rơi vào nhánh bỏ qua | 110 / 231 (47,6%) | 0 |

Phân rã: 85,0% khớp chính xác sau chuẩn hoá, **10,8% (891 từ) là Whisper nghe sai và kịch bản cứu
được**, 4,2% (349 từ) không có token nào nên cần chia timespan.

Lỗi thật đang hiển thị (run 2026-09-19): "chồng lên" → "trồng lên", "Chỉ" → "Chị", "quá xa cô" →
"quá Sarko", "cửa sổ" → "c�a sổ", "Buổi sáng" → "Bùi sáng", "gốc" → "góc".

Nguyên nhân lệch token đều nhỏ và có quy luật: Whisper chuẩn hoá số ("mười lăm nghìn" 3 từ → "15.000"
1 token), tự thêm dấu ngoặc kép, đổi `;` thành `,`, nghe nhầm danh từ riêng rồi tách/gộp khác đi.

## Ràng buộc từ nghiên cứu

- **Không có thư viện JS/TS nào** làm forced alignment. WhisperX, ctc-forced-aligner đều là Python và
  chạy trên mô hình âm học wav2vec2/CTC. Tự viết, không thêm dependency, không thêm runtime Python.
- `@remotion/install-whisper-cpp`'s `transcribe()` **không expose** `--prompt`/`initial_prompt`, nên
  không thể thiên vị Whisper về phía kịch bản lúc giải mã. Kể cả có, `initial_prompt` chỉ là thiên
  vị mềm, không phải ràng buộc cứng.

## Files

- `be/src/providers/whisper/align-captions-to-narration.ts` — viết lại: bỏ cổng chặn đếm tuyệt đối,
  thay bằng căn chỉnh chuỗi toàn cục.
- `be/src/providers/whisper/normalize-vietnamese-token.ts` (mới) — khoá so khớp thuần: NFD bỏ dấu, hạ
  chữ thường, bỏ dấu câu, và **mở rộng số chữ tiếng Việt thành chữ số theo đúng chiều Whisper chuẩn
  hoá** ("mười lăm nghìn" → "15000"), chứ không đảo ngược chữ số của Whisper về chữ.
- `be/src/providers/whisper/align-captions-to-narration.test.ts` (mới) — ma trận hợp đồng.
- `be/src/providers/whisper/normalize-vietnamese-token.test.ts` (mới).
- `be/src/providers/whisper/whisper-transcription-provider.ts:96` — chữ ký gọi giữ nguyên.

## Thiết kế

- Needleman-Wunsch toàn cục trên cặp (từ kịch bản đã chuẩn hoá, token Whisper đã chuẩn hoá), chi phí
  thay thế dựa trên khoảng cách sửa, không so bằng tuyệt đối.
- **Gộp (N từ kịch bản → 1 token):** chia `[startMs, endMs)` của token đó cho N từ theo tỷ lệ độ dài
  ký tự. Đây đúng cách WhisperX và ctc-segmentation xử lý.
- **Tách (1 từ kịch bản → N token):** gộp thành `[min(startMs), max(endMs))`.
- **Text hiển thị LUÔN lấy từ kịch bản, timing LUÔN lấy từ Whisper.**
- Giữ quy ước khoảng trắng đầu token của `createTikTokStyleCaptions`: token đầu tiên của cả mảng không
  có khoảng trắng dẫn, mọi token sau đều có. Phá quy ước này làm hỏng luật ngắt trang của thư viện
  (`.claude/rules/video.md`: ngắt trang cần token kế tiếp bắt đầu bằng khoảng trắng).

## Ma trận hợp đồng EP/BVA (discipline: on)

Áp ở chữ ký public của `alignCaptionsToNarration(captions, narration)`:

| Trường hợp | Kỳ vọng |
|---|---|
| Khớp 1:1 | mọi text lấy từ kịch bản, timing giữ nguyên |
| Gộp N:1 ("mười lăm nghìn" ↔ "15.000") | 3 token ra, timespan chia theo tỷ lệ ký tự, liền mạch |
| Tách 1:N | 1 token ra, `[min(startMs), max(endMs))` |
| Token thừa ở đầu mảng Whisper | token thừa bị bỏ, từ kịch bản đầu tiên vẫn có timing |
| Token thừa ở cuối | tương tự ở cuối |
| `narration` rỗng | trả về `captions` nguyên vẹn (không ném lỗi) |
| `captions` rỗng | trả về mảng rỗng (không ném lỗi) |
| Lệch hoàn toàn (không từ nào khớp) | kết quả ổn định, mọi từ kịch bản vẫn có timing tăng dần, không sinh rác |
| Một từ kịch bản không có token nào | nhận timespan chia từ hàng xóm, **không phải `startMs: 0`** |
| Token đầu tiên | không có khoảng trắng dẫn |

## Kết quả đo trên 231 file caption thật (2026-09-20)

| Chỉ số | Trước | Sau |
|---|---|---|
| Từ hiển thị đúng chính tả kịch bản | 4.255 / 8.263 (51,5%) | **8.263 / 8.263 (100%)** |
| Scene rơi vào nhánh bỏ qua | 110 / 231 (47,6%) | 0 |
| Timeline không hợp lệ (đảo ngược / 0ms) | không ai kiểm | **0** |

**Kiểm tra hồi quy** trên 121 scene mà code cũ vẫn chạy đúng: chỉ **9 từ** lệch timing, tối đa
**5ms**, nằm gọn trong **3 scene** (`3e0effe6:2`, `4fc54678:78`, `dee92f87:7`) — đúng ba scene có
token 0ms thật của whisper. Mọi scene còn lại giữ timing y hệt đường cũ.

Ngưỡng ban đầu "≥95% số từ nhận được timestamp" trở nên tầm thường (100% theo thiết kế, vì mỗi từ
kịch bản luôn sinh đúng một caption), nên đã đo bằng hai chỉ số mạnh hơn: tỷ lệ chính tả đúng và
mức hồi quy so với đường cũ.

## Quyết định thiết kế khác với kế hoạch ban đầu

- **Bỏ bộ mở rộng số chữ tiếng Việt.** Nguyên mẫu không có nó đã đạt 95,8% ghép được, và bản cài
  đặt thật đạt 100% chính tả, nên viết thêm một bộ phân tích số tiếng Việt là YAGNI. Trường hợp
  "mười lăm nghìn" ↔ "15.000" được xử lý bằng chính cơ chế chia timespan N:1.
- **Đặt tên file theo thực tế:** `normalize-caption-token.ts` (không phải
  `normalize-vietnamese-token.ts` như kế hoạch, vì nó không còn xử lý số tiếng Việt), cộng
  `pair-tokens-to-words.ts` tách riêng khi file chính vượt 300 dòng.

## Ba lần truy nguyên, hai lần đoán sai

Ghi lại vì đúng tinh thần `debugging.md`: 9 scene có timeline hỏng. Rem đoán lần 1 là "token 0ms",
sửa xong vẫn còn 54 từ lệch. Đoán lần 2 là "nuốt khoảng lặng giữa các từ", sửa xong **vẫn** còn 54.
Chỉ khi dừng đoán và in thẳng dữ liệu mới thấy nguyên nhân thật: whisper sinh token **ngắn nhưng
khác 0** (10ms, 30ms), và hằng số `MIN_CAPTION_MS = 34` ban đầu kéo dài chúng ra. Bộ lọc "scene
sạch" dùng để đo lại chỉ bắt token đúng bằng 0 nên che mất chính điều đang đo.

Sửa lần 2 (chỉ mở rộng span khi thật sự có token bị bỏ) vẫn giữ lại, vì nó đúng về nguyên tắc:
khoảng lặng giữa hai từ không thuộc về từ nào.

## Phát hiện để mở, KHÔNG sửa trong task này

`MIN_CAPTION_MS` hạ xuống 1ms, đủ để timeline hợp lệ nhưng không đủ để một từ được tô sáng. Hệ quả:
**một từ whisper đo dưới một frame vẫn hiện chữ nhưng không bao giờ được highlight xanh.** Nâng lên
34ms sẽ sửa được, nhưng đó là thay đổi timing, không thuộc phạm vi "sửa chính tả" của task 023. Đã
ghi vào `.claude/rules/video.md`.

## Gate — ĐÃ XANH

- `pnpm test` (toàn repo): **66 file, 505 test, pass toàn bộ** (thêm 22 test so với trước task 023).
- `npx eslint be/src/providers/whisper/`: **sạch.**
- `npx prettier --check`: **đạt.**
- Đo trên 231 file caption thật: xem bảng trên.
