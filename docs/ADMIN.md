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
| Tổng quan | Số tài khoản, bài viết, chuỗi ảnh và báo cáo chờ |
| Hạ tầng | Request trong phút trước, request API theo giờ trong 24 giờ gần nhất, RAM, đĩa, lưu trữ Cloudinary và kết nối dịch vụ |
| Người dùng | Tìm và lọc tài khoản, xem số liệu sử dụng, tạm khóa, mở khóa và thu hồi phiên |
| Nội dung | Tìm, xem, ẩn hoặc khôi phục bài viết, khoảnh khắc và bình luận |
| Báo cáo | Lọc, xem đối tượng, bỏ qua, ẩn nội dung hoặc tạm khóa tài khoản được báo cáo |

## Dữ liệu và giới hạn đo lường

- Biểu đồ đếm request HTTP của API trong bộ nhớ tiến trình, theo 24 khoảng 60 phút. Khi khởi động lại API, số liệu bắt đầu từ lần khởi động mới. Một request không tương ứng với một lượt xem trang hay một người dùng.
- Dung lượng đĩa phản ánh filesystem nhìn thấy từ container API. Cloudinary trả dung lượng của môi trường ảnh qua Admin API, cache 5 phút.
- Hạ tầng kiểm tra MongoDB Atlas, Redis, Cloudinary, GIPHY, OpenWeather và YouTube khi tích hợp có cấu hình. Trạng thái SMTP và Web Push phản ánh cấu hình. Kiểm tra GIPHY, OpenWeather và YouTube được gộp và cache 10 phút.
- Log vận hành đã lọc nằm ở stdout/container logs của Coolify. ID từ header `X-Request-Id` giúp đối chiếu request lỗi với log tương ứng.

## Tạm khóa và kiểm duyệt

Tạm khóa giữ nguyên dữ liệu, chặn tạo session và request được xác thực, thu hồi các session hiện có. Realtime đóng qua sự kiện thu hồi; kiểm tra lại session/tạm khóa tối đa mỗi khoảng 30 giây (cộng nhịp sweep) kể cả khi Redis Pub/Sub không sẵn sàng. Hết hạn cho phép đăng nhập lại; không khôi phục session cũ. Nội dung đã đăng vẫn theo quyền riêng tư và có thể kiểm duyệt riêng.

Nội dung có `moderation.hidden=true` bị loại khỏi truy vấn hiển thị, liên kết xem trực tiếp, bảng tin cache, bootstrap, tìm kiếm, hồ sơ và hành trình. Ẩn bình luận đồng thời ẩn mọi trả lời cấp dưới; không cho thêm trả lời hoặc cảm xúc vào bình luận đã ẩn. Khôi phục gốc vẫn tôn trọng trạng thái ẩn riêng của từng trả lời. Không xóa ảnh gốc khi kiểm duyệt. Luồng người dùng tự xóa nội dung vẫn giữ nguyên.

Các thao tác kiểm duyệt và tạm khóa vẫn lưu lý do trên bản ghi nghiệp vụ tương ứng. Xử lý báo cáo kiểm tra xung đột trong giao dịch. Worker vẫn chạy các tác vụ nghiệp vụ từ outbox.

## Dọn dữ liệu giám sát cũ một lần

Sau khi triển khai API và worker mới, xem trước rồi dọn các collection giám sát cũ theo [hướng dẫn triển khai](../infra/deploy/REGISTRY.md#dọn-dữ-liệu-giám-sát-cũ).

## Kiểm tra local

```sh
pnpm --filter @tellme/database build
pnpm --filter @tellme/admin build
pnpm --filter @tellme/api check-types
```
