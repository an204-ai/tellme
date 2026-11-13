# Dọn dữ liệu khoảnh khắc mẫu — 14/11/2026

Đã thực hiện trên database `tellme` theo yêu cầu giữ ba khoảnh khắc để xem giao diện. Không tạo tài khoản, ảnh hay tin nhắn mới.

- Trước: 14 chuỗi, 25 ảnh. Sau: 3 chuỗi, 3 ảnh, cả ba 1200×900 (4:3).
- Đã gỡ 22 ảnh khỏi dữ liệu, 11 chuỗi rỗng, 5 thông báo và 6 job liên quan. Gỡ trích dẫn khoảnh khắc khỏi 3 tin nhắn, giữ nội dung chữ/hội thoại.
- Giữ ảnh còn dùng cho avatar/bìa/nhóm và ảnh mẫu đã chọn. 17 media chỉ dùng cho ảnh đã xóa đi qua cleanup kiểm tra tham chiếu hiện có; đã xác nhận hoàn tất cả 17.
- Snapshot dữ liệu nằm tại `backups/moment-trim-2026-11-14.json` (0600). 17 ảnh gốc được lưu trước khi xóa tại thư mục cùng tên thêm `.images` (0700; file 0600). Các backup bị Git bỏ qua, chứa dữ liệu riêng và không được đưa vào Git hoặc phục vụ qua web.
- Đã kiểm tra lại: đúng ba ảnh được chọn, không còn trích dẫn chat hoặc thông báo trỏ tới các ảnh đã xóa.

Script dọn một lần và fixture tạm đã được gỡ trước khi phát hành. Việc deploy không xóa ảnh mới.
