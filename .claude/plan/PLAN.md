# Kế hoạch triển khai — flow-ex (auto-video)

> **Quy tắc thực thi: TUẦN TỰ NGHIÊM NGẶT + LÁT CẮT DỌC.** Làm đúng một task một lần, theo thứ tự.
> Mỗi task là một lát cắt mỏng xuyên qua mọi tầng nó chạm tới (DB + service + UI), KHÔNG chia theo tầng ("làm hết DB rồi mới tới API"), để lộ vấn đề tích hợp sớm.
> Không bắt đầu task N+1 khi gate của task N chưa GREEN (đã cài đặt + đã test + đã qua `/ccf:check`).
> Trạng thái `in-progress`/`in-review` được hook session-start đọc để nạp lại ngữ cảnh sau khi compact, luôn cập nhật trạng thái.

> **Ngoại lệ đã được chủ dự án phê duyệt cho iteration này (2026-09-17):** 7 task dưới đây chạy SONG SONG qua 7 agent trong worktree riêng, không theo hàng đợi tuần tự, vì đây là dự án cá nhân. Merge + commit dồn về một lần duy nhất ở cuối. Xem chi tiết ở `/Users/naniiluja/.claude/plans/t-i-mu-n-s-a-l-i-moonlit-giraffe.md`.

## Milestones

Iteration 2: giao diện đàng hoàng (sidebar/dashboard/danh sách project/lưới ảnh, dùng đúng shadcn), preset TikTok/YouTube, ảnh nhân vật/bối cảnh đồng bộ qua reference image, gen ảnh song song, skill viết kịch bản có quy trình.

> Trạng thái: `todo` / `in-progress` / `in-review` / `done` / `blocked`. Chu trình: `todo → in-progress → in-review → done`.
> Ghi trạng thái dưới dạng **chữ thường, không in đậm** (`in-review`, không phải `**in-review**`).
> Per-task detail nằm trong `task-NNN-*.md`.

| Task | Tên | Trạng thái | Predecessor |
|---|---|---|---|
| 008 | Sửa phụ đề: font tiếng Việt không bể | todo | không (song song) |
| 009 | Preset TikTok / YouTube xuyên suốt | todo | không (song song) |
| 010 | App shell: sidebar, dashboard, danh sách project | todo | không (song song) |
| 011 | Lưới ảnh: scene hiển thị dạng ô | todo | không (song song) |
| 012 | Skill viết kịch bản | todo | không (song song) |
| 013 | Ảnh tham chiếu: nhân vật/bối cảnh đồng bộ | todo | không (song song) |
| 014 | Gen ảnh song song trên một tab Flow | todo | không (song song) |
| 015 | (dự trữ) needs_user resume + dọn /api/samples + đo logo box 9:16 | todo | 008-014 (mở sau khi merge xong) |

> **Chỉ giữ iteration ĐANG chạy ở file này.** Khi mọi task của một iteration đều `done`, `/ccf:updatespec` chuyển nguyên phần đó sang `.claude/plan/ARCHIVE.md` và `git mv` các `task-NNN-*.md` vào `.claude/plan/archive/`. Một dòng đã đóng còn nằm ở đây vẫn bị hook session-start/Stop tính là việc đang mở, trong khi XÓA lịch sử sẽ mất bản ghi thật về những gì đã hoàn thành và vì sao. Vậy nên lưu trữ, không xóa.

<!-- Giữ phần hướng dẫn trạng thái TRÊN dòng này, không dưới "## Origin": việc lưu trữ nhóm nội dung từ một heading "## Origin" tới heading kế tiếp, chỉ phần văn bản TRƯỚC heading đầu tiên không bị cắt vào ARCHIVE.md. -->
