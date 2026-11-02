# Tellme stickers

Nguồn: bộ PNG nền trong suốt do chủ dự án cung cấp trong thư mục gốc `tellme-sticker/`, ngày 01/11/2026. Bản gốc được giữ trong thư mục nguồn; các bản dùng trên web được thu nhỏ còn 384 × 384 bằng `sips`, giữ kênh alpha.

| File trong ứng dụng | Hậu tố file gốc | Nội dung |
| --- | --- | --- |
| `tellme-hello.png` | `2026-1.png` | Chào nè |
| `tellme-okay.png` | `2026-2.png` | Okela |
| `tellme-haha.png` | `2026-3.png` | Haha |
| `tellme-thank-you.png` | `2026-4.png` | Cảm ơn nha |
| `tellme-sorry.png` | `2026-5.png` | Xin lỗi nhen |
| `tellme-wait.png` | `2026-6.png` | Đợi xíu |
| `tellme-love.png` | `2026-7.png` | Yêu nè |
| `tellme-good-night.png` | `2026-8.png` | Ngủ ngon |
| `tellme-please.png` | `Mascota xanh chắp tay đáng yêu.png` (02/11/2026) | Năn nỉ nè |

`tellme-please.png` giữ nguyên PNG 1254 × 1254 có alpha do người dùng cung cấp. Bản này xuất hiện trong modal ủng hộ, bộ chọn chat/bình luận và gợi ý “năn nỉ”, “làm ơn”, “please”, “ủng hộ”. Layout modal chỉ che vùng trong suốt thừa ở đầu ảnh bằng CSS, không sửa hình gốc.

## Bộ Bubu — 24 biểu cảm

Nguồn do người dùng cung cấp ngày 02/11/2026: `Bộ Sticker Mascot Trắng Đáng Yêu 24 Biểu Cảm.png`. Bản gốc có alpha được giữ tại `tellme-sticker/bubu/bubu-original-sheet.png`. Các file `bubu-*.png` trong thư mục này được cắt trực tiếp từ ảnh gốc theo thứ tự trái sang phải, trên xuống dưới, giữ hình vẽ và alpha gốc, thu vào canvas 384 × 384 có khoảng thở trong suốt.

| Hàng trong ảnh gốc | File theo thứ tự trái sang phải (tiền tố `bubu-`, đuôi `.png`) |
| --- | --- |
| 1 | `sparkle`, `hug-heart`, `haha`, `wink`, `okay`, `shy` |
| 2 | `cry`, `sleep`, `party`, `angry`, `surprised`, `thinking` |
| 3 | `love`, `please`, `sorry`, `tired`, `coffee`, `peek` |
| 4 | `work`, `gaming`, `cool`, `snack`, `music`, `hello` |

Picker dùng tab riêng **Tellme** / **Bubu**, tìm kiếm trong bộ đang chọn, có thể đổi tab bằng bàn phím. Gợi ý khi nhập tìm trên cả hai bộ; “cà phê”, “deadline”, “mệt”, “hóng”, “nghe nhạc”… sẽ gợi ý Bubu tương ứng. Chọn sticker vẫn chỉ thêm vào bản nháp, không tự gửi.

`ProfileJourney` dùng `hello` và `love` đứng trên hai cụm mây ở góc dưới khung; `wait` dùng ở trang chờ tháng tiếp theo. Cả bộ dùng chung trong trình chọn sticker và gợi ý theo từ khóa ở tin nhắn/bình luận.

## Thêm sticker về sau

1. Giữ ảnh gốc trong thư mục nguồn `tellme-sticker/` ở gốc dự án, đưa bản PNG/WebP tối ưu có nền trong suốt vào **thư mục này** (`apps/web/public/brand/stickers/`).
2. Đăng ký một mục trong **`packages/shared/stickers.mjs`**: id duy nhất, nhãn tiếng Việt, từ khóa và `packId` (mặc định `tellme`). Mặc định ảnh có tên `<id>.png`, kích thước 384 × 384; nếu ảnh khác định dạng/kích thước, bổ sung metadata cho mục đó. Để thêm bộ mới, thêm mục vào `TELLME_STICKER_PACKS` với id, nhãn và ảnh đại diện; picker tự tạo tab tương ứng.
3. Danh mục này được web và API dùng chung: nút chọn, tìm kiếm, gợi ý và kiểm tra dữ liệu gửi tự nhận sticker mới, không phải cập nhật riêng chat và bình luận.
4. Không đổi/xóa id hoặc đường dẫn đã phát hành để ảnh trong tin nhắn/bình luận cũ tiếp tục hiển thị.

Gợi ý chuẩn hóa chữ hoa/thường, dấu tiếng Việt và dấu câu; chỉ khớp từ/cụm từ đầy đủ, tối đa bốn sticker. Chọn sticker chỉ đính kèm vào bản nháp; người dùng bấm Gửi để đăng. Tin nhắn lưu `stickerId`; bình luận lưu media với metadata chuẩn của danh mục. API không nhận đường dẫn sticker tùy ý.
