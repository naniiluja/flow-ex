# Kế hoạch triển khai — flow-ex (auto-video)

> **Quy tắc thực thi: TUẦN TỰ NGHIÊM NGẶT + LÁT CẮT DỌC.** Làm đúng một task một lần, theo thứ tự.
> Mỗi task là một lát cắt mỏng xuyên qua mọi tầng nó chạm tới (DB + service + UI), KHÔNG chia theo tầng ("làm hết DB rồi mới tới API"), để lộ vấn đề tích hợp sớm.
> Không bắt đầu task N+1 khi gate của task N chưa GREEN (đã cài đặt + đã test + đã qua `/ccf:check`).
> Trạng thái `in-progress`/`in-review` được hook session-start đọc để nạp lại ngữ cảnh sau khi compact, luôn cập nhật trạng thái.

## Milestones

Milestone duy nhất cho iteration đầu: dựng xong pipeline end-to-end (nhập JSON → ảnh Flow → voice Vbee → phụ đề Whisper → render MP4), có thể chạy lại an toàn sau lỗi.

> Trạng thái: `todo` / `in-progress` / `in-review` / `done` / `blocked`. Chu trình: `todo → in-progress → in-review → done`. Mỗi task được cài đặt trực tiếp trong session (không qua subagent viết code), đánh `in-review` khi code + test xong; chỉ `/ccf:updatespec` mới ghi `done`, sau khi `/ccf:check` qua.
> Ghi trạng thái dưới dạng **chữ thường, không in đậm** (`in-review`, không phải `**in-review**`).
> Per-task detail nằm trong `task-NNN-*.md`.

> **Chỉ giữ iteration ĐANG chạy ở file này.** Khi mọi task của một iteration đều `done`, `/ccf:updatespec` chuyển nguyên phần đó sang `.claude/plan/ARCHIVE.md` và `git mv` các `task-NNN-*.md` vào `.claude/plan/archive/`. Một dòng đã đóng còn nằm ở đây vẫn bị hook session-start/Stop tính là việc đang mở, trong khi XÓA lịch sử sẽ mất bản ghi thật về những gì đã hoàn thành và vì sao. Vậy nên lưu trữ, không xóa.

<!-- Giữ phần hướng dẫn trạng thái TRÊN dòng này, không dưới "## Origin": việc lưu trữ nhóm nội dung từ một heading "## Origin" tới heading kế tiếp, chỉ phần văn bản TRƯỚC heading đầu tiên không bị cắt vào ARCHIVE.md. -->

## Origin: Iteration 1 — pipeline end-to-end

## Task backlog (theo thứ tự thực thi)

| #   | Lát cắt                                                                        | Tầng            | Gate (test phải xanh)                                                                           | Phụ thuộc | Trạng thái |
| --- | ------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------- | --------- | ---------- |
| 001 | Nhập JSON kịch bản, tạo thư mục dự án, UI hiện danh sách cảnh                  | fe + be + store | unit bảng zod schema; integration `POST /api/projects` ghi atomic; test component               | —         | done       |
| 002 | Composition Remotion + Player với ảnh/audio mẫu, render MP4                    | video + fe + be | unit bảng thời lượng + safe viewport; render 3 cảnh, ffprobe khớp thời lượng                    | 001       | todo       |
| 003 | Pipeline engine với provider giả (state machine, retry, resume, SSE, Log tab)  | be + fe         | unit retry/phân loại (fake timers); integration giết tiến trình rồi resume; e2e ra `output.mp4` | 002       | todo       |
| 004 | `VbeeTtsProvider` thật                                                         | be + fe         | unit bảng zod + phân loại lỗi; integration msw (đủ ma trận); smoke 1 câu thật                   | 003       | todo       |
| 005 | `FlowImageProvider` thật (đường mỏng)                                          | be              | integration trên HTML fixture; smoke 1 cảnh thật (xin phép trước)                               | 004       | todo       |
| 006 | Bước duyệt: dừng để duyệt, chọn biến thể, sinh lại, tải 2K, preview rồi render | fe + be         | unit chọn biến thể/sinh lại; test component; e2e giả dừng rồi render                            | 005       | todo       |
| 007 | Phụ đề từng chữ (Whisper) + component TikTok                                   | be + video + fe | unit gom token/căn thời gian; integration transcribe 1 audio mẫu; render có phụ đề              | 006       | todo       |
