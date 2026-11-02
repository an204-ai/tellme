# Ủng hộ Tellme

Mục đích: cho người dùng tự nguyện ủng hộ người phát triển mà không ngắt việc đọc/chụp/nhắn tin.

- Lần đầu vào Tell me now/Bảng tin, lời mời dạng modal chỉ hiện sau khi màn chào “Tell me now” kết thúc. Trạng thái hoàn tất được truyền từ `BrandIntro`, bao gồm kết thúc animation, bấm Vào Tellme/Escape hoặc giảm chuyển động; không dùng một khoảng chờ riêng để đoán thời điểm mở. Nút “Ủng hộ Tellme” căn giữa phần nội dung ở cả desktop và mobile. Không tự mở QR hoặc chuyển trang.
- Ghi cờ `tellme.support-invitation.v2` khi lời mời thực sự hiện sau màn chào. Không ghi cờ trong lúc intro còn chạy, không tự nhắc lại sau mỗi lần đăng nhập/chuyển tab. Chỉ lưu ở trình duyệt; chặn localStorage thì dùng cờ RAM cho phiên hiện tại.
- Khi modal/chuỗi/nhạc đang mở, lời mời tạm ẩn để không chen vào thao tác.
- Mở lại bằng `Ủng hộ Tellme` dưới tagline sidebar desktop hoặc menu tài khoản trên mobile/desktop. Khách có thể xem modal QR, không yêu cầu đăng nhập.
- Modal cho quét QR, sao chép số tài khoản và tải ảnh gốc; hướng dẫn chọn ảnh QR trong ứng dụng ngân hàng khi dùng cùng điện thoại. Không tự khởi tạo giao dịch hoặc đặt sẵn số tiền.

## Nguồn thông tin

Sticker chắp tay “Năn nỉ nè” (`public/brand/stickers/tellme-please.png`) đặt phía trên thông tin người nhận, không che QR hay nút thao tác. Ảnh PNG 1254 × 1254 có alpha do người dùng gửi ngày 02/11/2026 được giữ nguyên; CSS chỉ thu nhỏ và ẩn phần trong suốt dư phía trên. Cùng ảnh/id được đăng ký trong `packages/shared/stickers.mjs` cho kho sticker dùng chung.

`lib/support.ts` chứa thông tin người nhận công khai và đường dẫn ảnh, lấy từ ảnh người dùng cung cấp. Đổi tài khoản phải cập nhật cả thông tin lẫn QR cùng lúc. Không có key/env/backend mới; không thu thập tài khoản ngân hàng của người ủng hộ, không ghi donation vào DB.

`public/support/tellme-vietqr.jpg` sao chép nguyên file `IMG_1547.jpg` do chủ dự án cung cấp, giữ nguyên QR, tên, số tài khoản và logo. CSS giữ nguyên tỷ lệ ảnh 880 × 1040 để QR không bị cắt; tải xuống vẫn là ảnh gốc đầy đủ. Không tái tạo QR bằng công cụ sinh ảnh.

SHA-256 ảnh gốc/ảnh sử dụng: `5272f38f03b860d80a75838e8305920f15dc41505f32eaa9c8a7c7948d527d64` (153534 byte).
