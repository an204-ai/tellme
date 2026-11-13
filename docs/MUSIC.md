# Nhạc của ngày

Nhạc chỉ xuất hiện khi mở chuỗi từ mục **Hôm nay**. Trang chủ và màn chụp ảnh không có thao tác gắn nhạc. Chủ ảnh có thể thêm, đổi hoặc bỏ nhạc chung của ngày; từng ảnh vẫn được xóa riêng.

Local dùng `EPIDEMIC_SOUND_API_KEY` phía API để tìm kiếm và nghe preview HLS của Epidemic Sound. Giữ khóa trong `.env`, không đưa lên trình duyệt. Production luôn khóa thư viện này và hiển thị “Giai điệu đang lên dây”.

`GET /api/music/config` trả `{enabled, reason}`; không trả khóa. Các API tìm kiếm, preview và lưu nhạc đều kiểm tra quyền đăng nhập; preview và tìm kiếm bị chặn ở production trước khi gọi dịch vụ. `PUT /api/stories/:id/music` chỉ dành cho chủ ảnh, nhận `{trackId, provider: "epidemic-sound", startSeconds}`; `trackId: null` bỏ nhạc. `GET /api/stories/:id/music/stream` kiểm tra quan hệ hai chiều và quyền xem trước khi trả URL preview ngắn hạn.

Tìm kiếm có debounce, phân trang, cache metadata giới hạn năm phút. Chỉ lưu bài người dùng chọn và mốc bắt đầu; không lưu khóa hay URL stream trong MongoDB. Preview không tải master/MP3. Không có gắn nhạc khi tạo ảnh hoặc lời mời gắn nhạc sau khi đăng.
