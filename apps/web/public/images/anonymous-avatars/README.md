# Avatar đăng ẩn danh

15 PNG do chủ dự án cung cấp, đã đổi tên ASCII tiếng Anh. Đợt đầu gồm 8 ảnh từ thư mục `avt-andanh` ở gốc; đợt bổ sung gồm 7 ảnh đặt trực tiếp vào thư mục này. Giữ nguyên byte ảnh, độ phân giải và nền trong suốt; không cắt hoặc vẽ lại artwork. Số nguồn trong mỗi đợt là hậu tố số trong tên file gốc.

## Đợt đầu

| Nguồn | Con vật | File đang dùng | Ví dụ bí danh khớp ảnh |
| --- | --- | --- | --- |
| 1 | Gấu nâu | `bear.png` | Gấu nâu ngóng lương |
| 2 | Cú mèo | `owl.png` | Cú mèo mê cà phê |
| 3 | Rái cá | `otter.png` | Rái cá tan ca |
| 4 | Cáo | `fox.png` | Cáo nhỏ tò mò |
| 5 | Mèo | `cat.png` | Mèo mong tan ca |
| 6 | Thỏ | `rabbit.png` | Thỏ thèm trà sữa |
| 7 | Ếch xanh | `frog.png` | Ếch xanh ham vui |
| 8 | Chim cánh cụt | `penguin.png` | Cánh cụt thích chill |

Registry duy nhất: `apps/web/src/lib/anonymous-avatars.ts`. `AnonymousAvatar` dùng chung cho người đăng và bình luận chủ bài, qua Next Image để trình duyệt chỉ tải kích thước avatar phù hợp. Không gắn ảnh cú mèo cho họa mi, chim sẻ hoặc chim non; không gắn ảnh con vật khác cho loại chưa có artwork.

## Đợt bổ sung — đã kết nối

Đã có ảnh riêng cho cả 7 loại trước đây còn thiếu, ứng với 19 bí danh. Hiện **không còn loài nào thiếu avatar** trong bộ tên đang dùng.

| Nguồn đợt 2 | Con vật | File đang dùng | Bí danh khớp ảnh |
| --- | --- | --- | --- |
| 1 | Cá vàng / cá nhỏ | `fish.png` | Cá vàng vui vẻ; Cá nhỏ chill chill; Cá con chờ cơm; Cá vàng ghé chơi |
| 2 | Họa mi | `nightingale.png` | Họa mi hay hót |
| 3 | Chim sẻ | `sparrow.png` | Chim sẻ chăm chỉ |
| 4 | Chim non | `bird.png` | Chim non ngóng nắng |
| 5 | Rùa | `turtle.png` | Rùa rảnh rang; Rùa vừa tan ca; Rùa rủ rê; Rùa thích nghỉ trưa |
| 6 | Sóc | `squirrel.png` | Sóc thích ăn vặt; Sóc xinh xắn; Sóc ngóng cơm trưa; Sóc sắp tan ca |
| 7 | Cún / chó | `dog.png` | Cún con chăm chỉ; Cún chờ cơm trưa; Cún con kể chuyện; Cún thích cuối tuần |

Avatar dùng khung tròn nền trắng, viền xám navy nhạt và khoảng đệm nhỏ; ảnh giữ `object-fit: contain` để không bị kéo giãn. Cùng một kiểu khung được dùng ở bài viết và bình luận tác giả. Nền PNG gốc vẫn trong suốt.

Khi bổ sung loài mới: xác nhận đúng con vật, lưu bằng tên tiếng Anh, rồi thêm đúng species key vào registry. Registry dùng `Record` đầy đủ để TypeScript phát hiện loài bị bỏ sót. Việc bổ sung ảnh không cần đổi bí danh hay cập nhật MongoDB.

## Giữ bí danh nhất quán

API sinh tên theo từng bài, không theo tài khoản. Bài cũ giữ bộ tên v1 và không bị đổi tên khi bổ sung 8 avatar. Bài ẩn danh mới được server gắn `anonymousVersion: 2`, dùng thêm bí danh gấu, rái cá, cáo, ếch, cánh cụt và cú mèo. Không đổi thứ tự hoặc độ dài các bộ tên đã phát hành; thêm ảnh chỉ sửa registry. Avatar ẩn danh không có chấm online hoặc liên kết hồ sơ thật.
