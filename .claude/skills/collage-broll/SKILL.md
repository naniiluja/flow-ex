---
name: collage-broll
description: >
  Làm video flow-ex theo phong cách giấy cắt dán bán sắc (editorial halftone paper-collage): mỗi
  scene là MỘT ẩn dụ hình ảnh dựng bằng 3-6 mảnh giấy, Flow gen ảnh, rồi (tuỳ chọn) Flow gen clip
  "mảnh giấy tự lắp ráp từ nền trống" và ghép thành MP4 có giọng đọc + phụ đề. Kích hoạt khi người
  dùng nói "collage", "giấy cắt dán", "paper collage", "halftone", "b-roll kiểu giấy dán", hoặc chọn
  phong cách này khi grill video. Là lớp PHONG CÁCH + công đoạn video đặt lên `write-video-script`
  (kịch bản, schema, thời lượng vẫn theo skill đó), không thay thế nó. Không dùng cho ảnh nhân
  vật/ảnh chụp thật.
---

# Collage B-roll cho flow-ex

Chuyển thể từ `pyang5166/gbro-collage-broll` (MIT, xem `LICENSE-gbro-collage-broll`). Bản gốc viết
cho Codex (ảnh bằng `image_gen` của Codex, video bằng Gemini API). Bản này chạy trên flow-ex: **Flow
gen cả ảnh lẫn video**, Vbee đọc, ffmpeg ghép.

| gbro gốc | flow-ex |
|---|---|
| Gate 1: duyệt ẩn dụ | giữ nguyên, duyệt trong hội thoại trước khi tạo project |
| Gate 2: duyệt ảnh tĩnh | Flow gen ảnh (0 credit); duyệt bằng bước review của flow-ex (`reviewEnabled: true`) |
| Gate 3: Omni Flash lắp ráp từ khung trống | Flow chế độ Video > Frames (Start + End), model Omni 1.1 Flash, qua `scripts/flow-video.mjs`; **tốn credit nên cần duyệt** |
| ghép video | `scripts/assemble-video.mjs`: clip + giọng Vbee + phụ đề từng từ, bằng ffmpeg của `be/` |

## Quy trình

1. **Dùng `write-video-script` cho bước 0-4** (grill, nghiên cứu, premise/hook/payoff, draft, tự
   phản biện). Ở câu hỏi "phong cách hình ảnh", chốt paper-collage. Từ bước 5 (chia scene +
   `imagePrompt`) làm theo skill này.
2. **Gate 1: ẩn dụ.** Với MỖI scene, trình bày rồi DỪNG chờ người dùng duyệt (chưa tạo project):
   - ý chính của câu thoại, cảm xúc
   - một câu "mệnh đề hình ảnh" (thứ gì làm gì với thứ gì)
   - 3-6 vật thể chính
   - màu nền + màu điểm nhấn (bảng màu bên dưới)
   - **thứ tự lắp ráp** (vật nào vào trước, vật nào vào sau): dùng lại ở Gate 3

   Không đặt nguyên văn lời thoại vào hình. Một scene = một ẩn dụ; nhiều hơn 6 vật thể thì ý yếu đi.
   Cả video nên có mạch: cảnh trước đặt vấn đề, cảnh sau giải quyết.
3. **Viết `imagePrompt`** cho từng scene đã duyệt (mẫu bên dưới), ghép vào JSON
   `scriptInputSchema` theo `write-video-script/references/schema.md`, đặt `reviewEnabled: true`.
4. **Tạo project và chạy:** `POST /api/projects` rồi `POST /api/projects/:id/render` (xem cảnh báo
   style bên dưới). Mỗi scene dừng ở `awaiting_review`.
5. **Gate 2: duyệt ảnh.** Nhìn từng ảnh (file ở `projects/<id>/assets/images/`), đạt thì
   `POST /api/projects/:id/scenes/:index/approve` (`index` tính từ 0), không đạt thì
   `.../regenerate`. Chạy QA (cuối file) và **luôn kiểm tra ảnh trùng**:
   `md5 -r projects/<id>/assets/images/*.jpg | awk '{print $1}' | sort | uniq -d`. Pipeline gen ảnh
   song song có thể gán một ảnh cho hai scene (đã gặp: scene 5 và 6 byte-giống-hệt, scene 4 và 7
   treo tới hết timeout 180s rồi tự thử lại); scene trùng thì `regenerate` từng cái một.
   Pipeline tiếp tục: giọng Vbee, phụ đề whisper, rồi render Remotion ra `output.mp4`
   (Ken Burns, không có clip). **Đây là bản dự phòng đã đủ dùng**; Gate 3 chỉ nâng cấp nó.
6. **Gate 3: video clip (cần người dùng đồng ý trước, vì tốn credit).** Báo số clip, tổng credit
   (bảng giá bên dưới) và hỏi; chỉ chạy khi được duyệt. Rồi:

   ```bash
   S=.claude/skills/collage-broll/scripts; W=projects/<id>/clips-work
   # orders.json: mỗi scene một câu tiếng Anh nói thứ tự lắp ráp (lấy từ Gate 1)
   node $S/prepare-video-jobs.mjs --project <id> --orders orders.json --out-dir $W
   node $S/flow-video.mjs --jobs $W/jobs.json --out-dir $W/clips --max-credits <n>   # --dry-run để xem giá
   node $S/remove-clip-watermark.mjs --clips $W/clips --out-dir $W/clips-clean   # vá 2 ngôi sao Flow
   # tuỳ chọn: nhạc nền ambient tổng hợp bằng ffmpeg (không dính bản quyền), tự hạ khi có giọng
   node $S/make-ambient-music.mjs --seconds <độ dài video + 3> --out $W/bed.m4a
   node $S/assemble-video.mjs --project <id> --clips $W/clips-clean [--music $W/bed.m4a] --out projects/<id>/output-clips.mp4
   ```

   **Vá dấu sao khỏi ảnh khung cuối TRƯỚC khi gen** (sửa `end` trong `jobs.json` trỏ tới PNG sạch).
   Ảnh Flow gen ra mang dấu một sao quanh (647,1255) trên ảnh 768x1376; ảnh đó là khung cuối của
   clip, và mô hình video biến nó thành ngôi sao bay lạc ở nửa sau clip, ngoài tầm `delogo`. Đã gặp
   ở 7 trên 12 clip (cảnh 2, 3, 5, 6, 9, 10, 11), phải gen lại tốn 74 credit. Cách vá: chép mảnh nền
   96x96 từ (526,1230) đè lên (622,1230) bằng mặt nạ mờ (`drawbox` + `gblur` + `alphamerge`), làm
   trong RGB (`format=gbrp`) và xuất PNG: đi qua RGBA/yuvj420p làm lệch màu thấy được (173,80,40 so
   với nền 182,76,31). Đã thử xoá sao ngay trên clip bằng erosion/dilation: để lại khối tối và không
   xoá được tia sao mờ, nên bỏ.

   `remove-clip-watermark.mjs` dùng `delogo` của ffmpeg (nội suy từ viền) trên hộp 116x128 quanh dấu
   hai ngôi sao ở góc dưới-phải (clip 720x1280, tự co theo bề rộng). Hộp 84x92 cũ để lại vệt chữ
   thập mờ khi hai sao biến thành vệt sáng ở cuối clip. Bản đầu chép một mảnh nền bên
   cạnh đè lên, nhưng để lại ô tối khi có mảnh giấy ở vùng nguồn (đã đo ở scene 3), nên bỏ. Vẫn QA
   góc dưới-phải của từng clip: mảnh giấy đi sát góc sẽ bị nhoè nhẹ. Không dùng
   `gemini-watermark-remover` cho clip: mô hình video của nó nhắm dấu Gemini/Veo chứ không phải
   dấu hoạt hình hai sao của Flow, và CLI cần build repo cộng tải Chromium. Với **ảnh** thì repo đó
   chạy tốt (dấu một sao 48x48), nhưng vẫn để lại vệt viền mờ nên cần vá thêm bằng mảnh nền.

   Điều kiện: backend đã chạy xong tới bước phụ đề (cần `audioDurationMs` và `captions/`), Chrome
   riêng của Flow đang mở ở trang `https://flow.google.com/project/<uuid>`, ô Start/End trống.
   Script gen theo lô 3 clip, bỏ qua clip đã có (chạy lại để thử lại scene lỗi), chụp
   `error-scene-NN.png/.txt` khi lỗi, và trả Flow về chế độ Image khi xong.

   **Script báo lỗi không có nghĩa là chưa gen.** Trang "All media" của Flow ảo hoá lưới nên SỐ tile
   không tăng sau khi gen; bản cũ đếm tile và báo lỗi cả 12 cảnh dù Flow đã gen và trừ đủ 130
   credit. Giờ script nhận biết bằng việc tile đầu lưới đổi nội dung. Nếu vẫn lỗi, nhìn Flow trước
   khi chạy lại: chỉ dòng `scene N submitted` mới là đã trừ credit. Clip đã gen thì tải lại (tile mới
   nhất ở đầu lưới, vị trí 0 là scene cuối), đừng gen lại. Lỗi trước dòng `submitted` (bộ chọn ảnh còn
   quay vòng, nút gen chưa bật) thì chưa tốn credit và chạy lại an toàn.
   **Video dài (đã làm thật: truyện ma 80 cảnh, 14,6 phút, 19 clip + 61 ảnh tĩnh).** Gen clip cho mọi cảnh
   là không thực tế (1.154 credit cho 80 cảnh), nên chọn khoảng 20 cảnh then chốt (lúc một thứ hiện ra,
   biến hình, xuất hiện dần) và dùng `assemble-video.mjs --clips <dir> --stills <dir>`: cảnh nào có clip
   thì dùng clip, cảnh còn lại là ảnh tĩnh zoom chậm 6% đã xoá dấu sao (`remove-image-watermark.mjs`).
   Làm theo thứ tự này: gen ảnh (khoảng 55 phút cho 80 ảnh, 0 credit) và duyệt qua bảng 20 ảnh, phóng to
   mọi cảnh có giấy tờ vì Flow vẽ chữ giả (cảnh "dòng cuối sổ" ra chữ tiếng Anh đọc được, gen lại với
   prompt "dòng trống, không chữ"); xoá sao khỏi ảnh TRƯỚC khi đưa làm khung cuối; `--dry-run` rồi hỏi
   người dùng; dựng bản ảnh tĩnh trước làm bản dự phòng; rồi mới ghép bản có clip. Một cảnh Flow
   không nhận ảnh: **ảnh khung cuối kẹt "99%" mãi** (cả PNG lẫn JPEG, nghi bộ lọc nội dung với cảnh
   người già cởi trần cúi bên cậu bé), nên cảnh đó dùng ảnh tĩnh thay vì đốt thêm credit. Mã hoá lại
   sang JPEG cứu được ba cảnh khác (Flow gộp tệp trùng nội dung nên mỗi lần chạy lại vẫn trúng tài
   nguyên kẹt cũ). Tổng 274 credit cho 19 clip. Nút "Add to prompt" bị khoá lâu không phải lỗi hệ thống:
   Flow xử lý bản tải lên lúc nhanh lúc chậm; `flow-video.mjs` giờ thử bản cùng tên cũ hơn sau 40 giây.

   **Truyện dài: gen MỘT file audio cho cả truyện**, không để pipeline đọc từng cảnh: xem `.claude/rules/voice-tuning.md` và mục "Giọng đọc có nhấn nhá" bên dưới.
7. **QA clip:** ghép contact sheet vài khung hình mỗi clip, kiểm tra mảnh giấy có lắp ráp đúng
   thứ tự, kết thúc đúng bố cục ảnh đã duyệt, không có chữ giả. Scene hỏng: xoá `scene-NN.mp4`
   rồi chạy lại `flow-video.mjs` (tốn credit lần nữa).

## Giọng đọc có nhấn nhá

Kỹ thuật (một file audio cho cả truyện, dọn mối nối, whisper theo đoạn, nhấn cao độ, thông số giọng) nằm trong
`.claude/rules/voice-tuning.md`, nạp mọi phiên. Lệnh:

```bash
node --env-file=.env $S/narrate-expressive.mjs --project <id> --voice <code>   # --pitch 0 để bỏ phần cao độ
node $S/assemble-video.mjs --project <id> --clips $W/clips-clean --stills $W/stills \
  --timeline projects/<id>/narration-expressive/timeline.json --music $W/bed.m4a --out projects/<id>/output.mp4
```

## Flow Video: những điều đã kiểm chứng thật (2026-10-16)

- Cài đặt (nút `button.settings-trigger-button`): `Image | Video`; với Video có `Frames` (ô **Start**
  và **End**) hoặc `Ingredients`; tỉ lệ `16:9 | 9:16`; model `Omni 1.1 Flash` (mặc định), `Veo 3.1
  Lite/Fast/Quality`; độ phân giải `360p | 720p`; độ dài `4s | 6s | 8s | 10s`; số lượng `x1-x4`.
- Giá Omni 1.1 Flash 720p x1: **4s = 7, 6s = 10, 8s = 12, 10s = 15 credit** (360p/10s = 7). Ảnh Nano
  Banana: 0 credit (gói PRO). Số dư xem ở menu tài khoản (`.header-user-button`).
- Ô Start/End mở bộ chọn "Select a frame image" giống bộ chọn "+" của ảnh tham chiếu: nút Upload
  (`button.sidebar-upload-btn`, bắt `filechooser`), mục mới nhất là `.asset-item` đầu tiên, rồi
  `button.detail-add-to-prompt-btn`.
- File upload được đặt tên **đúng tên file** trong bộ chọn (tab Images cũng liệt kê cả upload,
  mới nhất lên đầu nhưng vẫn lẫn mục cũ). Chọn "mục đầu tiên" ngay sau upload từng lấy nhầm mục cũ
  (ô Start nhận ảnh scene trước), nên `flow-video.mjs` upload với tên có tiền tố mã băm nội dung rồi
  tìm mục theo tên đó. Xoá khung còn sót bằng nút `close` của thanh prompt.
- Không ghim handle phần tử của tile: Flow thay tile pending bằng tile xong nên handle trỏ vào DOM
  cũ và không bao giờ báo xong. Xác định tile theo vị trí từ trên xuống (tile mới luôn ở đầu).
- Gen một clip 4s mất khoảng 45 giây; clip 6s khoảng 1 đến 1,5 phút; 10 clip theo lô 3 mất khoảng
  8 phút. Tile mới là `flow-video-tile` (xuất hiện ở ĐẦU lưới), đang
  chạy thì chứa `flow-pending-tile` kèm phần trăm, xong thì có `flow-video-hotbar`. Không có thẻ
  `<video>` trong DOM.
- Tải: menu `more_vert` của tile > Download > `720p Original size` (miễn phí). `1080p/4K Upscaled`
  là bản upscale (4K bị khoá ở gói này). Playwright bắt được sự kiện `download` qua CDP.
- File tải về: 720x1280, 24fps, H.264, có track AAC (script ghép bỏ track này). Clip có dấu sao
  watermark ở góc dưới-phải như ảnh.
- Bảng cài đặt chỉ đóng chắc chắn khi bấm vào lớp nền (`.cdk-overlay-backdrop`), không phải bấm lại
  nút mở.

## Chữ ký phong cách (dán NGUYÊN VĂN vào mọi prompt của cùng một video)

```
premium editorial paper collage, flat bold color field, black-and-white halftone cut-outs mixed
with selective colored cardstock, visible halftone dots, crisp machine-cut edges, thin warm-cream
keylines, soft low-opacity paper shadows, fine uncoated-paper grain
```

Giữ y hệt ở mọi scene để cả video cùng một ngôn ngữ thiết kế (`.claude/rules/image-prompting.md`:
style/mood không được đổi giữa các scene). Chỉ đổi **màu nền** theo ngữ nghĩa.

## Chủ đề lịch sử Việt: PHẢI neo bối cảnh, nếu không Flow vẽ phương Tây

Lỗi đã gặp (2026-10-17): prompt chỉ nói "throne", "crown", "robe", "chessboard" thì Flow vẽ ngai gothic,
áo choàng lông ermine và bàn cờ vua, trong khi chủ đề là triều Lý-Trần. Dán NGUYÊN VĂN hai đoạn sau
vào mọi `imagePrompt` của video lịch sử Việt (đoạn bối cảnh đặt SAU chủ thể, đoạn cấm đặt CUỐI prompt):

```
set in ancient Vietnam during the 13th-century Ly and Tran dynasties of Dai Viet, Southeast Asian
not European: loose wide-sleeved giao linh crossed-collar robes, flat-topped imperial hats, upturned
curved tile roofs with dragon-head ridge finials, smooth S-curved Ly-style dragons, lotus motifs
```
```
no European medieval elements, no ermine or fur trim, no crowns with crosses, no gothic spires,
no castles, no chess pieces, no Western clothing
```

Gọi vật thể bằng bản Việt: "Vietnamese dragon throne with a curved lotus-petal back", "Vietnamese
imperial dragon robe", "Thang Long palace gate with an upturned curved roof", "pagoda gate with lotus-bud
finials", "do-paper scroll" (giấy dó), "ink stone and calligraphy brush". Ẩn dụ phải hợp thời: dùng
**con rối giật dây** (gợi rối nước) thay cho bàn cờ vua. Cuộn giấy dùng "blank brush marks" vì Flow có
thể vẽ chữ Hán giả giữa clip (đã gặp ở scene cuộn sử).

## Thông số chạy đã chốt (video 12 cảnh, 9:16)

- Ảnh Flow: 12 ảnh mất khoảng 15 phút ở `FLOW_IMAGE_CONCURRENCY` mặc định; hai scene đầu gen cùng lúc
  hay lệch (đã ghi OPEN trong `debugging.md`). Cách gỡ: khởi động lại backend rồi `POST .../render`,
  pipeline tự chạy lại đúng scene còn dở.
- Duyệt ảnh: `POST /api/projects/:id/scenes/:index/approve` cần body JSON `{}` (không body bị 400) và
  CHỈ chạy được khi lượt render đã dừng (`409 PIPELINE_ALREADY_RUNNING` nếu còn chạy). Rồi `POST .../render` lại.
- Clip: độ dài clip = lời đọc + 0,6s làm tròn lên 4/6/8/10s; giá 7/10/12/15 credit. 12 clip lời dài
  (270 từ) ra 138 credit; 12 clip lời ngắn (179 từ) ra 129 credit. Luôn `--dry-run` trước, đặt
  `--max-credits` sát mức kế hoạch.
- Hộp quảng cáo "Start $1 trial / Want higher speeds?" của Flow che trang làm automation kẹt (gen
  ảnh treo, không bắt được tile). Đóng bằng nút "No, thanks" qua CDP rồi khởi động lại backend.
- `flow-video.mjs`: lần bấm đầu vào nút cài đặt sau khi kết nối mới thường không mở bảng (đã sửa bằng
  bấm lại), nên trước đây scene đầu mỗi lượt luôn lỗi. Tải clip có thể quá 60s sau khi đã bị tính
  credit (đã nâng timeout 180s); nếu lỗi ở bước tải mà đã "submitted" thì chạy lại sẽ trả lần hai.
- Xóa watermark: ảnh Flow 768x1376 có dấu một ngôi sao 48x48 ở (647,1255); `gemini-watermark-remover`
  (`node bin/gwr.mjs remove <in> --output <out>`, cần `sharp`, cài trong thư mục tạm, tắt script cài
  đặt) xóa được nhưng để vệt viền mờ, nên vá thêm bằng cách chép mảnh nền 64x64 từ (530,1248) đè lên
  (640,1248). Clip Flow dùng `scripts/remove-clip-watermark.mjs` (xem bước 6). SynthID vô hình không xóa được.

## Bảng màu nền theo ngữ nghĩa

| Ý của scene | Màu nền |
|---|---|
| tiêu hao thời gian, lao động, gấp gáp | cam cháy / đỏ |
| công cụ, cảnh báo, kinh nghiệm bị rơi mất | vàng mù tạt |
| nhận thức, thẩm mỹ, đặt lại hệ thống | xanh lục đậm |
| quy chuẩn, tích luỹ, trí nhớ dài hạn | tím đậm |
| phán đoán, hợp tác, tự động chạy | xanh ngọc |

Chủ thể chính chủ yếu đen trắng halftone; mảnh giấy màu cục bộ chỉ dùng để nhấn thứ quan trọng.
Không mặc định cobalt blue cho mọi scene. Ghi hex cụ thể vào prompt.

## Mẫu `imagePrompt`

`image-prompting.md` yêu cầu **một câu văn liền mạch**, không phải danh sách field như bản gốc. Viết
tiếng Anh cho phần phong cách (Nano Banana hiểu từ vựng này tốt nhất); câu tường thuật gồm chủ thể,
hành động, bố cục, rồi chữ ký phong cách:

```
A [vật thể/nhân vật halftone] [hành động] [với/trên] [vật thể phụ], built from 3 to 6 large
separable paper pieces on a perfectly flat [màu] paper field [#hex], [màu điểm nhấn] cardstock
accents on [thứ cần nhấn], vertical 9:16 locked poster frame with the whole subject inside the
upper-middle area, within the top 70 percent of the height and the central 70 percent of the
width, and generous empty color-field space below it and in the bottom-right corner,
[chữ ký phong cách], no typography, no readable letters, no numerals, no logos, no watermark,
no UI, no glossy 3D, no photoreal environment
```

Quy tắc ràng buộc của flow-ex:

- **Hộp an toàn của bản Remotion (đã đo bằng `computeSafeViewport`, ảnh 9:16 và 16:9 ra cùng kết
  quả).** Để né logo Flow, cửa sổ nhìn thấy luôn zoom từ 1,34 trở lên và neo ở trên, nên
  `output.mp4` chỉ hiện khoảng **x 13-87% và y 0-74%** của ảnh (còn zoom thêm 6% theo thời gian).
  Khoảng 26% đáy và 13% hai mép bị cắt: đặt mọi thứ quan trọng trong hộp đó, phần đáy chỉ để
  nền trống. Ví dụ đã gặp: con mắt ở đáy scene 1 bị cắt mất nửa trong bản Remotion.
- **Bản ghép clip (Gate 3) không cắt** nên thấy cả khung; dấu sao watermark ở góc dưới-phải được vá
  bằng `remove-clip-watermark.mjs`, nhưng việc vá chỉ sạch khi góc đó TRỐNG: chừa trống góc dưới-phải.
- **Nền phải là một mảng màu phẳng, sạch.** Khung đầu của clip là chính màu nền đó (script lấy mẫu
  ở góc ảnh), nên nền loang hoặc có vật ở góc trên-trái sẽ làm khung đầu sai màu.
- **Không có chữ/số/logo trong ảnh.** Phụ đề do Remotion/ASS vẽ; chữ Flow tự vẽ trong ảnh thường
  là chữ giả và sẽ trùng lên phụ đề.
- Một scene tối đa 18 từ lời thoại (tiktok); nhiều hơn thì tách scene ở bước 5 của `write-video-script`.
- `preset: "youtube"` (16:9): đổi "vertical 9:16" thành "horizontal 16:9", thêm `--aspect 16:9`
  cho cả hai script Gate 3, vẫn chừa góc dưới-phải.

## Nhân vật lặp lại

Khai báo ở `references[]` như `write-video-script` quy định, nhưng `prompt` của reference cũng phải
dùng chữ ký phong cách trên (nhân vật là hình cắt halftone, không phải ảnh thật). Prompt scene mở
bằng "Using the attached character image, keep the halftone cut-out look exactly as shown; ...",
gọi theo vị trí ảnh đính kèm, không gọi tên. Nếu không cần nhân vật cụ thể, dùng "a faceless
halftone silhouette of a person": không cần reference và đỡ rủi ro lệch mặt giữa các scene.

## Tạo project

`POST /api/projects` không gắn thêm cụm phong cách nào vào `imagePrompt`, nên chữ ký phong cách trong prompt là thứ duy nhất quyết định ảnh.

## Giới hạn của bản ghép (`assemble-video.mjs`)

- Phụ đề đốt bằng ASS/Arial (có đủ dấu tiếng Việt), không phải font Inter của Remotion; từ đang đọc
  tô xanh. Không có chuyển cảnh mờ dần, các scene cắt thẳng (hợp nhịp stop-motion).
- Clip ngắn hơn lời đọc thì giữ nguyên khung cuối (bố cục hoàn chỉnh). Clip còn chuyển động khi cảnh
  hết thì được tăng tốc (tối đa 1,6 lần, chừa 0,25s giữ khung cuối) để mảnh cuối kịp lắp, không cắt:
  đo thật thì 9 trên 12 clip bị cắt mất mảnh cuối (ngọn lửa que diêm, mảnh sóng trên bình) khi chỉ
  trim. QA bằng KHUNG CUỐI của từng cảnh, không chỉ khung giữa.
- Ảnh clip 720p được phóng lên 1080x1920, mềm hơn bản Remotion. Muốn nét hơn có thể tải bản
  `1080p Upscaled` trong menu Download, nhưng chưa kiểm chứng giá của nó.

## QA ảnh (cùng người dùng, trong bước review)

- Ẩn dụ có nhìn là hiểu không, hay phải đọc lời thoại mới hiểu?
- 3-6 mảnh lớn rõ ràng, không phải vụn khắp khung?
- Có chữ giả, logo, watermark, UI trong ảnh không?
- Góc dưới-phải còn trống? Chủ thể nằm trong 70% giữa?
- Cả video cùng chất liệu giấy/halftone, chỉ khác màu nền?

Scene không đạt: `regenerate`, đừng sửa prompt hàng loạt khi mới một ảnh hỏng.
