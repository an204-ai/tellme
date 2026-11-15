# Tellme API

API Node/Hono dùng cookie phiên HttpOnly. Tất cả đường dẫn dưới `/api`. Actor được suy ra từ phiên, không lấy từ JSON gửi lên.

## Không gian bạn bè

| Endpoint | Hành vi |
| --- | --- |
| `GET /session` | Kiểm tra phiên trước khi render ứng dụng. Trả `{ authenticated: true }` với `Cache-Control: private, no-store`; 401 khi thiếu/không còn phiên, 403 khi bị khóa. |
| `GET /bootstrap` | Người đã đăng nhập nhận chính mình, bạn bè đã chấp nhận, ảnh được phép xem, hội thoại và lời mời. Khách hoặc phiên hết hạn nhận 401; không còn bootstrap dành cho khách. |
| `GET /friends/lookup?id=...` | Tìm đúng, đầy đủ Tellme ID; chấp nhận tiền tố `@` và chữ hoa rồi chuẩn hóa. Chỉ trả ID/tên/avatar, trạng thái quan hệ và ID lời mời nếu có. Không gợi ý tài khoản hoặc tìm theo tên. |
| `POST /friends/requests` | `{ tellmeId }`, tạo lời mời chờ. Không cấp quyền xem. Lời mời ngược chiều không tự động được chấp nhận. |
| `PUT /friends/requests/:id` | `{ accept: boolean }`; chỉ người nhận được chấp nhận hoặc từ chối. Chấp nhận tạo quan hệ hai chiều trong transaction. |
| `DELETE /friends/requests/:id` | Chỉ người gửi được hủy lời mời. |
| `DELETE /friends/:id` | Gỡ quan hệ hai chiều và lời mời còn lại trong transaction. |
| `GET /users/:username` | Chỉ chính chủ hoặc bạn bè hiện tại được xem hồ sơ, chỉ gồm danh tính, ảnh bìa và giới thiệu. |
| `GET /users/:id/journey?month=YYYY-MM` | Hành trình của chính chủ hoặc bạn bè, lọc quyền từng ảnh. |
| `PUT /users/:id/block` | `{ blocked }`; chặn thu hồi quyền xem/nhắn tin. Bỏ chặn không tự kết bạn trở lại. |

Lời mời đến/đã gửi nằm trong `bootstrap.friendRequests.incoming` và `.outgoing`: `{ id, person: { id, name, username, avatar }, at }`. Không trả tiểu sử/địa điểm/ngày sinh của tài khoản chưa kết nối. Người có trong lịch sử nhóm/chat có thể vẫn có danh tính tối thiểu để hiển thị lịch sử, nhưng không được mở hồ sơ hoặc ảnh.

Collection `friend_requests` giữ một lời mời cho mỗi cặp. Field `users.following` cũ được tận dụng nội bộ để lưu hai cạnh của quan hệ đã chấp nhận; client không còn nhận field `following`, không có API follow một chiều, danh sách follower/following hay gợi ý người lạ. Quan hệ hai chiều có sẵn tiếp tục được giữ; cạnh một chiều cũ không cấp quyền.

## Khoảnh khắc

| Endpoint | Hành vi |
| --- | --- |
| `GET /stories?cursor=0&limit=6&author=me` | Chuỗi ảnh của chính chủ/bạn bè; author tùy chọn là me hoặc ID bạn bè, lọc quyền trước phân trang. |
| `GET /stories/:id` | Một ngày được phép xem; chính chủ nhận cảm xúc đến. |
| `POST /stories/moments` | Ảnh vừa chụp thuộc media của người gửi; `storyPrivacy` chỉ nhận `connections` và có mặc định này. |
| `PUT /stories/:id/moments/:momentId/reaction` | `{ reaction }`: `like`, `love`, `haha`, `wow`, `sad`, một emoji Unicode dạng `emoji:🥹`, hoặc `null` để gỡ. API kiểm tra đúng một chuỗi emoji, bao gồm sắc độ da, cờ và ZWJ; không nhận văn bản tùy ý. Không được thả cảm xúc vào ảnh của mình. |
| `GET /stories/:id/moments/:momentId/reactions` | Chính chủ xem danh sách người thả cảm xúc. |
| `DELETE /stories/:id/moments/:momentId` | Chính chủ xóa một ảnh. |
| `DELETE /stories/:id` | Chính chủ xóa ngày ảnh. |

Bộ chọn quyền xem đã được gỡ. Nội dung cũ từng mang `public` cũng chỉ được API trả cho bạn bè hiện tại. Các ảnh/ngày `private` cũ vẫn chỉ hiện với chủ sở hữu. Thêm ảnh vào một ngày riêng tư cũ đánh dấu các ảnh cũ là riêng tư trước khi mở ngày đó cho ảnh bạn bè mới; không mở quyền ảnh cũ ngoài ý muốn.

Bộ emoji bàn phím dùng chung với chat. Tương tác cũ vẫn đọc được; `cheer`, `celebrate`, `appreciate`, `smile` được chuẩn hóa khi đọc.

## Ảnh và tin nhắn

- `POST /media/upload`: multipart `file`, xác thực loại file và chủ sở hữu; ảnh mới được lưu Cloudinary với delivery type `authenticated`.
- `GET /media/images/:key?size=thumbnail|feed`: kiểm tra phiên, chặn và tham chiếu ảnh được xem; proxy bytes ảnh với `Cache-Control: private, no-cache, must-revalidate`, ETag theo ảnh/kích thước/Accept/người xem và `Vary: Cookie, Accept`. Request có ETag khớp chỉ nhận304 sau khi đã kiểm tra lại phiên/quyền; không tải lại bytes Cloudinary. Không redirect hay trả URL có chữ ký Cloudinary ra trình duyệt. Avatar là danh tính tối thiểu của kết quả tìm đúng ID/lời mời; ảnh bìa và khoảnh khắc cần quyền xem tương ứng.
- Hội thoại/tin nhắn giữ các endpoint hiện tại. Trả lời trực tiếp dưới ảnh gửi `storyReply: { storyId, momentId }` vào hội thoại riêng và giữ nguyên màn ảnh; không điều hướng sau gửi.
- Báo cáo, chặn, nhạc, thời tiết, tài khoản, email bảo mật, push và quản trị vẫn được giữ.

Đã gỡ API kho lưu trữ, lưu/bỏ lưu/ẩn/hiện lại chuỗi ảnh và các field bootstrap tương ứng. Hồ sơ không còn số đếm hoặc các trường Một chút về mình; schema cập nhật hồ sơ chỉ ghi danh tính, giới thiệu, avatar/bìa.

Không còn API bài viết/Khám phá, tìm kiếm nội dung, follow một chiều, chỉnh đối tượng xem, danh sách follower/following.

Ảnh Cloudinary cũ cần bước chuyển delivery type khi triển khai; xem [hướng dẫn chuyển ảnh cũ](PRIVATE-MEDIA-ROLLOUT.md). Chỉ sửa code không thu hồi được bản CDN công khai đã tồn tại.

Kiểm tra hồi quy không kết nối dịch vụ thật: build `@tellme/database`, rồi chạy `pnpm --filter @tellme/api test:close-friends`.

Thông báo theo giờ/thời tiết đã tắt hoàn toàn. `/notifications/system` trả mảng rỗng để tương thích; inbox/unread chỉ tổng hợp tương tác người dùng, job `notification.system` cũ được drain mà không gửi.
