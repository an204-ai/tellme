# Backend Tellme

Backend dùng MongoDB Atlas, Cloudinary và Redis/BullMQ. Mọi workspace đọc chung một file `.env` ở gốc repository. Không lưu khóa trong app, tài liệu hay Git.

Thời tiết dùng `OPENWEATHER_API_KEY` phía server, Current Weather và 5 Day / 3 Hour Forecast của gói Free. Xem [WEATHER.md](WEATHER.md) cho thiết lập `.env` gốc, endpoint công khai, cache/ngân sách Redis, quyền riêng tư và kiểm thử.

## Cấu hình và chạy

1. Tạo `.env` gốc từ mẫu `.env.example` rồi điền thông tin dịch vụ của bạn.
2. Cài dependencies bằng `pnpm install`.
3. Chạy `pnpm dev` ở thư mục gốc.

Lệnh phát triển khởi động Redis bằng Docker Compose nếu chưa có Redis tại `REDIS_URL`, sau đó chạy web, API, admin và worker. Cần Docker Desktop cho Redis local. Có thể khởi động/dừng Redis riêng bằng `pnpm infra:up` và `pnpm infra:down`.

| Dịch vụ | Mặc định |
| --- | --- |
| Web | `http://127.0.0.1:3000` |
| Admin | `http://127.0.0.1:3001` |
| API | `http://127.0.0.1:4000` |
| Health | `GET /health` |

Biến chính được khai báo trong `.env.example`: `MONGODB_URI`, `MONGODB_DB`, `CLOUDINARY_URL`, `GIPHY_API_KEY`, `REDIS_URL`, `API_INTERNAL_URL`, `APP_URL`, `WEB_ORIGINS`, `PORT`, `API_HOST`, `NODE_ENV`. `SMTP_URL`/`EMAIL_FROM` bật gửi email; `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` bật Web Push; `ADMIN_EMAILS` cấp quyền API quản trị. `MEDIA_ORPHAN_HOURS` điều chỉnh thời gian lưu media chưa có tham chiếu trước khi sweeper dọn.

Đặt `NODE_ENV=production`, origin HTTPS chính xác và truyền secrets bằng môi trường của nền tảng khi triển khai. `.dockerignore` loại `.env` khỏi image. Compose phát triển `infra/dev/compose.yaml` chỉ khởi chạy Redis; production dùng `infra/deploy/compose.yaml` cho Redis, web, landing, admin, API và workers, còn API/worker kết nối MongoDB Atlas hiện tại bằng `MONGODB_URI`. Không có MongoDB container, replica set trên VPS hay bước migration/reset database trong stack này. Hướng dẫn domain/biến môi trường/Atlas Network Access: [infra/deploy/README.md](../infra/deploy/README.md). Dockerfile API/worker dùng chung giữ tại `infra/docker/`; script phát triển ở `infra/scripts/`. Redis dev giữ project `docker` và volume cũ sau khi chuyển đường dẫn. Production yêu cầu `ADMIN_EMAILS` thực tế, không còn email mặc định; bỏ trống sẽ bị Compose từ chối. Kết quả build/TypeScript và thử RAM tại [infra/deploy/REVIEW.md](../infra/deploy/REVIEW.md).

## Truy cập và đăng nhập

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`; `GET /api/auth/me`.
- Khách không đăng nhập được phép đọc bootstrap công khai, feed/bài public, chuỗi ảnh public và hồ sơ public. `/community/today` và `/community/feed` có thể xem trước khi đăng nhập.
- Ghi bài, bình luận, reaction, follow, chat, upload, thông báo, cài đặt và các nội dung cá nhân yêu cầu session hợp lệ.
- Bài/chuỗi ảnh connections chỉ hiển thị khi hai người follow lẫn nhau; chặn áp dụng hai chiều. API kiểm tra quyền trước khi tạo DTO.
- Session nằm trong cookie HttpOnly/SameSite=Lax; production bật Secure. DB chỉ lưu SHA-256 của token ngẫu nhiên; mật khẩu dùng scrypt.

## Các route nghiệp vụ

Tất cả route dưới `/api`; JSON trừ upload multipart.

| Nhóm | Route tiêu biểu |
| --- | --- |
| Public read | `GET /bootstrap`, `/posts`, `/posts/:id`, `/stories/:id`, `/users/:username`, `/users/:id/activity` |
| Người dùng | `PATCH /users/me`, `PUT /users/me/settings`, `PUT/DELETE /users/me/push-subscription`, `PUT /users/:id/follow`, `/block` |
| Bài viết | `POST/DELETE /posts`, reaction, save, share, comments, hide, report |
| Tell me · Tell you | `POST /stories/moments`, phản ứng và xóa mốc ảnh |
| Tin nhắn | Tạo hội thoại; đọc/gửi tin; đánh dấu đã đọc; hỗ trợ trả lời một mốc ảnh bằng `storyReply: {storyId,momentId}` |
| Media | `POST /media/upload`, `GET /media/giphy` |
| Admin API | Tổng quan, `/admin/infrastructure`, `/admin/audit`, `/admin/analytics`, người dùng/chi tiết/thao tác, nội dung/kiểm duyệt, job/retry, báo cáo/xử lý và dựng bảng tin. Hộp thông báo có phân trang `/notifications/inbox`, nhóm theo người gửi/loại; 7 ngày gần nhất tải trước, lịch sử cũ tải khi người dùng chọn xem thêm. Chỉ email quản trị đã xác thực trong `ADMIN_EMAILS`. Xem [ADMIN.md](ADMIN.md). |
| Kho lưu trữ | `GET /archive?view=saved\|hidden&cursor=0&limit=12` gộp bài viết và chuỗi; `DELETE /posts/:id/hidden`, `DELETE /stories/:id/hidden` hiện lại từng mục. Luôn kiểm tra quyền xem hiện tại và quyền từng ảnh trước khi phân trang. |

Admin web: mở `http://127.0.0.1:3001` khi chạy `pnpm dev`, hoặc chạy riêng `pnpm --filter @tellme/admin dev`. Dùng tài khoản Tellme riêng có email đã xác thực và nằm trong `ADMIN_EMAILS` ở `.env` gốc; không có mật khẩu admin mặc định. Danh sách phân trang 20 mục. Vite proxy `/api` tới `API_INTERNAL_URL`, dùng session HttpOnly và kiểm tra origin; `ADMIN_APP_URL` phải đúng origin khi triển khai. Đổi `.env` cần khởi động lại API. Có tạm khóa/mở khóa/thu hồi phiên, ẩn/khôi phục nội dung, xử lý báo cáo, retry job và nhật ký có lý do. Log ứng dụng giữ 7 ngày; thống kê hoạt động bắt đầu ghi từ khi triển khai, không có lịch sử trước đó. Dữ liệu job không trả payload/error thô; API không trả password hash/token hoặc nội dung chat riêng. Cách vận hành, quyền hạn, giới hạn đo lường và kiểm thử tại [ADMIN.md](ADMIN.md).

Hồ sơ có 6 mục tự chọn: `location`, `birthday` (YYYY-MM-DD), `occupation`, `interests`, `favoriteLunch`, `favoriteDrink`; API kiểm tra độ dài và ngày hợp lệ. `GET /users/:username` trả thêm `followersCount`/`followingCount` tính từ quan hệ thật, bỏ các quan hệ chặn hai chiều.

Input được xác thực lại bằng Zod. API lấy actor từ session, kiểm tra quyền trên MongoDB và trả lỗi JSON có status HTTP phù hợp. Upload được giới hạn ở 50 MB mỗi ảnh; endpoint cho phép thêm multipart metadata. Các định dạng được xác định bằng chữ ký file, gồm JPEG, PNG, WebP, GIF, AVIF, HEIC/HEIF, BMP và TIFF. Khả năng Cloudinary nhận/biến đổi file phụ thuộc tài khoản Cloudinary.

## MongoDB và media lifecycle

`@tellme/database` quản lý các collections `users`, `sessions`, `posts`, `stories`, `conversations`, `messages`, `notifications`, `media`, `reports`, `background_jobs` và `push_subscriptions`, cùng indexes/TTL.

Ảnh chỉ được gắn vào nội dung nếu URL thuộc media của người đăng. Khi xóa bài/mốc ảnh hoặc thay avatar/bìa, transaction ghi cleanup job vào outbox cùng thay đổi dữ liệu. Worker rà tham chiếu từ bài, stories và hồ sơ trước khi gọi Cloudinary destroy; nếu URL còn được dùng thì giữ lại. Sweeper chạy định kỳ để xử lý ảnh mồ côi hoặc cleanup job đã gián đoạn. Ảnh mới được đưa vào Cloudinary với kích thước gốc, worker tạo URL thumbnail/feed và blurhash.

## Redis, outbox và worker

Ghi tác vụ nền đầu tiên vào `background_jobs` trong MongoDB để thao tác chính không mất yêu cầu khi Redis tạm thời ngắt. Dispatcher đưa outbox vào BullMQ; BullMQ dùng retry exponential backoff, worker ghi `completed`/`failed`, API admin có thể retry job lỗi.

Ba worker:

- `@tellme/worker-media`: biến thể ảnh và dọn Cloudinary media.
- `@tellme/worker-feed`: feed public cache và thống kê chủ đề.
- `@tellme/worker-notification`: thông báo in-app, Web Push và email bảo mật sau khi thay đổi mật khẩu.

Worker heartbeat được lưu trong Redis để `/api/admin/status` có thể báo worker đang hoạt động. Realtime gửi sự kiện qua WebSocket `/api/realtime` và Redis Pub/Sub; nếu Redis không kết nối, web tiếp tục polling, ẩn chấm xanh chưa xác nhận và job outbox vẫn đợi dispatcher. SSE `/api/events` chỉ giữ để tương thích client cũ.

## Email và Web Push tùy chọn

Không có SMTP hoặc VAPID keys thì các kênh đó tắt, các thông báo trong ứng dụng vẫn hoạt động. Khi bật VAPID, web đăng ký service worker, xin browser permission và gửi subscription lên API. API chỉ lưu subscription từ endpoint HTTPS của các nhà cung cấp push phổ biến; hủy đăng ký xóa subscription của đúng user. Subscription hỏng bị dọn sau phản hồi 404/410.

## Lệnh workspace

```sh
pnpm dev
pnpm check-types
pnpm build
```

Các tệp kiểm thử và lệnh test đã được xóa theo yêu cầu của chủ dự án. Kiểm tra workspace bằng `pnpm check-types` và `pnpm build`.


## Xác thực email, mật khẩu và Web Push

SMTP chỉ dùng cho xác thực email, quên mật khẩu và thông báo sau khi đổi mật khẩu; không gửi email lượt thích, bình luận hay tin nhắn. Các job `notification.email` cũ được xử lý mà không gửi mail. Luồng tương tác vẫn tạo thông báo trong ứng dụng và enqueue Web Push nếu có VAPID.

- Đăng ký mới tạo phiên và gửi email xác thực. Tài khoản mới phải xác thực trước khi đăng hoặc tương tác; tài khoản cũ không bị khóa hồi tố.
- `GET /api/auth/account`: email, trạng thái xác thực và khả năng gửi email.
- `POST /api/auth/resend-verification`: gửi lại, cách nhau ít nhất 60 giây.
- `POST /api/auth/verify-email` yêu cầu phiên đăng nhập và nhận `{ code }`: OTP 6 số, hạn 10 phút, dùng một lần, tối đa 5 lần nhập; gắn với tài khoản đang đăng nhập.
- `POST /api/auth/forgot-password` nhận `{ email }`: luôn cùng phản hồi cho email tồn tại/không tồn tại; gửi mã 6 chữ số, hiệu lực 10 phút, gửi lại sau ít nhất 60 giây.
- `POST /api/auth/verify-reset-code` nhận `{ email, code }`: xác nhận mã, tối đa 5 lần thử cho một mã (tính nguyên tử cả khi gọi đồng thời), trả grant bí mật chỉ dùng trong bộ nhớ của web.
- `POST /api/auth/reset-password` nhận `{ token, password }`: token là grant 10 phút sau xác nhận mã; đổi mật khẩu, xác nhận quyền sở hữu email, thu hồi mọi phiên và token cũ.
- `POST /api/auth/change-password` nhận `{ currentPassword, password }`: xác minh mật khẩu hiện tại, thu hồi phiên/token cũ, cấp phiên mới cho thiết bị đang dùng.

MongoDB chỉ lưu SHA-256 của token xác thực email/grant và HMAC-SHA-256 của mã khôi phục với nonce riêng cùng `AUTH_CODE_SECRET` nằm ở server. TTL index trên `auth_tokens.expiresAt`; mọi truy vấn đều kiểm tra hạn dùng. Mã sinh bằng `crypto.randomInt`, đủ 6 số kể cả số 0 ở đầu. Sau 5 lần thử không thể xác nhận mã nữa; gửi lại thay thế mã/grant cũ. Chỉ sau khi xác nhận đúng mới có grant ngẫu nhiên 256-bit để đặt mật khẩu; grant dùng một lần và không đặt trong URL hoặc localStorage. Các link khôi phục cũ không còn dùng được. Thay mật khẩu và tiêu thụ grant thực hiện trong cùng transaction, đồng thời thu hồi phiên/token cũ.

Đăng ký và khôi phục dùng chung `issueAccountCode` / `reserveCodeAttempt`, tách mục đích mã khi HMAC. Xác thực email tiêu thụ mã và cập nhật tài khoản trong transaction; khôi phục đổi mã đúng thành grant. API gửi mã qua SMTP trực tiếp, không lưu bản thô trong outbox. Thư thông báo thay đổi mật khẩu đi qua notification worker. Link xác thực email cũ được thay bằng OTP; tài khoản chưa xác thực có thể yêu cầu mã mới.

Mọi email tài khoản dùng `renderAccountEmail` trong `packages/database/src/account-email.ts`: cùng header Tellme/navy, bố cục responsive và footer, gồm bản HTML và plain text. Mail xác thực email và khôi phục đều dùng khối mã OTP; mail cảnh báo đổi mật khẩu dùng nút hành động. Các dữ liệu chèn vào HTML đều được escape. SMTP chưa cấu hình thì đăng ký mới/yêu cầu email báo chưa sẵn sàng.

### Gmail và VAPID

Điền vào **.env gốc**:

```dotenv
SMTP_URL=smtps://YOUR_GMAIL%40gmail.com:APP_PASSWORD@smtp.gmail.com:465
EMAIL_FROM=Tellme <YOUR_GMAIL@gmail.com>
VAPID_SUBJECT=mailto:YOUR_GMAIL@gmail.com
AUTH_CODE_SECRET=RANDOM_SERVER_SECRET_AT_LEAST_32_CHARACTERS
```

App Password lấy tại Google Account → Security → 2-Step Verification → App passwords. Bỏ khoảng trắng trình bày của App Password; mã hóa URL nếu thông tin đăng nhập chứa ký tự đặc biệt. Không đưa thông tin thật vào `.env.example` hoặc commit `.env`.

### Giúp OTP vào hộp thư đến

Mẫu OTP có cả HTML và plain text, nhưng mã nguồn không thể bảo đảm email sẽ vào Inbox: Gmail và các nhà cung cấp khác còn đánh giá xác thực domain gửi, uy tín domain/IP và phản hồi của người nhận. Khi dùng domain riêng:

1. Xác minh `tellme.my` tại nhà cung cấp SMTP và dùng địa chỉ From cùng domain, ví dụ `noreply@tellme.my`.
2. Thêm đúng các bản ghi SPF và DKIM do nhà cung cấp SMTP cấp vào DNS của domain. Nếu đã có SPF, hợp nhất nguồn gửi vào bản ghi hiện tại; không tạo thêm SPF thứ hai.
3. Thêm DMARC ở `_dmarc.tellme.my`, bắt đầu với chính sách giám sát `p=none` và địa chỉ nhận báo cáo do bạn quản lý. Chỉ tăng mức xử lý sau khi đã xác nhận mọi nguồn gửi Tellme đều hợp lệ.
4. Gửi thử đến Gmail, mở “Hiển thị thư gốc” và xác nhận SPF, DKIM, DMARC đều `PASS`; kiểm tra domain xác thực khớp với `EMAIL_FROM`.

Không tự điền giá trị SPF/DKIM theo ví dụ trên mạng: các giá trị phải lấy từ đúng nhà cung cấp đang được đặt trong `SMTP_URL`. Google cũng khuyến nghị cấu hình SPF, DKIM, DMARC và căn chỉnh domain gửi; việc này giúp giảm khả năng vào spam nhưng không bảo đảm tuyệt đối [theo hướng dẫn gửi thư của Gmail](https://support.google.com/mail/answer/81126).

`pnpm configure:vapid` tạo cặp khóa VAPID trong `.env` nếu chưa có, giữ nguyên cặp đã tồn tại. Khóa private chỉ dùng ở server/worker; bootstrap chỉ trả public key. Khởi động lại API và worker sau khi sửa .env. Trên web, vào Cài đặt → Thông báo trên thiết bị để cho phép thông báo. Máy chủ production cần HTTPS; iOS cần thêm web vào màn hình chính theo khả năng Web Push của thiết bị.

Các kiểm tra bảo mật dùng database QA ngẫu nhiên và SMTP sink cục bộ, không gửi email tới địa chỉ thật.

`AUTH_CODE_SECRET` là bí mật server riêng để bảo vệ mã khôi phục; tạo bằng `crypto.randomBytes(32).toString("hex")`. Giữ trong `.env` gốc, không xuất ra web hoặc thay khi còn phiên khôi phục đang dùng.


`GET /api/stories?cursor=0&limit=6` phân trang chuỗi khoảnh khắc qua mọi ngày, cho phép guest. Quyền chuỗi, chặn, ẩn và quyền từng ảnh được áp dụng trước skip/limit; chuỗi không còn ảnh có thể xem bị loại trước phân trang. Trả `items`, `people` và `nextCursor`. `/api/stories/saved` vẫn yêu cầu đăng nhập. Không sửa quyền riêng tư dữ liệu để tăng số chuỗi khách nhìn thấy.

Trường cũ `breakTime` được giữ tương thích trong database/API input nhưng không còn hiển thị trên hồ sơ. Không tự chuyển nội dung giờ nghỉ cũ sang món ăn trưa để tránh đổi sai ý nghĩa thông tin người dùng.

Quyền chat được thực thi trong API: chat riêng yêu cầu hai người follow hai chiều, không có block. Khi tạo nhóm, mỗi người được mời chỉ cần là bạn bè hai chiều của người tạo; người được mời không cần follow nhau. Sau khi tạo, quyền gửi tin/chia sẻ vào nhóm dựa trên thành viên hiện tại, tài khoản khả dụng và không có block; bỏ follow không tự xóa tư cách thành viên. Có chung nhóm không mở quyền nhắn riêng với người lạ. Bootstrap trả `canMessage` theo đúng quy tắc này; API vẫn kiểm tra lại khi gửi text, chia sẻ bài viết và trả lời khoảnh khắc. Không xóa lịch sử hay quan hệ người dùng khi áp dụng quy tắc.

### Avatar nhóm và bộ cảm xúc

`POST /conversations` nhận `avatar` cho nhóm: một trong 6 đường dẫn preset được cho phép hoặc URL media do người tạo upload. Bỏ trống dùng avatar nhóm mặc định. Transaction `withMediaChange` kiểm tra quyền sở hữu và lưu tham chiếu ảnh cùng nhóm; worker cleanup/sweeper kiểm tra cả `conversations.avatar`, giữ ảnh khi nhóm vẫn đang sử dụng. DTO hội thoại trả lại avatar và WebSocket báo cập nhật cho thành viên.

API ghi cảm xúc nhận `like`, `love`, `haha`, `wow`, `sad` hoặc `null` để bỏ. DTO chuẩn hóa dữ liệu cũ khi đọc (`cheer → like`, `celebrate → wow`, `appreciate → love`, `smile → haha`) mà không thay đổi dữ liệu gốc. DTO bài viết có `reactorReactions` để danh sách người phản ứng hiển thị đúng artwork.

### MongoDB bị mất kết nối / TLS alert 80

Chạy `pnpm db:check` ở gốc để ping bằng chính cấu hình `.env`, không đọc/ghi dữ liệu và không in URI hoặc mật khẩu. `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` là kết nối TLS bị ngắt; riêng log này chưa xác định được lỗi IP Access List, cluster hay đường truyền/VPN. Kiểm tra IP public hiện tại trong Atlas Network Access, trạng thái cluster, rồi thử mạng khác nếu vẫn lỗi. Không tắt xác minh chứng chỉ hoặc hạ phiên bản TLS để che lỗi.

API và cả ba worker dùng chung `waitForDatabase`: lỗi kết nối tạm thời sẽ thử lại với thời gian chờ tăng dần 1–30 giây kèm jitter. Lỗi xác thực/cấu hình không bị lặp vô hạn. API mở cổng HTTP ngay khi khởi động và trả `503` + `Retry-After` trong lúc chờ MongoDB; sau khi kết nối và khởi tạo dịch vụ xong, API phục vụ bình thường. Khi đã chạy, MongoDB driver tiếp tục quản lý reconnect; lỗi kết nối của request trả 503 và log nguyên nhân rút gọn tối đa một lần mỗi 30 giây. Worker không khởi tạo consumer hoặc lên lịch job trước khi database sẵn sàng. `Ctrl+C` hủy quá trình chờ và đóng kết nối.

### Thông tin và quản lý hội thoại

`conversation.routes.ts` bổ sung:

| API | Chức năng |
| --- | --- |
| `PATCH /conversations/:id` | Trưởng nhóm đổi tên/avatar; ảnh upload được kiểm tra sở hữu, ảnh cũ được lên lịch cleanup |
| `POST /conversations/:id/members` | Trưởng nhóm thêm bạn bè hai chiều của mình; nhóm tối đa 30 người; không có block |
| `DELETE /conversations/:id/members/:userId` | Trưởng nhóm xóa người khác hoặc thành viên tự rời (`me`); chuyển trưởng nhóm khi cần |
| `PUT /conversations/:id/preferences` | Tắt/bật thông báo cho người đang đăng nhập, không ảnh hưởng thành viên khác |
| `GET /conversations/:id/search` | Tìm nội dung (`q`) hoặc nội dung chia sẻ (`shared=true`), mỗi trang 20 tin và cursor `(at, id)` ổn định |

DTO trả `ownerId` (alias `me` khi là chính mình) và `muted`; nhóm cũ chưa có owner dùng người đầu danh sách thành viên. Lịch sử nhóm còn 2 người vẫn hoạt động sau khi thành viên khác rời. Thành viên bị xóa/rời không được tìm, xem hay gửi tin qua ID cũ. Nhóm không còn ai được xóa cùng tin nhắn và enqueue cleanup avatar trong cùng transaction. Kiểm tra trưởng nhóm, quyền sở hữu ảnh, giới hạn thành viên và tài khoản chặn ở backend. Truy vấn tìm kiếm escape ký tự regex và đọc toàn lịch sử, độc lập với 50 tin đang tải ở bootstrap. Preview khoảnh khắc chia sẻ kiểm tra cả quyền chuỗi và quyền riêng từng ảnh tại thời điểm đọc.


### Trạng thái hoạt động và WebSocket

`GET /api/realtime` nâng cấp WebSocket trên chính API HTTP/1, dùng cookie HttpOnly đã có. Server kiểm tra Origin trong WEB_ORIGINS và session MongoDB lúc bắt tay; không nhận userId hay danh sách người cần theo dõi từ client. Next external rewrite hỗ trợ upgrade; proxy triển khai phải chuyển tiếp Upgrade/Connection (đã có mẫu trong infra/deploy/nginx/web.conf và infra/deploy/nginx/admin.conf). Tối đa 8 socket/tài khoản, frame 1 KB, có giới hạn tần suất và đóng client nhận quá chậm. Đăng xuất thu hồi socket theo session; đổi/khôi phục mật khẩu thu hồi các socket cũ.

Client dùng một kết nối cho cập nhật chat, feed, thông báo, hồ sơ và presence. Heartbeat `h` / xác nhận `p` rất nhỏ, mỗi lần cách 22–32 giây với jitter mới; reconnect có backoff và jitter. Heartbeat không tạo HTTP và không đọc/ghi MongoDB. Query metadata đối soát mỗi 60 giây khi realtime khỏe, quay về 10 giây khi lỗi; đây là polling dữ liệu dự phòng, không phải heartbeat.

RedisPresence giữ sorted set lease theo user và connectionId, TTL 75 giây; index toàn cục chứa hạn lease mới nhất. Lua gia hạn/rời kết nối/prune và publish online ↔ offline trong một bước nguyên tử. Gia hạn không publish lại. Đóng một tab chỉ xóa lease của tab đó, không làm tài khoản offline nếu còn tab/thiết bị khác. Sweeper mỗi khoảng 5–7 giây dọn lease quá hạn của cả API server bị chết; nhiều API cùng sweep vẫn chỉ publish một lần. Tất cả node dùng chung prefix từ MONGODB_DB và Redis.

Server lấy lại danh sách follow hai chiều, loại block ở cả hai phía khi gửi chuyển trạng thái; thao tác follow/block phát `relations` để gửi snapshot quyền mới cho cả hai người. Snapshot và delta có revision Redis để client bỏ thay đổi đến trễ. Client không làm mới query khi nhận heartbeat/presence; Zustand chỉ cập nhật avatar liên quan. Mất socket/Redis thì xóa trạng thái chưa xác nhận thay vì giữ chấm xanh cũ; resync qua socket có jitter khi dịch vụ hồi phục. Không có lastSeen ghi định kỳ vào MongoDB, không tạo collection presence hay background job cho heartbeat.

Các kiểm tra realtime trước đây đã dùng database/namespace riêng và dọn sau khi chạy; hiện các tệp kiểm thử đã được gỡ theo yêu cầu.


Thông báo nhắc giờ/thời tiết dùng Redis inbox có TTL và BullMQ trực tiếp, không ghi MongoDB outbox; xem lịch, giới hạn gửi, consent vị trí và kiểm tra trong [WEATHER.md](WEATHER.md#thông-báo-hệ-thống-và-worker-31102026).
