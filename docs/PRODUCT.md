# Tellme
## Your day. Your stories.

### 1. Giới thiệu dự án

**Tellme** tập trung vào **Tell me now**: chụp và nối tiếp các khoảnh khắc đời thường trong cùng một ngày. Ly cà phê đầu ca, bữa trưa với bạn bè hay chuyện lúc tan làm đều có thể trở thành một phần câu chuyện.

Câu dẫn sản phẩm: **“Đi làm cũng có chuyện để kể.”** Tagline thương hiệu: **Your day. Your stories.**

Tell me now dùng camera điện thoại hoặc webcam, cho xem lại/chụp lại và thêm chú thích trước khi gửi. Luồng này không chọn ảnh có sẵn từ thư viện. Ảnh mới chỉ gửi cho bạn bè đã chấp nhận kết nối hai chiều; không có bộ chọn quyền xem.

### 2. Người dùng và bối cảnh sử dụng

Tellme dành cho người muốn lưu ngày thường và chia sẻ với những người mình quan tâm. Lời gợi mở lấy từ nhịp sống đi làm, giờ nghỉ và sau giờ làm; người dùng vẫn có thể kể chuyện ngoài công việc.

Ba nhu cầu chính:

- **Ghi lại hôm nay:** Chụp ảnh ngay lúc đó và bổ sung dần vào chuỗi trong ngày.
- **Xem lại ngày thường:** Lưu chuỗi theo ngày và xem hành trình theo tháng trên hồ sơ.
- **Giữ kết nối:** Tìm nhau bằng đúng Tellme ID, chấp nhận kết bạn, trả lời ngay dưới ảnh và nhắn tin riêng.

### Phong cách viết

Trẻ trung, gần gũi như một người bạn hỏi thăm. Xưng “bạn”, dùng tình huống cụ thể và không mặc định ngày làm việc luôn vui. Nút thao tác, lỗi, quyền riêng tư và xác nhận xóa dùng câu ngắn, chính xác. Xem [VOICE.md](VOICE.md).

### 3. Các chức năng hiện tại

#### 3.1. Tell me now

- Chụp trực tiếp bằng camera trước/sau hoặc webcam.
- Bổ sung nhiều ảnh, chú thích và thời điểm vào cùng một chuỗi theo ngày Việt Nam.
- Chỉ chia sẻ ảnh mới với bạn bè đã chấp nhận. Ảnh/ngày riêng tư cũ vẫn giữ quyền của chủ sở hữu.
- Xem chuỗi theo dòng thời gian, phản ứng và trả lời từng khoảnh khắc qua tin nhắn.
- Chọn nhạc chung cho chuỗi khi nguồn nhạc được cấu hình.
- Báo cáo hoặc chặn từ các thao tác phù hợp.

Tell me now là trang mặc định ở `/community/today`: một ảnh lớn, kéo ngang để lật qua chồng ảnh, trả lời trực tiếp bằng input và thả cảm xúc cũ hoặc một emoji từ bộ bàn phím. Khu caption, phản hồi và chụp ảnh có vị trí ổn định, kể cả ảnh của chính chủ. Thả cảm xúc có hiệu ứng bong bóng bay lên rồi vỡ, tắt khi giảm chuyển động. Hôm nay hiển thị thẻ chuỗi của mình/bạn bè thành hai cột cuộn dọc; mở một thẻ để lật chồng ảnh của riêng người đó trong ngày, trả lời và thả cảm xúc trên modal trong suốt. Thanh nổi chỉ dùng icon Bạn bè, Trang chủ ở giữa, Tin nhắn; hồ sơ mở từ avatar. Nút bốn ô dành cho Góc Tellme, hiện để trống cho chức năng đặc biệt sau này. Ảnh theo ngày không tự biến mất sau 24 giờ.

#### 3.2. Hồ sơ và hành trình

Hồ sơ giữ ảnh bìa, avatar, Tellme ID, giới thiệu và hành trình khoảnh khắc theo tháng. Avatar trên header mở thẳng hồ sơ; nút ba chấm tròn trong suốt trên ảnh bìa gom chỉnh sửa, cài đặt, ủng hộ và đăng xuất. Ứng dụng yêu cầu đăng nhập ngay từ khi truy cập, không có chế độ khách. Không còn số đếm khoảnh khắc/bạn bè hoặc phần Một chút về mình. Chủ hồ sơ có thể mở camera để thêm khoảnh khắc mới. Hồ sơ chỉ hiển thị khoảnh khắc Tellme now; không còn bài viết hoặc số đếm bài viết.

#### 3.3. Kết bạn bằng Tellme ID

Nhập đúng Tellme ID để tìm một danh tính tối thiểu và gửi lời mời. Chỉ khi người nhận chấp nhận, hai người mới xem được ảnh/trang cá nhân và nhắn tin riêng cho nhau. Có từ chối, hủy lời mời, hủy kết bạn và chặn. Không có gợi ý người lạ, tìm theo tên hoặc follow một chiều. Các kết nối hai chiều có sẵn được giữ; cạnh follow một chiều cũ không cấp quyền xem.

#### 3.4. Tin nhắn

Trò chuyện riêng/nhóm, chữ, emoji và sticker; trả lời khoảnh khắc mở đúng ảnh được trích dẫn. Không còn thẻ chia sẻ bài Khám phá hoặc trích dẫn trả lời vào thẻ bài cũ.

#### 3.5. Thông báo

Thông báo có đọc từng mục/đọc tất cả; email/push chỉ bật khi dịch vụ được cấu hình và người dùng cấp quyền cần thiết.

#### 3.6. Quyền riêng tư và quản trị

API kiểm tra đối tượng xem, chủ sở hữu, quan hệ và chặn ở tất cả đường đọc/ghi. Người dùng có thể chặn/báo cáo; công cụ quản trị và kiểm duyệt vẫn được giữ.

### 4. Phạm vi đã gỡ — 13/11/2026

Theo quyết định thu hẹp sản phẩm ban đầu, đã gỡ chức năng **Khám phá**:

- Hai trang `/community/feed` và `/community/explore`, cùng màn scaffold tương ứng trên mobile.
- Bảng bài viết tổng hợp, tìm kiếm nội dung toàn hệ thống, lọc chủ đề và chủ đề thịnh hành.
- Ô tìm kiếm trên header, phím tắt và các liên kết vào các trang đã gỡ.
- Composer/validator/API tạo bài viết mới.
- Worker dựng cache bảng bài viết, lịch chạy và cấu hình deploy liên quan.

Các đường dẫn đã gỡ không còn phục vụ tính năng. Toàn bộ API bài viết, bình luận và lịch sử bài viết trên hồ sơ đã được gỡ. Tìm kiếm cục bộ trong bạn bè, hội thoại, sticker và kho nhạc vẫn phục vụ các luồng riêng đó.

Theo yêu cầu bổ sung, xóa toàn bộ collection `posts` cùng bình luận/tương tác/bookmark bên trong; xóa tin nhắn chia sẻ bài, trích dẫn vào tin đã xóa, thông báo/báo cáo/job/cache liên quan và trường ẩn bài trên tài khoản. Ảnh chỉ dùng bởi bài Khám phá được xóa trên Cloudinary; ảnh còn dùng ở khoảnh khắc, hồ sơ hoặc avatar nhóm được giữ. Tài khoản, phiên, quan hệ, chuỗi Tellme now và tin nhắn thường được giữ. API không còn phục vụ hồ sơ hoặc khoảnh khắc công khai. Các URL CDN cũ cần được chuyển quyền trong bước triển khai riêng: [PRIVATE-MEDIA-ROLLOUT.md](PRIVATE-MEDIA-ROLLOUT.md). Đây là quyết định về phạm vi sản phẩm, không phải kết luận về nghĩa vụ pháp lý.

### 5. Nguyên tắc sản phẩm

- **Khoảnh khắc làm trung tâm:** Ưu tiên chụp, kể tiếp và xem lại một ngày.
- **Kết nối tự nhiên:** Giữ tương tác với những người mình quan tâm.
- **Quyền riêng tư rõ ràng:** Biết ai được xem trước khi đăng; thực thi tại API.
- **Lưu giữ ngày thường:** Duy trì lịch sử khoảnh khắc theo ngày/tháng.
- **Nhất quán trên thiết bị:** Web desktop/mobile giữ cùng thao tác chính; native mobile vẫn là scaffold.

Giao diện có nền xanh biển sáng và chế độ tối, đổi bằng nút mặt trời/mặt trăng cạnh chuông và nhớ lựa chọn trên trình duyệt. Trên mobile, hồ sơ/hành trình/tin nhắn không còn panel trắng bọc ngoài.
