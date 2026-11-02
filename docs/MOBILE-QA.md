# Mobile layout và độ phản hồi — 03/11/2026

Phản hồi thiết kế: khôi phục desktop/laptop về tỷ lệ trước `aaf3f80`, chỉ tinh chỉnh bố cục điện thoại. Bỏ các badge số thứ tự, dòng mô tả, câu kết mới trong modal chuỗi từ `aaf3f80`. Giữ bản sửa picker, bàn phím, cuộn chat, camera và nav nổi.

## Kiểm tra bố cục

Dùng Next dev với cache riêng `.next-mobile-polish` và API giả lập tại localhost:4101. Không truy cập Atlas, không thao tác tài khoản thật. Ảnh/dữ liệu fixture và công cụ đo chỉ phục vụ QA; xóa trước build production.

| Kiểm tra | Kết quả |
| --- | --- |
| Feed tại 320, 390, 402, 440px | Không tràn ngang; bài viết rộng bằng viewport; nội dung 15px |
| Desktop 1440px | Cột giữa và bài viết cùng rộng 805px; max-width none; margin trái 0; nội dung 16px/29.6px; padding header bài 19px 20px 12px như trước aaf3f80 |
| Profile tại 320/402px | Không tràn ngang; tên 21px |
| Thẻ tạo khoảnh khắc | Thẻ 116×184px, nhãn nằm trong thẻ |
| Modal ngày tại 320/402/768/1440px | Không còn `.day-sequence-summary`, `.day-nav-index`, `.day-moment-position`, `.day-timeline-end`; giữ ngày, giờ, ảnh và thao tác |
| Cảm xúc bài viết | Trạng thái và số đếm đổi ngay; sau lỗi giả lập, tự về trạng thái/số đếm trước đó |
| Cảm xúc khoảnh khắc | Phản hồi ngay cả khi timeline vừa mở từ placeholder cache và còn đang lấy bản mới |
| Nhập tin nhắn | Counter render của history giữ 2→2 trong lượt gõ “Một lời chào hôm nay” (hai render ban đầu do Strict Mode); counter được gỡ sau thử |

Ảnh trong `.impeccable/review/` (không đưa vào Git): `desktop-width-restored.png`, `mobile-feed-dense.png`, `mobile-timeline-minimal.png`. Nội dung và avatar trong ảnh là dữ liệu QA, không phải phần trang trí mới của sản phẩm.

## Đo phản hồi trước/sau

API thử cố định trễ **350ms cho mỗi HTTP request**. Công cụ tạm dùng `performance.now()` từ click đến trạng thái cảm xúc được vẽ ở frame tiếp theo. Đây là lượt đo local có kiểm soát, không phải INP thực địa hoặc số đo VPS.

| Luồng | Trước | Sau |
| --- | --- | --- |
| Phản hồi cảm xúc | 1488ms | 27ms, trong lúc request còn pending |
| Request do một thao tác tạo ra (không tính polling độc lập) | PUT reaction → GET post → GET bootstrap → GET feed | PUT reaction → GET đúng post |
| Chuyển tới tab đã tải, có một query nền chờ 5 giây | Code cũ chờ mọi query Tellme active/pending | 152ms trong lượt thử; query nền vẫn pending, trang đích `aria-busy=false`, không inert |

Không thay endpoint, quyền xem hoặc logic backend. Lưu cảm xúc vẫn được máy chủ kiểm tra. Adapter dùng cùng queue cho lệnh cũ và lệnh cảm xúc; request lỗi không làm tắc các lệnh kế tiếp. Cache được cập nhật theo từng entity và chỉ hoàn tác trường cảm xúc, tránh làm mất bình luận hoặc thay đổi khác đang đến.

Timeline có thể dùng ngay dữ liệu đã đọc trước đó, vẫn yêu cầu bản mới từ server. Nếu server trả 403/404, ẩn chuỗi không còn khả dụng. Lớp chờ điều hướng chỉ chờ loading boundary của trang đích. Lịch sử chat được memo riêng, không dựng lại khi chỉ sửa draft.

Tham khảo kỹ thuật: [React optimistic UI](https://react.dev/reference/react/useOptimistic), [web.dev về độ trễ tương tác](https://web.dev/articles/optimize-inp). Không suy đoán cách triển khai nội bộ của Facebook từ ảnh giao diện.

## Kiểm tra chạy lại

```sh
node --test apps/web/src/lib/api-repository.test.mjs apps/web/src/lib/reaction-cache.test.mjs apps/web/src/lib/camera.test.mjs
pnpm --filter @tellme/web check-types
TELLME_LOW_MEMORY_BUILD=1 pnpm --filter @tellme/web build
```

Kết quả cuối: 11/11 test qua; TypeScript và build production Next.js thành công (23 trang tĩnh và các route động), `git diff --check` qua. Không có route/asset QA trong bản build.

11 test kiểm tra: số request hẹp, queue đồng thời/lỗi, optimistic count, đổi/bỏ cảm xúc, rollback giữ dữ liệu khác, cache feed/detail/profile/story, đối soát dữ liệu server, crop 4:3/zoom và ảnh selfie. Không dùng database hoặc webcam.

## Giới hạn

Responsive và thao tác được thử bằng Chromium, không phải iPhone vật lý. Cần xác nhận Safari sau deploy cho bàn phím thật, safe area và capability camera. Các số phản hồi trên là mẫu đo local trong điều kiện cố định, không đảm bảo cùng kết quả trên mạng/thiết bị thật. Không thay cấu hình hạ tầng, MongoDB Atlas hoặc dữ liệu production.

Detector CSS báo ba heuristic về separator 6px. Đây là đường phân vùng xám trung tính toàn chiều rộng theo ảnh tham khảo; các khối trên điện thoại đã đặt border-radius: 0, được kiểm tra bằng giao diện render, không phải accent border trên card bo góc.
