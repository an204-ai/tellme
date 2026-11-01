# Nhạc của ngày — YouTube và Epidemic Sound

Mỗi document `stories` giữ một lựa chọn `music`, dùng chung cho toàn bộ ảnh trong ngày. Không gắn bài riêng vào từng ảnh. Bài cũ giữ nguyên provider, không cần di chuyển dữ liệu.

## Cấu hình tại gốc workspace

```dotenv
YOUTUBE_API_KEY=
EPIDEMIC_SOUND_API_KEY=
```

Bật **YouTube Data API v3** trong Google Cloud và điền `YOUTUBE_API_KEY`. Key chỉ dùng phía API, không có tiền tố `NEXT_PUBLIC_`, không trả cho browser. Giới hạn key vào YouTube Data API v3 và IP server nếu môi trường có IP cố định; key này không phải key trình duyệt để giới hạn bằng HTTP referrer. Khởi động lại API sau khi đổi `.env`.

## Chọn nguồn và tìm kiếm

- Người dùng chọn **YouTube** hoặc **Epidemic Sound** bằng hai nút trong modal. Kho đã chọn quyết định API key tìm kiếm và provider được lưu; không âm thầm chuyển nguồn khi người dùng đã chọn rõ. Mặc định YouTube nếu có cấu hình, nếu chưa cấu hình mới mặc định nguồn cũ.
- Trước khi trả kết quả lên web, `search.list` luôn có `videoEmbeddable=true`, `videoSyndicated=true`, `regionCode=VN`, danh mục Music và safe search strict. `videos.list` kiểm tra lại public/embeddable, upload đã xử lý xong, không live/upcoming, không giới hạn tuổi, có thời lượng dương và không bị chặn tại VN (bao gồm allow-list rỗng). Giao diện dùng tiêu đề video, tên kênh và thumbnail. Tên kênh là thông tin do YouTube cung cấp, không được giả định là nghệ sĩ đã xác minh.
- Search debounce 350ms; giữ danh sách trong khi tìm, hiển thị loader; cuộn gần cuối mới tải tiếp. Cursor mang provider và từ khóa để không nhầm page token của YouTube với offset Epidemic Sound.
- Cache metadata/kết quả 5 phút có giới hạn dung lượng, gộp request trùng trong một API process. Mỗi trang tiếp theo vẫn là một API request và tiêu quota; nhiều API instance có cache RAM riêng. Theo dõi quota thực tế trong Google Cloud.
- Nếu kho đã chọn lỗi key/quota hoặc kết nối, giao diện báo lỗi và người dùng có thể bấm chọn kho còn lại. API client cũ không truyền provider vẫn giữ dự phòng tự động như trước. Lỗi cấu hình/quota tạm ngừng gọi YouTube 5 phút; kết quả rỗng không kích hoạt dự phòng.
- Khi đã chuyển nguồn, các trang tiếp theo của lần tìm đó giữ nguyên nguồn. Một bài đã lưu không bao giờ bị thay âm thầm bằng bài khác khi provider gặp lỗi.
- Epidemic Sound Developer Free vẫn chỉ được dùng cho prototype local, bị khóa ở production. Dự phòng không vượt qua giới hạn giấy phép này.

## Phát và lưu

YouTube Data API cung cấp metadata, **không cấp URL audio**. Tellme dùng YouTube IFrame Player API trong một khung video hiển thị rõ, có native controls, viewport ít nhất 200×200. Không tách âm thanh, tải audio, giấu iframe, chèn nội dung đè lên player hoặc phát khi tab ở nền. Người dùng bấm phát; trình duyệt có thể yêu cầu bấm thêm nút trong player nếu chặn autoplay. Khung xuất hiện trên màn hình ở desktop/mobile và có nút đóng. Đóng bộ chọn/modal gốc hoặc chuyển tab sẽ dừng phát; chỉ một nguồn nhạc phát cùng lúc.

Danh sách nhạc, nút chọn và dòng tên bài lật với tên kênh/nghệ sĩ được giữ như trước. Khung video YouTube là phần hiển thị cần thêm cho nguồn này. Metadata được kiểm tra mới khi lưu, không dùng kết quả cache để bỏ qua quyền nhúng. Không bắt buộc nghe thử trước khi chọn; người dùng có thể chọn bài, chỉnh đoạn bắt đầu rồi xác nhận ngay. Data API không đảm bảo mọi video sẽ phát ở mọi thời điểm/thiết bị: quyền nhúng có thể đổi hoặc player có giới hạn riêng. Nếu player trả lỗi 100/101/150, web bỏ video khỏi kết quả trong phiên đó; lỗi 153 được thông báo riêng về nhận diện trang phát. Nếu key/quota metadata hết, video đã chọn vẫn có thể mở bằng iframe chính thức, còn việc video có phát được tùy quyền nhúng/khu vực do YouTube quyết định. Video bị gỡ hoặc cấm nhúng sẽ báo lỗi, không tự đổi bài.

`music` tiếp tục có `provider`, `trackId`, `title`, `artists`, `cover`; `provider` nhận `youtube` hoặc `epidemic-sound`. Thêm `metadataUpdatedAt`, `durationSeconds` cho metadata YouTube và `startSeconds` cho mốc người dùng chọn. Metadata hết hạn không xóa mốc bắt đầu. Không lưu key, stream URL hay iframe HTML vào MongoDB. Metadata được làm mới khi mở phát. Media worker dọn title/channel/thumbnail quá 29 ngày trong job sweep hằng giờ; DTO cũng che metadata hết hạn ngay cả khi worker ngừng. ID video đã chọn được giữ để có thể lấy lại metadata khi phát. Client cache tối đa 5 phút.

Epidemic Sound vẫn phát preview HLS chính thức, không tải MP3/master làm dự phòng và không báo cáo preview lặp như một lượt export.

## Chọn đoạn bắt đầu

Bấm “Chọn” để mở thanh kéo và ô phút:giây (cũng đọc được giờ:phút:giây). “Dùng đoạn này” lưu bài và mốc bắt đầu chung cho cả chuỗi; “Nghe đoạn này” là tùy chọn. Mốc là số giây nguyên 0–86400, phải nhỏ hơn thời lượng YouTube. Bài cũ thiếu mốc mặc định 0. Khi bấm phát lại bằng nút Tellme, YouTube dùng `start` và `seekTo`; HLS seek tới mốc lưu và tải các segment từ đoạn đó. Tạm dừng rồi bấm nút Tellme phát lại sẽ quay lại đoạn đã chọn. Native controls vẫn hoạt động bình thường. Khung video trên điện thoại được đặt phía trên vùng chọn mốc để không che thanh kéo/nút xác nhận.

## Endpoint

| Endpoint | Vai trò |
| --- | --- |
| `GET /api/music/config` | Trạng thái cấu hình từng nguồn và nguồn mặc định, không trả key. |
| `GET /api/music/tracks?q=&cursor=0&provider=youtube` | Lấy tối đa 12 ứng viên/trang rồi lọc; trả `provider` và `nextCursor` dạng chuỗi hoặc null. |
| `GET /api/music/tracks/:id/stream?provider=youtube&startSeconds=30` | Trả video ID/metadata cho iframe; nguồn cũ trả HLS và thời điểm hết hạn. |
| `POST /api/stories/moments` | Ảnh đầu nhận `musicTrackId`, `musicProvider` và `musicStartSeconds`; backend xác minh metadata trước transaction. Ảnh tiếp theo giữ nhạc chung. |
| `PUT /api/stories/:id/music` | Chủ chuỗi chọn `{trackId, provider, startSeconds}` hoặc `{trackId:null}` để bỏ nhạc. Client cũ thiếu provider mặc định Epidemic Sound. |
| `GET /api/stories/:id/music/stream` | Kiểm tra quyền xem/block/ảnh khả dụng trước khi trả thông tin phát. Khách chỉ nghe trong chuỗi công khai. |

Ảnh đầu chưa có nhạc vẫn đăng bình thường rồi hiện lời mời chọn nhạc hoặc bỏ qua. Chủ chuỗi có thể thêm/đổi/bỏ bất cứ lúc nào. Các endpoint ghi vẫn kiểm tra đăng nhập/xác thực email/ownership và có rate limit.

## Tài liệu chính thức

- [YouTube search.list và bộ lọc video](https://developers.google.com/youtube/v3/docs/search/list)
- [YouTube videos.list](https://developers.google.com/youtube/v3/docs/videos/list)
- [IFrame API, kích thước và sự kiện](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube Developer Policies, phát và lưu dữ liệu](https://developers.google.com/youtube/terms/developer-policies)
- [Bảo vệ API key Google](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices)
- [Epidemic Sound Free, cache và giấy phép](https://developers.epidemicsound.com/docs/)
