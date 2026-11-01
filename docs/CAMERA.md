# Tell me now — chụp trực tiếp

Tellme dùng hướng A: điện thoại chụp bằng camera trước/sau, laptop hoặc PC dùng webcam. Máy không có camera nhận hướng dẫn kiểm tra webcam hoặc mở Tellme trên điện thoại. Đây là tính năng của web responsive; chưa thay đổi ứng dụng mobile.

## Luồng sử dụng

1. Bấm Chụp ảnh/Chụp khoảnh khắc ở Tell me now, hồ sơ hoặc chi tiết chuỗi.
2. Trình duyệt hỏi quyền camera nếu chưa cấp. Chỉ xin video, không xin microphone. Ưu tiên camera sau khi thiết bị hỗ trợ; có nút đổi và lựa chọn camera khi có nhiều camera.
3. Chụp trong khung 4:3. Ảnh được crop giữa theo đúng khung, không kéo giãn; JPEG chất lượng 0.9, tối đa 1600 × 1200, không phóng lớn ảnh nguồn nhỏ.
4. Xem lại/chụp lại, thêm caption, nhạc và quyền riêng tư. Chụp lại vẫn giữ các lựa chọn đã nhập. Một ngày vẫn dùng chung một bài nhạc; khoảnh khắc đầu tiên chưa có nhạc vẫn nhận lời mời chọn hoặc bỏ qua như trước.
5. Bấm Đăng khoảnh khắc mới upload qua API media rồi lưu chuỗi. Lỗi upload/lưu giữ ảnh trong modal để thử lại; lần thử lại dùng lại URL upload thành công và ID khoảnh khắc, tránh upload hoặc chèn lặp.

Không có nút tải ảnh từ thư viện trong Tell me now. Các loại upload khác không bị thay đổi.

## Quyền và vòng đời

`getUserMedia` yêu cầu HTTPS khi triển khai; localhost/127.0.0.1 được dùng khi phát triển. Mở bằng địa chỉ IP LAN trên điện thoại qua HTTP sẽ không dùng được camera. Không có key/env mới cho camera.

`MomentCamera` giữ stream riêng, dừng mọi track khi chụp, đóng/unmount, chuyển tab hoặc pagehide. Khi quay lại tab, người dùng bấm mở lại camera. Đổi camera dừng stream cũ trước khi mở stream mới. Token vòng đời dọn cả stream trả về muộn sau khi modal đóng hoặc request đổi camera đã bị thay thế.

Từ chối quyền, camera bận, camera ngắt kết nối, không có camera và thiếu HTTPS có hướng dẫn riêng. Nếu người dùng chưa trả lời hộp quyền, có thể đóng modal; Tellme không giả lập quyền được cấp. Blob preview chỉ nằm trong bộ nhớ trình duyệt và được thu hồi khi chụp lại/đóng modal. Media chưa gắn nội dung sau upload lỗi tiếp tục dùng cơ chế dọn ảnh mồ côi hiện có.

## Phạm vi

Camera trước lưu cùng chiều gương như khung đang canh; camera sau giữ chiều gốc. Phép lật được ghi vào pixel JPEG, không phụ thuộc CSS ở trang xem lại hay bảng tin.

Vùng cuộn là div riêng bên ngoài fieldset; fieldset chỉ khóa điều khiển lúc đăng. Header và footer nằm ngoài vùng cuộn. Dialog dùng cùng giới hạn chiều cao theo viewport với phần nội dung, tránh quy tắc 94dvh mặc định trên mobile cắt footer. Overflow clip ở khung ngoài và Select trả focus với preventScroll ngăn chọn quyền riêng tư kéo lệch modal.

`MomentComposer` tách khỏi `GlobalOverlays`; `MomentCamera` chỉ cung cấp File đã chụp. Nếu sau này chọn hướng B (chỉ điện thoại tạo), thêm policy tại điểm mở luồng mà không phải thay toàn bộ form/nhạc/API. Hiện tại không có khóa theo user agent.

Camera web là trải nghiệm nhập liệu, không phải bằng chứng chống giả mạo; server tiếp tục kiểm tra ảnh, quyền sở hữu và quyền riêng tư theo kiến trúc hiện tại. Kiểm thử UI dùng camera mô phỏng, không chụp hoặc đăng hình camera thật của người dùng; cần kiểm tra thực tế Safari iOS/Chrome Android với camera thiết bị trước phát hành.

Tài liệu trình duyệt: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [facingMode](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/facingMode).
