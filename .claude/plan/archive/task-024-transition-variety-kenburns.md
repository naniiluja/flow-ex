# Task 024 — Chuyển cảnh đa dạng và Ken Burns có nhịp

**Trạng thái:** done
**Predecessor:** 023
**discipline:** on
**Chi tiết đầy đủ:** xem "Task 024" trong `/Users/naniiluja/.claude/plans/t-m-hi-u-xem-h-woolly-snowglobe.md`

## Vấn đề

- Mọi mối nối dùng cùng `crossZoomPresentation()` với `springTiming({damping: 200})`. Đo thật:
  **23 frame = 767ms**, và mọi damping từ 20 trở lên đều cho đúng 23 frame, nên damping không phải
  cần gạt để chỉnh nhịp.
- `safe-viewport.ts`: Ken Burns luôn zoom-vào, `interpolate` **tuyến tính không easing**, hệ số
  1.06 cố định, không đảo chiều giữa các scene.

Kết quả: một ảnh tĩnh đứng 7-16 giây với 6% zoom tuyến tính, rồi một transition y hệt nhau, lặp lại.

## Rút gọn so với kế hoạch: giữ chung MỘT thời lượng transition

Kế hoạch ban đầu định cho mỗi mối nối một thời lượng riêng, kéo theo việc đổi
`sceneFramesForTimeline` từ một số thành một mảng, và đổi luôn cửa sổ lấy mẫu pixel trong
`render-video.test.ts`.

**Đã bỏ.** Hai kiểu transition dùng chung đúng một thời lượng, nên `TRANSITION_FRAMES` vẫn là một
hằng số đo duy nhất, `sceneFramesForTimeline` không đổi chữ ký, và bất biến "calculateMetadata và
JSX phải suy ra frame từ cùng một nguồn" không bị đụng tới. Hiệu quả nhìn thấy không đổi, rủi ro
thấp hơn hẳn.

## Files thực tế đã chạm

- `video/src/compositions/transition-plan.ts` (mới, thuần) + test — `presentationKindForJoin`, nguồn
  sự thật duy nhất cho việc mối nối nào dùng kiểu nào.
- `video/src/compositions/soft-fade-presentation.tsx` (mới) + test — kiểu thứ hai, **viết tay bằng
  CSS transform**, không dùng bản dựng sẵn của `@remotion/transitions`. Chuyển động ngược dấu với
  cross-zoom: cross-zoom đẩy cảnh ra đi TỚI (scale > 1), soft-fade kéo nó LÙI (scale < 1).
- `video/src/timing/safe-viewport.ts` + test — thêm `KenBurnsDirection` (`"in"`/`"out"`) và
  `KEN_BURNS_EASING` (`Easing.inOut`). Biên độ 1.06 giữ nguyên.
- `video/src/compositions/main-composition.tsx` — `kenBurnsDirectionForScene` đảo chiều theo scene,
  và chọn presentation theo `presentationKindForJoin`.
- `be/src/render/render-video.test.ts` — lấy mẫu pixel cho **cả hai** mối nối, tại đúng frame pha
  trộn nhất.

## Giữ nguyên, có lý do

`KEN_BURNS_ZOOM_FACTOR = 1.06`, đã hạ từ 1.15 vào 2026-09-18 vì chính người dùng chê "phèn". Hướng
dẫn dựng phim phổ thông nói 100-200% nhưng đó là cho phim dài. **Chỉ đổi đường cong và chiều, không
đổi biên độ.**

Không dùng `fade()`/`slide()`/`wipe()` dựng sẵn của `@remotion/transitions`: dự án đã từng bị bản
`crossZoom` dựng sẵn render ra frame đen toàn bộ vì nó vẽ qua canvas WebGL2 mà Chrome headless
không có GPU context. Viết tay CSS thì không có rủi ro đó.

## Chứng minh assertion có răng, không phải xanh giả

Dự án từng có một assertion transition **xanh giả** vì lấy mẫu trượt 12 frame ra ngoài cửa sổ. Lần
này Rem không tin test chỉ vì nó xanh: đã **cố tình làm hỏng** `softFadePresentation` (ép
`opacity = 0`) và chạy lại — test **FAIL** đúng như phải thế, rồi khôi phục nguyên vẹn. Điểm lấy
mẫu thật sự nằm trong cửa sổ transition.

## Phát hiện thật: spring dồn gần hết chuyển động vào đầu

Đo trực tiếp `springTiming({damping: 200}).getProgress()` trên 23 frame:

| frame | 0 | 2 | 4 | 6 | 8 | 11 | 15 | 19 | 22 |
|---|---|---|---|---|---|---|---|---|---|
| tiến trình | 0.000 | 0.144 | 0.385 | 0.594 | 0.745 | **0.881** | 0.960 | 0.987 | 0.995 |

Tại frame 11, tức "điểm giữa" theo số học, tiến trình đã là **0,881** — cảnh mới đã đục 88%. Nghĩa
là:

1. Cách lấy mẫu cũ (`+ transitionFrames / 2`) thực ra đang soi phần ĐUÔI của transition, gần như
   không chạm vào vùng pha trộn. Đã đổi sang tìm frame có `getProgress` gần 0.5 nhất, suy từ chính
   đường cong thật chứ không đoán. Frame đó là **5**, không phải 11.
2. **Về cảm nhận, transition đọc như một cú cắt ~250ms chứ không phải 767ms.** Khoảng 500ms cuối là
   spring lắng, mắt không thấy. Muốn transition thật sự "đọc được" thì phải đổi sang `linearTiming`
   kèm easing để chuyển động trải đều. Đây là **quyết định về gu, để ngỏ cho người dùng**, không tự
   đổi trong task này.

## Render thật để soi mắt (người dùng đã đồng ý)

Copy không phá huỷ của project `3e0effe6` sang id mới `3f1bafb2-ad72-4cd6-ac6c-1d116223720a`,
căn chỉnh lại caption bằng thuật toán task 023, rồi render.

- Kết quả: `1080x1920`, h264, **1629 frame / 54,36s**, 60MB, render mất 153s.
- **5 trong 7 scene** được căn chỉnh lại số token; sau đó **cả 7/7 scene khớp chính xác kịch bản.**
- Soi frame thật: phụ đề đúng chính tả, dấu tiếng Việt sạch, từ đang đọc tô xanh `#39e75f`, font
  Inter đồng nhất, viền + đổ bóng đọc được trên nền rối.
- Soi frame pha trộn của cả hai mối nối: cả cross-zoom lẫn soft-fade đều hiện hai cảnh chồng nhau
  thật, không đen, không nhảy cắt.

**Giới hạn phải nói rõ:** audio trong bản render này được sinh TRƯỚC task 022, nên nó **chưa có**
khoảng nghỉ cuối câu. Muốn nghe được cải thiện giọng thì phải chạy lại TTS, việc đó tốn credit Vbee
nên chưa làm.

## Phát hiện phụ, KHÔNG sửa trong task này

Ở `fontSize: 96` với `maxWidth: 85%`, một dòng phụ đề dài chiếm tới ~930/1080px, chỉ còn ~75px lề
mỗi bên. Không bị cắt chữ, nhưng sát mép. Nghiên cứu best practice chỉ đưa ra vùng an toàn theo
CHIỀU DỌC của TikTok (đã đạt), không nói gì về lề ngang, nên không có căn cứ để đổi.

## Gate — ĐÃ XANH

- `pnpm test` (toàn repo): **68 file, 527 test, pass toàn bộ.**
- `npx eslint video/src be/src/render`: **sạch.**
- `npx prettier --check`: **đạt.**
- Test lấy mẫu pixel: cả 2 mối nối, tại frame pha trộn thật, và đã chứng minh FAIL khi transition hỏng.
