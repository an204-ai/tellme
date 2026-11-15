# Tellme
## Your day. Your stories.

### 1. Giới thiệu dự án

**Tellme** tập trung vào **Tell me now**: chụp và nối tiếp các khoảnh khắc đời thường trong cùng một ngày. Ly cà phê đầu ca, bữa trưa với bạn bè hay chuyện lúc tan làm đều có thể trở thành một phần câu chuyện.

Câu dẫn sản phẩm: **“Đi làm cũng có chuyện để kể.”** Tagline thương hiệu: **Your day. Your stories.**

Tell me now dùng camera điện thoại hoặc webcam, cho xem lại/chụp lại và thêm chú thích trước khi gửi. Luồng này không chọn ảnh có sẵn từ thư viện. Khi có nhóm còn đăng được, trước hoặc sau khi chụp một nút chuyển tròn trong khung ảnh chọn **Đăng thường** (bạn bè đã chấp nhận kết nối hai chiều) hoặc **nhóm ảnh riêng đang hoạt động** mà mình đang tham gia. Không có nhóm thì ẩn nút và đăng thường; tạo nhóm nằm trong Góc Tellme. Đổi nơi đăng giữ nguyên ảnh/chú thích; không có bộ chọn public hay người lạ.

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
- Đăng thường chia sẻ ảnh mới với bạn bè đã chấp nhận; đăng vào nhóm ảnh chỉ dành cho thành viên nhóm. Ảnh/ngày riêng tư cũ vẫn giữ quyền của chủ sở hữu.
- Xem chuỗi thường theo dòng thời gian, phản ứng và trả lời từng khoảnh khắc thường qua tin nhắn; nhóm ảnh chưa có trả lời/cảm xúc.
- Chọn nhạc chung cho chuỗi khi nguồn nhạc được cấu hình.
- Báo cáo hoặc chặn từ các thao tác phù hợp.

Tell me now là trang mặc định ở `/community/today`: camera mở đầu, cuộn dọc có lực hút xuống ảnh mới nhất rồi ảnh cũ: kéo ngắn trả về, kéo đủ mới sang một trang kề; mỗi gesture hoặc wheel burst chỉ chuyển một trang. Settle (280–380ms) bị ngắt ngay bởi gesture kế tiếp, không có khoảng chờ giữa các lần vuốt. Giảm chuyển động đưa đến đích tức thì; snap native giữ vai trò fallback. Ảnh vuông lớn có caption phủ trên ảnh; bấm caption để mở rộng, ảnh thường không chuyển bằng kéo ngang hoặc tap. Chồng ảnh nhóm có điều hướng ngang riêng như mô tả bên dưới. Với ảnh thường, người đăng/thời gian, input trả lời riêng và cảm xúc nằm dưới ảnh. Nút gửi ở ngay trong input; bản nháp theo từng ảnh vẫn còn khi cuộn đi rồi quay lại. Ngón tay thứ hai hủy gesture cuộn an toàn; lần vuốt tiếp theo vẫn hoạt động ngay. Camera dừng khi rời trang đầu, bị dialog che hoặc tab bị ẩn. Lần đầu có lời giải thích quyền camera trước khi bật; người đã cấp quyền có thể vào preview ngay.

Nút giữa header mặc định ghi **Mọi người**, mở bộ lọc xem Mọi người, một nhóm ảnh mình tham gia hoặc một người đã kết nối, bỏ đối tượng không khả dụng do chặn. Mọi người trộn ảnh thường với một chồng ảnh cho mỗi nhóm; lọc người chỉ hiện ảnh thường của người đó, lọc nhóm chỉ hiện chồng ảnh nhóm đã chọn. Lọc theo người có query key/pages riêng và tham số author tại server, giữ nguyên quyền riêng tư/quan hệ/chặn; ảnh mới nhất theo thời điểm ảnh, không theo lần sửa chuỗi. Vào thẳng vùng ảnh của người đã chọn cả khi đang tải/rỗng; Mọi người reset bộ lọc và trở về camera-first. Mất kết nối bỏ bộ lọc người tương ứng; bắt đầu upload hoặc trở về camera bỏ bộ lọc xem. Nơi đăng đã chọn vẫn được giữ trong phiên ứng dụng hiện tại, độc lập với bộ lọc xem. Nút chồng ảnh bên trái camera mở Hôm nay: thẻ chuỗi của mình/bạn bè thành hai cột cuộn dọc, có tiêu đề và nút đóng về camera. Mở một thẻ, mốc hành trình hoặc link ảnh trong tin nhắn để xem đúng ngày bằng cùng luồng cuộn dọc, trả lời, cảm xúc và nhạc. Luồng kết thúc rõ ràng, không lặp ảnh; trang cuối luồng home căn giữa icon CircleCheckBig, “Đã xem hết rồi” và “Về đầu trang”; cuối viewer ngày có nút đóng. Phím lên/xuống, PageUp/PageDown và Home hỗ trợ vùng xem; giảm chuyển động bỏ smooth scroll và hiệu ứng thừa. Thả cảm xúc vẫn có bong bóng, tắt khi giảm chuyển động.

Thanh nổi giữ ba icon Bạn bè, Trang chủ/camera ở giữa, Tin nhắn chính giữa màn hình. Khi xem ảnh có hai slot bằng nhau: Góc Tellme bên trái và thao tác ảnh hiện tại bên phải. Giữa là House trên trang camera, thành shutter để trở về camera khi xem ảnh. Camera chỉ render pill ba nút giữa, không có hai nút bên. Khi có ảnh, nút Share hướng lên mở sheet với chia sẻ/lưu ảnh thật. Với ảnh thường, sheet có xóa/nhạc theo ngày cho chủ ảnh hoặc báo cáo/chặn theo quyền với ảnh bạn bè; với nhóm ảnh, thao tác theo đúng ảnh đang chọn, có xóa cho tác giả và không có nhạc theo ngày. Sheet có preview vuông lớn `min(100%, 360px, 46dvh)`, landscape thấp `min(100%, 160px, 38dvh)`, handle và nút đóng rõ. Các thao tác thật nằm trên một hàng ngang cuộn được, slot 86px/gap 20px, có phần action kế tiếp lộ ra; giữ nhãn ngắn, hỗ trợ swipe/bàn phím và không dựng đích mạng xã hội giả. Xóa vẫn cần xác nhận và chỉ báo thành công sau khi API hoàn tất. Lưu ảnh chỉ báo đã bắt đầu gửi file cho trình duyệt lưu, không xác nhận đã vào thư viện ảnh. Không còn hàng camera/chia sẻ phụ hoặc ba chấm trên ảnh chính chủ; viewer ngày dùng cùng dock. Với ảnh thường, trả lời/cảm xúc hoặc nút Hoạt động nằm ngay dưới ảnh và phía trên dock; nhóm ảnh dùng điều hướng và thông tin ảnh tại vùng này. Hồ sơ mở từ avatar. Góc Tellme có mục **Nhóm ảnh**, mở danh sách/tạo nhóm trong dialog có nút đóng và Escape. Desktop giữ cùng trải nghiệm căn giữa. Ở landscape thấp, ảnh và thao tác đặt cạnh nhau để vừa chiều cao. Ảnh theo ngày không tự biến mất sau 24 giờ.

Camera live có hai flank 56px với icon 30px: trái mở Hôm nay, phải flip. Camera trước giữ nguyên hướng nguồn ở cả preview và ảnh chụp, không lật ngang; camera sau cũng vậy. Pinch hoặc +/- đổi zoom, vòng tròn 44px hiển thị số một chữ số thập phân (1.0×, 1.1×…) ở góc trên phải rồi ẩn sau 1400ms; không có slider. Phạm vi hardware zoom theo thiết bị; thiếu hardware zoom thì dùng crop số 1–2x thật và đồng nhất preview/capture. Không có status badge thường trực. Sau chụp, X trái bỏ ảnh và quay về live, shutter thành paper-plane đăng; caption một dòng co theo nội dung, chữ 16px (15px ở màn tối đa 360px), nằm trên ảnh tại cùng vị trí caption, không có form review dưới ảnh. Ảnh và caption đã đăng không chỉnh sửa; chủ ảnh vẫn có thể xóa sau xác nhận. Caption khi tạo ảnh mới phải đồng thời không quá 8 từ và 40 ký tự: policy dùng chung từ `@tellme/shared/captions` chuẩn hóa whitespace, giới hạn gõ/dán và giữ IME composition ở capture; API kiểm tra khi tạo ảnh mới. Đường PATCH sửa khoảnh khắc đã được gỡ; dữ liệu cũ không bị viết lại. Không thay nội dung caption cũ đã lưu; caption dài mặc định một dòng/ellipsis và bấm để đọc rộng. Chip trên ảnh dùng xanh bán trong suốt theo theme, chữ trắng; không thay màu nút chính. Khám phá dưới camera đi vào luồng ảnh; nhãn này không khôi phục bảng bài viết Khám phá cũ.

Ảnh vừa gửi xuất hiện ngay trong luồng: hamster và “Đang đăng…” ở vị trí tác giả, thành công hiện “Đã xong” trong 2 giây rồi fade về “Bạn”. Lỗi giữ bản chụp, ID và thao tác thử lại; URL đã upload được dùng lại khi thử lưu lại. Chặn gửi trùng trong lúc xử lý.

#### 3.1a. Nhóm ảnh riêng

Nhóm ảnh độc lập với hội thoại chat và chuỗi ảnh thường theo ngày. Mỗi người chỉ tham gia **một nhóm đang hoạt động**, dù là người tạo hay bạn được chọn. Nhóm có thời hạn **1, 3 hoặc 7 ngày tính từ lúc tạo**; hết hạn chỉ dừng đăng thêm, không xóa ảnh. Nhóm cũ thiếu thời hạn là chồng ảnh lịch sử chỉ đọc, không chuyển đổi hoặc xóa dữ liệu cũ.

Góc Tellme luôn dùng lưới ba cột, hiện đúng một mục **Nhóm ảnh** với icon lớn và tên căn giữa ngay bên dưới, gần header. Khi chưa có nhóm hoạt động, danh sách có nút cộng lớn căn giữa và nhãn **Tạo nhóm**; modal chỉ quản lý nhóm đang hoạt động và lời mời, không có mục chồng đã lưu. Chồng ảnh đã kết thúc vẫn xem trong luồng ảnh chính theo thứ tự thời gian. Khi không có nhóm/lời mời, entry Tạo nhóm nằm gọn và không cuộn/nhúc nhích khi wheel hoặc kéo touch. Form có tên tối đa 40 ký tự, sáu avatar preset hoặc **Tải ảnh lên** qua luồng kiểm tra/cắt/tải ảnh dùng chung, và chọn 1–29 bạn bè đã kết nối để gửi lời mời. Chỉ người tạo tham gia ngay; người được chọn chưa là thành viên cho đến khi chấp nhận. Tổng audience đã chấp nhận và lời mời đang chờ tối đa 30 người. Người đang ở nhóm khác vẫn có thể nhận lời mời, nhưng phải rời nhóm cũ trước khi chấp nhận. Không có danh sách checkbox dài: tìm theo tên/Tellme ID, gợi ý và chip có thể bỏ.

Khung tạo thông tin/thành viên giữ tỷ lệ 4:3 với header/footer cố định, không cuộn dialog, body hoặc form; bước avatar có thể tăng tối thiểu tới 280px trong giới hạn visualViewport để giữ hai hàng target 44px, nút tải lên và quay lại. Chỉ gợi ý bạn cuộn dọc và chip đã chọn cuộn ngang độc lập; danh sách lời mời/quản lý dài vẫn cuộn được. Nút ngày và thao tác chính cùng cao 48px và cùng kiểu chữ. Lỗi có thể tăng khung để đọc và khôi phục trong giới hạn vùng nhìn thấy; ở màn hẹp/thấp, gồm SE 375 × 667px, nhãn hiển thị rút gọn nhưng label/legend truy cập vẫn giữ. Nhóm ảnh và Góc Tellme dùng Modal fitViewport. Tạo xong chọn nhóm và mở camera.

Lời mời có trong hộp thư thông báo và Góc Tellme với **Từ chối / Tham gia**; badge chuông cộng số lời mời còn chờ. Chưa đồng ý thì chỉ thấy danh tính nhóm/người mời và hạn nhóm, có quyền xem avatar nhóm, không xem lịch sử/ảnh, không đăng và không giữ chỗ trong nhóm. Chấp nhận kiểm tra lại nhóm còn hoạt động, kết nối/chặn, sức chứa và giới hạn một nhóm; hai lần chấp nhận cạnh tranh chỉ một nhóm giữ được chỗ. Từ chối chỉ bỏ lời mời. Chủ nhóm đang hoạt động có **Mời bạn** trong quản lý; người đang chờ hiện riêng “Đang chờ”, không tăng số thành viên đã chấp nhận. Danh tính người chờ chỉ trả cho chủ nhóm. Hết hạn/hủy bỏ lời mời khỏi inbox và trạng thái chờ khỏi archive; hook làm mới đúng hạn cả nhóm lẫn lời mời. Chưa thêm push/email hoặc loại notice riêng cho lời mời: inbox lấy dữ liệu nhóm và cập nhật bằng realtime hiện có.

Camera chỉ hiện nút tròn 48px trước/sau chụp khi có nhóm còn đăng được, đổi UserRound ↔ UsersRound bằng scale/rotation 500ms, delay 180ms và dùng glass hiện có. Nút chuyển trực tiếp Đăng thường ↔ nhóm, không mở popup. Không có nhóm thì ẩn nút, giữ đăng thường và bỏ đích cũ trước capture; tạo/quản lý chỉ mở từ Góc Tellme. Đổi đích giữ ảnh/chú thích; nhãn truy cập của nút gửi nêu nhóm đích. Nếu đã chụp ảnh riêng mà nhóm đã chọn hết hạn, kết thúc hoặc mình đã rời, giữ ảnh/caption và yêu cầu chủ động chọn “Đăng thường” trong thông báo khôi phục trước khi gửi; không tự đăng thường. Hook làm mới ngay tại mốc hết hạn của nhóm hoặc lời mời. Bộ lọc xem và nơi đăng độc lập. Upload giữ caption policy, hamster → Đã xong 2 giây → tác giả, ID retry và tái sử dụng URL như ảnh thường.

Chi tiết nhóm ôm nội dung thay vì ép 4:3, không cuộn toàn body; quay lại nằm trong header. Hai thao tác Đăng vào nhóm/Xem ảnh là hai ô kính bằng nhau cao 64px, hủy/rời là hàng riêng rộng toàn khung cao tối thiểu 44px có nhãn/icon đỏ. Xác nhận có hai nút bằng nhau cao 48px, hủy/rời màu đỏ đặc; nhóm lịch sử chỉ còn Xem ảnh khi có ảnh. Thành viên dài dùng rail ngang độc lập. Người tạo có thể **Hủy nhóm**, thành viên có thể **Rời nhóm** bất cứ lúc nào; xác nhận nói rõ ảnh cũ vẫn giữ. Hủy giải phóng chỗ tham gia của cả nhóm; rời chỉ giải phóng chỗ của người rời trong nhóm còn hoạt động. Danh sách thành viên lịch sử và ảnh không bị xóa: các chồng đã lưu vẫn đọc/lưu ảnh và tác giả vẫn được xóa ảnh của mình theo quyền hiện có. Hết hạn/hủy/rời không đổi số ảnh, thời gian hay thứ tự chồng. Không cho đăng mới sau các mốc này; retry của ảnh đã lưu thành công vẫn trả thành công. Chủ nhóm đang hoạt động có thể tải/đổi avatar và mời thêm bạn; không có xóa thành viên khác, chat, trả lời hoặc cảm xúc nhóm ảnh. Nhóm đã được chấp nhận trước khi có lời mời vẫn giữ nguyên membership.

Avatar tùy chỉnh chỉ nhận URL media bảo vệ thuộc người tải lên; API ghi tham chiếu trong transaction và cleanup giữ avatar còn được nhóm, kể cả archive, tham chiếu. Chỉ chủ nhóm đang hoạt động được đổi avatar.

API kiểm tra membership lịch sử và chặn hai chiều khi đọc, kể cả URL ảnh được sao chép; đăng thêm cần quyền tham gia hiện tại và nhóm còn hoạt động. Có bạn chung/chat không cấp quyền nhóm ảnh; hủy kết bạn không tự xóa membership. Nếu block làm nhóm đang tham gia không khả dụng, chỉ trả mục quản lý đã che dữ liệu để hủy/rời, không lộ ảnh hay dữ liệu thành viên thực.

Mỗi nhóm có ảnh chiếm một slot ổn định trong feed dọc, sắp theo **thời điểm ảnh mới nhất thực tế**. Ảnh mới nhất ở trên, lớp sau thể hiện chồng. Tap hoặc vuốt trái xem ảnh cũ hơn; vuốt phải/phím trái-phải đổi ảnh; không có nút mũi tên hiện trên chồng. Cuộn dọc vẫn đổi mục feed. Tác giả ảnh trong ngoặc và thời gian nằm trên avatar/tên nhóm; số vị trí/tổng ảnh là chữ gọn riêng. Ảnh mới đẩy nhóm lên và về ảnh mới nhất; xóa tính lại từ ảnh mới nhất còn lại. Nhóm rỗng vẫn ở danh sách nhưng chưa chiếm slot feed. Lịch sử tải từng 20 ảnh theo keyset, tải trước gần cuối; danh sách trả metadata/latest/count, chưa có phân trang riêng.

Ảnh/chú thích đã đăng là bất biến; chỉ tác giả được xóa sau xác nhận, kể cả trong chồng đã lưu, không trao quyền xóa ảnh người khác cho chủ nhóm. Sheet chia sẻ/lưu/xóa dùng đúng ảnh đang chọn và giữ quyền ảnh; không có nhạc theo ngày cho nhóm ảnh.

#### 3.2. Hồ sơ và hành trình

Hồ sơ có summary theo theme với ảnh bìa, avatar/tên/Tellme ID/dấu Mở lối/giới thiệu căn giữa. Chủ hồ sơ có shortcut số bạn đã kết nối, sao chép ID và chia sẻ ID (mở dialog nhận diện Tellme với avatar/tên/ID và nút sao chép; “Chia sẻ qua…” mở hệ thống khi người dùng chủ động chọn và trình duyệt hỗ trợ). Hành trình khoảnh khắc theo tháng có bề mặt riêng và tiêu đề gọn “Hành trình”; prompt chụp ảnh cũng có nền riêng. Bộ chuyển tháng chỉ dùng hai mũi tên, không vuốt ngang; giới hạn từ tháng tạo tài khoản đến tháng sau hiện tại. Bản đồ giữ đủ ngày trong khung, dùng bốn cột trên điện thoại và sáu cột khi rộng. Avatar trên header mở thẳng hồ sơ; menu ba chấm trên bìa giữ lối vào chỉnh sửa hồ sơ, cài đặt, ủng hộ Tellme và đăng xuất; không có section “Tài khoản của bạn” riêng. Ứng dụng yêu cầu đăng nhập ngay từ khi truy cập, không có chế độ khách. Đăng nhập thành công tải thẳng đích `/community` nội bộ hợp lệ hoặc trang hôm nay, bỏ cache chưa đăng nhập; xác thực email xong tự vào ứng dụng, không có bước bấm Vào Tellme thêm. Không còn số đếm khoảnh khắc hoặc phần Một chút về mình; số bạn là số kết nối thật trong shortcut của chủ hồ sơ. Không thêm Gold, widget hoặc tích hợp mạng xã hội giả. Chủ hồ sơ có thể mở camera để thêm khoảnh khắc mới. Dấu Mở lối cảm ơn 100 tài khoản đầu tiên; bấm dấu mở dialog gọn theo theme, có nút đóng rõ ràng và vùng chạm tối thiểu 44px. Hồ sơ chỉ hiển thị khoảnh khắc Tellme now; không còn bài viết hoặc số đếm bài viết.

#### 3.3. Kết bạn bằng Tellme ID

Nhập đúng Tellme ID để tìm một danh tính tối thiểu và gửi lời mời. Chỉ khi người nhận chấp nhận, hai người mới xem được ảnh thường/trang cá nhân và nhắn tin riêng cho nhau; quyền nhóm ảnh dựa vào thành viên riêng của nhóm. Có từ chối, hủy lời mời, hủy kết bạn và chặn. Không có gợi ý người lạ, tìm theo tên hoặc follow một chiều. Các kết nối hai chiều có sẵn được giữ; cạnh follow một chiều cũ không cấp quyền xem.

#### 3.4. Tin nhắn

Trò chuyện riêng/nhóm, chữ, emoji và sticker; trả lời khoảnh khắc mở đúng ảnh được trích dẫn. Danh sách có avatar chân dung 64px, preview/thời gian thật và mũi tên cuối hàng, nút soạn nổi trên mobile. Hội thoại có avatar/pill tên ở giữa, fade ở mép lịch sử, bong bóng trung tính và ô nhập pill chỉ có nét sáng inset 1px, giữ translucency/backdrop nhưng không bóng ngoài ở nghỉ/focus; mobile mở chat ẩn header ứng dụng và dock. Ô soạn chat cao 59px, dịch lên 3px với đáy mobile `max(13px, safe-area + 3px)`; thanh trả lời ảnh cao riêng 63px và dịch xuống 3px. Artwork cảm xúc ảnh là 48×48px, strip 132px chứa ba slot 42px; cộng rộng 44px với SVG 32px. Nút soạn mobile cùng tâm dock, 46px và 44px ở màn tối đa 360px. Preset avatar nhóm giữ asset alpha có sẵn, bỏ nền tile trắng; nút trong suốt, hover/selected dùng glass theo theme. Icon chat lớn hơn 3px so với trước, có khoảng đáy/safe area khi bàn phím mở. Tạo chat mới, gợi ý sticker và picker cùng theo theme; tab/search cách nhau 12px, search cao 44px. Không còn thẻ chia sẻ bài Khám phá hoặc trích dẫn trả lời vào thẻ bài cũ.

#### 3.5. Thông báo

Thông báo mở trong dialog có nút đóng, Escape/backdrop; tự đánh dấu tất cả đã đọc ngay khi mở, không có toolbar đọc tất cả. Nếu cập nhật lỗi, toast hướng dẫn đóng/mở lại để thử lại; email/push chỉ bật khi dịch vụ được cấu hình và người dùng cấp quyền cần thiết.

#### 3.6. Thời tiết đang tạm dừng — 14/11/2026

Tạm dừng tính năng thời tiết và thông báo liên quan: ứng dụng không mount provider/widget/style, API công khai và watch routes không đăng ký, không có lịch gọi thời tiết hoặc yêu cầu API key trong cấu hình mẫu. Job thời tiết cũ được bỏ khi xử lý; mục inbox/realtime thời tiết cũ được lọc. Mã nguồn chưa hoạt động vẫn được giữ để có thể mở lại sau; xem [WEATHER.md](WEATHER.md).

#### 3.7. Quyền riêng tư và quản trị

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

Giao diện dùng canvas trắng ở chế độ sáng và than chì ở chế độ tối, các bề mặt xám trung tính; giữ navy cho thao tác và Nunito cho chữ. Theme đổi bằng nút mặt trời/mặt trăng cạnh chuông và nhớ lựa chọn trên trình duyệt. Riêng header trang chủ mobile ẩn nút theme; các trang khác vẫn có điều khiển này. Trên mobile, hồ sơ/tin nhắn không có panel trắng bọc toàn màn; các nhóm hồ sơ vẫn có bề mặt theo theme riêng.

Text input/textarea/contenteditable và wrapper trên toàn ứng dụng không thêm viền đổi màu, outline hoặc glow khi focus. Caret dùng màu thao tác Tellme theo theme, riêng caption nhập trên ảnh dùng trắng. Input/textarea rỗng có placeholder căn đầu dòng; khi có chữ, giữ căn lề của component: caption vẫn căn giữa và caret native theo vị trí chèn; placeholder dùng Nunito 700 với token `placeholder` theo theme hiện có. Nút và link giữ focus bàn phím rõ ràng.

Điều khiển nổi dùng chung chất liệu xám bán trong suốt, blur tĩnh giới hạn 16px, nét sáng inset và bóng mềm; riêng ô soạn chat không có bóng ngoài. Header điện thoại cao 90px; dock cách đáy tối thiểu 28px theo safe area. Mọi tính năng UI mới bắt buộc tích hợp motion và vật liệu chung trong [DESIGN.md](DESIGN.md): ui-motion/SurfaceTransition/Modal và kính control/field/option/action. Common Input/secondary Button cùng kính trung tính như dock; lựa chọn dùng control-selected, phá hủy dùng danger.

Motion chung giữ quan hệ giữa thao tác và kết quả: modal mở nhỏ ở giữa rồi lớn lên 460ms, đóng 460ms về hướng nút mở, với ease mở/đóng riêng. Scrim native chạy đồng bộ tới frame trong suốt cuối; chuyển modal cùng commit giữ scrim hiện có; panel trượt lên, nội dung mới sắp theo nhịp giới hạn và route dùng clip/opacity 380ms. Avatar có cùng identity được nối từ vị trí cũ sang chi tiết bằng shared-element khi có đích phù hợp. Runtime chung xử lý modal/menu/popover; các thay thế nội dung có ý nghĩa phải nối qua hook/presence chung, không tự animate mọi React rerender hoặc lần gõ. Thao tác route/API không phải chờ motion; route root không transform để giữ hit target fixed. Snapshot thoát chỉ là hình ảnh inert/aria-hidden và không nhận pointer. Khi controller gỡ modal mà không có modal thay thế, native exit ghost giữ backdrop/top layer và bảo vệ focus trong pha đóng 460ms rồi tự gỡ; route/API vẫn bắt đầu ngay. Reduced motion dùng opacity 100ms, bỏ di chuyển/phóng mạnh và vòng lặp không thiết yếu. Fixed action dùng FloatingActions ngoài main. Status upload giữ 200ms, switch camera 500ms và glider dock 340ms theo vai trò riêng. Danh sách hội thoại giữ nguyên vị trí, không stagger; mở chat rồi quay lại trong cùng họ Tin nhắn không chạy lại transition main/list. Scrollbar được ẩn trên toàn ứng dụng, vẫn cuộn native bằng touch/wheel/bàn phím. Cancel cửa sổ chọn file giữ wizard nhóm và bản nháp tên/ngày/thành viên; Escape, backdrop và nút đóng dialog vẫn hoạt động. Loader mèo giữ giữa màn hình, có phần tử normal-flow tối thiểu để Next xử lý auto-scroll mà không thay cuộn nội bộ của AppShell.

UI state đã dùng Zustand trong `apps/web/src/stores/app.store.ts` (overlay, trạng thái camera/shelf, ảnh active, pending upload, feedback); dữ liệu server và phân trang vẫn do React Query quản lý. AppShell prefetch các route đã đăng nhập thường dùng (Today, Bạn bè, Tin nhắn, Cài đặt, hồ sơ của mình) và account query stale 60 giây khi rảnh. Indicator dock chỉ theo pathname đã commit; link pending có phản hồi riêng. Prefetch không thay đổi auth guard hoặc quyền API.
