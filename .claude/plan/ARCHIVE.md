## Origin: Iteration 1 — pipeline end-to-end

## Task backlog (theo thứ tự thực thi)

| #   | Lát cắt                                                                        | Tầng            | Gate (test phải xanh)                                                                           | Phụ thuộc | Trạng thái |
| --- | ------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------- | --------- | ---------- |
| 001 | Nhập JSON kịch bản, tạo thư mục dự án, UI hiện danh sách cảnh                  | fe + be + store | unit bảng zod schema; integration `POST /api/projects` ghi atomic; test component               | —         | done       |
| 002 | Composition Remotion + Player với ảnh/audio mẫu, render MP4                    | video + fe + be | unit bảng thời lượng + safe viewport; render 3 cảnh, ffprobe khớp thời lượng                    | 001       | done       |
| 003 | Pipeline engine với provider giả (state machine, retry, resume, SSE, Log tab)  | be + fe         | unit retry/phân loại (fake timers); integration giết tiến trình rồi resume; e2e ra `output.mp4` | 002       | done       |
| 004 | `VbeeTtsProvider` thật                                                         | be + fe         | unit bảng zod + phân loại lỗi; integration msw (đủ ma trận); smoke 1 câu thật                   | 003       | done       |
| 005 | `FlowImageProvider` thật (đường mỏng)                                          | be              | integration trên HTML fixture; smoke 1 cảnh thật (xin phép trước)                               | 004       | done       |
| 006 | Bước duyệt: dừng để duyệt, chọn biến thể, sinh lại, tải 2K, preview rồi render | fe + be         | unit chọn biến thể/sinh lại; test component; e2e giả dừng rồi render                            | 005       | done       |
| 007 | Phụ đề từng chữ (Whisper) + component TikTok                                   | be + video + fe | unit gom token/căn thời gian; integration transcribe 1 audio mẫu; render có phụ đề              | 006       | done       |
