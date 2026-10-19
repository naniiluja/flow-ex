# Chỉnh giọng đọc (Vbee) và nhấn nhá

Mọi thông số dưới đây người dùng đã chọn bằng tai qua mẫu A/B ngắn (2026-10-17/18). Rem không nghe được: số đo
`silencedetect` không chứng minh giọng tự nhiên, chỉ tai người dùng chứng minh.

## Giọng và thông số

- Giọng: `s_hochiminh_female_vyquangcao_advertise_vc` (ưa thích); `n_hn_male_ngankechuyen_ytstable_vc` (nam, kể chuyện, "ổn"). `n_yenbai_female_giang20260720203822824_book_vc` bị chê hai lần, không dùng lại trừ khi được yêu cầu, và khi người dùng nêu mã giọng thì đưa MỘT mẫu ngắn (~30 giây, một lệnh `afplay`) trước khi gen cả video.
- `tts`: `speed` 0,95; `clientPause` phẩy 0,2, `majorBreak` 0,3, chấm 0,4, ngắt đoạn 1,4 (giây). `speed` 0,85 (mặc định preset) nghe uể oải và giả. Dấu chấm và phẩy để ngắn, nếu không nghe "ngắt vụn".
- Ngắt đoạn 1,4s là khe "dừng kịch tính": chỉ đặt trước chi tiết lộ ra và trước lời thoại sau dấu hai chấm (người dùng khen nhịp dừng trước "Phạm Văn Út!").
- Vbee không có tham số cao độ: `emphasisIntensity` trả 400 trên mọi giọng đã thử, tài liệu không nêu SSML, đừng chèn thẻ hay chữ in hoa.
- Khoảng nghỉ đo thật: chấm 0,45-0,54s; phẩy 0,22-0,29s; "…" khoảng 0,22s; hai chấm KHÔNG ỔN ĐỊNH (0 đến 0,26s); câu ≤4 từ sau dấu chấm có thể bị nuốt nghỉ. Cần chắc có nghỉ thì dùng chấm, phẩy hoặc ngắt đoạn.

## Truyện dài: MỘT file audio

- Gen audio từng cảnh nghe "câu bị ngắt, không liền mạch": 1,01s im lặng ở cả 79 chỗ nối của truyện 80 cảnh (9% video). Một lần gọi Vbee cho cả truyện (15.428 ký tự, trần 100.000) hết khoảng lặng từ 1s trở lên.
- `collage-broll/scripts/narrate-expressive.mjs` làm trọn: truyện chia đoạn, khối riêng trước lời thoại sau dấu hai chấm, một lần gọi Vbee, dọn mối nối, whisper theo đoạn, nhấn cao độ, ghi `timeline.json`; ghép bằng `assemble-video.mjs --timeline`. `narrate-whole.mjs` là bản không xử lý cao độ.
- Mối nối đoạn của Vbee có nhiễu nhỏ (-29 đến -39 dB) rồi giọng bật lên đột ngột, nghe "giật cục nhẹ như nhiễu": `prosody/declick.py` xoá nhiễu và làm mờ 15 ms hai đầu.
- whisper gán thời gian sai quanh khoảng im lặng dài (từng gán 1,1s im lặng cho một từ), nên chạy theo từng đoạn rồi cộng offset.
- Không có file truyện gốc thì `prosody/paragraphs.py` khôi phục chỗ ngắt đoạn từ khoảng nghỉ của audio cũ (≤0,46s ngắt câu, ≥0,68s ngắt đoạn; khôi phục 45/45).

- Đổi lời mà giữ ảnh đã duyệt (đỡ gen lại ảnh): sao lưu project, đặt mọi cảnh về `generating_audio`, xoá `audioFile`, `audioDurationMs`, `audioRequestId`, `audioRequestSubmittedAt`, `captionsFile`, `runStatus: "idle"`, bỏ `runId` và `outputFile`, rồi `POST /api/projects/:id/render` (ghi `project.json` khi lượt render không chạy).

## Nhấn cao độ (`prosody/emphasis.py`, Praat PSOLA qua Parselmouth)

Chỉ chỉnh nhịp nghỉ thì giọng "ngang ngang". Nguyên tắc rút từ nghiên cứu ngữ âm:
- Ngôn ngữ có thanh điệu nhấn bằng MỞ RỘNG biên độ cao độ quanh từ, giữ hình dạng thanh, không cộng một "cục nhô" lên đường thanh (cách đó bẻ dấu). Không đổi cao độ bằng `asetrate`: đổi luôn âm sắc, nghe "chỉ to giọng lên".
- Nén biên độ 3 từ sau từ nhấn; kéo dài từ nhấn 15% (độ dài là dấu hiệu tin cậy nhất); mỗi câu trôi từ +4% xuống -7%; đầu đoạn reset cao thêm 6%.
- Từ nhấn chọn tự động: lời đáp ngắn trong ngoặc kép hoặc từ có "!" nâng (x1,4); câu chốt dưới 7 từ hạ từ cuối; từ sau "rất, chính, chỉ, vẫn, đúng" nâng nhẹ (quy tắc này chọn nhầm 2/7 ở mẫu thử).
- Thư viện Python chỉ chạy qua `uv run --with`; Praat PSOLA thay WORLD vì giữ âm sắc và kéo dài được từng từ. Kết quả truyện ma: 975s audio, 59 chỗ ngắt dài, 546 mối nối dọn, 81 từ nhấn, dài thêm 5s.
- Tìm hiểu thêm thì tra kỹ thuật kể chuyện của con người, rộng hơn một ngôn ngữ hay hãng, và repo GitHub nhiều sao (`gh search repos <từ khoá ngắn> --sort stars`).
