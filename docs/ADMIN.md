# Quản trị Tellme

Ứng dụng React/Vite tại `apps/admin`, API tại `apps/api/src/modules/admin`. Mở `http://127.0.0.1:3001` khi chạy môi trường phát triển. Giao diện dùng cùng nhận diện Tellme, ưu tiên bảng dữ liệu và thao tác rõ ràng, không có intro trước khi vận hành.

## Tài khoản quản trị riêng

1. Tạo tài khoản Tellme trên ứng dụng chính và xác thực email bằng luồng hiện có. Mật khẩu do chủ tài khoản tự đặt; không có mật khẩu quản trị mặc định.
2. Thêm email đã chuẩn hóa vào `ADMIN_EMAILS` trong `.env` gốc, ngăn bằng dấu phẩy nếu có nhiều quản trị viên. Khởi động lại API sau khi đổi môi trường. Không đưa `.env` lên Git.
3. Đặt `ADMIN_APP_URL` đúng origin quản trị, `APP_URL` đúng ứng dụng chính và proxy `/api` tới API nội bộ. Đăng nhập quản trị bằng tài khoản riêng đó. Email chưa xác thực chỉ đọc được `/admin/me`, chưa đọc được dữ liệu quản trị.

Cấp quyền bằng cấu hình server; không có nút tự nâng quyền trong giao diện. API kiểm tra allowlist và email đã xác thực ở mỗi request. Không thể khóa/thu hồi phiên của chính mình hoặc tài khoản quản trị khác bằng trang quản lý người dùng. Session HttpOnly, kiểm tra origin và giới hạn thao tác quản trị 30 lần/phút áp dụng ngoài giới hạn API chung.

## Các khu vực

| Khu vực | Chức năng |
| --- | --- |
| Tổng quan | Tổng số tài khoản, bài viết, chuỗi ảnh, báo cáo chờ; trạng thái worker và outbox; liên kết tra cứu |
| Hạ tầng | Uptime/phiên bản API, RAM tiến trình/máy, CPU/load, đĩa của máy/container API, ping MongoDB/Redis, dung lượng MongoDB khi được cấp quyền đọc dbStats, heartbeat worker, số job BullMQ, cấu hình tích hợp, yêu cầu dựng lại bảng tin |
| Log server | Log ứng dụng API/worker theo mức độ, dịch vụ, thời gian 1–168 giờ, request ID/route/sự kiện/job; phân trang và bật/tắt cập nhật |
| Tác vụ nền | Lọc trạng thái/nhóm, số lần thử và thời gian; tra log; chạy lại job đã lỗi sau retry tự động |
| Người dùng | Tìm tên/username/ID/email; lọc xác thực/tạm khóa; chi tiết mức sử dụng, phiên còn hạn, lịch sử quản trị; khóa 1/7/30 ngày hoặc đến khi mở, mở khóa, thu hồi phiên |
| Nội dung | Bài viết, Tell me now, bình luận; tìm lời kể, lọc tác giả/trạng thái; xem đầy đủ nội dung/ảnh; ẩn hoặc khôi phục |
| Báo cáo | Lọc loại/trạng thái, xem đối tượng, bỏ qua, ẩn nội dung hoặc tạm khóa tài khoản được báo cáo; chống xử lý trùng |
| Sử dụng ứng dụng | Biểu đồ và bảng 7/30/90 ngày; đăng ký, hoạt động, bài viết, chuỗi ảnh, khoảnh khắc, bình luận, số tin gửi; CSV, xác thực email, phiên, bản ghi ảnh |
| Nhật ký quản trị | Tra ai đã thao tác, thời điểm, đối tượng và lý do; chỉ đọc, không có API sửa/xóa nhật ký |

## Dữ liệu và giới hạn đo lường

- Log mới được tạo từ khi triển khai phần ghi log; không nhập ngược stdout/container log cũ. Log HTTP chứa route mẫu, mã request sinh ở server, method/status/thời gian; log worker có loại/mã lỗi và job ID. Không thu query string, header, body, cookie, token, nội dung trò chuyện hoặc error/stack thô. Chỉ nhận metadata theo schema cố định.
- `server_logs` có TTL 7 ngày, ghi theo lô 100 mỗi 2 giây, bộ đệm tối đa 500 bản ghi/tiến trình. Mất kết nối DB sẽ thử ghi lại trong giới hạn bộ đệm; restart tiến trình hoặc quá tải có thể làm mất log chưa ghi. Stdout vẫn có sự kiện/cảnh báo/lỗi chuẩn hóa. Đây là log ứng dụng, không phải trình đọc journald/Docker hay shell từ trình duyệt.
- Mã `X-Request-Id` do API sinh mới giúp liên kết lỗi và log. Request quản trị thành công không ghi lại vào log HTTP để tránh vòng lặp khi polling. Lỗi truy cập vẫn ghi nhận. Request metrics là bộ đếm trong tiến trình API, cửa sổ 15 phút, reset khi API khởi động lại; không cộng dồn nhiều replica.
- Hoạt động người dùng ghi theo ngày Việt Nam, tối đa một bản ghi/user/ngày trong `activity_days`, giữ 365 ngày. `lastActiveAt` cập nhật tối đa mỗi 5 phút. Định nghĩa là tài khoản có request xác thực (gồm polling), không phải lượt truy cập, thời gian dùng hay online hiện tại. Ngày trước khi có ghi nhận để trống, không giả định bằng 0. Không có dữ liệu lịch sử trước khi triển khai bộ theo dõi.
- Thống kê bài/chuỗi/bình luận/tin nhắn tổng hợp từ bản ghi còn lưu; không tính lại nội dung đã xóa. Tin nhắn chỉ đếm số bản ghi, không trả nội dung. Phiên còn hạn không đồng nghĩa đang online. Số ảnh là bản ghi media, không phải dung lượng/tổng hóa đơn nhà cung cấp.
- SMTP, Web Push, Cloudinary, Giphy, thời tiết và nhạc chỉ báo có cấu hình; không khẳng định nhà cung cấp hoạt động. Thống kê CPU/RAM/đĩa là máy/container của API; không thay thế giám sát host khác. dbStats thiếu quyền sẽ hiện không có số liệu.
- Admin phụ thuộc xác thực MongoDB. Khi MongoDB hoặc API không phục vụ được, cần dùng health check/log triển khai ở hạ tầng ngoài ứng dụng. Trang không có chức năng thực thi shell, sửa bí mật môi trường, khởi động lại host hoặc tự động khôi phục backup.

## Tạm khóa và kiểm duyệt

Tạm khóa giữ nguyên dữ liệu, chặn tạo session và request được xác thực, thu hồi các session hiện có. Realtime đóng qua sự kiện thu hồi; kiểm tra lại session/tạm khóa tối đa mỗi khoảng 30 giây (cộng nhịp sweep) kể cả khi Redis Pub/Sub không sẵn sàng. Hết hạn cho phép đăng nhập lại; không khôi phục session cũ. Nội dung đã đăng vẫn theo quyền riêng tư và có thể kiểm duyệt riêng.

Nội dung có `moderation.hidden=true` bị loại khỏi truy vấn hiển thị, liên kết xem trực tiếp, bảng tin cache, bootstrap, tìm kiếm, hồ sơ và hành trình. Ẩn bình luận đồng thời ẩn mọi trả lời cấp dưới; không cho thêm trả lời hoặc cảm xúc vào bình luận đã ẩn. Khôi phục gốc vẫn tôn trọng trạng thái ẩn riêng của từng trả lời. Không xóa ảnh gốc khi kiểm duyệt. Luồng người dùng tự xóa nội dung vẫn giữ nguyên.

Mỗi thao tác thay đổi cần lý do 5–500 ký tự. Bản ghi `admin_audit` được ghi cùng transaction với thay đổi MongoDB; nếu ghi nhật ký thất bại, thay đổi cũng không commit. Xử lý báo cáo có kiểm tra xung đột; job chỉ được retry ở trạng thái lỗi. Dispatcher xử lý lại BullMQ theo outbox, không chạy đè job đang hoạt động. Job dựng bảng tin được gộp theo phút. Không có API quản trị đọc nội dung chat riêng.

## Kiểm tra và QA

```sh
pnpm --filter @tellme/database build
pnpm --filter @tellme/admin build
pnpm --filter @tellme/api check-types
pnpm --filter @tellme/api test:admin
```

`test:admin` dùng kết nối MongoDB đã cấu hình nhưng luôn tự tạo tên DB ngẫu nhiên `tellme_admin_qa_*`, tài khoản/session giả và dọn DB đó khi kết thúc. Cần quyền tạo/xóa DB QA; không dùng tài khoản người thật. Test không bật dispatcher hoặc worker và không gửi email/push, không gọi xử lý Cloudinary.

Xem giao diện QA với dữ liệu minh họa:

```sh
pnpm --filter @tellme/api exec node --import tsx tests/admin-preview.ts
API_INTERNAL_URL=http://127.0.0.1:4111 pnpm --filter @tellme/admin exec vite --host 127.0.0.1 --port 3111 --strictPort
```

Trang QA tại `http://127.0.0.1:3111` có banner dữ liệu thử. Tài khoản fixture chỉ tồn tại trong DB QA; thông tin đăng nhập được in bởi script preview. Dừng API preview bằng Ctrl+C để dọn DB thử, rồi dừng Vite QA. Cổng ứng dụng thật 3000/3001/4000 không đổi.
