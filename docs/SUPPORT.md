# Ủng hộ Tellme

Mục đích: cho người dùng tự nguyện ủng hộ người phát triển mà không ngắt việc đọc/chụp/nhắn tin.

- Lần đầu vào Tell me now/Khám phá, sau khi trang có dữ liệu, hiện một lời mời nhỏ ở mép dưới. Trên mobile nó nằm trên thanh điều hướng. Có nút đóng; không tự mở QR hoặc chuyển trang.
- Ghi cờ `tellme.support-invitation.v1` khi lời mời đã hiện. Không tự nhắc lại sau mỗi lần đăng nhập/chuyển tab. Chỉ lưu ở trình duyệt; chặn localStorage thì dùng cờ RAM cho phiên hiện tại.
- Khi modal/chuỗi/nhạc đang mở, lời mời tạm ẩn để không chen vào thao tác.
- Mở lại bằng `Ủng hộ Tellme` dưới tagline sidebar desktop hoặc menu tài khoản trên mobile/desktop. Khách có thể xem modal QR, không yêu cầu đăng nhập.
- Modal cho quét QR, sao chép số tài khoản và tải ảnh gốc; hướng dẫn chọn ảnh QR trong ứng dụng ngân hàng khi dùng cùng điện thoại. Không tự khởi tạo giao dịch hoặc đặt sẵn số tiền.

## Nguồn thông tin

`lib/support.ts` chứa thông tin người nhận công khai và đường dẫn ảnh, lấy từ ảnh người dùng cung cấp. Đổi tài khoản phải cập nhật cả thông tin lẫn QR cùng lúc. Không có key/env/backend mới; không thu thập tài khoản ngân hàng của người ủng hộ, không ghi donation vào DB.

`public/support/tellme-donate-qr.jpg` sao chép nguyên file `IMG_1544.JPG` do chủ dự án cung cấp, giữ nguyên byte/pixel QR. CSS chỉ hiển thị phần chứa QR, tên, số tài khoản và logo trong khung vuông; tải xuống vẫn là ảnh gốc đầy đủ. Không tái tạo QR bằng công cụ sinh ảnh.

SHA-256 ảnh gốc/ảnh sử dụng: `27636a310e416e11add76cfed259552dce485d350f262b7aa1f41b9ce7a22e78` (172062 byte).
