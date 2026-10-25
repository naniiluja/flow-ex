# Phim lemo-opuscar Caption News dọc (Shorts) có người dẫn

Áp cho phim bình luận dạng chữ to trên tranh, khung 9:16 (phim mẫu "Funny Valentine trong 2 phút",
`~/Developer/lemo-films/valentine-short`, 2026-10-25). Quy trình theo lemo-opuscar; giọng theo `voice-tuning.md`.

## Hình

- Vùng nút like/bình luận của Shorts (mép phải, nửa dưới) không đặt gì quan trọng: khung tròn người dẫn ở góc TRÊN
  phải, dưới thẻ tín dụng; khoảng dưới y 1560 chỉ để phụ đề lời nói.
- Tranh nhỏ (ảnh wiki 360-1000 px) là thẻ có viền trên nền chính nó làm mờ tối (không viền đen hai bên), không phóng
  quá 1,6x (manga) hay 2,5x (khung GIF). Tranh có chữ in sẵn (chữ Nhật trong GIF) thì bỏ, vẽ lại cảnh bằng code.
- Khối chữ đặt sát mép thì căn theo mép (`align: 'right'` ở x 1020), không đặt tâm gần mép: "THỨ 23" từng tràn mất số.
- Soát bằng still cả phim theo nhóm 8 khung trước khi render; mỗi lần sửa, render lại rồi cắt một khung từ mp4 cuối.

## Thời gian

- Mốc đo tay (khoảng lặng `silencedetect`, chỗ chữ tục, lúc nhạc vào lại) để trong `data/marks.json`, trang và
  `mix.py` cùng đọc; đổi giọng thì đo lại file đó, không sửa code.
- whisper gán sai mốc quanh chỗ chèn nghỉ: từ ngay sau chỗ chèn thì sửa tay theo cuối khoảng lặng đo được
  (`tools/fix_words.py`).
- Tiếng bíp: tìm chữ bằng cách whisper đoạn đầu câu cắt ở nhiều mốc; sau khi trộn, whisper lại bản trộn: nghe ra một
  phần chữ ("cái gì") là bíp ngắn quá, mất luôn chữ sau là dài quá.

## Tiếng và phụ đề

- Nhạc nền: bài miễn phí (Kevin MacLeod, incompetech.com, CC BY 4.0, ghi trong CREDITS), mỗi phần truyện một bài
  hợp không khí, đưa offset theo đồ thị độ to 4 giây; khoảng lặng vẫn dừng hẳn nhạc. Nhạc tự tổng hợp bị chê "xàm".
- Phụ đề lời nói không ngắt giữa từ ghép (cãi nhau, khăn tay, chôn sống...): ưu tiên ngắt trước hư từ (là, thì, mà...).
