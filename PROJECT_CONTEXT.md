# PROJECT_CONTEXT — Tellme

**Ngày chụp trạng thái:** 01/11/2026  
**Workspace:** `/Users/mac/Documents/hk1-2026/mediatoday/tellme`  
**Mục đích:** Bản bàn giao để tiếp tục công việc trong cuộc trò chuyện mới. Tài liệu này mô tả trạng thái theo tài liệu và mã nguồn đã được xem; hãy kiểm tra code hiện tại trước khi sửa vì workspace đang có nhiều thay đổi chưa commit.

## 1. Sản phẩm và hướng thiết kế

Tellme là mạng xã hội để mọi người lưu và chia sẻ những câu chuyện, khoảnh khắc đời thường. Tinh thần thương hiệu: gần gũi, trẻ trung, khuyến khích lắng nghe và kết nối; màu navy đậm, nền trắng, kiểu chữ Poppins. Nội dung có thể lấy cảm hứng từ ngày đi làm nhưng sản phẩm không giới hạn cho người đi làm.

Các khu vực chính trên web:

- **Tell me now**: đăng ảnh khoảnh khắc bằng camera, xem chuỗi khoảnh khắc theo ngày.
- **Khám phá**: bảng tin/bài viết và nội dung công khai.
- **Tin nhắn**: trò chuyện riêng và nhóm.
- **Trang cá nhân**, **Bạn bè**, **Kho lưu trữ**, **Cài đặt**.
- Khách chưa đăng nhập được xem nội dung công khai; hành động cần danh tính/tương tác yêu cầu đăng nhập.

Quyết định trải nghiệm đã thống nhất qua các lượt làm việc:

- Web là phạm vi runtime hiện tại; mobile native chưa triển khai.
- Tell me now là chụp ảnh trực tiếp bằng camera (điện thoại hoặc camera máy tính), không chọn ảnh từ thư viện trong luồng này. Cần xin quyền camera khi người dùng chủ động mở camera. Ảnh khoảnh khắc hiển thị tỷ lệ phù hợp, mở xem theo ảnh gốc.
- Mỗi chuỗi trong ngày dùng một bài nhạc chung; có thể chọn/thay nhạc, đặt điểm bắt đầu phát. YouTube Data API v3 là nguồn ưu tiên; chỉ hiện video đã kiểm tra có thể nhúng/phát bên ngoài, ưu tiên khu vực Việt Nam. Epidemic Sound là nguồn dự phòng khi cấu hình YouTube không khả dụng; gói free chỉ dành cho thử nghiệm, không coi là quyền dùng thương mại production.
- Cảm xúc dùng bộ ảnh/sticker Tellme đã có, thay nút tim/emoji cũ; giữ thao tác nhấn giữ trên mobile và hover trên desktop.
- Bài ẩn danh dùng tên con vật thân thiện, không lộ mã số trong tên hiển thị; avatar lấy từ bộ con vật tương ứng, không ghép ảnh không đúng loài.
- Follow là quan hệ một chiều; hai bên follow nhau thì thành bạn bè. Nhắn riêng và gửi nội dung trực tiếp chỉ dành cho bạn bè hai chiều, không bị chặn. Tạo nhóm chỉ yêu cầu người tạo là bạn với từng người được mời, không bắt các thành viên mời phải là bạn với nhau.
- Ảnh tải lên giới hạn 50 MB. Khi xóa/thay ảnh, cleanup phải kiểm tra tham chiếu còn được dùng trước khi xóa Cloudinary.
- Hồ sơ có 6 trường “Một chút về mình”: nơi ở, sinh nhật, công việc, sở thích, món ăn trưa yêu thích, đồ uống quen thuộc.

## 2. Cấu trúc và kiến trúc hiện tại

Monorepo pnpm + Turborepo; `pnpm-workspace.yaml` đưa `apps/*`, `packages/*`, `workers/*` vào workspace chính. `tellme-landing/` cố ý là project Next.js riêng, nằm ngoài workspace và có thể deploy độc lập.

| Đường dẫn | Vai trò |
|---|---|
| `apps/web` | Next.js App Router, React, Tailwind; ứng dụng web Tellme. |
| `apps/api` | Hono/Node.js API, REST, xác thực cookie HttpOnly, WebSocket realtime. |
| `apps/admin` | React/Vite dashboard quản trị: tổng quan, người dùng, báo cáo, tác vụ nền. Quyền API dựa trên email trong `ADMIN_EMAILS`. |
| `apps/mobile` | Khung ứng dụng mobile, ngoài phạm vi runtime/triển khai hiện tại. |
| `packages/database` | MongoDB, index/config, Cloudinary lifecycle, Redis/BullMQ, outbox, cache/feed. |
| `packages/shared`, `packages/config`, `packages/ui` | Kiểu/schema dùng chung, config và UI dùng chung. |
| `workers/media-processor` | Xử lý tác vụ media nền. |
| `workers/feed-processor` | Feed/cache tác vụ nền. |
| `workers/notification-processor` | Thông báo/tác vụ nền. |
| `tellme-landing` | Landing page riêng, Next.js trên cổng 3002 ở môi trường dev. |

Luồng backend chính theo `ARCHITECTURE.md`, `docs/BACKEND.md` và phần code đã đối chiếu:

1. Web gọi API; API xác thực phiên, kiểm tra quyền sở hữu, quyền riêng tư, quan hệ bạn bè và block ở phía server.
2. MongoDB là nguồn dữ liệu bền vững. Các thay đổi cần xử lý nền đi qua outbox MongoDB → dispatcher → Redis/BullMQ → worker; retry/backoff và kết quả job có thể quản lý từ admin.
3. Redis dùng cho hàng đợi, cache/pubsub và presence. API khởi động worker/dispatcher hoặc cho phép worker chạy riêng theo scripts triển khai.
4. `/api/realtime` dùng WebSocket cho chat và hiện diện; heartbeat chạy trên socket, không ghi MongoDB mỗi nhịp. Redis giữ lease kết nối (75 giây); chỉ phát sự kiện khi trạng thái đổi online/offline và giới hạn cho bạn bè. Polling là fallback nếu realtime/Redis không hoạt động; `/api/events` SSE được giữ cho client cũ.
5. Cloudinary lưu media. Giphy được proxy qua API. Những endpoint công khai chỉ trả nội dung public sau khi kiểm tra lại quyền, kể cả khi dùng cache.

Các vùng dữ liệu/khái niệm được tài liệu hiện hành nhắc đến gồm users, sessions, posts, stories, conversations, messages, notifications, media, reports, background jobs/outbox và push subscriptions. Cần xem models/indexes thực tế trước khi thêm migration hoặc kết luận collection nào tự dọn.

## 3. Quyền riêng tư, bảo mật và lưu trữ

- Guest đọc chỉ nội dung public; ghi/chia sẻ/tương tác yêu cầu đăng nhập.
- Quyền riêng tư, owner, block và relationship phải kiểm tra ở API, không dựa vào ẩn nút trên frontend.
- Mật khẩu dùng scrypt; token phiên ngẫu nhiên được lưu dạng băm SHA-256 theo tài liệu backend.
- Email chỉ phục vụ xác minh/khôi phục/đổi mật khẩu. Gmail SMTP đã được chọn; quy trình dùng OTP 6 số thay cho link, OTP có thời hạn, resend cooldown, lưu hash và giới hạn yêu cầu. Có email template chung.
- Web Push dùng VAPID; chỉ bật khi đủ cấu hình public/private. Cần HTTPS ở production.
- Thông báo tương tác thông thường lưu theo mô hình hiện có. Nhắc giờ và thông báo hệ thống về thời tiết dùng Redis inbox có giới hạn 20 mục/người và TTL 72 giờ, không ghi Mongo/outbox cho mỗi thông báo. Worker schedule theo giờ Việt Nam, có khóa phân tán, giới hạn push và retry hữu hạn.
- Thông báo thời tiết cần người dùng đăng nhập/xác minh email và đồng ý vị trí khi cần. Không xin vị trí tự động. Có cache và giới hạn tần suất để tôn trọng quota OpenWeather.
- Thư mục/collection `auth_tokens` và `background_jobs` cần được phân biệt với credential bí mật: kiểm tra TTL, retention và worker cleanup thực tế trước khi xóa tay; không xóa dữ liệu production chỉ để làm sạch giao diện.

## 4. Dịch vụ ngoài và biến môi trường

`.env` gốc là nơi giữ cấu hình local. **Không đưa giá trị bí mật vào tài liệu, prompt, commit hay log**; chỉ nêu tên biến. Cần kiểm tra `.env` tồn tại trên máy trước khi chạy vì người dùng từng báo không tìm thấy file. `.env.example` là mẫu placeholder.

Các biến quan trọng (tên có thể thay đổi theo code/config hiện tại, xác nhận trước khi deploy):

- Database/API: `MONGODB_URI`, `MONGODB_DB`, `API_INTERNAL_URL`, `APP_URL`, `WEB_ORIGINS`, `API_HOST`, `PORT`, `NODE_ENV`.
- Redis: `REDIS_URL`.
- Media: `CLOUDINARY_URL`, `MEDIA_ORPHAN_HOURS`.
- Email: `SMTP_URL`, `EMAIL_FROM`.
- Push: VAPID public/private key và subject; `pnpm configure:vapid` tạo cặp khóa nếu chưa có.
- Quản trị: `ADMIN_EMAILS`; không có mật khẩu admin mặc định riêng. Đăng nhập bằng tài khoản được liệt kê và đủ điều kiện xác thực.
- Tích hợp: `GIPHY_API_KEY`, `OPENWEATHER_API_KEY`, `YOUTUBE_API_KEY`, `EPIDEMIC_SOUND_API_KEY`.

Không ghi các giá trị thật từ `.env` vào bản bàn giao. Các key/credential từng được chia sẻ trong hội thoại nên được xem là nhạy cảm; nếu nghi ngờ đã lộ thì chủ tài khoản nên rotate.

## 5. Chạy local / cổng dịch vụ

Node workspace dùng pnpm 9.15.0.

```bash
pnpm install
pnpm dev
```

`pnpm dev` gọi `infra/scripts/dev.mjs`, nạp env gốc, kiểm tra Redis và có thể khởi động Redis qua Docker Compose. MongoDB hiện dùng Mongo Atlas bên ngoài theo cấu hình root `.env`; Redis local cần Docker nếu chưa chạy.

Các lệnh vận hành:

```bash
pnpm infra:up
pnpm infra:down
pnpm db:check
pnpm configure:vapid
pnpm build
pnpm check-types
pnpm lint
```

- Web: `http://127.0.0.1:3000`
- Admin Vite: `http://localhost:3001` (API vẫn chặn nếu email không có trong `ADMIN_EMAILS`).
- API: `http://127.0.0.1:4000`
- Landing riêng: từ root chạy `pnpm --dir tellme-landing dev`, tại `http://127.0.0.1:3002`.

Port đang bị chiếm có thể gây `EADDRINUSE`; kiểm tra tiến trình cũ trước khi khởi động thêm bản dev. Lỗi Mongo `MongoServerSelectionError`/TLS alert 80 chưa đủ để kết luận nguyên nhân; dùng `pnpm db:check`, kiểm tra Atlas Network Access IP allowlist, cluster, URI/credential và mạng/VPN. Không tắt TLS certificate verification để né lỗi.

## 6. Trạng thái landing page và việc tiếp tục ngay

Landing là project riêng để deploy riêng, lấy cảm hứng từ cách trình bày đơn giản, vui, giàu chuyển động của Locket nhưng dùng nhận diện Tellme. Các yêu cầu đã chốt: trang chủ, giới thiệu có đường tới `tellme.my`, một hoặc hai trang bổ sung; app native ghi “sắp ra mắt”; dùng ảnh/sticker đã chuyển vào asset riêng, tên file tiếng Anh; không lặp cùng một ảnh ở nhiều vị trí; nav căn giữa, chữ lớn/đậm hơn và không gạch chân.

**Công việc mới nhất chưa hoàn tất** (ưu tiên tiếp theo, dựa trên 4 ảnh người dùng gửi):

1. Sửa sticker đang bị cắt/che khỏi khung.
2. Section minh họa thứ hai: thay hình/sticker chính bằng cảnh đời thường ở nơi làm việc; sticker chỉ dùng làm chi tiết trang trí xung quanh.
3. Trong mockup điện thoại ở section kế tiếp, tạo nội dung ảnh/post Tellme đời thường, không dùng sticker làm ảnh trong màn hình.
4. Hai section Tell me now phía dưới cũng chuyển phần ảnh chính sang cảnh người thật/ngày thường; tránh dùng sticker làm ảnh chính.
5. Làm mới thẻ iOS/Android “Sắp ra mắt” cho đẹp, cân đối và responsive.

Project đã có ảnh moments ở `tellme-landing/public/moments/` (`after-work.webp`, `coffee.webp`, `lunch.webp` cùng sidecar `.webp.json`). Kiểm tra các asset đó và layout hiện tại trước khi thêm/thay ảnh để không tạo ảnh lặp. Chưa khẳng định build/visual QA của landing đã chạy trong lượt bàn giao này.

## 7. Các việc còn cần rà soát sau landing

- Workspace có **492 mục thay đổi** theo `git status --short` tại thời điểm ghi; branch đang là `main`. Có nhiều sửa đổi, file xóa và asset mới chưa commit. Giữ nguyên tất cả; trước khi chỉnh cần xem `git diff`/`git status`, không reset, checkout, stage hay commit nếu chưa được yêu cầu.
- `.github/workflows/deploy.yml` đang bị xóa trong working tree, còn CI workflow có sửa đổi. Kiểm tra lại hướng triển khai Render và service graph (web, API, admin, workers, Redis) trước khi push/deploy.
- Người dùng từng yêu cầu dọn file test/không cần thiết; nhiều test/QA artefact bị xóa trong working tree. Không kết luận dọn xong khi chưa rà soát đủ; không chạy test nếu chưa được yêu cầu.
- Đối chiếu `.env.example` để chắc không có secret; không đọc/chép giá trị `.env` vào chat.
- Kiểm tra quy trình worker/media/feed/notification và Redis khi cần vận hành, nhưng phân biệt code có tích hợp với dịch vụ đang kết nối/đang chạy thật.
- Rà soát responsive trên viewport phổ biến và thiết bị thật cho modal chụp Tell me now, chat, weather widget, story/timeline và các tab. Người dùng đã báo modal preview sau khi chụp bị tràn ngang trên iPhone 16; các sửa đổi trước đó cần xác minh trước khi kết luận đã ổn.
- Rà soát giao diện admin với API, vai trò/quyền admin, trạng thái backend và dữ liệu thật trước deploy.

## 8. Nguồn sự thật và điểm tài liệu mâu thuẫn

`ARCHITECTURE.md` và `docs/BACKEND.md` mô tả kiến trúc hiện hành; `docs/WEATHER.md` và `docs/MUSIC.md` bổ sung chính sách cho tích hợp tương ứng. Mã nguồn API/database đã thấy đường WebSocket, Redis/BullMQ và worker nên không phải chỉ là scaffold.

`docs/STRUCTURE.md` có các đoạn cũ nói chat/push chỉ polling, admin/workers còn scaffold và database theo thiết kế cũ. Các điểm đó mâu thuẫn với kiến trúc chính và code hiện có; coi file này là tài liệu cũ cần cập nhật, không lấy làm nguồn duy nhất. Việc code tồn tại cũng **không đồng nghĩa** dịch vụ ngoài hoặc production đã được xác minh hoạt động end-to-end.

## 9. Quy tắc tiếp tục làm việc

1. Bắt đầu bằng `git status --short` và đọc file/component liên quan đến yêu cầu mới nhất.
2. Bảo toàn thay đổi chưa commit hiện có; không xóa asset hoặc test thêm nếu chưa hiểu người dùng muốn giữ gì.
3. Không làm lộ secret. API key chỉ đọc phía server khi phù hợp; YouTube player phải tuân thủ chính sách embed/nhận diện của YouTube.
4. Ưu tiên hoàn thiện landing page theo mục 6 trước, rồi xác nhận thay đổi và báo rõ những gì chưa được kiểm tra.
5. Chỉ chạy build/kiểm tra khi người dùng yêu cầu verify hoặc công việc kế tiếp cần thiết và được phép; không khẳng định đã kiểm thử nếu chưa chạy.

