# Task 021 — Tích hợp ImageGen của Codex qua MCP

**Trạng thái:** done
**Ngày lập:** 2026-09-19
**Predecessor:** kiểm tra tương thích với MCP hiện có của task 016-020; giữ nguyên các thay đổi đang làm của người dùng.
**Phạm vi hiện được yêu cầu:** triển khai đang thực hiện; các lát cắt A–E đã có mã nguồn và kiểm thử mục tiêu, lát cắt F còn chờ smoke test HTTP/ImageGen ngoài sandbox.

## Mục tiêu và quyết định

Cho phép tạo video bằng ảnh do ImageGen tích hợp trong phiên Codex sinh ra. Codex điều phối tạo ảnh, nhập ảnh qua MCP, duyệt và khởi chạy pipeline. Backend flow-ex quản lý dữ liệu, tạo giọng đọc, phụ đề và MP4.

- Thêm lựa chọn theo dự án `imageSource: "flow" | "codex"`; thiếu trường này dùng `flow` để tương thích kịch bản cũ. Chế độ fake vẫn là cấu hình môi trường phục vụ test, không phải lựa chọn sản phẩm mới.
- Dùng ImageGen tích hợp; không cần thêm OpenAI API key cho hướng này. Backend không gọi ngược công cụ ImageGen của phiên chat. Nếu Codex không có công cụ tạo ảnh, hiển thị bước đang chờ; không tự chuyển sang API trả phí hay Flow.
- Bản đầu hỗ trợ Codex và backend cùng máy, cùng truy cập workspace. Codex chuyển artifact thật vào vùng nhập của dự án trước khi gọi MCP. Không giả định tool có tham số chỉ định đường dẫn đầu ra.
- Xác nhận khả năng lấy artifact của công cụ hiện có bằng lát cắt A trước khi triển khai phần còn lại. Nếu tool chỉ trả ảnh trong hội thoại, phải xác định cách xuất artifact được hỗ trợ; không suy đoán đường dẫn hay endpoint nội bộ.
- Giữ lựa chọn Google Flow; dự án mới chọn Codex rõ ràng. Một dự án dùng một nguồn ảnh trong bản đầu, không đổi nguồn giữa chừng.
- Tạo ảnh tham chiếu nhân vật/bối cảnh trước ảnh cảnh. Đọc ảnh tham chiếu thật khi gọi ImageGen; mô tả bằng chữ không thay thế việc cung cấp ảnh.
- Bản đầu không gồm tự gọi Codex từ nút web, hàng đợi tạo ảnh khi không có phiên Codex, API tạo ảnh độc lập, hoặc sửa ảnh của video đã hoàn thành.

## Cơ sở từ mã nguồn

- `be/src/domain/providers.ts` có `ImageProvider` với ảnh cảnh và ảnh tham chiếu. `select-providers.ts` hiện chỉ chọn Flow/fake theo môi trường.
- MCP có 8 tool. `get_status` chỉ trả trạng thái; chưa đủ prompt và thông tin tham chiếu để tiếp tục tạo ảnh sau khi mất ngữ cảnh.
- Pipeline sinh references trước, rồi ảnh cảnh, audio, captions, render. `approve_scene` chỉ chuyển trạng thái; cần gọi `start_render` sau khi duyệt để tiếp tục.
- `ProjectStore` ghi atomic và tuần tự hóa update theo dự án. Import phải đi qua store, không sửa trực tiếp `project.json` bằng shell.
- `main-composition.tsx` đang áp dụng `ASSUMED_LOGO_BOX` cho mọi ảnh. Ảnh Codex cần viewport riêng để tránh bị crop theo vùng watermark của Flow.
- `schemaVersion` hiện là 2. Danh sách công việc có mục còn `in-progress`/`in-review`; không tự coi chúng đã hoàn tất chỉ vì có file triển khai.

## Luồng sử dụng

1. Thống nhất kịch bản/phong cách, gọi `create_project` với `imageSource: "codex"`.
2. Gọi `get_image_tasks`, tạo và nhập các ảnh tham chiếu còn thiếu.
3. Gọi lại `get_image_tasks`, tạo ảnh cảnh với các ảnh tham chiếu đã nhập; nhập từng ảnh ngay sau khi tạo.
4. Khi đủ ảnh, gọi `start_render`. Nếu bật duyệt, pipeline đưa cảnh về `awaiting_review`.
5. Duyệt bằng `approve_scene`; nếu cần phương án mới, Codex tạo ảnh mới rồi gọi `import_scene_image`, sau đó chọn variant để duyệt.
6. Gọi `start_render` để tiếp tục audio → captions → render. Theo dõi bằng `get_status`/`get_logs`, lấy MP4 bằng `get_output`.

Nếu tắt duyệt, bước 4 chạy tới MP4. Nếu bị ngắt khi đang tạo ảnh, gọi lại `get_image_tasks` để tiếp tục những ảnh thiếu. Ảnh đã nhập nằm trong dự án nên không cần sinh lại.

## Hợp đồng MCP dự kiến

Thêm 3 tool, tổng dự kiến từ 8 lên 11. Tên và schema dưới đây là thiết kế cần triển khai, chưa phải tool đang hoạt động.

| Tool | Input chính | Output/hành vi |
| --- | --- | --- |
| `get_image_tasks` | `projectId`, bộ lọc target/trạng thái, phân trang | Read-only; trả target, prompt đã chuẩn hóa, aspect ratio mong muốn, references, đường dẫn/URL ảnh tham chiếu, revision, trạng thái thiếu/đủ/bị chặn và thư mục nhập. Có thể lấy lại prompt của cảnh đang duyệt để tạo variant. |
| `import_reference_image` | `projectId`, `referenceId`, `stagedFile`, `expectedRevision` | Nhập ảnh tham chiếu hợp lệ; trả đường dẫn asset và metadata để dùng cho các cảnh phụ thuộc. |
| `import_scene_image` | `projectId`, `sceneIndex`, `stagedFile`, `expectedRevision` | Nhập ảnh cảnh, thêm variant và chọn ảnh vừa nhập; trả metadata/variant index. Retry cùng nội dung không tạo variant trùng. |

Điều chỉnh tool hiện có:

- `create_project`: nhận và lưu `imageSource`; giữ logic phong cách đã thống nhất, không tự thêm phong cách chỉ vì chọn Codex.
- `get_status`: bổ sung nguồn ảnh, số ảnh/reference thiếu, số cảnh chờ duyệt và `nextAction`; giữ các trường hiện có. Không nhét toàn bộ prompt vào phản hồi trạng thái.
- `start_render`: với Codex, kiểm tra đủ ảnh và file còn tồn tại trước khi chạy nền. Thiếu ảnh trả lỗi có cấu trúc `IMAGES_REQUIRED` cùng danh sách target thiếu; không đặt dự án thành failed hay chạy Vbee.
- `regenerate_scene`: Flow vẫn hoạt động như cũ. Codex trả lỗi có hướng dẫn `EXTERNAL_IMAGE_GENERATION_REQUIRED`; dùng ImageGen rồi import. Không trả thành công nếu chưa tạo được ảnh mới.
- Cập nhật mô tả MCP/prompt để agent hiểu thứ tự references → scenes → review → render và biết phải gọi lại `start_render` sau khi duyệt.

## Dữ liệu, lưu ảnh và trạng thái

- Nâng schema lên v3 với migration tuần tự v1 → v2 → v3; bảo toàn preset, dữ liệu ảnh, âm thanh, captions và trạng thái cũ. Không chỉ đổi số version để bỏ qua migration trung gian.
- Lưu `imageSource` ở project. Với asset/variant mới, lưu source, checksum, kích thước đọc từ file, revision và dấu vết prompt/reference dùng để tạo. Khi chọn variant, metadata render phải khớp variant được chọn.
- Vùng nhập: `projects/<id>/image-inbox/`, nằm ngoài subtree `/assets` được phục vụ qua HTTP. `stagedFile` chỉ là đường dẫn tương đối trong vùng này. Tên asset đích do backend quyết định; ảnh cuối nằm trong `assets/images/` hoặc `assets/references/`.
- Kiểm tra containment sau khi resolve/realpath; chặn traversal, symlink thoát vùng nhập, file không hợp lệ, SVG và ảnh động. Ban đầu nhận PNG/JPEG/WebP tĩnh; giới hạn đề xuất 20 MiB và 25 megapixel, kiểm tra trước giải mã đầy đủ. Đo kích thước thực tế, không tin extension hay kích thước client gửi.
- Cùng target + checksum + revision trả kết quả cũ, không nhân bản variant; khác nội dung tạo file mới. Lưu asset trước rồi cập nhật metadata atomic: nếu ngắt giữa hai bước có thể còn file mồ côi nhưng không có metadata trỏ tới file chưa tồn tại. Retry tái sử dụng asset hợp lệ.
- Revision được backend tính từ prompt, nguồn ảnh, aspect ratio và checksum các reference liên quan. Import với revision cũ bị từ chối; không gắn ảnh vào target đã thay đổi.
- Scene pending vẫn pending sau khi nhập lần đầu; bước image của pipeline đọc ảnh đã nhập rồi chuyển trạng thái bằng state machine hiện có. Không cần thêm trạng thái scene chỉ để biểu diễn chờ Codex.
- UI hiển thị “Chờ ảnh từ Codex” từ readiness được backend tính. Dự án chưa chạy vẫn `idle`; không báo failed vì đang chờ người dùng/agent cung cấp ảnh.
- Import variant chỉ cho scene pending hoặc awaiting_review và không có run đang hoạt động. Sau khi approve/đã có audio hoặc dự án hoàn thành, yêu cầu tạo dự án mới trong bản đầu; không âm thầm làm mất hiệu lực output.
- Chỉ thay reference trước khi có ảnh cảnh phụ thuộc. Retry cùng ảnh được phép; thay reference đã được dùng bị từ chối rõ ràng để tránh cảnh cũ và mới dùng nhân vật khác nhau.
- Dùng cùng cơ chế khóa theo dự án cho import, approve và khởi chạy: kiểm tra trạng thái, mutation và đặt `activeRuns` không được tranh chấp. Khóa metadata ngắn; không giữ khóa trong suốt thời gian tạo ảnh bên ngoài. Bản đầu giữ mô hình một backend ghi dự án.
- Sau import phát sự kiện cập nhật asset để FE invalidate cache, kể cả khi chưa có `runId`. Không giả phát sự kiện chuyển trạng thái scene nếu trạng thái không đổi.

## Pipeline và hiển thị video

- Thêm `ImportedImageProvider` đọc ảnh đã nhập, không gọi mạng. Việc chọn provider phải dựa trên project cho cả MCP, HTTP render và đường regenerate; không chỉ sửa một handler.
- Preflight chạy chung cho MCP/HTTP trước mọi công việc trả phí. Kiểm tra lại asset tại điểm sử dụng để lỗi file bị xóa sau preflight được báo rõ.
- Reference phase dùng ảnh đã nhập. Image step không thêm lại variant đã có mỗi lần resume; kiểm thử rõ hành vi này vì pipeline hiện tự append kết quả provider.
- Giữ logic audio/captions/render và khả năng resume. Lỗi import hoặc ImageGen không được làm mất kết quả ảnh đã có.
- Truyền chính sách viewport từ ảnh được chọn tới cả Remotion Player và SSR: Flow dùng hành vi hiện tại; Codex dùng cover căn giữa và Ken Burns, không áp vùng né watermark Flow. Thiếu metadata ở dự án cũ giữ hành vi cũ.
- Yêu cầu aspect ratio trong prompt nhưng không giả định ImageGen luôn trả kích thước chính xác. Dùng kích thước thật, preview crop 9:16/16:9 và giữ bố cục chủ thể trong vùng an toàn.
- UI tạo dự án có lựa chọn nguồn ảnh; trang cảnh hiển thị ảnh thiếu/đã nhập, preview và variants. Với Codex, nút sinh lại giải thích cần tạo ảnh trong Codex thay vì gọi Flow. Chỉ bật chạy khi đã đủ ảnh; server vẫn kiểm tra độc lập.

## Lát cắt triển khai tuần tự

Mỗi lát cắt gồm thay đổi xuyên các tầng cần thiết và kiểm thử hành vi của chính lát cắt đó. Hoàn tất một lát cắt trước khi bắt đầu lát tiếp theo.

| Bước | Kết quả bàn giao | Điều kiện đạt |
| --- | --- | --- |
| A — Xác minh artifact và một cảnh | Xác minh tạo ảnh thật khi bước triển khai được yêu cầu; thêm nguồn ảnh, migration, import ảnh cảnh, provider, MCP, lựa chọn FE và viewport tối thiểu. Một project Codex không reference, tắt duyệt chạy được qua fixture. | File thật có thể lưu vào workspace; ảnh import xuất hiện trong giao diện và MP4 fixture; Flow không được gọi; dự án v1/v2 vẫn đọc được. |
| B — Danh sách việc và resume | `get_image_tasks`, readiness, preflight chung MCP/HTTP, import idempotent, revision và lỗi có cấu trúc. | Dự án nhiều cảnh thiếu ảnh không gọi TTS; dừng/khởi động backend rồi tiếp tục không mất ảnh hoặc thêm variant trùng. |
| C — Nhân vật/bối cảnh | `import_reference_image`, thứ tự dependencies, reference metadata và hướng dẫn truyền ảnh tham chiếu thật sang ImageGen. | Scene phụ thuộc chỉ sẵn sàng tạo khi references đủ; chặn reference/revision lỗi; không cần Flow để tạo nhân vật. |
| D — Duyệt và tạo lại | Import variant khi chờ duyệt, chọn ảnh, khóa trạng thái, SSE cập nhật asset và hành vi nút FE tương ứng. | Hai variant khác nhau chọn được; ảnh đã approve không bị import ghi đè; approve và render tiếp đúng quy trình. |
| E — Quy trình agent | Cập nhật MCP descriptions/prompt và tài liệu sử dụng với ví dụ JSON, 3 tool mới, cách lưu artifact, giới hạn cùng máy và cách tiếp tục sau gián đoạn. | Một phiên mất ngữ cảnh có thể đọc trạng thái/task để tiếp tục; phiên không có ImageGen nhận hướng dẫn đúng; không yêu cầu API key cho luồng tích hợp. |
| F — Xác minh toàn tuyến | Kiểm thử hồi quy, render pixel checks và smoke thật bằng ImageGen khi thực hiện triển khai; ghi kết quả vào task. | 1 reference + 2 cảnh, trong đó một cảnh có variant mới; duyệt → MP4; ảnh/voice/captions đúng, preview và render cùng crop. |

Nhóm file dự kiến: `packages/shared-schemas/src/`, `be/src/store/`, `be/src/pipeline/`, `be/src/providers/select-providers.ts`, provider nhập ảnh mới, `be/src/mcp/{server,tools,prompts}/`, HTTP routes liên quan, FE tạo/cảnh/duyệt và hooks SSE, `video/src/compositions/` và `video/src/timing/`. Tách business logic import/readiness thành service dùng chung; handlers chỉ validate và gọi service.

## Kiểm thử và tiêu chí hoàn tất

- Schema/migration: script cũ, v1/v2, v3 Codex, dữ liệu hỏng, variant metadata và chọn lại variant cũ.
- Import: target không tồn tại, thiếu file, sai ảnh, giới hạn byte/pixel, path traversal/symlink, retry trùng, revision cũ và cập nhật đồng thời với approve/start.
- Pipeline: đủ/thiếu reference và scene, review bật/tắt, restart, file biến mất, không gọi Flow trong Codex mode, không gọi TTS trước khi ảnh đủ; không nhân đôi variant khi resume.
- MCP integration qua client thật: 11 tool, đúng schema và structured errors, giữ 8 tool cũ hoạt động; MCP và HTTP áp dụng cùng readiness/lock.
- FE: chọn nguồn, chờ ảnh, asset event trước runId, cập nhật variant dù trạng thái scene không đổi, duyệt, resume, cảnh báo khi thao tác bị từ chối.
- Render: ảnh dọc/ngang với kích thước thực; kiểm pixel tại đầu/giữa/cuối và trong transition để phát hiện crop sai, khung đen hoặc trailing frames. Giữ test safe viewport cho Flow.
- Chạy test từng package bị tác động, typecheck, lint và kiểm tra định dạng theo cấu hình repo. Ở gate cuối chạy `pnpm test` và coverage ngưỡng hiện có cho pipeline/timing. Không coi kiểm tra số frame đơn thuần là đủ.
- Test tự động dùng fixture ảnh + fake TTS/transcription, có render MP4 thật. Smoke ImageGen thật chạy riêng trong giai đoạn triển khai, không gọi dịch vụ tạo ảnh trong CI và không tạo ảnh trong lượt chỉ lập kế hoạch này.
- Hoàn tất khi agent có thể tạo project Codex, nhập ảnh/reference, tạo lại và duyệt một cảnh, khởi động lại backend rồi tiếp tục tới MP4 mà không chạy Google Flow; dữ liệu và luồng Flow hiện có vẫn qua hồi quy.

## Tham chiếu

- [OpenAI: Image generation](https://learn.chatgpt.com/docs/image-generation?surface=cli) — khả năng tạo ảnh trong Codex và hạn mức sử dụng.
- [OpenAI: MCP](https://developers.openai.com/codex/mcp) — kết nối Codex tới MCP server.
- Kiểm tra giao diện tool thực tế khi triển khai; khả năng tạo ảnh của phiên không đồng nghĩa backend có API gọi tool nội bộ.
