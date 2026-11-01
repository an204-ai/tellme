# Thời tiết quanh bạn

Widget thời tiết xuất hiện tại `/community/today` và `/community/feed`, dùng được khi chưa đăng nhập. Đây là phần mở rộng của giao diện Tellme hiện có: nền trắng, navy và Poppins theo [DESIGN.md](DESIGN.md); lời nhắc theo nhịp đi làm trong [PRODUCT.md](PRODUCT.md) và [VOICE.md](VOICE.md).

## Thiết lập OpenWeather

Tạo API key có quyền dùng **Current Weather Data** và **5 Day / 3 Hour Forecast**. Tại thời điểm đối chiếu 30/10/2026, [bảng giá chính thức](https://openweathermap.org/full-price) liệt kê hai API này trong gói Free, giới hạn 60 request/phút và 1.000.000 request/tháng. Kiểm tra lại giới hạn trên tài khoản khi triển khai.

Điền key vào biến sau trong **`.env` ở gốc repository**, rồi khởi động lại `pnpm dev`:

```dotenv
OPENWEATHER_API_KEY=<key-cua-ban>
```

Key chỉ được API server đọc. Không đặt tên `NEXT_PUBLIC_*`, không đưa vào mã web hay commit `.env`. Trong production, truyền cùng biến qua cấu hình secret của nền tảng và khởi động lại API. `GET /api/weather/config` chỉ cho biết biến đã có giá trị, chưa xác minh key hoạt động.

API gọi `https://api.openweathermap.org/data/2.5/weather` và `/forecast` với `units=metric`, `lang=vi`. Tài liệu nhà cung cấp: [Current Weather](https://openweathermap.org/current), [5 Day / 3 Hour Forecast](https://openweathermap.org/forecast5). Mỗi lần làm mới dự trữ hai lượt gọi; forecast dùng `cnt=8` để chọn lời nhắc về khả năng mưa. Widget hiển thị biểu tượng và nhiệt độ; khi hover có mô tả thời tiết và độ ẩm. Không có bảng dự báo hay panel chi tiết.

## Hành vi giao diện

- Khi nghỉ widget chỉ có biểu tượng, khung 64×48px trên desktop / 56×42px trên mobile. Hover/focus mới mở thành 160×120px / 144×108px (đều 4:3), hiện nhiệt độ cùng hàng biểu tượng, “Hôm nay”, mô tả và độ ẩm. Tự hiện lời nhắc không làm widget phình ra. Không có panel chi tiết hoặc nút con.
- Giữ nền theo thời tiết: nắng vàng, nóng cam, mưa xanh đậm, dông tím, đêm navy, nhiều mây xanh nhạt, lạnh mint, tuyết xanh băng, gió teal; dữ liệu cũ dùng màu trung tính.
- Bấm trực tiếp ô nhiệt độ gọi Geolocation trong thao tác người dùng; không qua modal hoặc nút xin vị trí trung gian. Quyền đã được cấp thì trình duyệt có thể trả vị trí ngay mà không hỏi lại.
- Kéo trực tiếp ô nhiệt độ rồi thả để bám mép gần nhất. Ngưỡng di chuyển 6px phân biệt kéo với bấm; click phát sinh sau kéo bị chặn để tránh xin quyền ngoài ý muốn. Không có nút chọn mép; bàn phím vẫn dùng phím mũi tên để chuyển mép.
- Hover chuột hoặc focus bằng bàn phím hiện lời nhắc trong đám mây trắng có lớp nổi 3D nhẹ và bóng đổ. Ưu tiên phía trên widget, nếu thiếu chỗ thì chọn cạnh còn đủ diện tích và đổi hướng đuôi về widget. Giới hạn theo visual viewport, bên dưới header và phía trên thanh điều hướng mobile; tính lại khi đổi mép, đổi kích thước hay thu phóng. Viewport cực ngắn cho phép đám mây chồng lên widget để giữ nội dung trong màn hình. Bản cập nhật khác thực sự về nhiệt độ, điều kiện, độ ẩm, gió hoặc các mốc dự báo sẽ tự bật đám mây trong 10 giây; bỏ qua timestamp fetch, bản lặp và dữ liệu cũ/lỗi. Lần lấy dữ liệu đầu chỉ thiết lập mốc so sánh. Escape hoặc bắt đầu kéo sẽ tắt lời nhắc tự động; đang kéo không hiện. Không có nút đóng riêng.
- Lỗi mạng/vị trí hiển thị trong lời nhắc và thông báo cho trình đọc màn hình; không mở panel lỗi. Không hiển thị dữ liệu mẫu như thời tiết thật.

Lời nhắc là các câu tiếng Việt xác định sẵn trong `src/lib/weather.ts`, chọn theo điều kiện thực tế: dông, mưa, tuyết, tầm nhìn hạn chế, gió, nóng, lạnh, ban đêm, mây hoặc trời quang. Ngưỡng nóng là cảm giác ≥33°C, lạnh ≤19°C, gió ≥35 km/h. Lời nhắc mang ô cho vài giờ tới chỉ áp dụng khi có mốc dự báo trong 12 giờ tới, xác suất mưa ≥50% và mã thời tiết mưa/dông.

Gợi mở trên Feed, Tell me now, placeholder bài viết và chú thích khoảnh khắc dùng cùng ngữ cảnh thời tiết. Chúng chỉ đổi lời gợi ý, không sửa nội dung người dùng đã nhập. Khi chưa có quyền hoặc dữ liệu đã cũ/lỗi, dùng lại lời gợi mở thông thường; ẩn lời khuyên thời tiết và gợi ý món ăn trên thẻ cũ.

## Vị trí và dữ liệu lưu lại

Lần đầu, người dùng bấm trực tiếp ô nhiệt độ để trình duyệt xin quyền. Geolocation cần HTTPS hoặc localhost; dùng `enableHighAccuracy: false`, timeout 12 giây và chấp nhận vị trí trình duyệt đã có tối đa 10 phút. Không theo dõi liên tục bằng `watchPosition`.

Tọa độ được làm tròn hai chữ số thập phân trước khi gọi API, rồi API làm tròn lại trước khi gọi OpenWeather. Đây là lưới thô khoảng 1 km theo vĩ độ, không phải phép ẩn danh tuyệt đối. Tọa độ giữ trong RAM phía web. Khi đã đăng nhập, cho phép vị trí và bật lời nhắc Tellme, có thêm watch tạm trong Redis 24 giờ để worker cập nhật thời tiết ngay cả khi đóng trang; không ghi vào hồ sơ, bài đăng hay MongoDB. Thu hồi quyền vị trí, đăng xuất hoặc tắt lời nhắc sẽ xóa watch. Nếu thiết bị đang offline lúc thu hồi quyền thì watch phía máy chủ tự hết hạn trong tối đa 24 giờ. OpenWeather nhận tọa độ đã làm tròn từ API server. Request tới `/api/weather` có tọa độ trong query string; khi cấu hình access log/proxy, tránh ghi query vị trí nếu không cần thiết.

| Nơi lưu | Nội dung | Khi xóa/hết hạn |
| --- | --- | --- |
| `localStorage: tellme-weather-location` | Chuỗi `allowed`, ghi sau khi geolocation thành công; không có tọa độ | Thu hồi quyền vị trí hoặc xóa storage |
| `localStorage: tellme-weather-dock` | `{ edge, ratio }` | Người dùng xóa storage; giá trị hỏng trở về dock mặc định bên phải |
| Bộ nhớ web / TanStack Query | Tọa độ thô và báo cáo, query `weather-local` | Ngừng dùng vị trí xóa tọa độ và hủy/xóa query; query không còn observer có `gcTime: 0` |
| Redis phía API | Báo cáo theo khóa ô tọa độ thô, dùng chung giữa người dùng | TTL một giờ |
| Bộ nhớ tiến trình API | Tối đa 256 báo cáo theo ô tọa độ | Loại mục cũ khi vượt giới hạn hoặc khi tiến trình khởi động lại; thời hạn dùng dữ liệu vẫn được kiểm tra riêng |

Sau lần đồng ý, app chỉ tự lấy lại vị trí khi trình duyệt báo quyền đã `granted` **và** cờ `allowed` còn tồn tại. Nếu Permissions API không khả dụng, người dùng bấm ô nhiệt độ để lấy lại vị trí. Người dùng thu hồi quyền tại cài đặt vị trí của trình duyệt; không có nút con trong widget. Nếu trình duyệt hỗ trợ theo dõi thay đổi quyền, tắt quyền sẽ dừng dùng vị trí và xóa dữ liệu local. Cache ô thời tiết dùng chung trên server không gắn với tài khoản.

## API, cache và hạn mức

| Route công khai | Kết quả |
| --- | --- |
| `GET /api/weather/config` | `{ enabled: boolean }`, `Cache-Control: no-store`; không trả key |
| `GET /api/weather?lat=10.77&lon=106.70` | Báo cáo chuẩn hóa; bắt buộc `lat` trong −90…90 và `lon` trong −180…180; `Cache-Control: private, no-store` |

Báo cáo gồm `place`, `observedAt`, `fetchedAt`, `timezone`, `temperature`, `feelsLike`, `humidity`, `windKph`, `conditionId`, `description`, `icon`, `rainMm`, `forecast`, `forecastAvailable`, `stale`. Timestamp dùng milliseconds; `timezone` dùng giây; nhiệt độ °C, gió km/h, `rainMm` từ lượng mưa một giờ gần nhất. Mỗi mốc forecast có `at`, `temperature`, `conditionId`, `icon`, `rainChance` (0…1 hoặc `null` nếu thiếu). API không trả tọa độ hay URL upstream chứa key.

Cache mới trong 15 phút. Các request đồng thời cùng ô tọa độ được gộp trong một tiến trình; Redis chia sẻ kết quả giữa các tiến trình. Web làm mới mỗi 15 phút khi còn ở hai route hỗ trợ, không polling ở background. Khi upstream hoặc hạn mức lỗi, server chỉ dùng lại báo cáo dưới một giờ và đánh dấu `stale`. Web cũng đánh dấu cũ ngay khi refresh lỗi, hoặc khi báo cáo đạt 30 phút tuổi; kiểm tra lại tuổi mỗi phút khi trang đang hoạt động.

Nếu current thành công nhưng forecast lỗi, current vẫn hiển thị với `forecastAvailable: false` và danh sách forecast rỗng. Không suy diễn xác suất mưa còn thiếu. Nếu không có cache còn dùng được, thiếu cấu hình, hết ngân sách hoặc lỗi upstream trả 503 với lỗi tiếng Việt; query sai trả 400. Mỗi lượt gọi upstream timeout sau 7 giây; lỗi/URL fetch thô không đi ra client.

API áp dụng rate limiter ở mức 240 request/phút cho route dữ liệu, với namespace `weather` riêng. Weather không cần đăng nhập nên dùng bucket `guest` chung cho route này, không phải giới hạn riêng từng IP và không tiêu thụ bucket của bảng tin/chat. Ngoài ra ngân sách upstream dành cho weather là **50 lượt/phút và 900.000 lượt/tháng UTC**, chừa khoảng so với gói Free. Hai API dùng chung ngân sách, kể cả khi forecast thất bại. Khi dùng cùng key cho hệ thống khác, phải tính thêm lưu lượng của hệ thống đó.

Redis dùng bộ đếm nguyên tử cho ngân sách chung. Khi Redis không sẵn sàng, production không gọi mới upstream; chỉ còn cache cũ hợp lệ. Dev/test có bộ đếm theo tiến trình. Khi Redis báo ready nhưng không xác nhận được bộ đếm, từ chối gọi mới để tránh vượt ngân sách chưa biết. Cơ chế gộp request không phải khóa phân tán; các instance có thể cùng refresh một ô nhưng vẫn qua ngân sách Redis.

## Nguồn giao diện và phạm vi đối chiếu

Nguồn tham khảo ban đầu do chủ dự án chọn: [mohsinraza0007/lovely-husky-84 trên Uiverse](https://uiverse.io/mohsinraza0007/lovely-husky-84), lưu tại [references/uiverse/weather.html](references/uiverse/weather.html). Giữ thông báo tác giả và giấy phép MIT trong [LICENSES.md](references/uiverse/LICENSES.md#weather-widget) cùng bản phục vụ tại `/licenses/uiverse.txt`.

Yêu cầu mới thay thẻ bung ngang bằng khung 4:3 gọn và tooltip đám mây trắng. `WeatherSymbol` giữ hình học mặt trời/mây/mưa của mẫu; có trăng khi đêm, tuyết và sương/gió theo mã thời tiết. Không phục hồi bảng thông tin hoặc các nút con đã bỏ. CSS nằm riêng trong `styles/weather.css`; không thay token hay hệ thống thiết kế chung.

## Kiểm tra và giới hạn QA

Các lệnh kiểm tra không cần key OpenWeather thật:

```sh
pnpm --filter @tellme/web check-types
pnpm --filter @tellme/api check-types
```

Các tệp kiểm thử tự động đã được xóa theo yêu cầu của chủ dự án; những kết quả dưới đây là lịch sử kiểm tra trước khi xóa. Các lệnh check-types/build phía trên vẫn dùng được.

Kết quả bàn giao 30/10/2026: **48 test web đạt** (gồm bốn ca weather), **năm test API weather đạt**; database build, web production build và kiểm tra kiểu API đạt. Các test backend ngoài phạm vi weather chưa được chạy lại cho thay đổi này.

Bản bàn giao đã được đối chiếu ở cấp source. Cập nhật sau khi chủ dự án điền key thật: đã gọi Current Weather và Forecast trực tiếp, cả hai HTTP200; endpoint `/api/weather` trên API Tellme đang chạy cũng HTTP200, có dữ liệu hiện tại và tám mốc forecast. Kiểm tra dùng tọa độ tham chiếu công khai TP.HCM, không xin vị trí thiết bị hay in key. Có 49 test web đạt sau khi bổ sung kiểm tra khung hover/dock ở viewport hẹp. Chưa có QA render bằng trình duyệt; không có screenshot thời tiết làm bằng chứng. Các kiểm tra dock là kiểm tra hình học hàm thuần, chưa xác nhận thao tác kéo thực tế, kích thước DOM, bàn phím hoặc safe-area trên thiết bị.

Khi có trình duyệt, kiểm tra `/community/today` và `/community/feed` ở desktop, 390px và 320px: lần đầu chỉ bấm ô nhiệt độ mới xin quyền; chấp nhận/từ chối/thu hồi quyền; kéo đủ bốn mép và reload; kéo không gọi Geolocation; hover/focus mở widget; dữ liệu/dự báo đổi tự hiện đám mây, cache lặp không bật lại; Escape ẩn; thu phóng/đổi hướng màn hình; bubble không che ô nhiệt độ; offline/503/quota/forecast lỗi; dữ liệu cũ trở về prompt thường. Kiểm tra Network chỉ gửi key từ API server tới OpenWeather, không có key trong response hoặc bundle web. Không đưa key hay tọa độ người dùng vào ảnh QA.


## Thông báo hệ thống và worker (31/10/2026)

- Notification worker chạy một batch Redis mỗi 10 giây, dùng khóa chia sẻ để không trùng giữa các instance. Registry chỉ giữ người đã dùng ứng dụng trong 7 ngày; không quét toàn bộ collection users để phát lời nhắc.
- Các khung nhắc bắt đầu **08:30, 12:00, 17:30, 21:00**; mỗi khung chỉ có hiệu lực 45 phút, không gửi bù các khung đã qua. Mặc định UTC+7; khi có weather watch thì dùng timezone của OpenWeather. Một mục duy nhất cho mỗi người/ngày/khung giờ nhờ ID ổn định và khóa Redis.
- Worker kiểm tra weather watch khoảng 30 phút/lần với jitter tối đa 2 phút, dùng chung cache và quota OpenWeather với API. Nếu upstream lỗi/stale thì lùi 5–7 phút, không phát thông báo từ dữ liệu cũ. Snapshot đầu tiên là baseline; sau đó so sánh các điều kiện hiện tại và dự báo, không so timestamp fetch. Web vẫn cập nhật 15 phút/lần khi đang xem Feed/Today.
- Web Push thời tiết tối đa **3 lần/ngày**, cách nhau ít nhất **2 giờ** để tránh dồn thông báo. Lời nhắc trong đám mây trên web không chịu giới hạn này. Nội dung push có nhiệt độ, mô tả, lời nhắc phù hợp và mốc dự báo kế tiếp nếu thực sự có dữ liệu; dự báo mưa dùng điều kiện xác suất ≥50% trong 12 giờ.
- Lưu thông báo hệ thống bằng Redis, **tối đa 20 mục/người, TTL 72 giờ**, giữ trạng thái đã đọc nguyên vẹn khi retry. Job dùng BullMQ trực tiếp, xóa khi thành công hoặc sau khi đã hết tám lần thử lại; không giữ lịch sử job nhắc tạm. Không ghi system notice hoặc outbox job mới vào MongoDB. Bộ sưu tập thông báo tương tác hiện có giữ nguyên.
- Bootstrap trộn inbox Redis với thông báo tương tác, sắp xếp mới nhất. Cả chuông thông báo và trang danh sách dùng mascot biểu cảm cùng huy hiệu theo sáng / bữa trưa / chiều / tối / thời tiết, nhãn “Hệ thống”; bấm vào dẫn tới Today.
- Tùy chọn **Cài đặt → Thông báo → Lời nhắc từ Tellme** tắt cả nhắc giờ và cập nhật thời tiết. **Thông báo trên thiết bị** vẫn là quyền Web Push riêng. Chỉ dùng VAPID, không gửi SMTP cho các mục này. Khi chưa cấp quyền push vẫn có inbox trong ứng dụng.
- API mới: `PUT /api/weather/watch` (lat/lon; cần đăng nhập và xác thực email theo chính sách hiện có), `DELETE /api/weather/watch`, `GET /api/notifications/system`. Đọc thông báo vẫn qua `PUT /api/notifications/read`; UUID do server tạo. Không nhận nội dung thông báo hay forecast do client tự khai.

Weather engine thuần chuyển sang `packages/database/src/weather-service.ts`, cache dùng chung tại `weather-cache.ts`; API giữ shim export để các caller cũ tiếp tục dùng được. Policy nhắc ở `system-notice-policy.ts`, lịch/Redis inbox ở `system-notifications.ts`; worker notification gọi cùng các module này. Sau khi cập nhật cần restart `pnpm dev` để API và notification worker dùng bản build database mới.

Kiểm tra cho thay đổi này: 51 test web, 2 test policy và 8 test weather/system API đạt; ba test system chạy với MongoDB/Redis trong namespace riêng, có chạy worker BullMQ thật, kiểm tra inbox, quyền riêng tư, hết hạn, chống trùng, tùy chọn tắt và không có bản ghi Mongo/outbox. VAPID và OpenWeather tắt trong test tích hợp để không gửi tới tài khoản/thiết bị thật. Web production build và kiểm tra kiểu API/database đạt. Chưa có QA render/thiết bị Web Push thực tế do công cụ trình duyệt không khả dụng.

### Thao tác cảm ứng

Widget mở lời nhắn đám mây sau khi ấn giữ 420 ms bằng ngón tay/bút; nhả tay vẫn giữ mở, chạm ngoài hoặc Escape để đóng. Di chuyển hơn 6 px trước ngưỡng giữ sẽ chuyển sang kéo widget và hủy ấn giữ. Một lần giữ đã mở mây không chuyển thành kéo giữa chừng; lần chạm ngắn tiếp theo vẫn xin vị trí. Không gửi yêu cầu vị trí khi giữ hoặc kéo.
