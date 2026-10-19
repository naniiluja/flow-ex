# Task 025 — Đồng bộ hướng dẫn độ dài scene

**Trạng thái:** in-review
**Predecessor:** 024
**discipline:** off
**Chi tiết đầy đủ:** xem "Task 025" trong `/Users/naniiluja/.claude/plans/t-m-hi-u-xem-h-woolly-snowglobe.md`

> **ĐỌC PHẦN "Sửa lần hai" Ở CUỐI FILE TRƯỚC.** Mọi con số về tốc độ đọc trong phần thân dưới đây
> (`MEASURED_WORDS_PER_SECOND = 4.5`, "14-27 từ") **đã bị bác bỏ bằng đo đạc thật** và không còn
> tồn tại trong mã. Giữ lại vì đó là chuỗi lập luận dẫn tới mô hình đúng, không phải để dùng.

## Vấn đề

Đây là đòn bẩy chất lượng lớn nhất đo được, và phần render không chạm tới được nó.

| Project (preset tiktok) | Số scene | Tổng audio | Trung bình mỗi scene |
|---|---|---|---|
| dee92f87 | 8 | 112,8s | 14,1s |
| 5a63e05c | 10 | 159,8s | 16,0s |
| 3e0effe6 | 7 | 50,6s | 7,2s |

`PRESETS.tiktok.suggestedDuration` ghi 30-60s cho cả video, thực tế 51-160s. `suggestedSceneCount`
ghi 6-10 và thực tế đúng khoảng đó, nên toàn bộ phần dôi ra nằm ở **độ dài mỗi scene**. Một ảnh
tĩnh với Ken Burns zoom 6% đứng 16 giây là nguyên nhân lớn nhất khiến video trông đơ.

## Số đo mới: tốc độ đọc thật là 4,50 từ/giây, không phải ~5

`SKILL.md` đang ghi "~5 từ/giây", lấy từ **một** lần render (1200 từ → 236,5s). Đo lại trên **toàn
bộ 231 scene** dự án đã sinh:

| | giá trị |
|---|---|
| tổng thể | **4,50 từ/giây** |
| trung vị | 4,34 |
| p10 / p90 | 3,56 / 5,20 |

Đã đưa thành `MEASURED_WORDS_PER_SECOND` trong `packages/shared-schemas/src/presets.ts`, một nguồn
duy nhất, để `SKILL.md`, `references/schema.md` và MCP prompt không còn tự viết lại con số.

**Cảnh báo phải mang theo:** bộ 231 scene đó được sinh TRƯỚC task 022, khi `clientPause` còn bị vứt
trước lúc gửi Vbee. Giờ mỗi dấu chấm nghỉ 0,9s thay vì 0,45s mặc định của Vbee, mỗi dấu phẩy lớn
0,6s thay vì 0,3s, nên audio thật sẽ **dài hơn** con số này dự đoán. Hướng dẫn vì vậy nói rõ: nhắm
đầu THẤP của khoảng số từ, và đo lại khi đã đủ audio sinh sau task 022.

## Thay đổi

- `packages/shared-schemas/src/presets.ts` — thêm `suggestedSceneDurationSeconds` vào
  `PresetConfig` và cả hai preset, cộng `MEASURED_WORDS_PER_SECOND`.
  - `tiktok`: **3-6 giây → 14-27 từ**
  - `youtube`: **8-16 giây → 36-72 từ**
- `packages/shared-schemas/src/index.ts` — export `MEASURED_WORDS_PER_SECOND`.
- `packages/shared-schemas/src/presets.test.ts` — khẳng định giá trị, cộng hai bất biến mới (xem
  dưới).
- `.claude/skills/write-video-script/SKILL.md` — bước 3 thay con số cũ, bước 5 thêm bảng độ dài
  scene kèm lý do và cách xử lý khi đoạn ý quá dài.
- `.claude/skills/write-video-script/references/schema.md` — nhắc lại cùng con số.
- `be/src/mcp/prompts/write-script.ts` — `sceneLengthGuidance(preset)` **suy ra** câu hướng dẫn từ
  bảng `PRESETS`, không viết số bằng tay. Đây đúng là cách hai nơi đã lệch nhau lần trước.

## Bất biến mới trong test

1. **Ba trường độ dài phải nhất quán:** scene dài trung bình × số scene trung bình phải nằm trong
   `suggestedDuration`. tiktok: 4,5s × 8 = 36s trong [30,60] ✓. youtube: 12s × 17 = 204s trong
   [180,480] ✓. Kiểm ở điểm giữa, không ở góc, vì ba khoảng độc lập thì góc cực không bao giờ khớp
   cả ba.
2. **Hướng dẫn phải siết hơn thực tế:** `PRESETS.tiktok.suggestedSceneDurationSeconds.max < 7`, vì
   một hướng dẫn chỉ lặp lại hiện trạng (7-16s) thì vô nghĩa.

Bất biến 2 ban đầu Rem viết cho **cả hai** preset và nó FAIL đúng: 16 giây mỗi scene là bình thường
với youtube long-form, số đo 7-16s kia là của project **tiktok**. Đã thu hẹp test về đúng phạm vi
nó chứng minh, thay vì nới lỏng ngưỡng.

## Gate — ĐÃ XANH

- `pnpm test` (toàn repo): **68 file, 532 test, pass toàn bộ.**
- `npx eslint be/src/mcp packages/shared-schemas/src`: **sạch.**
- `npx prettier`: **đạt.**
- Ba nơi (bảng `PRESETS`, `SKILL.md`, MCP prompt) nói cùng một con số, và MCP prompt suy ra từ bảng
  nên không thể lệch.

`pnpm lint` ở gốc vẫn còn đúng **2 lỗi** thuộc việc dang dở của người dùng (task 019/021), cố ý
không sửa: `fe/src/pages/dashboard-page.tsx:85` và `be/mcp-full-flow.mjs`.

---

## Sửa lần hai, 2026-09-20 chiều: một tỉ lệ từ/giây KHÔNG THỂ đúng

Bản đầu của task này đặt `MEASURED_WORDS_PER_SECOND = 4.5`, đo trên 231 scene sinh TRƯỚC task 022.
Dùng nó cho một video Johnny Joestar 60 giây thật thì ra **86 giây, vượt 43%**. Đo lại trên chính
lần chạy đó cho 3,19 từ/giây, nên Rem hạ hằng số xuống 3,3. Bản trim tiếp theo vẫn ra **69 giây,
vượt 15%** (2,93 từ/giây).

Hai lần sai liên tiếp mới lộ ra nguyên nhân thật: **một tỉ lệ phẳng trộn lẫn hai chi phí độc lập** —
thời gian đọc chữ, và thời gian nghỉ ở mỗi dấu chấm. Câu ngắn dồn dập tốn nhiều thời gian nghỉ hơn
trên mỗi từ, nên cùng số từ mà khác dấu câu thì lệch tới 20% thời lượng. Không có một con số nào
khớp được cả hai.

### Mô hình hai phần, khớp 0,0%

```
thời lượng lời nói = số_từ / 4,34 + số_dấu_ngắt_câu × 0,88 giây
```

| Lần chạy thật | số từ | dấu ngắt câu | thực tế | dự đoán |
|---|---|---|---|---|
| Johnny bản đầy | 253 | 24 | 79,4s | **79,4s** |
| Johnny bản trim | 183 | 23 | 62,4s | **62,4s** |

Hai hệ số tự xác nhận nhau, và đây là điều thuyết phục nhất:

- **0,88s** lắp gần khít `clientPause.sentenceBreak: 0.9` mà task 022 vừa nối tới Vbee — suy ra
  hoàn toàn từ thời lượng đầu ra, không đọc config. Đây là bằng chứng độc lập thứ hai rằng task 022
  thật sự hoạt động trong đường chạy thật.
- **4,34 từ/giây** đúng bằng **trung vị của bộ 231 scene cũ**, vốn đo khi Vbee còn dùng break mặc
  định ngắn hơn. Tức phần "đọc chữ" chưa bao giờ thay đổi; chỉ phần nghỉ được thêm vào.

### Thay đổi trong mã

- **Bỏ** `MEASURED_WORDS_PER_SECOND`. Giữ hai hằng số cạnh tranh nhau chính là cái bẫy drift mà
  task này sinh ra để chặn.
- Thêm `SPEECH_WORDS_PER_SECOND`, `SENTENCE_BREAK_SECONDS`, `estimateNarrationSeconds(words,
  sentenceMarks)` và `countSentenceMarks(text)` vào `packages/shared-schemas/src/presets.ts`.
- `be/src/mcp/prompts/write-script.ts` suy ra khoảng số từ từ công thức, không viết số bằng tay.
- `SKILL.md` và `references/schema.md` nêu công thức kèm cả ba con số đã sai (5 → 4,5 → 3,3) và lý
  do, để phiên sau không lặp lại.

### Còn để ngỏ

`scenePauseMs` (600ms mỗi mối nối) nằm NGOÀI công thức. Phải tự trừ ra trước khi tính số từ. Chưa
gộp vào một hàm ước lượng cấp project vì chưa có nơi nào cần.

Tốc độ đọc vẫn phụ thuộc giọng, sai số khoảng ±15%: giọng `astraea` chậm hơn giọng trong bộ mẫu cũ.
Hai hệ số hiện tại fit từ đúng một giọng.

## Gate lần hai — ĐÃ XANH

- `pnpm test`: **68 file, 539 test, pass toàn bộ** (thêm 7 test cho mô hình mới).
- `npx eslint packages/shared-schemas/src be/src/mcp`: **sạch.**
