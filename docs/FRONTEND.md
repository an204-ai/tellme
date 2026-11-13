# Tellme Web

Tellme web dùng Next.js App Router và API Hono/Node.js trong `apps/api`. Tài khoản, ảnh theo ngày, quan hệ, hội thoại và thông báo được lưu trong MongoDB; ảnh upload dùng Cloudinary, sticker chat lấy từ danh mục Tellme dùng chung. Xem [BACKEND.md](BACKEND.md) cho cấu hình và endpoint, [ARCHITECTURE.md](../ARCHITECTURE.md) cho kiến trúc hiện tại.

## Giao diện hiện tại — 14/11/2026

- Nền xanh rất nhạt `#F3F7FD`, bề mặt trắng, navy cho thao tác; Nunito 600–900 được self-host và hỗ trợ tiếng Việt. Logo tiếp tục dùng tài sản thương hiệu.
- `MomentCard` đặt một ảnh thật ở trung tâm. Kéo ngang để ảnh đi theo tay và nghiêng/lật khỏi chồng ảnh; bấm ảnh hoặc dùng bàn phím cũng chuyển được. Không còn hai nút mũi tên che ảnh. Giảm chuyển động bỏ hiệu ứng lật.
- Caption dành sẵn hai dòng, phản hồi và chụp ảnh có hàng bố cục riêng; ảnh của mình/ảnh không có caption không làm camera dịch vị trí. Caption dài mở đầy đủ trong timeline.
- Input trả lời luôn có ngay dưới ảnh bạn bè, chiếm nửa trái thanh; nửa phải hiển thị ba cảm xúc và nút cộng, có vuốt ngang để xem bộ còn lại. Khi có chữ, nút chụp ở giữa đổi thành nút gửi liên kết với form trả lời; gửi một `storyReply` vào hội thoại riêng mà giữ nguyên màn ảnh. Gửi thành công hoặc xóa hết chữ trả nút về camera; lỗi giữ bản nháp. Nút cộng chọn emoji Unicode từ picker dùng chung với chat.
- Desktop: Hồ sơ, Tin nhắn và Bạn bè dùng chung khung 1040px/padding 24px; logo nằm bên trái header trên mọi route. Cover hồ sơ chiếm toàn chiều rộng.
- Cảm xúc đến dùng tối đa 5 avatar chồng nửa hình, không có chữ/số đếm. Preview và dialog dùng chung query `moment-reactors`, phân trang 5 người, chỉ tải preview của khoảnh khắc đang xem trong timeline; dialog căn trái tên/ID và cột cảm xúc.
- Khung `.close-app` cố định trong visual viewport, body không cuộn; main, danh sách chat và lịch sử tin có vùng cuộn riêng. Keyboard vẫn giữ composer trong màn hình. `close-messages.css` đồng bộ chat với nền xanh biển, hai panel trắng bo mềm, typography Nunito và input mới.
- Loader chuyển trang dùng `SleepingCat` từ SVG chủ dự án cung cấp, không thêm styled-components; loader nhỏ/upload giữ nguyên. Giảm chuyển động tắt loop. Photo toss 400ms, arrival 320ms, drag gom theo requestAnimationFrame và giải mã trước ảnh kề.
- `FloatingNavigation` tái sử dụng `LiquidNavigation`: một cụm icon Bạn bè/Trang chủ/Tin nhắn (Home ở giữa), không có nhãn chữ; nút bốn ô riêng mở Góc Tellme đang để trống. Avatar header mở thẳng hồ sơ. Nút ba chấm trên ảnh bìa chủ hồ sơ chứa chỉnh sửa, cài đặt, ủng hộ và đăng xuất. Không có sidebar hoặc thanh tab quản lý ở trang chủ. Hôm nay mở dải story cũ và timeline theo ngày.
- Tìm đúng Tellme ID và gửi/chấp nhận lời mời ở `FriendsScreen`; không hiển thị ID của mình, tiêu đề Bạn bè hoặc nút quay lại ở đầu trang. Điều hướng bằng thanh nổi. Hồ sơ giữ bìa, avatar, giới thiệu, Tellme ID và hành trình; đã gỡ phần Một chút về mình, form/schema liên quan và hai số đếm. Prompt camera có margin và padding riêng để không sát mép.
- `useReactionBubbles` tạo tối đa 12 bong bóng cho một lượt chọn mới, tự hủy sau 1,9 giây; portal không chặn chạm, chỉ animate transform/opacity và tắt khi giảm chuyển động. Bỏ cảm xúc không tạo hiệu ứng.
- Draft input nằm trong StoryReply, lưu theo ảnh trong ref; màn ảnh chỉ nhận trạng thái có chữ/đang gửi. Danh sách chuỗi, map người và danh sách ảnh đã sắp xếp được memo hóa, tránh dựng lại trên mỗi ký tự.
- Bootstrap không tải danh bạ toàn hệ thống; ảnh/hồ sơ chỉ dành cho chính chủ và bạn bè. Ảnh mới đi qua URL kiểm tra phiên, kể cả khi URL đã được sao chép. Cấu hình nhạc, thời tiết, emoji, sticker và các dịch vụ đang dùng được giữ; widget thời tiết cũ không còn gắn trên shell mới, lời gợi mở theo thời tiết trong camera vẫn được dùng.

Phần mô tả giao diện lịch sử bên dưới ghi lại các quyết định trước lần thay đổi này; không dùng các đoạn nói về follow một chiều, xem công khai, sidebar, Poppins hoặc luồng bài dọc như chuẩn hiện hành. [API.md](API.md), [PRODUCT.md](PRODUCT.md) và [DESIGN.md](DESIGN.md) mô tả hệ thống hiện tại. [PRIVATE-MEDIA-ROLLOUT.md](PRIVATE-MEDIA-ROLLOUT.md) ghi bước chuyển ảnh CDN cũ khi deploy.

## Chạy và kiểm tra

Yêu cầu Node.js 22.18+ hoặc 24+, pnpm 9.15. Tại gốc repository:

```sh
pnpm install
pnpm dev
```

`pnpm dev` đọc `.env` ở gốc, khởi động Redis qua Docker Compose khi Redis local chưa chạy rồi mở API ở `127.0.0.1:4000`, web tại [127.0.0.1:3000](http://127.0.0.1:3000/community/today), admin ở `127.0.0.1:3001` và ba worker. Next rewrite `/api/*` tới `API_INTERNAL_URL`. Chỉ cấu hình ở `.env` gốc; xem danh sách tên biến trong `.env.example` và cách thiết lập tại [BACKEND.md](BACKEND.md). Không đưa `.env` thật vào Git.

Khách chỉ nhận bootstrap rỗng và được chuyển tới đăng nhập. Dữ liệu localStorage từ prototype không được chuyển thành tài khoản hay nội dung thật. `/` và `/community` chuyển tới `/community/today`. Sau đăng nhập/đăng ký, người dùng trở về URL nội bộ hợp lệ hoặc trang Tellme now. Đăng xuất hủy session và xóa cache phía trình duyệt.

```sh
pnpm --filter @tellme/web check-types
pnpm --filter @tellme/web build
pnpm --filter @tellme/api check-types
pnpm --filter @tellme/api build
```

Web dev dùng `.next/`; build/start dùng `.next-production/` trừ khi đặt `NEXT_DIST_DIR`. `pnpm --filter @tellme/web start` chạy bản production đã build.

## Thu hẹp phạm vi — 13/11/2026

Đã gỡ bảng bài viết, tìm kiếm nội dung toàn hệ thống, chủ đề xu hướng và luồng tạo bài mới. Hai route `/community/feed`, `/community/explore` không còn tồn tại. Toàn bộ phần tương thích bài cũ cũng đã gỡ, gồm hồ sơ, kho lưu trữ, thẻ chia sẻ và API; dữ liệu Khám phá được dọn bằng script riêng. Xem [PRODUCT.md](PRODUCT.md) cho phạm vi giữ lại.

## Các luồng hiện có

| Màn hình | Thao tác |
| --- | --- |
| Tell me now | Bổ sung ảnh và chú thích vào chuỗi theo ngày Việt Nam, quyền xem chung cho chuỗi, phản ứng từng ảnh, chồng ảnh riêng cho một người trong ngày |
| Hồ sơ | Resolve username thật; hành trình khoảnh khắc theo tháng; sửa tên/bio/vị trí/avatar/bìa; Follow/Following và nhắn tin |
| Follow | Đang follow và gợi ý, tìm tên/username, follow/bỏ follow; route cũ `/community/connections` redirect tới `/community/follow` |
| Tin nhắn | Hội thoại riêng/nhóm, tìm danh sách đã tải, gửi chữ/emoji/sticker và trả lời khoảnh khắc, đánh dấu đã đọc |
| Đã lưu / Thông báo | Chuỗi ảnh đã lưu phân trang; chuông mở popover toàn bộ thông báo đã tải, đọc từng mục hoặc đánh dấu tất cả đã đọc |
| Cài đặt | Lưu đối tượng xem mặc định, tùy chọn thông báo, giảm chuyển động, chặn/bỏ chặn và khôi phục bài ẩn |
| Tài khoản / trạng thái | Đăng ký, đăng nhập, đăng xuất thật; validation, loading, lỗi kết nối có thử lại, 404 |

Facebook dùng sharer. Instagram/TikTok sao chép liên kết rồi mở nền tảng; trạng thái và tên truy cập mô tả thao tác này. Liên kết tới dev server chỉ dùng được tại nơi truy cập được máy chủ đó. Báo cáo được lưu và API admin có route xử lý khi `ADMIN_EMAILS` được cấu hình. Email/push chỉ xuất hiện trong cài đặt khi SMTP/VAPID đã cấu hình; push cần người dùng cấp quyền cho trình duyệt.

## Dữ liệu và trạng thái

- **Route/component:** `src/app/` là lớp route mỏng; `components/screens/` giữ màn tương tác, `components/app/` giữ shell/composer/dialog/timeline, `components/ui/` giữ primitive dùng lại.
- **API repository:** `src/lib/api-repository.ts` gọi `/api` bằng cookie cùng origin. Các draft UI được chuyển thành lệnh REST hẹp theo từng thay đổi; không gửi toàn bộ state để ghi đè server. Bộ nhớ `metadata`, bài/chuỗi/người đã tải chỉ là cache trong phiên trình duyệt, không phải nơi lưu dữ liệu bền vững.
- **TanStack Query:** `use-community.ts` dùng key `['tellme', 'community']`, polling metadata mỗi 10 giây. `use-stories.ts` phân trang chuỗi Tellme now 6 mục/lần; username và chuỗi ngày có query riêng. Mutation làm mới metadata và vô hiệu hóa query chuỗi liên quan.
- **Tải tiếp:** IntersectionObserver với `rootMargin: 650px 0px` lấy trang kế trước viewport. Không có nút tải thêm ở trạng thái nghỉ; có loader khi tải và nút thử lại khi lỗi. Cursor hiện là offset số, không phải snapshot cursor ổn định giữa các thay đổi đồng thời.
- **Giới hạn đầu phiên:** bootstrap chỉ tải các danh tính liên quan đến phiên, không tải danh bạ 500 người mới nhất; tối đa 100 chuỗi, 100 hội thoại, 100 thông báo và 100 báo cáo của mình. Mỗi hội thoại nhận 50 tin mới nhất. API có endpoint lấy tin cũ; các giới hạn này không được mô tả như tìm kiếm toàn hệ thống không giới hạn.
- **Zustand:** giữ UI như dialog, toast và ảnh đang xem; không nhân đôi nguồn dữ liệu bài/tin nhắn.
- **Validation:** React Hook Form + Zod ở client; API kiểm tra lại input và lấy actor từ session HttpOnly. Password dùng scrypt, session lưu ở MongoDB; trình duyệt không cất access token trong localStorage. Guest bootstrap không trả email hay password hash.
- **Quyền xem:** `visibility.ts` hỗ trợ lọc/hiển thị phía UI; API thực thi ownership, block và quyền chuỗi/chat. Bạn bè (`connections`) là kết nối được chấp nhận, lưu bằng hai cạnh trong trường dữ liệu cũ; cạnh một chiều cũ không mở quyền này. `data.connections` do API tính từ quan hệ hiện tại.
- **Ảnh:** `readImage` chấp nhận JPEG/PNG/HEIC/HEIF/WebP/GIF/AVIF/BMP/TIFF tối đa 50 MB. API xác định định dạng bằng chữ ký file, đưa ảnh lên Cloudinary và ghi chủ sở hữu. Giữ kích thước/tỷ lệ ảnh gốc, phân phối qua `f_auto,q_auto`; feed dùng bản giới hạn rộng 1280px. `PostPhoto` chọn tỷ lệ khung trong khoảng 4:5–1.91:1, bấm mở dialog giữ toàn bộ tỷ lệ gốc và có zoom. URL gắn vào bài/chuỗi/hồ sơ phải thuộc media của người gửi.
- **Căn ảnh hồ sơ:** `ImageCropper` dùng react-easy-crop để kéo, zoom, pinch và dịch bằng phím mũi tên. Avatar vuông (khung xem tròn), cover 3:1. Ảnh được giải mã/cắt trên thiết bị, HEIC dùng heic-to khi trình duyệt không đọc được, TIFF dùng UTIF; chỉ bấm Dùng ảnh này mới upload bản đã cắt. Hủy không upload. Bấm Lưu thay đổi mới cập nhật hồ sơ. Bản crop avatar giới hạn 1200px, cover 2400px; GIF dùng khung hình tĩnh cho avatar/cover.
- **Trả lời ảnh:** dưới từng khoảnh khắc của người khác có ô trả lời riêng và emoji. Tin nhắn lưu `storyReply: {storyId,momentId}`, mở/tạo hội thoại trực tiếp với chủ ảnh. Chat hiển thị ảnh/caption trích dẫn, bấm mở đúng mốc ảnh. API kiểm tra quyền xem và chủ hội thoại khi gửi; khi đọc sẽ ẩn ảnh nếu quyền xem bị thu hồi.
- **Ngày ảnh:** gom theo `Asia/Ho_Chi_Minh`, giữ lịch sử trên hồ sơ, không tự xóa sau 24 giờ.

Hồ sơ phân biệt lỗi quyền/không tồn tại (`ApiError` 403/404) với lỗi mạng/máy chủ. Lỗi có thể phục hồi hiển thị thông báo thực và nút **Thử tải lại hồ sơ**, gọi lại query mà không reload trang.

Chat dùng chung một WebSocket cho cập nhật dữ liệu và heartbeat presence; Redis Pub/Sub phát thay đổi theo người nhận. Metadata đối soát mỗi 60 giây khi kết nối khỏe, 10 giây khi lỗi. Presence không kích hoạt refetch query và không có HTTP heartbeat. Khi thiếu Redis, API giữ job trong Mongo outbox và web quay về polling; worker cần Redis để xử lý hàng đợi. Email, push, SMTP và VAPID là tùy chọn; OAuth, reset mật khẩu, xác minh email và triển khai public chưa được làm. Admin API, Redis queue và workers đã có runtime; mobile vẫn ngoài phạm vi.

Trong Cài đặt, `AccountBlockPicker` tìm tên/Tellme ID trong bạn bè follow hai chiều trong metadata bạn bè hiện có, không gọi API tìm kiếm toàn hệ thống, hiện avatar và có cùng chiều rộng với nút mở. Trên hồ sơ người khác, menu ba chấm ở góc ảnh bìa có chặn và báo cáo tài khoản; báo cáo được lưu qua `POST /users/:id/report`. Căn avatar/ảnh bìa cho phép thu nhỏ dưới 100%, kéo và pinch; vùng nằm ngoài ảnh được xuất nền trắng, giữ khung avatar 1:1 và ảnh bìa 3:1.

Đã gỡ kho lưu trữ: route web, màn hình, API, type, CSS, invalidation và menu lưu/ẩn/hiện lại chuỗi ảnh. Field lưu/ẩn cũ không còn được đọc hoặc ghi, không ảnh hưởng danh sách ảnh nữa. Các ảnh gốc và hành trình được giữ; không chạy thao tác dọn dữ liệu production trong lượt sửa UI.

Form chỉnh sửa hồ sơ chỉ quản lý tên, Tellme ID, bio và avatar/bìa; dùng một profileSchema. Hồ sơ không còn form thông tin cá nhân riêng hoặc số đếm.

Admin dùng React/Vite, TanStack Query, bộ font dùng chung `styles/fonts.css`, màu navy/trắng và logo hiện tại. Các trang được tải khi mở: tổng quan, báo cáo, người dùng, tác vụ nền. Có đăng nhập/đăng xuất, trạng thái thiếu quyền, loading/error/retry, bộ lọc, phân trang và xác nhận trước gỡ nội dung. Xem [BACKEND.md](BACKEND.md) cho quyền và cách chạy.

## Quyết định giao diện được giữ

Nền trắng, chữ đen, navy `#07327F`, Poppins với Be Vietnam Pro dự phòng. Nội dung bài 16px desktop/15px điện thoại. Không có heading trang trang trí; giữ heading ẩn và tiêu đề chức năng. Tên tính năng ngày ảnh lấy từ `src/lib/brand.ts`: **Tell me now**, nhãn mobile **Tell me**; route `/community/today` là trang mặc định.

Sidebar trái fixed, cuộn riêng, top 109px/bottom 20px; ở viewport 1440px có x=42/width=205px. `scrollbar-gutter: stable` giữ vị trí giữa route dài/ngắn. Tin nhắn và Cài đặt dùng toàn khu chức năng, không có rail phải. Trên điện thoại, rail trái thành thanh đáy có safe-area. Header không có tìm kiếm nội dung hoặc nút tạo bài viết. Chuông không có tab Tất cả/Chưa đọc.

Luồng ảnh ngày là một cột với composer avatar gọn, ảnh thật 4:3 lớn xếp chồng tối đa ba ảnh xem trước; không nhân bản ảnh để lấp cụm. `moments.css` animate transform/shadow 700ms với `cubic-bezier(0.16, 1, 0.3, 1)`. `StoryMomentViewer.tsx` mở toàn ngày theo giờ tăng dần, desktop có rail thumbnail/mốc giờ, mobile có dải mốc giờ ngang; chú thích/phản ứng gắn từng ảnh. Native dialog giữ focus/Escape, hỗ trợ mũi tên lên/xuống và giảm chuyển động. Trang ngày không có tab Hôm nay/Chuyện của tôi hoặc nút Thêm ảnh trên cùng; composer nội tuyến giữ thao tác thêm ảnh.

Hồ sơ lưu hành trình Tellme now theo tháng, không có dòng bài viết. Đầu hồ sơ có inset 24px desktop/19px mobile. Theo chỉnh sửa 29/10, cụm thao tác được đặt riêng sát dưới bìa, canh phải (`top: -66px` desktop, `-60px` mobile so với `.profile-main`); tên/username có hàng rộng toàn phần, không chia sẻ chiều ngang với nút. Mobile pill chung cao tối thiểu 34px, nhãn 12px; thao tác hồ sơ cao tối thiểu 36px/12px, ở ≤370px nhãn 11px và avatar có khoảng dưới 54px để tránh chồng. Tên hồ sơ mobile 23px; giữ khoảng thở giữa avatar, nút và tên ở cả 320px.

Tim Thích có vùng icon 22px độc lập, tô kín navy khi chọn; scale xác nhận chỉ nằm trong tim. Tổng tim mở người dùng từ dữ liệu API. Emoji dùng `emoji-mart` Unicode 15 tải khi mở, 8 emoji/hàng, tìm tiếng Việt, nhóm và sắc độ da; glyph native theo hệ điều hành. Popover ở top layer tránh bị panel cắt. Dải người nhận và emoji ẩn scrollbar nhưng giữ cuộn, bàn phím và multi-select.

## Nguồn component và hình ảnh

Bộ **13 mẫu Uiverse** do chủ dự án chọn được lưu tại [references/uiverse](references/uiverse/README.md), kèm nguồn, tác giả và giấy phép. CSS được chuyển vào phạm vi `.uiv-*`, giữ hình học/chuyển động nhận diện, chỉnh navy/tiếng Việt/responsive/bàn phím; không thêm styled-components chỉ để bọc stylesheet. Giữ [thông báo MIT](references/uiverse/LICENSES.md), được phục vụ tại `/licenses/uiverse.txt`.

Ảnh Unsplash cục bộ ở `apps/web/public/images/` có [bảng nguồn](references/image-sources.json); runtime hiện dùng ảnh rừng cho vùng hình minh họa trang tài khoản. Nội dung cộng đồng không nạp sample users hay seed ảnh stock.

Wordmark dùng CSS crop từ bảng nhận diện chủ dự án, giữ nguyên bản gốc. Khi có asset logo xuất riêng, điểm thay là `components/ui/Primitives.tsx` và `.brand-wordmark`. Font được self-host qua Fontsource.

## Bằng chứng kiểm tra

Lần tích hợp hiện tại: web/API build đạt; 9 kiểm tra frontend và 6 kiểm tra API tích hợp thật đạt. Ảnh QA trong `.impeccable/review/` gồm `backend-desktop.png` (1440px), `backend-mobile.png` (390px), `backend-mobile-320.png` (320px) và `backend-auth-mobile.png`. Các ảnh này là tài khoản/dữ liệu kiểm tra trong môi trường QA riêng, không phải seed của ứng dụng và không đưa vào Git. Các capture trước đó (`moments-*`, `profile-journal-*`, `share-horizontal-*`, `emoji-no-scrollbar-mobile.png`) ghi lại quyết định UI lịch sử; source hiện tại và bộ `backend-*` là bằng chứng mới hơn cho profile/runtime.

Kiểm tra phục hồi hồ sơ đã mô phỏng HTTP 503 qua proxy QA riêng: sau khi bỏ lỗi, nút thử lại khôi phục hồ sơ mà không reload trang. Bằng chứng: `.impeccable/review/backend-profile-error-mobile.png` và `backend-profile-recovered-mobile.png`; ba ảnh profile theo viewport đã được chụp lại, web build đạt sau sửa lỗi.


## Điều chỉnh chuỗi khoảnh khắc — 30/10/2026

`Select` dùng chung với class `select-control`; danh sách dùng Popover API ở top layer để không bị dialog hoặc vùng cuộn cắt. Hỗ trợ phím mũi tên, Home/End, Escape và chọn nhanh theo chữ cái. Không dùng native select cho các màn hình web.

Ngày của bạn bè đứng trước ô thêm khoảnh khắc. Thẻ desktop 220 × 296px, mobile 172 × 236px; cuộn ngang không hiện thanh cuộn, tên giới hạn hai dòng. Header chuỗi dùng thời gian tương đối và `PrivacyIcon` dùng chung (Globe2/Users/LockKeyhole). Menu chủ chuỗi đổi đối tượng xem hoặc xóa; người xem lưu, ẩn, báo cáo hoặc chặn. Chuỗi lưu được mở lại trong Đã lưu; nội dung ẩn được khôi phục trong Cài đặt.

Sửa một ảnh mở modal riêng, giữ nguyên quyền riêng tư của các ảnh khác và của chuỗi. Bỏ nhãn quyền riêng tư dưới caption; lựa chọn riêng của ảnh vẫn được lưu. Nút ba chấm trên ảnh giữ aria-label, bỏ tooltip nổi để tránh bị cắt ở mép modal.


### Tinh chỉnh sau phản hồi giao diện

Dải bạn bè chỉ giữ ảnh, avatar, tên và các mốc ảnh, không có heading, số chuỗi, số ảnh hay mũi tên. Ô thêm khoảnh khắc là một hàng phẳng trên nền trắng: avatar, lời gợi mở chữ đen và camera kèm Thêm ảnh màu navy; không dùng nền màu, khung bo hay nút đặc. Viewer bỏ lựa chọn quyền riêng tư cả chuỗi và dòng ngày tháng trên ảnh đầu; sửa quyền chuỗi qua menu ngoài bài.

Thẻ trả lời ảnh có viền và nền rõ ràng.


## Giọng viết sản phẩm

Concept hiện tại: **Đi làm cũng có chuyện để kể.** Câu gợi mở bám nhịp sống đi làm, giờ nghỉ và tan làm; giữ cách gọi thao tác rõ ràng. Các câu dùng chung ở `apps/web/src/lib/brand.ts`; quy chuẩn đầy đủ ở [VOICE.md](VOICE.md), định vị ở [PRODUCT.md](PRODUCT.md).


Khôi phục mật khẩu gồm email ở `/auth/forgot-password` → mã xác nhận 6 số và mật khẩu mới ở `/auth/reset-password`. Trang nhập mã luôn có sẵn ô email và ô mã (`autocomplete=one-time-code`, bàn phím số). Chỉ email và thời điểm gửi được giữ trong sessionStorage để phục hồi bước nhập mã khi tải lại; mã, mật khẩu và grant không được lưu. Có gửi lại sau 60 giây, đổi email và yêu cầu mã mới; refresh ở bước mật khẩu cần xác nhận mã lại hoặc yêu cầu mã mới.


## Khách xem cộng đồng và trang Bạn bè

Lời mời tham gia dùng `GuestInvitation`: một hàng chữ nhỏ và link có icon, không dùng hai dòng mặc định thiếu style. Tell me now tải danh sách qua `/api/stories` và tự tải trang tiếp theo khi gần cuối, gồm chuỗi các ngày trước; chỉ dải đầu trang giới hạn hôm nay, ưu tiên chuỗi của mình trước bạn bè.

Điều hướng **Bạn bè** trỏ `/community/friends`, gồm Bạn bè, Đang follow và Gợi ý cho bạn. Icon ở mục Làm quen thêm trong sidebar trỏ `/community/friends#suggestions`, cuộn tới section sau khi dữ liệu được tải. Route `/community/follow` và `/community/connections` chuyển hướng tới Bạn bè để giữ link cũ hoạt động. Sidebar không còn phần chủ đề.

Xác thực email đăng ký dùng OTP 6 số, không đọc token từ URL. `/auth/verify-email` hiện ô mã trực tiếp, gắn với email của phiên đăng nhập. `OtpCodeField` dùng chung với khôi phục; API account trả thời gian chờ gửi lại để countdown được giữ khi tải lại.

Trang chat dùng `messages-frame` cố định theo VisualViewport (kể cả khi bàn phím mobile mở), header và navigation nằm trong flex layout; phần chat lấy chiều cao còn lại. Chỉ `.conversation-rows` và `.chat-messages` cuộn nội dung độc lập, header/tìm kiếm/composer giữ nguyên. CSS nằm trong `styles/messaging.css`, chỉ áp dụng route tin nhắn. Modal chỉnh sửa hồ sơ giữ cuộn nhưng ẩn scrollbar; hướng dẫn ảnh chỉ hiện Tối đa 50 MB.

Nhắn tin riêng chỉ dành cho bạn bè follow hai chiều; nhóm đã tham gia dựa trên quyền `canMessage` do API xác nhận. `chat-policy.ts` dùng chung cho chọn người nhận chia sẻ, tạo nhóm, tin nhắn mới, nút Nhắn tin trên hồ sơ và trả lời khoảnh khắc. Hội thoại cũ có `canMessage=false` vẫn hiện lịch sử nhưng không có ô gửi; nhóm không đủ điều kiện được loại khỏi danh sách chia sẻ. Modal chia sẻ ẩn scrollbar nhưng vẫn cuộn. Sidebar trái trong Tin nhắn kế thừa vị trí/kích thước cố định chung, sidebar phải cố định theo viewport và cuộn nội bộ khi nội dung dài.

### Avatar nhóm và cảm xúc Tellme

`public/images/group-avatars` chứa 6 PNG avatar nhóm; `public/images/reactions` chứa 5 PNG cảm xúc (Thích, Yêu thích, Haha, Wow, Buồn). Tất cả tên file dùng ASCII, giữ nguyên artwork người dùng cung cấp. `lib/social-assets.ts` định nghĩa nhãn và đường dẫn, Next Image tối ưu ảnh khi hiển thị. `ReactionControl` dùng chung cho bảng tin và từng khoảnh khắc; native popover tránh bị ảnh/modal che, hỗ trợ hover chuột, bấm trên cảm ứng và bàn phím. Emoji nhập trong caption/tin nhắn vẫn dùng bộ chọn emoji văn bản.

Trong Tin nhắn có nút Tạo nhóm chat cạnh nút cuộc trò chuyện mới, đồng thời có mục tạo nhóm trong hộp thoại tin nhắn mới. `GroupComposer` được tái sử dụng trong hộp chia sẻ, cho nhập tên tối đa 60 ký tự, chọn avatar mẫu hoặc upload tối đa 50 MB, tìm thành viên theo tên/Tellme ID và chọn tối thiểu 2 bạn (tối đa 29 người khác). Danh sách, đầu chat và hộp chia sẻ đều dùng avatar đã lưu. API kiểm tra mỗi người được mời là bạn bè của người tạo nhóm; các thành viên không cần follow nhau. Với nhóm đã tham gia, giao diện dùng `canMessage` do API xác nhận thay vì yêu cầu mọi người trong nhóm phải là bạn của người đang xem. Nút dấu cộng nhỏ trên avatar nhóm mở chọn ảnh và màn `ImageCropper` để kéo/thu phóng/căn khung tròn trước khi upload; hủy căn ảnh không tải lên. Giới hạn ảnh vẫn 50 MB.

### Bảng chức năng trong chat

Nút `PanelRight` ở góc phải header mở `ConversationTools`. `chat-workspace` chuyển grid từ vùng chat toàn chiều rộng sang chat + rail 300px trong 340ms; rail trượt cùng hướng từ phải vào. Đóng trong 220ms, hỗ trợ ngắt/đảo chiều thao tác. Khi vùng chat hẹp hơn 620px, bảng thông tin chiếm khu vực chat; màn hình không bị ép thành các cột quá nhỏ. Chỉ nội dung bảng chức năng cuộn, không có scrollbar hiển thị. Có Escape, focus trả về nút mở và trạng thái `aria-expanded`/`inert`; chế độ giảm chuyển động dùng thay đổi trạng thái và opacity nhẹ.

Chung cho nhóm/chat riêng: tìm tin trên toàn hội thoại qua API có phân trang, xem khoảnh khắc đã trả lời, tắt/bật thông báo riêng từng hội thoại. Chat riêng thêm xem hồ sơ và chặn tài khoản có xác nhận. Nhóm có danh sách thành viên; trưởng nhóm được đổi tên/avatar (dùng lại `GroupComposer` và cropper), mời bạn bè của mình, xóa thành viên. Mọi người được rời nhóm sau xác nhận; quyền trưởng nhóm chuyển cho thành viên tiếp theo. Thành viên cuối cùng được cảnh báo rõ trước khi xóa nhóm/lịch sử.

### Kéo làm mới bảng tin và Tell me now

`PullToRefresh` bọc hai trang, dùng viewport cuộn native bình thường từ scrollTop=0; header và hai sidebar giữ nguyên vị trí. Desktop dùng nhấn giữ trackpad/chuột rồi kéo xuống ở đầu nội dung (hoặc kéo tay nắm nhỏ ở mép trên). `enablePullDrag` nhận pointerdown/move/up, capture pointer khi bắt đầu kéo dọc. Pointerup gọi refresh đồng bộ ngay trong handler, không chờ scrollend/quán tính hoặc timer suy đoán nhấc tay. Nếu mất sự kiện up, pointermove có buttons=0 cũng xác nhận nhả thật. Vuốt hai ngón/wheel chỉ cuộn, không làm mới.

Tay nắm cũng là nút làm mới dùng được bằng click/Enter, có focus rõ ràng; thiết bị cảm ứng giữ kéo tự nhiên với touchend. Link/button/input/ảnh và dải story ngang không bị biến thành thao tác kéo desktop; sau một lần drag, chỉ click phát sinh từ lần nhả đó bị chặn. Mất capture, pointercancel, blur, Escape hoặc chuyển sang wheel hủy kéo chưa gửi. Kéo trả xuống dưới ngưỡng thì nhả không fetch. Không còn rail/spacer/carrier sticky, scroll offset giả hay ResizeObserver đo chiều cao danh sách. Vì nội dung nằm trực tiếp trong viewport, reset cuộn không thể lộ vùng đệm trắng. Projection giới hạn 0–88px, CSS bắt buộc transform=0 khi idle và khởi tạo effect xóa phase/loader cũ. Request đã hủy không được đổi busy/settle của lượt mới.

Các loại drag dùng cùng lực cản mũ `88 × (1 − exp(−travel × 0.52 / 88))`: chuyển động ban đầu bằng khoảng 52% quãng kéo, giảm dần khi kéo xa, tiệm cận tối đa 88px. Khi kéo, vòng tải đứng yên và hiện rõ dần; đủ 64px hiện “Thả để làm mới”, có hysteresis 8px. Vòng xoay CSS được bật ngay trong pointerup/touchend, giữ khoảng mở 80–88px trong lúc tải, chỉ thu về sau khi dữ liệu và ảnh đang trong viewport hoàn tất.

Loader lấy đúng `Chriskoziol/bright-ladybug-86` từ kho công khai Uiverse Galaxy khi trang Uiverse trả 403; lưu nguyên mẫu trong `docs/references/uiverse/pull-refresh.html` và thông tin MIT trong `public/licenses/uiverse.txt`. Bản React dùng ba vòng xoay và chữ luân phiên, đổi sang navy và cỡ gọn. Không reload toàn trang hoặc thêm delay giả. `useTimelineRefresh` dùng `refreshFirstTimelinePage`: chờ metadata/sidebar và trang đầu nội dung, chỉ rút cache đang được sử dụng về một trang để không refetch lại toàn bộ các trang đã cuộn. `InfiniteTrigger` tạm ngừng trong lúc refresh/thu về, sau đó tiếp tục quan sát gần viewport để fetch trang kế tiếp. IntersectionObserver dùng vùng cuộn native làm root, giữ khoảng tải trước 650px thay vì bị vùng cuộn cha cắt rootMargin. Không chủ động tải hết ảnh ngoài màn hình. Ảnh lỗi, timeout 8 giây hoặc rời trang giải phóng chờ ảnh, tránh giữ loader vô hạn. Có lỗi/Thử lại và nút tay nắm làm mới dùng được bằng bàn phím.

Danh sách thành viên dùng grid cố định avatar 36x36 + thông tin co giãn + thao tác, tránh rule flex vô tình kéo dẹt avatar. Nút Thêm đặt cạnh số thành viên, dùng kích thước nhỏ cân đối. `TooltipIconButton` dùng native manual popover trong top layer cho hai nút tạo nhóm/cuộc trò chuyện, tránh bị vùng cuộn hoặc chat pane cắt, tự căn trong viewport và đóng khi cuộn/Escape.

Chuyển động refresh được gom trong một requestAnimationFrame, ghi trực tiếp khoảng kéo/độ hiện có giới hạn; React chỉ đổi state khi chuyển phase. Loader và nhãn giữ nguyên DOM; vòng quay chỉ chạy sau nhả và dừng khi đã ẩn. Có hai frame vẽ loader trước khi Query cập nhật danh sách. Timer 320ms chỉ dự phòng kết thúc transition thu về, không bắt đầu request; timer 0ms trong input helper chỉ chặn click phát sinh từ drag, không nhận diện nhả.


### Nhấn giữ cảm xúc, rail cố định và presence

Bảng cảm xúc dùng chiều rộng max-content ôm sát 5 lựa chọn, icon 40px trong vùng bấm 44px; khay chỉ có icon, cao 54px với padding 4px; vị trí popover lấy từ kích thước thật để không chừa khung trống hoặc tràn màn hình. `mobile-type.css` gom vai trò chữ trên điện thoại, tăng khoảng 2px ở nội dung/metadata/thao tác; dữ liệu cá nhân giữ cỡ 15px và giảm weight 500.

Số follower/đang follow trên hồ sơ đều mở `ProfileConnections` trong modal dùng chung, không chuyển route. API `/users/:username/followers` và `/users/:username/following` trả danh tính công khai, phân trang 20 tài khoản/lần và loại tài khoản chặn hai chiều theo người xem lẫn chủ hồ sơ. Modal tải tiếp theo viewport, không hiện thanh cuộn; đóng modal hủy request qua AbortSignal và giải phóng query để lần mở sau chỉ tải trang đầu.

ReactionControl giữ hover bằng chuột; touch/pen nhấn giữ 320ms mở popover, kéo tới cảm xúc rồi thả để chọn, còn tap ngắn vẫn thích/bỏ thích. Gesture hủy khi kéo khỏi nút trước khi mở, pointercancel hoặc blur; click tổng hợp sau thao tác kéo bị chặn để không đổi cảm xúc lần hai. Nút mũi tên và bàn phím vẫn chọn được; artwork dùng bộ PNG Tellme. Trạng thái chưa thả dùng biểu tượng ngón cái nét rỗng, còn trạng thái đã thả mới hiện artwork cảm xúc. Chặn callout/chọn chữ riêng nút cảm xúc, vẫn cho cuộn dọc.

Support rail phải dùng position:fixed và overflow:clip, không có vùng cuộn riêng nên cuộn trên rail không kéo nội dung rail hoặc đổi vị trí. Mobile chat tools dùng pane trượt transform, không animate độ rộng grid trên điện thoại; main chat span toàn chiều rộng ở cả hai trạng thái khi hẹp để không đổi dòng tin nhắn trong animation. Không crossfade hai pane trên mobile; focus chỉ đặt sau animation xong với preventScroll, tránh cuộn/keyboard chen vào chuyển động. Reduced motion vẫn có phản hồi nhẹ.

useRealtime trong AppShell mở duy nhất WebSocket /api/realtime cho mỗi tab đăng nhập. usePresenceStore giữ online IDs trong RAM, không persist localStorage; chỉ me và bạn bè hai chiều được nhận từ snapshot server. Avatar đọc theo riêng ID để hiện chấm xanh, group/anonymous không có trạng thái cá nhân. Header chat riêng hiện Đang hoạt động khi đã xác nhận online. Đóng socket hoặc không xác nhận được Redis thì xóa trạng thái; heartbeat và presence delta không invalidate query. Presence revision chặn cập nhật đến trễ; thay đổi follow/block prune quyền và đồng bộ snapshot. Web guest không mở socket và không thấy presence.


Điều hướng dưới màn hình nhỏ (≤640px) dùng mẫu radio/glider do chủ dự án cung cấp, chuyển thành link Next.js để giữ URL và thao tác Back/Forward. Ba mục Tell me now, Tin nhắn, Cá nhân dùng cột bằng nhau; nền pill trắng, ô chọn trượt màu navy nhạt trong 250ms, badge lấy số tin chưa đọc thật. CSS riêng tại `styles/mobile-navigation.css`, không thêm styled-components. Vùng bấm cao 56px, có focus bàn phím và chế độ giảm chuyển động. Thanh nổi cách mép dưới theo safe-area; trong chat nằm trong visual-viewport frame để không bị bàn phím đẩy ra ngoài. Đã kiểm tra Chrome ở 320px/390px, chat với viewport cao 500px và xác nhận thanh di động ẩn ở desktop 1280px.

### Điều hướng và ảnh xem trước

`LiquidNavigation` dùng chung cho sidebar desktop và thanh tab mobile: chỉ báo chuyển ngay khi bấm liên kết, trượt 340 ms với độ co giãn nhẹ, giữ vị trí đang chuyển khi bấm liên tiếp. Vẫn dùng Next Link, lịch sử trình duyệt và trạng thái route thật; tắt chuyển động khi người dùng chọn giảm chuyển động. Dải ảnh chuỗi ở Tell me now xem trước tối đa 5 ảnh, giữ tỷ lệ 4:3 và mở đúng ảnh tương ứng trong dòng thời gian.

Thông báo tự động giữ mascot và tiêu đề nhưng bỏ nhãn chữ “Hệ thống”. Công cụ gửi thông báo xem thử đã được gỡ sau khi xóa đúng thông báo thử được yêu cầu.

### Chủ đề trong header và phản hồi cảm xúc


Khay cảm xúc chỉ hiện năm artwork Tellme, mỗi nút vẫn có aria-label, trạng thái được chọn và điều hướng bàn phím. Đo vị trí trước khi đóng picker, dùng tọa độ viewport và chỉ animate transform/opacity; không chạy đo layout theo từng frame. Khoảnh khắc chưa có bộ đếm giữ hiệu ứng bật icon cùng vòng/tia nhỏ. Gỡ cảm xúc không chạy hiệu ứng. Native manual popover giữ phản hồi phía trên nội dung và dialog; tự dọn sau 720 ms, không chặn thao tác. Tắt hiệu ứng bay khi hệ điều hành hoặc cài đặt Tellme yêu cầu giảm chuyển động.

### Chuyển trang theo tab

Tên điều hướng chính: Tell me now (`/community/today`) và Tin nhắn (`/community/messages`); mobile có thêm Cá nhân. Next Link prefetch các route trong thanh điều hướng. Khi bấm tab, nội dung cũ mờ trong 140 ms và khóa tương tác; loader hiện trong vùng nội dung, header và sidebar giữ nguyên. Khi route và dữ liệu đầu tiên sẵn sàng, nội dung mới hiện rõ trong 240 ms. `usePageNavigation` theo dõi React transition, query cache và marker loader qua MutationObserver; không dùng thời gian tải giả, không chờ refetch nền hoặc tải trang tiếp theo. Navigation liên tiếp chỉ kết thúc theo yêu cầu mới nhất; Back/Forward hủy trạng thái đang chuyển. `community/loading.tsx` giữ shell khi tải route segment.

Tên tác giả và chủ đề dùng cùng kiểu chữ 600, cùng line-height/cỡ chữ/màu, căn giữa theo hàng. Nav mobile dùng chữ fluid 11–14px để nhãn Tell me now vừa màn hình 320px.

Lưu ý chiều cao vùng cuộn: `.route-content` ở trang Tell me now có PullToRefresh phải kế thừa `height: 100%`, `min-height: 0` và `overflow: hidden` từ main để `.pull-refresh-viewport` giữ chiều cao viewport và tự cuộn. Không để wrapper này giãn theo toàn bộ danh sách. Loader chuyển trang hiển thị trong suốt trực tiếp trên nội dung đang mờ, không có nền hộp/padding/bóng riêng.


### Chụp và đăng Tell me now

`MomentComposer` dùng `MomentCamera` chung trên điện thoại và máy tính có webcam (hướng A). Các điểm tạo khoảnh khắc mở camera, không còn file picker trong luồng này. Ảnh chụp theo khung 4:3, xem lại/chụp lại trước khi đăng; caption, quyền riêng tư chuỗi/từng ảnh và nhạc chung trong ngày được giữ. Khung modal giới hạn theo viewport, nội dung cuộn bên trong và nút đăng luôn sẵn ở cuối. File JPEG chỉ được tải lên khi bấm Đăng; camera dừng sau chụp, khi đóng modal hoặc chuyển sang tab khác. Luồng upload avatar, ảnh bìa và nhóm chat được giữ. Xem [CAMERA.md](CAMERA.md) về quyền camera, xử lý lỗi và giới hạn kiểm chứng.

### Hành trình Tell me now trên hồ sơ

`ProfileJourney` là nội dung chính của hồ sơ trong card nền trắng, cao cố định 520px desktop/500px mobile, có mây xanh pastel và sticker ở hai góc dưới. Toàn bộ 28–31 ngày được bố trí trên đường cong gấp vòng mềm trong một khung; không cuộn riêng để xem hết tháng. ResizeObserver đo vùng bản đồ và tính lại tọa độ/kích thước bubble theo khoảng cách giữa các mốc để vừa bề ngang, giữ đủ chỗ cho pill ngày. Đường nối là các nét tròn ngắn dày 5px, dash 3px/gap 15px. Bubble khóa chiều rộng/chiều cao bằng nhau, không co trong flex, bo tròn 50%, có viền trắng và bóng nhẹ; node trống dùng cùng khung pastel và pill ngày nhưng lòng trắng không ảnh. Ngày gần nhất dùng navy. Chạm ảnh mở `StoryMomentViewer`; hover/chọn phóng nhẹ node, chế độ giảm chuyển động tắt hiệu ứng. Sticker lấy từ `public/brand/stickers/`.

Các khúc cua dùng hai đoạn Bézier một phần tư cung tròn (ellipse khi khung rất rộng), nối tiếp tuyến với đoạn dọc để tránh gãy tại mốc ngày. Các node được phân bổ theo độ dài đường, chọn độ lệch phân bố có khoảng hở tốt nhất và giảm đường kính theo vùng khả dụng; không dùng từng node làm điểm điều khiển đường. Tính toán được memo theo tháng/kích thước bản đồ.

Vuốt trái để sang tháng sau, vuốt phải để xem tháng trước. Mũi tên điều hướng và bàn phím vẫn theo thứ tự thời gian (trái = trước, phải = sau). `enableMonthSwipe` theo dõi chuột/bút bằng pointer ở capture phase trên window, cảm ứng dùng riêng touchstart/move/end non-passive để không xử lý trùng một ngón tay. Khi kéo, track chứa tháng hiện tại và hai tháng kề dịch theo hướng và lực kéo; tiêu đề, điều hướng, footer và kích thước khung đứng yên. Kéo có lực cản 18% (track đi 82% khoảng tay); kéo chậm cần thả ở vị trí vượt 50% vùng tháng mới chuyển. Vuốt nhanh được hỗ trợ khi tốc độ cuối ≥0,85px/ms cùng hướng kéo và đã đi ít nhất min(90px, 22% khung); cử động nhỏ hoặc giữ yên quá 100ms không được tính là vuốt nhanh. Đích đến được đưa vào từ cạnh đối diện, thời gian thả 240–380ms theo quãng đường còn lại, dùng easing giảm tốc. Chỉ cập nhật tháng sau khi trượt xong và reset track bằng layout effect trước khi paint để tránh giật hình. Mũi tên/bàn phím cũng dùng cùng hiệu ứng; khóa chuyển tiếp trong lúc hoàn tất. Ngày ở trang kề có inert/aria-hidden cho đến khi trở thành tháng hiện tại. Ở giới hạn tháng chỉ kéo đàn hồi nhẹ rồi trở về.

Trackpad hai ngón dùng wheel ngang cộng dồn khoảng cách, kéo track theo từng gói input và thả sau 180ms không còn input; áp dụng cùng lực cản/ngưỡng khoảng cách và nhận diện vuốt nhanh, không đổi tháng ngay khi chạm nhẹ. Cuộn dọc, pinch zoom và Ctrl-wheel vẫn hoạt động; click sau kéo được chặn để tránh mở nhầm ảnh, chạm mới vẫn dùng được. Resize/hủy cử chỉ đưa track về trạng thái ban đầu. Reduced motion bỏ hoạt ảnh thả nhưng giữ quy tắc khoảng cách/tốc độ và phản hồi trực tiếp khi kéo. Chỉ cho đi tới tháng kế tiếp tháng hiện tại, không xa hơn; trang này không gọi API và không vẽ đường/node, chỉ hiện sticker cùng lời hẹn “Tháng mới, mình lại có chuyện để kể.” và “Những khoảnh khắc tiếp theo sẽ ở đây.” Tháng hiện tại và các tháng đã qua có bản đồ.

Mốc tháng đầu lấy từ ngày tạo tài khoản (`accountCreatedAt`, quy đổi giờ Việt Nam), không lấy ngày đăng ảnh đầu tiên. Tất cả tháng từ tháng tạo tài khoản tới hiện tại đều có bản đồ đầy đủ, kể cả tháng không đăng ảnh; không đi về trước tháng tạo tài khoản. Chỉ giữ tháng đang xem cùng tối đa hai tháng kề để vuốt, không render toàn bộ lịch sử. IntersectionObserver bật truy vấn khi trang tháng gần/đi vào viewport; ảnh dùng lazy loading, cache tháng có thời gian thu hồi hai phút. `GET /users/:id/journey?month=YYYY-MM` trả tối đa 31 ảnh đại diện/số khoảnh khắc và mốc đầu/cuối được phép xem; quyền chuỗi, quyền ảnh và block được lọc trên server. Chuỗi đầy đủ tải qua API xem ngày khi được mở. Không có danh sách/API bài viết trên hồ sơ.

### Sticker trong tin nhắn

Trong tin nhắn, bộ chọn/gợi ý và bản xem trước chỉ hiện ảnh sticker; nhãn vẫn có trong aria-label/alt.

`TellmeStickerButton` mở popover có tìm kiếm, dùng ảnh chung trong `apps/web/public/brand/stickers/` và danh mục `packages/shared/stickers.mjs`. Bộ Tellme và bộ Bubu (24 biểu cảm cắt từ ảnh gốc) có tab riêng, lấy từ `TELLME_STICKER_PACKS`; hỗ trợ phím mũi tên/Home/End. Tìm kiếm trong bộ đang chọn; chỉ vùng ảnh cuộn, giữ tiêu đề/tab/tìm kiếm ở trên. Khi nhập, `TellmeStickerSuggestions` đề xuất tối đa bốn sticker từ cả hai bộ, khớp từ/cụm từ tiếng Việt có dấu hoặc không dấu. Người dùng có thể ẩn gợi ý, chọn sticker để xem trước, bỏ/đổi sticker hoặc gửi kèm chữ; chọn không tự gửi. API kiểm tra id/đường dẫn theo cùng danh mục và chuẩn hóa metadata ảnh; tin nhắn lưu `stickerId`, DTO và realtime chuyển đầy đủ sang người nhận. Thêm sticker mới theo README trong thư mục ảnh; giữ nguyên id/đường dẫn đã phát hành.

Ô tạo khoảnh khắc đầu Tell me now dùng một vùng bấm với avatar và gợi mở, icon máy ảnh nằm trong cùng field. Trên điện thoại, không có tiêu đề/badge hay nút xuống dòng; chữ giới hạn hai dòng và có phần rộng riêng để không đè icon 44px. Shelf hôm nay dùng tiêu đề Hôm nay đậm, lời giới thiệu ngắn và thẻ nhỏ; khi chưa có ảnh có lời nhắc tạo khoảnh khắc.

### Màn mở đầu thương hiệu

Root layout dùng `BrandIntro` và `brand-intro.css`: nền navy Tellme, ba từ “Tell / me / now” dùng Fredoka Bold 700 dạng bubble, chữ biến mất rồi màn có mép SVG cong co giãn rút lên. Nội dung dịch từ dưới và tăng opacity theo đúng cùng tiến độ/easing của màn (900ms, trễ 1200ms), không hiện đột ngột khi màn rời đi. Font TrueType subset 4,2KB được lưu/preload tại public/brand/fonts/, có giấy phép SIL OFL. Tổng thời gian 2,1 giây; chỉ chạy khi tạo document mới (mở/tải lại trang), không chạy lại khi điều hướng nội bộ. Nút “Vào Tellme” và Escape bỏ qua ngay. Tôn trọng prefers-reduced-motion và tùy chọn giảm chuyển động trong ứng dụng; luôn trả lại tương tác, không giữ transform trên wrapper sau khi xong. CSS tự kết thúc ngay cả khi JS/hydration không chạy; timeout JS dự phòng chỉ chặn tương tác trong lúc intro còn hiển thị. Landing có bản component/CSS tương ứng độc lập để tiếp tục export tĩnh, không phụ thuộc ứng dụng/API.

### Ủng hộ Tellme và chữ trong form

`TellmeSupport` có lời mời nhỏ lần đầu trên Tell me now, không tự mở modal. Trạng thái đã thấy lưu một cờ localStorage theo trình duyệt, không ghi MongoDB hay tạo thông báo/job. Mở lại từ liên kết dưới tagline sidebar hoặc menu tài khoản; khách được xem QR mà không cần đăng nhập. Chi tiết tại [SUPPORT.md](SUPPORT.md).

`form-typography.css` thống nhất nhãn và chữ nhập liệu 15px desktop/16px mobile, gồm hồ sơ, tài khoản, đổi mật khẩu và chỉnh khoảnh khắc. Trường OTP vẫn dùng chữ mã lớn. Camera trước mã hóa ảnh cùng chiều preview. Modal chụp có div cuộn ngoài fieldset, clip khung ngoài để focus không kéo lệch header, footer nền trắng nằm ngoài vùng cuộn.

### Authenticated entry

Middleware chặn yêu cầu `/` và `/community/*` thiếu cookie, chuyển sang đăng nhập cùng `next`. Layout server xác minh cookie qua `/api/session` trước khi render AppShell; cookie tồn tại nhưng giả/hết hạn không cấp quyền. Kết quả kiểm tra không cache; lỗi kết nối/5xx không bị hiểu nhầm thành đăng xuất. API bootstrap cũng yêu cầu phiên, lối vào khách trên AuthScreen và middleware xác thực tùy chọn đã được gỡ.

### Blue daylight and day stacks

`ThemeProvider` nhận theme cookie từ root layout; `ThemeSwitch` dùng artwork chủ dự án cung cấp, giữ lựa chọn một năm. `themes.css` định nghĩa màu sáng/tối và bỏ các panel bọc trên mobile. Không thêm styled-components.

TodayStoryHighlights dùng grid hai cột, cuộn trong `.now-today`. `StoryMomentViewer` thay timeline cũ bằng một chồng ảnh giới hạn theo storyId/người/ngày. Dùng chung MomentCard, StoryReply, reaction hook và native dialog; reply draft tách theo momentId, camera đổi thành send, nhạc/ngày lịch sử/sửa/xóa vẫn giữ. Dialog đóng ở vùng trống và giữ focus native. ReactionBubbles chọn portal host là dialog khi mở từ modal. StoryTimeline, StoryReactions chỉ dùng bởi timeline và các rule CSS cũ đã được gỡ.

PullToRefresh nhường thao tác cho vùng cuộn lồng bên trong khi vùng đó chưa trở về đầu, tránh kích hoạt làm mới khi kéo danh sách Hôm nay về trên. Vùng Hôm nay hỗ trợ bàn phím PageUp/PageDown bên cạnh vuốt và wheel.

### First-view received reaction regression

MomentReactionBurst gắn trên mọi ảnh của chính chủ, dùng history detail chung giữa home/modal. Hiệu ứng received-reaction-burst có 24–40 hạt, xuất phát từ đáy màn hình và portal vào body/dialog; effect chờ BrandIntroFinished và không chạy sau modal che ảnh. Counts được giữ trong sessionStorage với fallback bộ nhớ. Helper received-reactions.ts kiểm tra lượt mới và bộ icon thực nhận; `pnpm --filter @tellme/web test:received-reactions` chạy các ca lần đầu, không lặp, mới tăng, bỏ/thả lại và emoji Unicode mà không kết nối database.
