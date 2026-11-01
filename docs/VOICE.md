# Giọng viết Tellme

## Concept

**Đi làm cũng có chuyện để kể.**

Tellme là nơi người đi làm chia sẻ khoảnh khắc đời thường trong công việc, làm quen và trò chuyện. Nhịp sống có thể là đầu ca, giờ nghỉ, làm từ xa hoặc tan làm; không mặc định ai cũng làm văn phòng hay làm giờ hành chính.

Tagline thương hiệu vẫn là **Your day. Your stories.** Tính năng ảnh theo ngày là **Tell me now**; bảng bài viết là **Khám phá**.

## Giọng và cách dùng

- Xưng “bạn”; gợi mở như một người bạn đang hỏi thăm. Không tự gọi người dùng là đồng nghiệp vì họ có thể làm ở những nơi khác nhau.
- Dùng từ quen thuộc, câu gọn. Chất trẻ đến từ tình huống gần gũi: ly cà phê đầu ca, bữa trưa, ca làm, góc làm việc, chuyện lúc tan làm.
- Để người dùng kể cả điều vui lẫn điều chưa suôn sẻ. Không ép tích cực, cổ vũ làm quá sức hay mặc định ai cũng thích công việc của mình.
- Không rải tiếng lóng, emoji, dấu chấm than hoặc “nhé” trong mọi câu. Không dùng văn phong quảng cáo hay những câu trừu tượng về đồng cảm, giá trị, hành trình.
- Lời gợi mở có thể thân mật. Nút thao tác cần rõ: Đăng bài, Thêm ảnh, Gửi, Lưu thay đổi. Lỗi, quyền riêng tư, báo cáo và xóa nội dung phải chính xác, không pha trò.
- Nội dung gợi ý không làm thay đổi bài viết, caption, chủ đề hoặc hồ sơ mà người dùng đã lưu.

## Ví dụ đang dùng

| Vị trí | Câu chữ |
| --- | --- |
| Trang đăng nhập | Đi làm cũng có chuyện để kể. |
| Mô tả Tellme | Chia sẻ khoảnh khắc đời thường nơi làm việc, từ cà phê đầu ca đến chuyện lúc tan làm. |
| Ô tạo bài | Hôm nay đi làm thế nào, An? |
| Ô thêm khoảnh khắc | Hôm nay đi làm có gì mới, An? |
| Modal tạo bài | Kể chuyện đi làm |
| Gợi ý nội dung | Ca làm hôm nay thế nào? Kể một chút nhé… |
| Chủ đề gợi ý | Chuyện đi làm · Giờ nghỉ trưa · Tan làm rồi |
| Chú thích ảnh | Ví dụ: Cà phê đầu ca cùng cả nhóm |
| Thành công | Đã đăng bài viết. |

## Thuật ngữ dùng nhất quán

- **Bài viết:** Một nội dung được đăng lên Bảng tin; “câu chuyện” dùng trong lời gợi mở.
- **Khoảnh khắc:** Một ảnh trong chuỗi của ngày; **chuỗi khoảnh khắc** là toàn bộ ảnh trong ngày.
- **Follow / Bạn bè:** Follow một chiều / hai người follow nhau. Không suy ra cùng công ty hoặc quan hệ đồng nghiệp.
- **Tellme ID:** Tên định danh người dùng tự đặt.
- **Công khai / Bạn bè / Chỉ mình tôi:** Nhãn quyền riêng tư giữ nguyên nghĩa ở mọi màn.

## Bí danh khi đăng ẩn danh

Bài ẩn danh có tên con vật gần gũi với nhịp đi làm: **Mèo muốn ngủ**, **Cá vàng vui vẻ**, **Thỏ thèm trà sữa**, **Sóc sắp tan ca**. Không thêm số hay mã định danh vào tên. Avatar con vật và màu nền giúp nhận diện trong cuộc trò chuyện.

Bí danh gắn với từng bài, giữ nguyên khi chủ bài trả lời bình luận và kèm nhãn **Tác giả**. Bài khác có thể có bí danh khác; không dùng một bí danh cố định theo tài khoản để tránh nối danh tính giữa nhiều bài. Không có liên kết hồ sơ hoặc chấm trạng thái hoạt động trên avatar ẩn danh. Tên con vật không phải tên duy nhất trong toàn hệ thống.

Đã có avatar cho đủ 15 loại trong bộ tên: gấu, cú mèo, rái cá, cáo, mèo, thỏ, ếch, chim cánh cụt, cá, họa mi, chim sẻ, chim non, rùa, sóc và cún. Họa mi, chim sẻ và chim non có ảnh riêng, không dùng chung ảnh cú mèo. Mapping ảnh/tên nằm ở `apps/web/public/images/anonymous-avatars/README.md`. Khung avatar tròn nền trắng, viền nhẹ; artwork giữ nguyên. Bài cũ giữ tên đã sinh; các bộ tên mở rộng chỉ áp dụng cho bài mới theo phiên bản được lưu khi đăng.

Câu gợi mở dùng lại được tập trung tại `apps/web/src/lib/brand.ts`. Khi thêm màn hình, đọc tài liệu này và giữ nội dung chức năng ngắn, dễ hiểu.
