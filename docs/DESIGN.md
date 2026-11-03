---
name: "Tellme"
description: "Your day. Your stories. — hệ thống giao diện web Tellme"
colors:
  primary: "#07327F"
  white: "#FFFFFF"
  line: "#E8EDF3"
  ink: "#000000"
  canvas: "#FFFFFF"
  primary-tint: "#F5F5F5"
  muted: "#000000"
  supporting-text: "#000000"
  field-surface: "#FFFFFF"
  focus: "#07327F"
  field-error: "#B12642"
typography:
  display:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "41px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.5
  dialog-title:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.003em"
  button-label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  field-label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  control: "9px"
  tabs: "10px"
  panel: "12px"
  post: "13px"
  dialog: "15px"
  button: "50px"
  pill: "999px"
spacing:
  small: "8px"
  compact: "12px"
  control: "16px"
  content: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.button-label}"
    rounded: "{rounded.button}"
    padding: "10px 19px"
  button-secondary:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary}"
    typography: "{typography.button-label}"
    rounded: "{rounded.button}"
    padding: "10px 19px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button-label}"
    rounded: "{rounded.button}"
    padding: "10px 19px"
  search-input:
    backgroundColor: "{colors.field-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  navigation-active:
    backgroundColor: "#07327F"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "0 15px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "20px"
    padding: "7px 12px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "20px"
    padding: "7px 12px"
  post-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.post}"
  filter-tabs:
    backgroundColor: "#E9EDF3"
    rounded: "{rounded.tabs}"
    padding: "4px"
  daily-photo:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.post}"
    width: "350px"
    height: "262.5px"
  day-timeline:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    width: "1080px"
  emoji-popover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.post}"
    width: "360px"
  profile-cover-preview:
    backgroundColor: "#F5F5F5"
    rounded: "{rounded.panel}"
    height: "160px"
    width: "100%"
  share-post-dialog:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    width: "620px"
    padding: "22px"
  journal-collage:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.panel}"
    width: "100%"
  audience-tile:
    backgroundColor: "{colors.white}"
    textColor: "#566278"
    rounded: "{rounded.control}"
    padding: "8px 8px 8px 28px"
---

# Design System: Tellme

## Overview

**Creative North Star: "Nhật ký xã hội hằng ngày"**

Nhật ký xã hội hằng ngày là cách mô tả hệ thống đã triển khai: gần gũi, yên tĩnh và rõ thao tác. Câu chuyện và ảnh đời thường dẫn nhịp; navy xác nhận hành động và lựa chọn. Đây là mô tả rút từ mã nguồn và direction contract, không phải một bản thiết kế bố cục đã được phê duyệt.

Bốn màu thương hiệu và Poppins được giữ từ [bảng nhận diện do chủ dự án cung cấp](../assets/brand/references/brand-board.png). Tagline vẫn là **Your day. Your stories.**; thông điệp nhận diện là **KẾT NỐI • LẮNG NGHE • KIẾN TẠO GIÁ TRỊ**. Các màu hỗ trợ trong frontmatter là phần mở rộng của bản web đã chạy, không được trình bày như màu gốc do người dùng cung cấp. Phạm vi tài liệu là giao diện web React/Next nối API Hono/Node.js, MongoDB và Cloudinary. Quyền truy cập được API thực thi; chat/thông báo dùng polling, chưa có WebSocket. [PRODUCT.md](PRODUCT.md) tiếp tục giữ sự thật sản phẩm; [FRONTEND.md](FRONTEND.md) ghi phạm vi và cách chạy.

**Key Characteristics:**

- Bề mặt trắng trên nền xám mát, phân cách bằng nét mảnh.
- Navy gắn với hành động, điều hướng và trạng thái được chọn.
- Be Vietnam Pro là font giao diện và dùng đủ weight 400–700.
- Các mẫu Uiverse do người dùng chọn giữ hình học và chuyển động nhận diện.
- Chuyện hôm nay có chuỗi ảnh riêng, phân biệt với bài viết trong bảng tin.

## Colors

Navy sâu, trắng và xám mát giữ cảm giác tin cậy, nhẹ và thân thiện. Các giá trị trong frontmatter là chuẩn máy đọc; tên dưới đây giải thích vai trò.

### Primary

- **Navy thương hiệu** (`primary`): CTA chính, liên kết, điều hướng đang chọn, đối tượng xem được chọn, tim và switch bật.
- **Navy nhạt** (`primary-tint`): nút phụ, phản hồi hover và các vùng hỗ trợ nhẹ.

### Neutral

- **Trắng thương hiệu** (`white`): header, card nội dung, menu và dialog.
- **Xám nhạt thương hiệu** (`line`): viền và đường phân cách; đây cũng là màu xám nhạt trong bảng gốc.
- **Xám than thương hiệu** (`ink`): nội dung và tiêu đề.
- **Nền xám mát** (`canvas`): nền trang để card trắng có ranh giới yên tĩnh.
- **Chữ phụ** (`muted`, `supporting-text`): mô tả, thời gian và metadata. Chữ phụ `supporting-text` phản ánh bản sửa độ tương phản cuối cùng.
- **Bề mặt trường nhập** (`field-surface`): ô tìm kiếm và trường tiêu chuẩn.

Màu `focus` biểu thị vị trí bàn phím; `field-error` dành cho lỗi validation. Các sắc xanh cục bộ trên ghi chú, chủ đề gợi ý và phần giới thiệu hôm nay là chi tiết theo component, không phải accent thương hiệu mới. Chưa có hệ dark mode.

**The Pinned Brand Rule.** Giữ bốn màu gốc và tỷ lệ wordmark từ bảng nhận diện; dùng các sắc hỗ trợ cho nhiệm vụ UI đã thể hiện trong mã nguồn.

## Typography

**Display Font:** Be Vietnam Pro, dự phòng sans-serif.

**Body Font:** Be Vietnam Pro, dự phòng sans-serif. Font được self-host bằng Fontsource. Trọng số gốc được người dùng cung cấp là Regular (400), Medium (500), SemiBold (600); mã web cũng nạp 700, nhưng không biến nó thành trọng số chủ đạo mới.

**Character:** Chữ hình học gọn, mềm và thân thiện; nội dung tiếng Việt có khoảng dòng thoáng. Đây là các vai trò quan sát được, không phải một thang tỷ lệ toán học thống nhất.

### Hierarchy

- **Display:** vai trò `display` chỉ xuất hiện ở vùng giới thiệu đăng nhập desktop; thu về cỡ 30px dưới 850px, và vùng này ẩn trên điện thoại.
- **Headline:** vai trò `headline` dùng cho tiêu đề trang. Bảng tin dùng 22px; tiêu đề trang khác thường 23–25px. Trên điện thoại, greeting là 20px và tiêu đề trang là 22px.
- **Dialog title / Section title:** tiêu đề dialog và khu vực chức năng; tiêu đề dialog thu về 15px trên điện thoại.
- **Body:** vai trò `body` mô tả bài viết bảng tin. Trên điện thoại giữ cỡ chữ và tăng line-height lên 1.95. Body nền của trang là 14px; textarea viết bài là 16px/1.9, thu về 15px trên điện thoại.
- **Button label / Field label:** nhãn thao tác và trường nhập. Metadata đang có các cỡ 8–11px tùy ngữ cảnh; ghi nhận đây là mật độ đã quan sát, không nâng chúng thành chuẩn chữ nội dung.

**Mobile refinement (30/10/2026):** `mobile-type.css` là lớp vai trò dùng chung ở viewport tối đa 640px, giữ nguyên desktop và font Poppins/Be Vietnam Pro. Nội dung chính 16px, bài viết 17px/1.8, nhãn thao tác 15px, metadata và điều hướng 14px, tiêu đề mục 18px và modal 19px. Chữ kế thừa body 18px. Các giá trị trong “Một chút về mình” giữ 15px nhưng giảm còn weight 500, nhãn 13px. Quy tắc này thay thế các cỡ mobile cũ nêu trong phần Hierarchy; không tăng kích thước avatar, ảnh hoặc khung trang theo chữ.

**The Content First Rule.** Giữ chữ bài viết đủ thoáng để đọc và đặt ảnh trong nội dung; không dùng kiểu chữ trưng bày của màn hình tài khoản cho nội dung bảng tin.

## Layout

Khung desktop không giới hạn max-width, header sticky cao (80px). Trên 1190px, mọi route giữ cột điều hướng (205px), padding ngang (42px) và gap (34px); trang có hỗ trợ thêm cột phải (278px), Tin nhắn/Cài đặt dành phần còn lại cho khu chức năng. Rail trái fixed theo viewport ở top (109px), bottom (20px), chiều cao tự tính và có cuộn riêng; tại viewport 1440px, x=42/y=109/width=205 giống nhau giữa các route. `scrollbar-gutter: stable` trên html giữ ổn định vị trí khi đổi trang dài/ngắn. Spacing frontmatter ghi các bước dùng lại, không khẳng định một grid bắt buộc cho mọi thành phần.

Ở tối đa (1190px), rail hỗ trợ ẩn và lưới còn (180px + nội dung) với gap (28px), padding (26px). Ở tối đa (850px), điều hướng thu thành rail icon (64px), gap (20px), padding ngang (20px). Ở tối đa (640px), bố cục thành một cột với padding (22px 15px 100px), header cao (65px), rail trái ẩn và điều hướng đáy cố định có safe-area. Tìm kiếm nằm trong trang Khám phá khi ô tìm kiếm header ẩn. Không ghi rằng rail hỗ trợ được dời xuống dưới: triển khai hiện tại ẩn rail này.

Card bài viết xếp dọc với gap (20px), thu còn (17px) trên điện thoại. Chuyện hôm nay và Chuyện của tôi dùng một luồng chia sẻ dọc, phân cách bằng đường mảnh; composer avatar gọn nằm đầu luồng, mỗi lượt chia sẻ có tên người, chú thích, cụm ảnh lớn và hành động mở dòng thời gian. Không dùng lưới các ô đồng đều ở hai màn hình này. Nội dung ảnh desktop thụt (56px) theo tên người, bỏ thụt trên điện thoại và trong khoảng 851–1190px. Khám phá dùng lưới ảnh hai cột. Tin nhắn dùng hai pane trên desktop và một pane danh sách hoặc hội thoại trên điện thoại. Dialog thông thường rộng (600px), padding vỏ (20px); trên điện thoại rộng toàn khung, padding (12px), max-height (94dvh).

Popup ngày dùng vỏ rộng (1080px), padding (24px), nội dung cao tối đa (820px/90dvh). Desktop có sidebar mốc giờ (224px) và vùng ảnh cuộn độc lập. Ở tối đa (700px), sidebar thành dải nút mốc giờ cuộn ngang kèm ngày luôn hiển thị; padding vỏ (12px), nội dung cao (92dvh). Các mốc nối thành một trục dọc với ảnh, chú thích và cảm xúc theo từng khoảnh khắc. Bấm ảnh nào thì mở tới khoảnh khắc đó, vẫn có thể cuộn xem toàn ngày.

## Elevation & Depth

Nền xám, card trắng và viền (1px) tạo độ sâu chính. Card bài viết và settings không mang bóng nền. Menu, dialog, tray cảm xúc, toast và phản hồi hover có bóng mềm. Form đăng nhập là ngoại lệ do mẫu Uiverse được chọn: bề mặt gradient trắng–xám và bóng thấp, khuếch tán.

### Shadow Vocabulary

- **Button hover:** `0 5px 12px #07327f20`, cùng dịch lên (1px).
- **Menu:** `0 8px 32px #18223b21`.
- **Dialog:** `0 20px 80px #0c1b3c26`; backdrop `#13274270`, blur (3px).
- **Reaction tray:** `0 6px 25px #1d2b4326`.
- **Toast:** `0 8px 30px #10294d2b`.
- **Auth form:** `0 25px 40px -25px #375f9a66`.
- **Emoji popover:** `0 12px 36px #09214926`, khung chọn emoji ở top layer, không bị panel nội dung cắt.
- **Daily photo fan:** `0 15px 25px -14px #0b21484d`; hover `0 20px 32px -16px #0b214866`, dành cho ảnh chồng nhau thay vì một card chứa cả lượt chia sẻ.

**The Quiet Surface Rule.** Card nội dung ở trạng thái nghỉ dùng nền, nét viền và khoảng cách; bóng nổi dành cho phần chồng lớp hoặc phản hồi tương tác đã có.

Chuyển trạng thái cơ bản thường (0.18–0.22s); nút dùng easing `cubic-bezier(0.22, 1, 0.36, 1)`. Gradient trượt của nút giữ thời gian (0.3s), switch giữ easing đàn hồi riêng từ nguồn, loader vòng giữ chu kỳ (2s). Cả `prefers-reduced-motion` và tùy chọn giảm chuyển động trong app rút animation/transition về (0.01ms), chạy một lần và tắt cuộn mượt; không áp một chuyển động chung lên các mẫu đã chọn.

Cụm ảnh hôm nay chuyển động bằng `transform` và `box-shadow` trong (700ms), easing `cubic-bezier(0.16, 1, 0.3, 1)`. Không animate width, height hay margin: khung luồng luôn ổn định, ảnh chỉ tách ngang, bớt nghiêng và nâng nhẹ (9px) khi hover/focus. Chế độ giảm chuyển động tắt transition của cụm ảnh và tắt cuộn mượt trong popup.

## Shapes

Panel nội dung thường bo (12–13px), dialog bo (15px), controls bo (9px), filter tabs bo (10px) và glider bo (7px). Nút dùng pill (50px), ô tìm kiếm dùng pill (999px), avatar tròn. Form tài khoản giữ bo (28px), trường tài khoản (18px) theo họ component riêng. Ảnh nằm trong crop `object-fit: cover`, ảnh bài viết có góc bo (7px); không kéo giãn ảnh để lấp chỗ.

Logo chính, âm bản, icon đơn sắc và app icon được ghi trong bảng nhận diện gốc. Web hiện chỉ dùng wordmark navy trên nền sáng, qua CSS crop chính xác từ bảng nhận diện, không có một asset logo vẽ lại. Giữ tỷ lệ và khoảng trống an toàn theo vùng X trong bảng; chưa có phép đo X cụ thể nên không tự quy đổi thành pixel. Tài sản gốc ở `assets/brand/`, bản dùng cho web ở `apps/web/public/brand/`; tài liệu này không xác nhận triển khai mobile.

## Components

### Buttons

Pill có phản hồi nhẹ, giữ hai lớp gradient trượt đối hướng từ mẫu đã chọn. Ba biến thể là primary navy/trắng, secondary navy nhạt/navy và ghost trong suốt/navy; padding và bo nằm trong frontmatter, min-height chung (40px), gap icon (8px). Hover dịch lên (1px); focus dùng outline (3px) với offset (4px). Disabled có opacity (0.45), bỏ lift và bóng. CSS hiện tại có luật active dịch xuống từ nguồn bị luật hover ghi đè khi con trỏ còn trên nút; không coi khác biệt này là một trạng thái chuẩn mới. Ở tối đa (640px), pill chung thu về min-height (34px), nhãn (12px), padding (7px 12px), gap (6px), icon (16px). Thao tác hồ sơ giữ min-height (36px), nhãn (12px), padding (7px 11px); tối đa (370px) dùng nhãn (11px), padding (7px 9px), icon (14px).

### Chips

Pill chủ đề có viền mảnh, nền trong suốt; khi chọn chuyển navy/trắng. Chủ đề do nội dung và truy vấn quyết định; không dựng một hệ màu danh mục cố định. Filter tabs là nhóm nút `aria-pressed` với glider trắng, hỗ trợ phím mũi tên trái/phải; cỡ nhãn thường (11px), trên điện thoại (10px).

### Social actions and emoji

Bảng tin mặc định theo thứ tự mới nhất, chỉ giữ bộ lọc chủ đề; không hiện các tab Dành cho bạn / Đang theo dõi / Mới nhất. Header không có nút Tạo bài viết; composer trong bảng tin giữ vai trò viết bài. Popover chuông và màn hình thông báo cũ hiển thị toàn bộ thông báo hợp lệ, không có tab Tất cả / Chưa đọc, vẫn có chấm chưa đọc và thao tác đánh dấu đã đọc.

Tim ở nút Thích có wrapper cố định (22×22px), tách khỏi nhãn; trạng thái đã thích tô kín navy, không còn vòng xác nhận chạy qua chữ. Phản hồi `like-confirm` chỉ scale tim từ (0.75 → 1) trong (300ms), easing `cubic-bezier(0.16, 1, 0.3, 1)`.

Bộ emoji dùng `emoji-mart` với dữ liệu Unicode 15, tải khi mở, 8 emoji/hàng, tìm kiếm tiếng Việt, nhóm, mục dùng thường xuyên và chọn sắc độ da. Glyph native theo hệ điều hành: Apple trên macOS/iOS, hệ khác giữ font emoji gốc của hệ. Khung trắng/chữ đen/navy rộng tối đa (360px), giới hạn theo viewport (24px khoảng thở), bo (13px), native popover ở top layer, host cao (420px) và có giới hạn theo viewport. Dùng cùng picker cho chat, bình luận và trả lời; chọn emoji đóng picker rồi chèn vào nội dung hiện tại.

### Sharing, named reactions and the profile journal

Tổng tim là một nút mở danh sách người thả tim: avatar, tên, username và tim navy. Danh sách dùng ID người dùng do API trả về và tôn trọng chặn; không dựng tên để lấp tổng số.

Popup Chia sẻ câu chuyện rộng (620px), nội dung padding (22px), gap (16px). Bản xem trước bài ở đầu có ảnh (80×76px), tên và đoạn nội dung rút gọn; bên dưới là tìm kiếm người/nhóm, dải avatar ngang cho chọn nhiều người nhận, nút gửi và nhóm chia sẻ liên kết. Có form tạo nhóm qua API với tên và tối thiểu 2 người khác. Facebook mở sharer; Instagram/TikTok sao chép link rồi mở nền tảng; accessible name và trạng thái sao chép hướng dẫn dán. Không có đoạn giải thích cố định cuối popup, không biểu đạt rằng đã đăng trực tiếp. Thẻ bài gửi tới chat giữ liên kết tới bài gốc.

Hồ sơ là một nhật ký dọc, không có tab nội dung. Bài viết và chuỗi ảnh được trộn theo thời gian gần nhất, nhóm bằng mốc ngày navy với đường phân cách mảnh. Collage ảnh xem trước có tối đa 3 ảnh: 3 ảnh dùng lưới (2fr/1fr, hai hàng) tỷ lệ (2:1), 2 ảnh chia đôi tỷ lệ toàn cụm (8:3), 1 ảnh (4:3); gap (8px desktop/5px điện thoại), góc (11px/9px). Chú thích và nút Xem trọn một ngày tiếp tục dẫn tới dòng thời gian. Composer nội tuyến chỉ hiện ở hồ sơ của mình.

GIF/sticker chung một dialog, một trường tìm kiếm, một lưới kết quả trộn; bỏ tab phân loại và chỉ giữ một icon media trong form bình luận/trả lời. Emoji picker vẫn riêng cho ký tự biểu cảm. Chuyện hôm nay bỏ nút Thêm ảnh phía trên; composer avatar nội tuyến giữ thao tác thêm khoảnh khắc.

Cuộn liên tục tự lấy trang kế khi sentinel nằm trong (650px) trước viewport. Trạng thái nghỉ không có nút Xem thêm; đang tải hiện loader, lỗi mới có nút Thử tải lại. Quy tắc này dành cho danh sách bài và nhật ký; picker Giphy giữ phân trang riêng của dịch vụ.

Dải người nhận không hiện scrollbar nhưng giữ `overflow-x: auto`, thao tác chạm/trackpad/bàn phím và native checkbox. Mỗi người nhận chiếm (94px desktop/85px điện thoại), avatar (56px), gap (14px/10px); tên căn giữa tối đa hai dòng, chọn dùng tick trắng trên navy và vòng navy quanh avatar. Emoji picker cũng ẩn scrollbar trong shadow root và vỏ ngoài mà không khóa cuộn.

### Feature naming and Follow

Nhãn tính năng ảnh theo ngày là **Tell me · Tell you**, rút gọn **Tell me** trên mobile, lấy từ `src/lib/brand.ts`; không đổi tên thương hiệu Tellme hay route `/community/today`. Follow thay nhãn Kết nối ở điều hướng; màn `/community/follow` dùng hai phần Đang follow và Gợi ý cho bạn, không có tab. Nút Following là trạng thái đã theo dõi, bấm để bỏ follow; Follow thêm tài khoản vào danh sách. Hồ sơ bỏ nút kết nối cũ và hiển thị số đang follow. Follow một chiều không mở quyền Bạn bè: API tính `connections` từ follow hai chiều, giữ khác biệt với `following`.

Vùng thông tin đầu hồ sơ dùng padding ngang (24px desktop/19px điện thoại), padding đáy (24px/22px), để tên và thao tác có khoảng thở với mép khung. Giữ chữ đen, nền trắng, navy và hệ chữ hiện có. Cụm thao tác nằm riêng sát dưới bìa, canh phải và đặt tuyệt đối so với vùng thông tin (`top: -66px` desktop, `-60px` mobile). Tên và username dùng trọn hàng riêng; không co theo chiều rộng nút. Tên mobile cỡ (23px), line-height (1.45). Avatar có margin dưới (26px) trên mobile, tăng thành (54px) ở tối đa (370px) để nút và tên không chồng nhau tại (320px).

### Profile media editor

Form sửa hồ sơ có preview ảnh bìa 3:1, rộng toàn form, bo 12px. Avatar tròn (92px/80px) viền trắng 4px, chồng lên mép bìa 37px; nút Đổi ảnh bìa/Đổi avatar dùng icon camera. Chọn file mở công cụ căn ảnh: khung tròn cho avatar, khung 3:1 cho cover, kéo/pinch/phím mũi tên để dịch chuyển và thanh zoom 100–300%. Chỉ bấm Dùng ảnh này mới upload bản crop; Hủy giữ nguyên ảnh cũ. HEIC/HEIF, TIFF và các định dạng raster phổ biến tối đa 50 MB được hỗ trợ; giải mã HEIC/TIFF tại thiết bị nếu trình duyệt không hỗ trợ. Bấm Lưu thay đổi mới cập nhật hồ sơ. Trạng thái tải và lỗi có thông báo bằng chữ. Ảnh bài viết có khung theo tỷ lệ 4:5–1.91:1; bấm mở ảnh đầy đủ theo tỷ lệ gốc, zoom tối đa 400%. Dưới mỗi ảnh ngày của người khác có ô trả lời riêng qua tin nhắn và bộ emoji dùng chung với bình luận/chat; chat hiển thị ảnh trích dẫn theo quyền xem hiện tại.

### Cards / Containers

Bài viết dùng token `post-card`, viền màu line (1px); header padding (19px 20px 12px), vùng chữ (0 21px 14px). Trên điện thoại, header (16px 16px 12px), chữ (0 16px 13px). Settings dùng panel bo và padding (25px), thu về (20px 17px). Không dùng một padding toàn-card duy nhất để mô tả cả ảnh, header và action row.

### Inputs / Fields

Search là pill nền field-surface, leading SVG icon và chiều cao (44px), riêng header (43px). Focus-within đổi viền sang `#6185bf`, thêm ring `0 0 0 3px #07327f12`; trường có tên truy cập hoặc label. Select/textarea tiêu chuẩn có padding (12px 14px), viền `#dce3ed` (1px), bo control. Lỗi có văn bản cùng màu field-error. Composer textarea ưu tiên nội dung, bỏ viền/ring riêng; không suy diễn đó là quy tắc bỏ focus cho tất cả trường.

### Navigation

Điều hướng trái là hàng icon SVG + nhãn, min-height (47px), bo control; active dùng navy và nền `#e6edf8`, hover dùng `#eaf0f8`. Thanh đáy điện thoại giữ nhãn, màu navy cho route active, nền trắng, đường phân cách trên và phần đệm safe-area. Icon là SVG Lucide hoặc SVG từ mẫu; emoji chỉ dùng cho lựa chọn cảm xúc/biểu cảm đã có.

### Audience and switches

Đối tượng xem là radio tile với chấm chọn, nhãn và SVG. Chọn đổi viền/chấm/chữ navy, nền `#f4f7fc`; focus tile dùng outline (3px). Ba lựa chọn vẫn là Công khai, Bạn bè, Chỉ mình tôi. Switch (46×24px) có thumb trắng (18px), cross/checkmark, track navy khi bật; input thật vẫn nhận bàn phím.

### Daily Moments and source components

Chuyện hôm nay giữ cơ chế ảnh xếp chồng được người dùng chọn từ codebykay101/ugly-lion-23, chuyển sang ảnh ngang **4:3**. Lượt chia sẻ là một phần của luồng xã hội, không bọc bằng card ô sản phẩm; avatar/tên người và chú thích dẫn nội dung. Ảnh trong cụm rộng `min(48%, 350px)` trên desktop, tối đa (350×262.5px); nhóm một ảnh dùng `min(92%, 520px)`. Trên điện thoại, ảnh trong cụm rộng (66%), một ảnh rộng (96%). Viền ảnh trắng (4px desktop/3px điện thoại), góc (13px/12px), crop `object-fit: cover`; số ảnh và giờ đều lấy từ dữ liệu thật của chuỗi, không nhân bản ảnh để tạo chồng giả.

Popup là dòng thời gian cuộn theo giờ tăng dần, không còn slideshow progress phủ trên một ảnh. Sidebar desktop có avatar, ngày, số khoảnh khắc, thumbnail và nút mốc giờ; trạng thái mốc hiện tại đồng bộ khi cuộn. Điện thoại giữ ngày và nút mốc giờ ở đầu, trục thời gian bên trái ảnh; toàn bộ ảnh tiếp tục dùng 4:3, chú thích đen trên trắng và cảm xúc riêng bên dưới. Nút mốc giờ hỗ trợ bàn phím, popup giữ focus/Escape của native dialog và tiếp tục lọc theo quyền xem. Nút thêm khoảnh khắc dành cho chuỗi của mình trong ngày hiện tại.

Reply composer, heart tooltip, reaction tray, loader vòng, form và animated 404 giữ kết cấu/chuyển động từ bộ 13 mẫu được người dùng chọn. Nguồn gốc và MIT nằm ở [Uiverse references](references/uiverse/README.md) và [LICENSES.md](references/uiverse/LICENSES.md). Cách tích hợp từ mã nguồn được ưu tiên; không có approved composition comp.

Ảnh minh họa được lưu cục bộ ở `apps/web/public/images/`, có provenance nhúng và [bảng nguồn ảnh](references/image-sources.json). Runtime hiện dùng ảnh rừng stock ở vùng hình trang tài khoản; không nạp các ảnh này như nội dung hoặc người dùng cộng đồng. Không phải raster tạo sinh. `.impeccable/design.json` ở gốc repository mang metadata, motion, breakpoint và snippet độc lập để xem các primitive của bản triển khai.

### Quyết định giao diện được giữ từ 28–29/10/2026

Các quyết định từ các vòng phản hồi đã được giữ trong giao diện hiện tại:

- Nền trang trắng hoàn toàn, nội dung và chữ phụ đen. Navy `#07327F` là màu thao tác chính; chữ trên nút navy và trên ảnh dùng trắng. Xám nhạt chỉ dùng phân vùng, đường viền và bong bóng bình luận.
- Poppins; body 16px, bài viết desktop 16px/điện thoại 15px, bình luận 15px/14px. Tăng các nhãn và thông tin phụ để đọc rõ hơn.
- Không hiển thị tiêu đề trang hoặc đoạn chào trang trí. Heading trang ẩn vẫn giữ cấu trúc truy cập; tiêu đề chức năng, tên người và nội dung bài được giữ.
- Chuyện hôm nay là trang mặc định và mục đầu tiên, sau đó Bảng tin. Tìm kiếm trên header; chuông mở native popover thông báo lớn. Sidebar không còn Khám phá/Thông báo.
- Chuyện hôm nay và Chuyện của tôi dùng luồng xã hội một cột; ảnh thật 4:3 lớn xếp nghiêng/chồng rồi tách bằng transform/shadow 700ms khi hover hoặc focus, dựa trên codebykay101/ugly-lion-23. Không nhân bản ảnh chỉ để tạo chồng giả. Popup là toàn bộ dòng thời gian trong ngày, có mốc giờ và cảm xúc từng ảnh.
- Tim động là nút Thích chính của bài viết, overflow hiển thị đủ. Thanh chọn cảm xúc chỉ nằm ở từng ảnh của chuyện hôm nay và dùng được bằng nút trên điện thoại.
- Trường nhập có một viền ngoài khi focus; bỏ outline/viền màu lồng trong input. Form bình luận/reply luôn đặt nút gửi bên phải, icon trắng, hỗ trợ ảnh GIF/sticker.
- Tin nhắn và Cài đặt lấp đầy khu chức năng, bỏ sidebar phải. Sidebar phải ở trang xã hội có ảnh chuyện của bạn bè, gợi ý tài khoản và chủ đề từ API.

Ảnh kiểm tra mới nằm trong `.impeccable/review/` (không đưa vào Git): `today-revision-desktop.png`, `today-revision-mobile.png`, `comments-revision-desktop.png`, `messages-revision-desktop.png`, `messages-revision-mobile.png`, `story-reactions-mobile.png`.

Ảnh bằng chứng cho lần chỉnh Chuyện hôm nay: `.impeccable/review/moments-stream-desktop.png`, `moments-stream-mobile.png`, `moments-timeline-desktop.png` và `moments-timeline-mobile.png`.

Cập nhật hẹp 29/10/2026: bỏ các nhóm tab lọc bảng tin/thông báo và nút tạo bài ở header; sidebar ổn định giữa route, tim không chồng nhãn, emoji native đầy đủ và chỉnh avatar/ảnh bìa có bản xem trước trước khi lưu. Nguồn triển khai: `apps/web/src/styles/refinements.css`, `components/ui/EmojiButton.tsx`, `EmojiPicker.tsx`, `components/app/GlobalOverlays.tsx`. Bằng chứng: `.impeccable/review/profile-upload-desktop.png`, `profile-upload-mobile.png`, `emoji-picker-mobile.png`, `feed-like-fixed-desktop.png`.

Cập nhật hẹp tiếp theo 29/10/2026: sidebar fixed tách khỏi cuộn document; một picker GIF/sticker; tổng tim mở danh sách tên; chia sẻ qua chat riêng/nhóm hoặc liên kết; hồ sơ nhật ký một luồng không tab, tự tải tiếp trước viewport 650px. Nguồn: `PostDialogs.tsx`, `GiphyPicker.tsx`, `InfiniteTrigger.tsx`, `ProfileScreen.tsx`, `visibility.ts`, `refinements.css`. Không thay đổi palette, typography hoặc quy tắc ngoài phạm vi.

Cập nhật nhãn/tinh chỉnh 29/10/2026: Tell me · Tell you (mobile Tell me), route Follow mới với redirect route Kết nối cũ; dải người nhận ngang và emoji giữ cuộn nhưng ẩn scrollbar; tăng inset đầu hồ sơ; đoạn giải thích cố định cuối popup chia sẻ đã bỏ, giữ mô tả truy cập và trạng thái copy trung thực. Bằng chứng nằm trong `.impeccable/review/share-horizontal-*.png`, `profile-spacing-brand-*.png`, `emoji-no-scrollbar-mobile.png`, `follow-page-desktop.png`.

Tinh chỉnh và tích hợp 29/10/2026: pill mobile nhỏ hơn; cụm thao tác hồ sơ nâng sát dưới bìa và có khoảng thở, tên/username có hàng riêng trên desktop/mobile. Giao diện dùng dữ liệu API và không hiện nhãn thử nghiệm trong luồng sản phẩm. Giữ palette, font, hình học Uiverse và chuyển động đã chọn. Ảnh mới: `.impeccable/review/backend-desktop.png` (1440px), `backend-mobile.png` (390px), `backend-mobile-320.png` (320px), `backend-auth-mobile.png`; đây là dữ liệu QA riêng, không phải seed của runtime. Xem [FRONTEND.md](FRONTEND.md) cho dữ liệu/session/phân trang và [BACKEND.md](BACKEND.md) cho phạm vi API.

## Do's and Don'ts

### Do:

- Do giữ navy cho quyết định và lựa chọn, nền trắng và chữ than cho nội dung.
- Do kiểm tra dấu tiếng Việt với cả Poppins và Be Vietnam Pro; dùng font đã self-host.
- Do giữ nguyên tỷ lệ tài sản thương hiệu; wordmark web hiện là vùng crop bằng CSS của bảng gốc.
- Do giữ tên tác giả, nguồn và thông báo MIT khi tiếp tục điều chỉnh các component Uiverse đã chọn.
- Do giữ điều hướng, quyền xem và trạng thái chọn có nhãn rõ ràng, hỗ trợ bàn phím và giảm chuyển động.
- Do dùng ảnh 4:3 lớn trong luồng Chuyện hôm nay; giữ thời gian, chú thích và cảm xúc gắn với đúng khoảnh khắc.

### Don't:

- Don't vẽ lại wordmark hoặc trình bày crop hiện tại như một logo xuất riêng đã được duyệt.
- Don't nâng các màu hỗ trợ UI thành màu thương hiệu gốc hoặc tạo dark mode từ tài liệu này.
- Don't dựng người dùng hoặc số tương tác giả; lấy nội dung và quyền xem từ API, chỉ mô tả trạng thái đã được máy chủ xác nhận.
- Don't lấy cỡ metadata nhỏ hiện có làm chuẩn cho nội dung đọc dài hoặc hướng dẫn chính.
- Don't biến Chuyện hôm nay/Chuyện của tôi thành lưới ô bán hàng, thu ảnh thành dải dọc hẹp hoặc animate kích thước để bung ảnh.


### Camera Tell me now

Modal chụp giữ header trắng/navy của hệ thống, khung camera 4:3 và nút chụp tròn ở giữa, đổi camera nhỏ bên phải. Camera lỗi dùng chính khung xem trước để hướng dẫn thay vì thêm lớp modal. Bước xem lại giữ ảnh 4:3, nút Chụp lại trên ảnh, lời kể và nhạc bên dưới; quyền riêng tư mở rộng theo nhu cầu. Footer đăng cố định trong modal, chỉ vùng nội dung cuộn và không hiện scrollbar. Fieldset đặt min-width: 0 để caption/nhạc dài không đẩy vỡ khung mobile.

### Form và ủng hộ Tellme

`form-typography.css` định nghĩa chữ nhãn/điều khiển 15px desktop và 16px mobile. Nhãn weight 500, nội dung/placeholder weight 400; trường OTP giữ chữ mã lớn chuyên biệt. Hồ sơ, tài khoản, mật khẩu, chỉnh khoảnh khắc và quyền riêng tư dùng chung vai trò này.

Ủng hộ dùng lời mời nhỏ không chặn trang, tự hiện một lần trên trình duyệt ở Tell me now/Khám phá. Icon cà phê, chữ đen và hành động navy; QR chỉ mở khi bấm. Khung vuông hiển thị phần chính của ảnh gốc không sửa pixel. Các nút lưu ảnh, sao chép tài khoản ở bên dưới. Nội dung modal cuộn riêng trên màn hình thấp, footer luôn trong viewport.

Vùng cuộn của modal camera là div bao fieldset; cả hai đặt min-width: 0. Khung ngoài dùng overflow clip để focus không kéo lệch header; footer nền trắng nằm ngoài vùng cuộn.


### Ràng buộc thiết kế sau phản hồi — 03/11/2026

- Desktop/laptop giữ tỷ lệ và độ rộng cột trước commit `aaf3f80`; gỡ giới hạn 680px được thêm ở commit đó. Các thay đổi mật độ mới chỉ áp dụng trong `max-width: 640px`; không thêm max-width hoặc margin để thu hẹp cột giữa trên desktop.
- Điện thoại tham khảo các ảnh Facebook do chủ dự án gửi: nội dung chiếm chiều rộng màn hình, tên/ngày/thao tác có phân cấp rõ, khoảng cách trong nhóm chặt và giữa các khu vực đủ phân biệt. Giữ Poppins, màu navy và nav nổi Tellme.
- Hạn chế câu mô tả không có giá trị thao tác. Không thêm câu kết, khẩu hiệu, hướng dẫn hiển nhiên hoặc lặp lại cùng thông tin tại nhiều vị trí trong một modal.
- Không nhồi thêm badge, sticker, số thứ tự, nhãn hoặc chi tiết trang trí khi người dùng không yêu cầu. Thể hiện sự liên tiếp của chuỗi qua thứ tự ảnh, mốc giờ, thumbnail và đường nối sẵn có; không cần thêm đoạn giải thích.
- Chữ trên điện thoại: nội dung 15px, bình luận 14px, thông tin phụ 12–13px; input vẫn 16px. Giữ nút có vùng bấm đủ lớn dù icon nhỏ.
- Picker cảm xúc được giới hạn chiều cao; giữ sửa lỗi bàn phím/cuộn chat và camera trước/sau từ `aaf3f80`. Không đánh đổi các bản sửa chức năng để khôi phục tỷ lệ desktop.
- Phản hồi thao tác phải xuất hiện ngay khi có thể, có hoàn tác nếu máy chủ từ chối; không dùng trạng thái thành công giả cho tác vụ chưa lưu. Chỉ giữ lớp chờ khi nội dung trang đích thực sự đang tải.

Nguồn triển khai: `social-scale.css`, `use-reaction.ts`, `reaction-cache.ts`, `use-page-navigation.ts`. Kiểm tra và giới hạn: [MOBILE-QA.md](MOBILE-QA.md).
