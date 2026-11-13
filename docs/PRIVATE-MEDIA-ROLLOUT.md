# Chuyển ảnh cũ sang không gian bạn bè

Code mới đóng quyền đọc hồ sơ/khoảnh khắc tại API và lưu ảnh mới dưới Cloudinary delivery type `authenticated`, phục vụ qua endpoint kiểm tra phiên. Các URL CDN `upload` đã được tạo bởi bản cũ cần được chuyển riêng; chúng không tự đổi quyền khi deploy web.

Script `infra/scripts/privatize-moment-media.mjs` được chuẩn bị cho bước chuyển này. Script chưa được chạy trên production trong công việc viết giao diện.

## Thứ tự triển khai

1. Deploy đồng bộ API, web, admin và media worker mới. Dừng instance/worker bản cũ; không chạy script trong khi còn bản cũ ghi URL công khai hoặc xử lý media.
2. Build package database và kiểm tra đúng cấu hình môi trường/`MONGODB_DB`. Không in `.env` hay URL kết nối.
3. Chạy dry-run, mặc định chỉ đọc:

   ```sh
   node infra/scripts/privatize-moment-media.mjs --dry-run
   ```

4. Khi đã kiểm tra database và có bản sao lưu theo quy trình vận hành, chạy apply. Thay tên DB và đường dẫn backup bằng giá trị của môi trường đang triển khai:

   ```sh
   node infra/scripts/privatize-moment-media.mjs --apply --expect-db tellme --backup /secure/backups/tellme-private-media.jsonl
   ```

5. Kiểm tra ảnh của chính chủ/bạn bè, chặn/hủy kết bạn, ảnh trong trích dẫn chat, avatar/bìa và avatar nhóm. Chạy lại dry-run để xác nhận không còn media công khai đang được tham chiếu.

## Bảo toàn dữ liệu

Script chỉ đổi delivery type của ảnh cũ đang được tham chiếu, yêu cầu Cloudinary invalidate và cập nhật tất cả URL trong stories, avatar/bìa, avatar nhóm, media trong một transaction cho từng ảnh. Không xóa nội dung hay tài khoản. Quyền `private` cũ của ngày/ảnh được giữ.

Mỗi thay đổi được ghi vào backup JSONL với quyền file `0600` trước khi gọi dịch vụ ảnh. Backup chứa URL/ID tài sản: giữ ở nơi riêng tư. Nếu một lượt bị gián đoạn sau bước Cloudinary, có thể chạy lại với một file backup mới; script kiểm tra asset đã chuyển để tiếp tục. Không đổi ảnh trở lại public chỉ để khôi phục URL cũ.

CDN invalidation là bất đồng bộ, cần thời gian lan truyền. Không mô tả các link CDN cũ là đã bị thu hồi hoàn toàn trước khi bước chuyển và invalidation thực sự hoàn tất. Các bản sao đã được người xem tải xuống không thể bị thu hồi bởi ứng dụng.
