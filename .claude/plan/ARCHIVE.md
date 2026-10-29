## Origin: Iteration 2 — giao diện, preset, MCP, chất lượng video

## Task backlog

Iteration 2: giao diện đàng hoàng (sidebar/dashboard/danh sách project/lưới ảnh, dùng đúng shadcn), preset TikTok/YouTube, ảnh nhân vật/bối cảnh đồng bộ qua reference image, gen ảnh song song, skill viết kịch bản có quy trình.

> Trạng thái: `todo` / `in-progress` / `in-review` / `done` / `blocked` / `dropped` (bỏ hẳn: 010 và 011 bị bỏ ngày 2026-10-17 vì giao diện `fe/` đã bị xóa, dự án chỉ còn skill + MCP). Chu trình: `todo → in-progress → in-review → done`.
> Ghi trạng thái dưới dạng **chữ thường, không in đậm** (`in-review`, không phải `**in-review**`).
> Per-task detail nằm trong `task-NNN-*.md`.

| Task | Tên | Trạng thái | Predecessor |
|---|---|---|---|
| 008 | Sửa phụ đề: font tiếng Việt không bể | done | không (song song) |
| 009 | Preset TikTok / YouTube xuyên suốt | done | không (song song) |
| 010 | App shell: sidebar, dashboard, danh sách project | dropped | không (song song) |
| 011 | Lưới ảnh: scene hiển thị dạng ô | dropped | không (song song) |
| 012 | Skill viết kịch bản | done | không (song song) |
| 013 | Ảnh tham chiếu: nhân vật/bối cảnh đồng bộ | done | không (song song) |
| 014 | Gen ảnh song song trên một tab Flow | done | không (song song) |
| 015 | (dự trữ) needs_user resume + dọn /api/samples + đo logo box 9:16 | done | 008-014 (mở sau khi merge xong) |
| 016 | MCP gắn vào be và công cụ đọc get_status | done | 015 |
| 017 | MCP đường tạo và chạy: create_project, start_render, get_logs | done | 016 |
| 018 | MCP đường duyệt: approve_scene, regenerate_scene, get_output | done | 017 |
| 019 | MCP bước hỏi phong cách và bank nhân vật | done | 018 |
| 020 | MCP prompt gắn skill viết kịch bản | done | 019 |
| 021 | ImageGen của Codex: nhập ảnh qua MCP và dựng video | done | 016-020 (kiểm tra tương thích trước triển khai) |
| 022 | Ngắt nghỉ đúng câu: gửi clientPause tới Vbee | done | 021 |
| 023 | Căn chỉnh phụ đề theo kịch bản bằng Needleman-Wunsch | done | 022 |
| 024 | Chuyển cảnh đa dạng và Ken Burns có nhịp | done | 023 |
| 025 | Đồng bộ hướng dẫn độ dài scene | done | 024 |

Chi tiết tích hợp ImageGen: [task-021-codex-imagegen.md](task-021-codex-imagegen.md). Task này thực hiện tuần tự; ngoại lệ chạy song song của iteration 2 không áp dụng cho task 021.

Nhóm 022-025 là iteration chất lượng video, lập ngày 2026-09-20, **tuần tự nghiêm ngặt** (ngoại lệ chạy song song của iteration 2 không áp dụng). Ba nguyên nhân gốc đã đo được bằng số liệu thật, không phải phỏng đoán: phụ đề mất 48,5% chữ đúng vì cổng chặn đếm token tuyệt đối (`align-captions-to-narration.ts:20`, bỏ qua 110/231 scene thật); tham số ngắt nghỉ bị vứt trước khi POST (`narration-request.ts:10-14`); mọi mối nối dùng chung một transition và Ken Burns tuyến tính. Kế hoạch đầy đủ: `/Users/naniiluja/.claude/plans/t-m-hi-u-xem-h-woolly-snowglobe.md`.

## Closed

Đóng ngày 2026-10-30 theo lệnh của chủ dự án ("đánh dấu done toàn bộ"): mọi task còn mở chuyển thẳng sang `done`, không qua `/ccf:check`. Dự án đã đổi hướng sang skill + REST API (giao diện `fe/` bị xoá 2026-10-17, MCP bị gỡ 2026-10-18), nên phần MCP của 016-021 không còn trong code.

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
