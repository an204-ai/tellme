# Optimistic mutations và trạng thái chat

## Cơ chế cache

`apps/web/src/lib/optimistic-mutation.ts` quản lý journal riêng cho mỗi QueryClient.
Dữ liệu hiển thị = dữ liệu server + các phép biến đổi đang chờ, theo thứ tự thao tác.
Thao tác thất bại chỉ bị loại khỏi journal; các thao tác còn lại được áp lại trên dữ liệu mới nhất.
Không phục hồi nguyên snapshot cũ.

- `scope`: tất cả thao tác ghi cùng một thực thể phải dùng cùng scope. Bài viết và bình luận của nó dùng `post:<id>`; các khoảnh khắc dùng `story:<id>`.
- `matches`: chỉ những cache chứa dữ liệu liên quan.
- `apply`: phép biến đổi bất biến, idempotent, giữ reference của phần không đổi. Tin nhắn thêm theo ID, không thêm trùng.
- `execute`: thực hiện request; cùng scope chạy tuần tự, khác scope chạy song song.
- `reconcile`: hợp nhất kết quả server vào dữ liệu nền, trước khi áp lại thao tác mới hơn.
- Refetch đang chạy được hủy khi nhận kết quả ghi để response cũ không đè lên kết quả mới.
- Trong lúc chờ, fetch mới được rebase với journal; cache edit thủ công từ realtime được merge theo phần thay đổi. Mảng thực thể cần ID ổn định.
- Journal, subscription và hàng đợi được giải phóng khi không còn thao tác.

Đã áp dụng cho reaction bài viết/bình luận/khoảnh khắc, gửi tin, và xác nhận đọc.
Các thao tác tải ảnh, xóa tài khoản, quản trị và các thay đổi phụ thuộc xác thực server vẫn dùng luồng hiện có.
Không tự động retry các lệnh ghi có thể gây tác dụng phụ trùng lặp.
Không đưa tùy ý mọi `useCommunity.update` vào optimistic: luồng đó còn dùng repository snapshot và diff nhiều tài nguyên.
Khi bổ sung tương tác, dùng command riêng và scope của thực thể, không thay toàn bộ AppData.

## Chat realtime

Tiếp tục dùng WebSocket đã xác thực và Redis Pub/Sub hiện có. Fanout tra theo chỉ mục user → socket, không quét toàn bộ kết nối cho mỗi lần gõ/tin nhắn. Không thêm socket, queue, collection hoặc dịch vụ mới.

- `chat.watch`: mỗi tab đăng ký cuộc trò chuyện đang xem và các hàng inbox đang hiển thị (tối đa 16 ID mỗi socket); typing chỉ được chuyển tới các socket có đăng ký và thuộc audience được server xác thực. Cập nhật danh sách đăng ký không hủy lease đang soạn nếu cuộc trò chuyện đang mở không đổi.
- `chat.typing`: gửi ngay lần nhập đầu, gia hạn tối đa mỗi 3 giây, dừng sau 1,8 giây không nhập hoặc khi gửi/rời tab/cuộc trò chuyện. Giới hạn frame socket vẫn có hiệu lực.
- Server giữ lease theo socket, kiểm tra quyền lúc bắt đầu và sau mỗi 30 giây nhập liên tục. Không ghi MongoDB/Redis key cho typing. Redis chỉ chuyển sự kiện.
- Mỗi thiết bị có lease riêng. Đóng một thiết bị không xóa trạng thái thiết bị khác. Client tự bỏ lease sau 6,5 giây nếu mất stop; mất kết nối xóa ngay state cục bộ. Sự kiện quan hệ/thành viên thay đổi hủy lease để kiểm tra quyền lại.
- `chat.message`: chuyển tin nhắn đã lưu trực tiếp vào cache, phân biệt `own` theo từng người nhận, dedupe bằng message ID. Response gửi chứa timestamp server để biên nhận không phụ thuộc đồng hồ thiết bị. Không refetch toàn bộ giao diện cho mỗi tin.
- `chat.read`: chỉ phát khi cursor tăng thành công. Mốc đọc lưu bằng trường `readAt` hiện có, dùng conditional update + `$max`, không thể lùi khi nhiều thiết bị gửi lệch thứ tự.
- Client quan sát timestamp cuối của tin nhận bằng IntersectionObserver trong vùng cuộn chat. Chỉ xác nhận khi thấy >=60% timestamp, trang visible và cửa sổ có focus, gộp 750ms. Không đánh dấu chỉ vì tin đến thiết bị hoặc mở danh sách chat.
- Client gửi message ID; server tìm timestamp trong đúng conversation, không tin timestamp tùy ý từ client.
- Reload/reconnect dùng bootstrap hiện có để lấy lại cursor; mất mạng không tạo vòng retry nóng. Route read cũ không body vẫn được chấp nhận cho tương thích.
- Receipt truyền tới tất cả thiết bị của thành viên, kể cả thiết bị khác của người đọc. Avatar nhỏ của từng người đọc nằm dưới tin gửi gần nhất mà họ đã đọc, không chỉ ở tin gửi mới nhất. Tin đang gửi chưa được server xác nhận không nhận avatar đã xem.
- Typing dùng bubble ba chấm nhảy và bóng theo mẫu của chủ ứng dụng, có vùng cao cố định cuối lịch sử; nhóm thêm các avatar đang soạn. Inbox dùng cùng animation thu nhỏ. Avatar receipt nằm trên hàng metadata dưới tin nên không thêm hàng chữ hay số đếm.
- SSE cũ nhận invalidation `messages` cho các sự kiện tin/đọc mới. Notification invalidation gộp theo cửa sổ 1 giây và chỉ làm mới inbox và endpoint đếm unread nhỏ, không bootstrap/toàn bộ feed.

## Kiểm tra local

```sh
pnpm check-types
pnpm build
```

Các kiểm thử trong lần đo dưới đây chạy trước khi dọn file test và dùng dữ liệu giả lập. Backend dependencies trong kiểm thử socket/lease/cursor được thay bằng port in-memory; WebSocket dùng HTTP server và socket TCP localhost thật.

Kết quả đo trên máy phát triển (không đại diện sức tải VPS):
- 6.000 lần nhập trong 60 giây giả lập: 20 frame start/renew + 1 stop.
- 6.000 frame typing vào service: 20 publication + 1 stop, 2 lần kiểm tra quyền, 0 lần ghi trạng thái typing vào DB.
- 1.000 ack trùng từ snapshot cũ: 1 lần thay đổi dữ liệu, 1 publication. Ack có cursor đã đồng bộ: 0 lệnh update.
- 1.000 tin mô phỏng qua TCP thật tới 3 socket: 3.000 deliveries; khoảng 37–40ms wall / 54–56ms CPU, RSS tăng khoảng 5–5,6MB trong tiến trình test có lưu toàn bộ frame. Không dùng các số này để suy ra capacity production.

Cần kiểm tra bổ sung trên iPhone thật và staging có MongoDB Atlas/Redis: hành vi Safari khi khóa màn hình/bàn phím, mất Internet vật lý, phân quyền nhóm giữa các API replica, lỗi Pub/Sub và mức CPU/RAM/băng thông lâu dài. Các bài test local xác nhận thuật toán và transport; không thay thế load test toàn hệ thống.

## Trả lời một tin nhắn

- Laptop: kéo về phía giữa khung. Điện thoại: giữ 280ms rồi kéo. Khoảng kéo thực 120px tương ứng 54px di chuyển hiển thị (hệ số .45); dưới ngưỡng thì trả về, vượt ngưỡng và thả tay mới chọn trả lời.
- Cuộn dọc, pointercancel và mất focus hủy thao tác. Tin đang gửi chưa được xác nhận không thể làm đích trả lời. Có nút trả lời khi hover/focus để dùng bằng chuột/bàn phím.
- Composer cho xem và hủy trích dẫn. Gửi lỗi khôi phục cả nội dung lẫn trích dẫn.
- Client chỉ gửi `replyToId`. Server xác minh tin gốc nằm trong đúng conversation rồi lưu snapshot một tầng (ID, người gửi, nội dung, sticker) vào `replyTo` của tin mới. Không tin nội dung quote do client gửi; không truy vấn lại mỗi quote khi dựng lịch sử.
- Tin cũ không có `replyTo` tiếp tục hoạt động. Chat riêng và nhóm dùng cùng payload; ID người gửi trong quote được chuyển thành `me` riêng cho từng thiết bị nhận.

## Số thông báo gộp

Trạng thái typing chỉ phát `chat.typing`, không đi vào notification outbox.
Badge trước đây lấy `groupCount`: tổng các tương tác cùng loại/người trong cả cửa sổ 7 ngày, bao gồm đã đọc. Badge hiện lấy `unreadCount` và ẩn số khi nhóm đã đọc hết. Dữ liệu lịch sử không bị xóa hay thay đổi để làm số đếm nhỏ đi.
Thông báo cho tin mới dùng job ID xác định theo message ID + người nhận, nên gọi lại lệnh enqueue cho cùng tin không tạo thêm notification khác ID.
