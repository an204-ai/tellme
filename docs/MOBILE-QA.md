# Web mobile regression — 03/11/2026

Phạm vi: picker cảm xúc, chat và bàn phím, modal chuỗi trong ngày, camera, nav nổi và tỉ lệ bảng tin. Giữ Poppins, navy Tellme, API, quyền xem, MongoDB Atlas và dữ liệu production.

## Kiểm tra giao diện thực tế

Dùng Next dev ở cổng 3100, cache riêng `.next-mobile-review`, API fixture tạm thời và ảnh nội bộ. Không đăng bài, gửi tin nhắn hoặc sửa tài khoản thật. Tất cả route/asset fixture được xóa trước khi build production.

| Kiểm tra Chromium | Kết quả |
| --- | --- |
| Bảng tin ở 320, 390, 402, 440, 768, 1440px | Không tràn ngang; nội dung 15px; cột bài tối đa 680px |
| Modal ngày tại sáu chiều rộng trên | Dialog trong viewport, nội dung nằm trong dialog, thông báo nhạc không tràn |
| Thumbnail đầu, giữa, cuối | Đồng bộ ảnh và chỉ số 1/3, 2/3, 3/3 |
| Picker bài viết và khoảnh khắc | Khung 234×54px, năm lựa chọn 44×44px; dùng chung component |
| Chat ở 320, 402, 768, 1440px | Header/composer trong viewport, lịch sử cuộn riêng |
| Touch chat qua Chrome CDP | Vuốt xuống giảm scrollTop để xem tin cũ; vuốt lên tăng scrollTop để về tin mới |
| Giả lập viewport bàn phím: 402×760 → 402×420 khi input focus | `data-keyboard-open=true`, header chat ở y=0, composer kết thúc y=420, input kết thúc y=412; header toàn cục và nav ẩn |
| Camera dùng Canvas stream giả lập | Không có combobox lens; facing `environment` ↔ `user`; 2× digital cho ảnh 600×450 từ video 1200×900 |
| Track zoom có min=1, base=2, max=4 | 0.5× gọi hardware zoom=1; camera trước 2× gọi zoom=4 |
| Chụm hai ngón camera qua Chrome CDP | Zoom thay đổi liên tục theo khoảng cách hai ngón |

Ảnh local trong `.impeccable/review/`: `iphone-timeline-refined.png`, `iphone-chat-keyboard-refined.png`, `desktop-feed-scale-refined.png`. Dữ liệu trong ảnh chỉ là fixture kiểm tra, không đưa vào Git/runtime.

## Kiểm tra có thể chạy lại

```sh
node --test apps/web/src/lib/camera.test.mjs
pnpm --filter @tellme/web check-types
TELLME_LOW_MEMORY_BUILD=1 pnpm --filter @tellme/web build
```

Kết quả cuối: 4/4 test camera thành công; TypeScript exit 0; build production Next.js thành công, tạo đủ 23 trang tĩnh và các route động. Bản build không có route API hay trang camera giả lập. `git diff --check` thành công.

Test camera kiểm tra crop 4:3, crop 2× ở giữa, giới hạn kích thước, zoom không hợp lệ, selfie mirror và khớp tọa độ preview/ảnh chụp. Không yêu cầu webcam hay truy cập database.

## Giới hạn và xác nhận trên thiết bị

Các phép thử responsive và touch ở trên dùng Chromium, không phải Safari trên iPhone vật lý. Việc thu viewport chỉ mô phỏng ảnh hưởng của bàn phím, không mở bàn phím iOS thật. Stream/capability camera là giả lập; quyền camera, lựa chọn ống kính của Safari và chất lượng ảnh cần kiểm tra thêm trên iPhone 17 Pro sau deploy.

Trên iPhone, mở lại picker ở feed/modal; nhập và đóng bàn phím chat; vuốt hai hướng; thử camera trước/sau, 1×/2×, chụm zoom và so preview với ảnh chụp. 0.5× phụ thuộc capability mà Safari trả về; nếu không hỗ trợ thì ẩn mức này thay vì hiển thị lựa chọn không hoạt động. Giữ khả năng pinch-zoom trang ngoài viewfinder.
