---
name: "Tellme"
description: "Your day. Your stories. — không gian ảnh thân mật giữa bạn bè đã kết nối"
colors:
  primary: "#07327F"
  primary-hover: "#052561"
  canvas: "#FFFFFF"
  paper: "#F5F5F5"
  paper-soft: "#EBEBEB"
  control-surface: "#DDDDE3E6"
  control-surface-night: "#444449C9"
  control-selected: "#C5C5CFE6"
  control-selected-night: "#62626BC9"
  danger: "#B12642"
  danger-night: "#FF9BAF"
  danger-fill: "#B12642"
  danger-ink: "#FFFFFF"
  overlay-surface: "#F5F5F5F2"
  overlay-surface-night: "#2B2B2FF2"
  caption-glass: "#07327FB8"
  caption-glass-night: "#303E52B8"
  placeholder: "#5F5F69"
  placeholder-night: "#B8B8C0"
  action-ink: "#FFFFFF"
  canvas-night: "#18181B"
  paper-night: "#2B2B2F"
  paper-soft-night: "#3A3A40"
  ink-night: "#F5F5F7"
  muted-night: "#B8B8BD"
  line-night: "#4A4A51"
  primary-night: "#A5CCFF"
  primary-hover-night: "#BDDBFF"
  primary-tint-night: "#252E3B"
  action-ink-night: "#000000"
  ink: "#000000"
  muted: "#000000"
  primary-tint: "#E5EEFB"
  icon-surface: "#E4EDFA"
  line: "#DEDEDE"
  focus: "#8CA7D8"
  field-error: "#B12642"
  notification-marker: "#E54858"
  camera-preview: "#102238"
  viewer-backdrop: "#07162b80"
  founding-gold: "#aa7414"
  founding-gold-night: "#f0ce79"
typography:
  headline:
    fontFamily: "Nunito, sans-serif"
    fontSize: "32px"
    fontWeight: 900
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Nunito, sans-serif"
    fontSize: "22px"
    fontWeight: 900
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  moment-caption:
    fontFamily: "Nunito, sans-serif"
    fontSize: "16px"
    fontWeight: 900
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Nunito, sans-serif"
    fontSize: "17px"
    fontWeight: 700
  button-label:
    fontFamily: "Nunito, sans-serif"
    fontSize: "16px"
    fontWeight: 800
  supporting-label:
    fontFamily: "Nunito, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  capture-caption:
    fontFamily: "Nunito, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.35
  capture-caption-narrow:
    fontFamily: "Nunito, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.35
  placeholder:
    fontFamily: "Nunito, sans-serif"
    fontWeight: 700
  stream-author:
    fontSize: "18px"
  stream-timestamp:
    fontSize: "15px"
  stream-end-title:
    fontSize: "25px"
    lineHeight: 1.3
  shelf-title:
    fontSize: "25px"
  viewer-subtitle:
    fontSize: "13px"
  narrow-audience:
    fontSize: "12px"
  profile-name:
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1.25
  journey-year:
    fontSize: "11px"
  compact-dialog-title:
    fontSize: "24px"
rounded:
  history-thumbnail: "9px"
  upload-retry: "16px"
  chat-input: "30px"
  refresh: "22px"
  thumbnail: "12px"
  control: "18px"
  response: "23px"
  card: "24px"
  panel: "28px"
  navigation: "32px"
  photo-mobile: "32px"
  photo: "36px"
  circle: "50%"
spacing:
  small: "8px"
  compact: "12px"
  control: "16px"
  content: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.action-ink}"
    typography: "{typography.button-label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-secondary:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button-label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button-label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-danger:
    backgroundColor: "{colors.danger-fill}"
    textColor: "{colors.danger-ink}"
    typography: "{typography.button-label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  tellme-id-input:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
  floating-navigation:
    backgroundColor: "{colors.control-surface}"
    rounded: "{rounded.navigation}"
    padding: "5px"
    height: "60px"
  moment-photo:
    rounded: "{rounded.photo}"
    width: "min(100%, 440px)"
    aspectRatio: "1 / 1"
  reply-surface:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "5px 8px 5px 16px"
    height: "63px"
  chat-composer:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chat-input}"
    height: "59px"
  camera-shutter:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    rounded: "{rounded.circle}"
    size: "82px"
  profile-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    width: "100%"
---

# Design System: Tellme

## Overview

**Creative North Star: "Tellme close friends"**

Một không gian ảnh thân mật, nhẹ và gần gũi giữa những người đã chấp nhận kết nối. Canvas trắng ban ngày và than chì ban đêm nâng ảnh đời thường lên trước; navy giữ nhịp cho hành động, chữ Nunito tròn và đậm tạo tiếng nói ấm áp. Bề mặt xám trung tính theo theme, ảnh bo mềm và camera tròn nối các màn hình thành cùng một thế giới.

Tài liệu ghi hệ thống web responsive đã triển khai và được tinh chỉnh theo duyệt ngày 15/11/2026. Desktop giữ trải nghiệm ở giữa màn hình; native Expo vẫn là scaffold. Giữ wordmark và tài sản thương hiệu do dự án cung cấp, tagline **Your day. Your stories.**, ảnh thật của người dùng và bộ ảnh cảm xúc có sẵn. Màu hỗ trợ UI là phần mở rộng của giao diện, không được coi là màu gốc mới của bộ nhận diện. [PRODUCT.md](PRODUCT.md) giữ phạm vi sản phẩm; [API.md](API.md) giữ hành vi và quyền truy cập.

**Key Characteristics:**

- Canvas trắng/than chì, bề mặt xám trung tính theo theme và navy dành cho hành động.
- Nunito self-host có tiếng Việt; tiêu đề đậm, nội dung dễ đọc.
- Camera mở đầu, ảnh thật cuộn dọc, caption phủ trên ảnh và điều hướng nổi gọn.
- Cùng một trải nghiệm trên điện thoại và desktop, không thêm sidebar.
- Giữ danh tính, giới thiệu và hành trình theo tháng trên hồ sơ.

## Colors

Bảng màu trung tính trắng/than chì, các lớp xám và navy rõ nét; frontmatter là nguồn giá trị chuẩn, tên dưới đây diễn giải vai trò.

### Primary

- **Navy thương hiệu** (`primary`): nút chính, liên kết, biểu tượng camera và điều hướng được chọn.
- **Navy sâu** (`primary-hover`): phản hồi hover trên phần trong nút chụp.
- **Xanh kết nối nhạt** (`primary-tint`): nút phụ và bề mặt lời mời.
- **Xanh biểu tượng** (`icon-surface`): nền tròn của lối vào bạn bè và các điểm thao tác nhẹ.

### Neutral

- **Nền ban ngày** (`canvas`): nền trắng chung của ứng dụng và phần mở đầu.
- **Bề mặt chính** (`paper`): xám rất nhạt cho nội dung phẳng, menu và các nhóm hồ sơ; điều khiển nổi dùng `control-surface`, dialog dùng `overlay-surface`.
- **Bề mặt lồng** (`paper-soft`): xám nhẹ cho các lớp lồng và ô nhập và nhóm điều khiển.
- **Chữ trên thao tác** (`action-ink`): trắng trên nút navy; tách khỏi màu bề mặt.
- **Mực đen** (`ink`): chữ đọc và tiêu đề ở chế độ sáng; chế độ tối giữ chữ sáng để dễ đọc.
- **Chữ bổ trợ** (`muted`): dùng đen ở chế độ sáng, phân cấp bằng cỡ/độ đậm thay vì màu xanh xám.
- **Nét xám trung tính** (`line`): đường phân cách và viền của các mẫu dùng lại.

Caption trên ảnh dùng `caption-glass` / `caption-glass-night`, chữ trắng và blur tĩnh (14px). Đây chỉ là chất liệu chip trên ảnh trong capture, stream và sheet; không thay màu `primary` của nút hoặc hành động toàn hệ thống.

Bề mặt camera chưa bật dùng `camera-preview`; scrim của viewer dùng `viewer-backdrop`. Dấu Mở lối dùng `founding-gold` ban ngày và `founding-gold-night` ban đêm; đây là màu hỗ trợ theo ngữ cảnh, không thay navy thương hiệu.

Trạng thái dùng **xanh focus** (`focus`), **đỏ lỗi** (`field-error`) và **đỏ thông báo** (`notification-marker`). Giữ nhãn chữ/trạng thái truy cập được; không truyền thông tin chỉ bằng màu.

**The Neutral Canvas Rule.** Giữ canvas trắng ở chế độ sáng và than chì ở chế độ tối; các lớp `paper`/`paper-soft` dùng xám trung tính. Navy dành cho thao tác. Các token hậu tố `-night` ghi giá trị ghi đè cho cùng role khi `data-theme="dark"`; `primary-night` là màu thao tác sáng, `action-ink-night` là chữ đen trên nó. Chữ đọc dùng `ink-night`, chữ phụ dùng `muted-night`; không đổi canvas thành xanh theo theme.

## Typography

**Display Font:** Nunito, sans-serif.
**Body Font:** Nunito, sans-serif.

Nunito được self-host qua `@fontsource/nunito`, đủ bốn weight (600–900), gồm dấu tiếng Việt. Wordmark dùng tài sản ảnh riêng, không thay bằng chữ gõ lại. Không thêm font trưng bày thứ hai cho các màn mới.

### Hierarchy

- **Headline:** tiêu đề nổi bật; role `headline`. Tên ở summary hồ sơ dùng riêng `profile-name`, xuống (25px) trên mobile để tên dài vẫn cân với avatar giữa.
- **Journey year:** `journey-year` chỉ dành cho năm ở dòng phụ của bộ chuyển tháng; tên tháng dùng (14px). Không lấy cỡ năm làm chuẩn cho nội dung đọc hoặc nút thao tác.
- **Section title:** tiêu đề các nhóm nội dung; role `section-title`, thường xuống (21px) trên mobile.
- **Moment caption:** chip xanh bán trong suốt phủ đáy ảnh, role `moment-caption`, chữ trắng một dòng và ellipsis; bấm để mở rộng caption dài đã lưu. Capture dùng riêng `capture-caption`, xuống `capture-caption-narrow` ở màn tối đa (360px), với placeholder Nunito (700). Chip nhập co theo chữ, không kéo thành một thanh rộng cố định.
- **Stream metadata:** `stream-author` cho người đăng, `stream-timestamp` cho thời gian; mobile giảm lần lượt (17px / 14px), landscape thấp (16px / 13px).
- **Stream supporting roles:** `stream-end-title` cho cuối luồng, `shelf-title` cho Hôm nay, `viewer-subtitle` cho phụ đề viewer và `narrow-audience` cho nút giữa header ở màn tối đa (360px). Camera explanation dùng tiêu đề (19px), xuống (15px) ở landscape thấp.
- **Body:** role `body`; phần diễn giải dài dùng nhịp dòng (1.6) nơi nguồn triển khai quy định.
- **Compact dialog title:** `compact-dialog-title` chỉ dành cho tiêu đề Thông báo, Góc Tellme và feedback hành động; không thay headline của các trang.
- **Button label:** role `button-label`; trên mobile nút dùng (15px), weight giữ nguyên.
- **Supporting label:** thời gian và thông tin phụ; không lấy nhãn điều hướng nhỏ làm chuẩn cho văn bản hướng dẫn.

**The Rounded Voice Rule.** Dùng Nunito đậm và kiểm tra dấu tiếng Việt trong tên dài, placeholder và nhãn nút; không kế thừa Be Vietnam Pro/Poppins từ tài liệu cũ làm font UI mới.

## Layout

Ứng dụng có header gọn, logo luôn bên trái và nội dung căn giữa. Trên desktop từ 900px, hồ sơ, bạn bè và tin nhắn dùng chung khung ngoài tối đa 1040px với padding ngang 24px. Ảnh khoảnh khắc giữ sân khấu hẹp riêng. Khung ứng dụng cố định theo visual viewport; html/body không cuộn, nội dung dài chỉ cuộn trong main. Header và nav giữ nguyên vị trí. Scrollbar track/thumb được ẩn trên toàn ứng dụng, gồm lịch sử chat, form/dialog và rail; giữ nguyên overflow cùng cuộn touch/wheel/bàn phím native. Header trang chủ trong suốt; ở các route khác, header dùng `canvas` theo theme để chữ cuộn không chồng lên wordmark và nút điều khiển, không thêm panel, viền hoặc bóng. Header cao 88px trên desktop; ở màn hẹp cao 90px với padding trên 24px, dưới 12px để logo/avatar lớn hơn và nằm thấp hơn; gutter mobile là 20px. Mốc responsive chính là 640px. Khoảng cách lặp lại dựa trên scale trong frontmatter.

Tellme now bắt đầu bằng camera inline trên trang đầu của vùng cuộn dọc. Cuộn xuống đi qua ảnh mới nhất rồi ảnh cũ, từng trang hữu hạn. Ảnh và output camera giữ vuông (1:1), content rộng tối đa (440px), gutter mobile (16px). Kích thước ảnh theo cả chiều rộng lẫn chiều cao còn lại để caption, người đăng/thời gian và trả lời hoặc nút Hoạt động kết thúc ngay phía trên dock. Camera/gửi không còn một hàng thao tác phụ dưới ảnh. Ở viewport quá thấp hoặc khi cần thêm chiều cao cho khả năng truy cập, giữ cuộn native trong trang quá khổ thay vì khóa phần nội dung.

Landscape có chiều cao tối đa (520px) đưa ảnh và thao tác sang hai cột, content rộng tối đa (740px); trang bằng chiều cao stream. Camera/review cũng dùng hai cột; viewer ngày chừa chỗ cho header và cùng dock nổi. Hình ảnh crop bằng cover. Trạng thái active lấy trang cắt qua dải giữa viewport bằng IntersectionObserver; chỉ render active và hai trang liền kề. Khi bàn phím mở, giữ geometry trang và đưa input vào vùng nhìn thấy; ẩn nhóm cảm xúc và thao tác phụ để dành chỗ cho trả lời.

Dock ở chính giữa, cách đáy tối thiểu (28px), có tính safe area, rộng tối đa (420px); landscape thấp dùng (12px). Ba icon Bạn bè / Trang chủ hoặc camera / Tin nhắn nằm trong một pill cao (60px), khi xem ảnh có hai slot hai bên bằng nhau: Góc Tellme bên trái, thao tác ảnh hiện tại bên phải. Camera chỉ có pill ba nút giữa, không render hai flank. Slot hai bên (48px), xuống (46px) ở mobile và (44px) ở màn tối đa (360px), giữ pill ba nút chính cân giữa ở chế độ xem ảnh. Pill camera rộng tối đa (260px), tối thiểu (190px). Desktop giữ cùng cấu trúc, không thêm rail. Header avatar mở hồ sơ. Hồ sơ dùng khung tối đa (780px), từng summary/hành trình/prompt có mặt riêng; Bạn bè và Tin nhắn giữ khung ngoài tối đa (1040px) với padding ngang (24px). Khi bàn phím mobile mở trong luồng trả lời/chat, header và dock tạm ẩn để dành chỗ cho nhập liệu.

Trang thêm bạn bắt đầu bằng label và ô Tellme ID; tiêu đề h1 chỉ dành cho trình đọc màn hình. Không có tiêu đề Bạn bè, Tellme ID của chính mình hoặc nút quay lại hiển thị trên màn này. Đây là quyết định của bề mặt thêm bạn, không phải quy tắc cấm tiêu đề trên các trang khác.

## Elevation & Depth

Chiều sâu đến từ các lớp xám trung tính trên canvas trắng/than chì, bo góc và caption navy trên ảnh. Stream dùng một ảnh phẳng mỗi trang, không có lớp ảnh sau xoay. Điều hướng, thanh trả lời, Hoạt động, nút chọn bạn, shortcut hồ sơ và ô soạn chat dùng cùng chất liệu điều khiển bán trong suốt: nền `control-surface` theo theme, blur tĩnh giới hạn (16px) với saturate (1.12), nét sáng inset và bóng lệch mềm. Riêng ô soạn chat giữ nền/blur và nét sáng inset (1px), không có bóng ngoài ở cả nghỉ lẫn focus; dock và trả lời ảnh giữ control lift. Không animate blur; hồ sơ và thẻ lời mời phần lớn phẳng. Không biến mọi vùng nội dung thành card nổi.

### Shadow Vocabulary

- **Control lift, ban ngày:** `inset 0 1px #ffffffb3, 0 8px 24px #17172216` — các điều khiển bán trong suốt dùng chung, trừ ô soạn chat.
- **Control lift, ban đêm:** `inset 0 1px #ffffff20, 0 8px 24px #0002` — cùng chất liệu trên canvas than chì, trừ ô soạn chat.
- **Chat composer highlight:** `inset 0 1px var(--control-highlight)` — chỉ nét sáng trong ở nghỉ/focus, giữ chất liệu bán trong suốt và blur, không có bóng ngoài.
- **Button hover:** `0 5px 12px #07327f20` — phản hồi hover được giữ từ primitive nút.

**The Gentle Lift Rule.** Dùng bóng mềm để phân biệt lớp thao tác nổi; ảnh và nội dung giữ vai trò chính.

**The Shared Material Rule.** Mọi tính năng UI mới bắt buộc dùng lại chất liệu bán trong suốt trong `apps/web/src/styles/ui-system.css`: `glass-control` cho điều khiển nổi, `glass-field` cho ô nhập, `glass-option` cho lựa chọn và `glass-action` cho thao tác. Common Input và secondary Button dùng cùng `control-surface`, highlight inset, bóng mềm và blur tĩnh như dock; `overlay-surface` dành cho dialog/picker theo cả hai theme. Input con giữ nền trong suốt, không chồng nền cũ lên wrapper kính. Lựa chọn hiện hành và glider dock dùng `control-selected`, kèm dấu check ở nhóm lựa chọn; chữ/icon hành động vẫn theo `primary`. `danger` dành cho nhãn/icon hủy hoặc rời, còn xác nhận phá hủy dùng `danger-fill` và `danger-ink` để giữ chữ trắng rõ ở cả hai theme. Không sao chép màu, blur hoặc bóng sang bộ token riêng. Vùng nội dung phẳng vẫn dùng `paper`/`paper-soft`. Placeholder dùng token `placeholder` theo theme, Nunito weight (700); riêng caption trên ảnh có override tương phản theo nền caption.

## Shapes

Ngôn ngữ hình học gồm ảnh vuông bo rộng, mặt giấy bo mềm và điều khiển tròn. Scale `rounded` phân biệt thumbnail, input/nút, thanh phản hồi, card, panel và ảnh; ảnh mobile dùng role riêng trong frontmatter. Avatar, nút icon và camera dùng hình tròn thực. Giữ tỷ lệ ảnh, crop bằng `object-fit: cover`, không kéo méo ảnh hoặc wordmark.

Drag handle của sheet ảnh là nét ngang (34 × 5px), bo riêng (4px); đây là hình học handle, không thêm một bước bo (4px) cho card hoặc panel.

Ảnh và viewfinder stream dùng role `photo`, mobile dùng `photo-mobile`; landscape thấp riêng viewfinder dùng (28px). Thumbnail đường vào khoảnh khắc dùng `history-thumbnail`; nút về đầu luồng dùng pill bo (24px). Những giá trị này là hình học đã triển khai, không cần ép về radius card cũ. Thumbnail Hôm nay có thể giữ silhouette chồng ảnh nhỏ; ảnh trong stream không xếp lớp hay nghiêng.

## Components

### Buttons

Nút chắc, mềm và dễ chạm. Primary dùng `primary`/`action-ink` theo theme; secondary dùng nền kính trung tính và chữ `ink`, không có nét navy inset; ghost trong suốt/navy. Danger dùng `danger-fill`/`danger-ink`; nhãn/icon hủy hoặc rời trên bề mặt kính dùng `danger` theo theme. Role `button-*` trong frontmatter ghi padding và chữ bản desktop; chiều cao tối thiểu (46px), mobile (44px). Hover nhấc nhẹ (1px) với bóng mềm; focus có outline xanh (3px), offset (4px); disabled giảm opacity và không nhấc. Không phục hồi các viền gradient giả của phiên bản nút trước.

### Inputs / Fields

Common Input, gồm ô Tellme ID, dùng nền kính điều khiển chung bo mềm và chữ body; wrapper kính không bị rule `paper-soft` cũ ghi đè. Label vẫn có tên truy cập; ở khung tạo nhóm hẹp/thấp có thể rút gọn nhãn hiển thị trong khi giữ label/legend thật. Placeholder lấy màu từ role `placeholder` theo theme, font Nunito weight (700). Input giữ `aria-invalid`, thông báo lỗi và trạng thái đang tìm/đang gửi. Mọi input chữ, textarea, contenteditable và wrapper nhập liệu dùng caret `primary` theo theme khi focus (riêng caption nhập trên ảnh dùng caret trắng để dễ thấy); không có outline, border đổi màu hay glow. Giữ viền trung tính hoặc trong suốt sẵn có; bóng chất liệu glass ở trạng thái nghỉ không tăng khi focus. Nút và link vẫn giữ keyboard focus indicator. Input/textarea rỗng có placeholder căn đầu dòng để caret bắt đầu bên trái trong UI tiếng Việt; khi có chữ, giữ căn lề do từng component quy định. Caption đã nhập vẫn căn giữa và caret native đi theo vị trí chèn. Không giả độ dày caret bằng CSS. Ô trả lời giữ bản nháp khi lỗi, có toast và status truy cập được.

### Cards / Containers

Kết quả tìm ID dùng `paper`; lời mời đến dùng nền xanh nhạt, cùng role `card`. Danh sách bạn bè là hàng thoáng thay vì thẻ lặp nặng. Hồ sơ có summary theo theme với bìa, avatar tròn chồng mép bìa và tên/ID/dấu Mở lối/bio căn giữa. Chủ hồ sơ có ba shortcut thật: số bạn đã kết nối, sao chép ID, chia sẻ ID. Hành trình và prompt chụp ảnh là các bề mặt riêng, cùng bo (28px); không có panel lớn bọc toàn hồ sơ. Không có section “Tài khoản của bạn”. Menu ba chấm sẵn có trên bìa vẫn mở Chỉnh sửa hồ sơ, Cài đặt, Ủng hộ Tellme và Đăng xuất. Không khôi phục số đếm khoảnh khắc hoặc phần Một chút về mình; không thêm Gold, widget hoặc tích hợp mạng xã hội giả.

### Tellme ID sharing

“Chia sẻ ID” mở dialog riêng “Kết bạn trên Tellme”, rộng tối đa (440px) với lề viewport (16px), nền `paper`, bo (28px), wordmark/avatar/tên/ID thật và hướng dẫn tìm nhau. “Sao chép ID” là thao tác chính, sao chép ID thuần và báo thành công/lỗi ngay trong dialog; ID cũng chọn được bằng tay. Khi trình duyệt hỗ trợ Web Share, “Chia sẻ qua…” là thao tác phụ chủ động mở hệ thống với một mục `text` duy nhất chứa lời mời và @ID. Không mở share sheet ngay khi bấm shortcut. Dialog dùng nút đóng (44px), cơ chế Escape/backdrop/focus của Modal và giảm kích thước avatar khi màn thấp.

### Loading

Loader chuyển trang giữ artwork fixed ở giữa và có anchor normal-flow cao tối thiểu (1px) để Next chọn đích auto-scroll hợp lệ; AppShell tiếp tục quản lý cuộn bên trong, không che cảnh báo bằng console/dependency patch. Loading chuyển trang dùng SVG mèo ngủ do chủ dự án cung cấp: đuôi đung đưa và hai chữ Z. Animation chỉ ở loader đang hiển thị, không thêm thời gian chờ giả; tắt chuyển động khi bật reduced motion. Upload có hamster từ CSS/JSX do người dùng cung cấp, ghi provenance trong stylesheet; không thêm thư viện styled-components hoặc raster mới. Ảnh vừa gửi xuất hiện ngay trong luồng với hamster và “Đang đăng…” ở vị trí tác giả; thành công hiện “Đã xong” trong (2s), fade rồi trở về “Bạn”. Lỗi giữ ảnh/ID và nút thử lại bo theo role `upload-retry`; retry tái sử dụng URL đã upload. Không thêm thời gian chờ giả cho mạng.

### Messages

Danh sách hội thoại dùng hàng chân dung thoáng: avatar (64px), tên đậm, preview/thời gian thật và mũi tên nhỏ ở cuối. Mobile có nút soạn nổi qua `FloatingActions`, cùng cỡ slot dock (46px), xuống (44px) ở màn tối đa (360px), tâm thẳng với dock; chỉ hiện danh sách hoặc hội thoại được chọn, không bọc toàn màn bằng panel. Desktop giữ danh sách (300px) cạnh hội thoại. Chat đặt avatar (64px) và pill tên ở giữa header; lịch sử có mask fade trên/dưới, bong bóng trung tính bo (24px), ô nhập pill bán trong suốt bo theo role `chat-input`, chỉ nét sáng inset (1px), không bóng ngoài ở nghỉ/focus, và nút gửi tròn. Header và composer cố định trong chat, chỉ lịch sử và danh sách cuộn. Mobile đang mở chat ẩn header ứng dụng và dock để nhường chỗ cho hội thoại. Giữ trả lời, sticker, nhóm, thông tin cuộc trò chuyện và trạng thái đã xem. Ô soạn chat cao tối thiểu (59px), dịch lên (3px); mobile chừa đáy `max(13px, safe-area + 3px)`. Thanh trả lời ảnh dùng role riêng cao (63px), không dùng chung chiều cao chat. Icon chat giữ mức tăng (3px) so với bản trước; safe area và khoảng đáy vẫn đủ thoáng khi bàn phím mở. Preset avatar nhóm giữ asset alpha có sẵn, nút trong suốt mặc định; hover/selected dùng `control-surface`, selected giữ nét `primary`, không thêm tile trắng hoặc asset mới. Dialog tạo chat, gợi ý sticker và picker dùng semantic theme; các hàng tab/search cách nhau (12px), search cao (44px).

### Navigation

Thanh điều hướng nổi dùng SVG (26px), nét đậm 2.4–2.8; mỗi link giữ aria-label và aria-current. Glider dùng nền `control-selected` trung tính và chuyển động (340ms), icon chuyển trạng thái dùng (380ms), tắt khi giảm chuyển động. Indicator chỉ theo pathname đã commit; link đang tải có pending signal riêng, không nhảy tab lạc quan trước khi route hoàn tất. Trên camera chỉ hiện pill ba nút với House ở giữa; khi xem ảnh, icon giữa thành shutter để trở về camera và hai flank xuất hiện. Đây không phải nút gửi hay nút chụp ngay trên ảnh đang xem. Góc Tellme ở slot trái mở Modal lưới tính năng luôn ba cột, hiện đúng một tile Nhóm ảnh với icon lớn và tên căn giữa ngay bên dưới. Nút bên phải dùng icon Share hướng lên của thư viện hiện có, mở sheet của đúng ảnh active. Cả hai slot không render trên camera. Viewer ngày dùng cùng FloatingNavigation; không còn hàng camera/chia sẻ riêng hoặc ba chấm trên ảnh chính chủ.

Sheet dùng giấy theo theme, bo hai góc trên (32px), rộng tối đa (500px), cao theo nội dung và cuộn khi cần. Preview vuông lớn căn giữa, rộng `min(100%, 360px, 46dvh)`; landscape cao tối đa (520px) dùng `min(100%, 160px, 38dvh)`. Có handle riêng và nút đóng rõ ràng. Một rail thao tác ngang dùng slot (86px), gap (20px), cuộn ngang bằng swipe hoặc focus bàn phím; phần action kế tiếp lộ ra báo còn nội dung. Giữ nhãn gọn và bỏ hướng dẫn chia sẻ dài thường trực. Caption và tác giả xác định đúng ảnh; Chia sẻ dùng file khi thiết bị hỗ trợ, rồi Web Share/link hoặc clipboard; Lưu ảnh tải file thật, có trạng thái tải/lỗi/thử lại; feedback chỉ xác nhận đã gửi ảnh cho trình duyệt lưu, không bảo đảm ảnh đã vào thư viện. Xóa chỉ báo “Đã xóa ảnh” qua feedback toàn ứng dụng sau khi API thành công. Liên kết vẫn giữ quyền xem hiện có. Ảnh và caption đã đăng không chỉnh sửa; sheet giữ xóa và nhạc theo ngày cho chủ ảnh, báo cáo/chặn theo quyền với ảnh bạn bè. Xóa luôn mở xác nhận và có Giữ lại.

### Dialogs & authentication

Thông báo và Góc Tellme mount có điều kiện bằng Modal, dùng `overlay-surface` theo theme với blur tĩnh (16px), bo (28px), nút đóng (44px), Escape/backdrop và khôi phục focus. Modal có `leading` để đặt nút quay lại cùng hàng tiêu đề và `fitViewport` opt-in cho nhóm ảnh/Góc Tellme. Khung fit dùng chiều cao và offset của visualViewport khi không zoom, theo dõi resize/scroll có cleanup, căn giữa bằng inset/margin thay vì transform, giữ lề an toàn và giới hạn chiều cao theo vùng nhìn thấy; zoom trình duyệt giữ fallback innerHeight. Các popover còn lại có fallback toggle, click ngoài và Escape cho trình duyệt Safari cũ. Modal dùng `animateSurface` chung trước paint: mở từ translateY (20px), scale (.24), opacity (.08) tới trạng thái nghỉ trong (460ms); đóng (460ms) thu về scale (.16), opacity (0) theo hướng nút mở đã ghi nhận, với quãng di chuyển giới hạn. Panel/menu trượt lên từ (22px), scale (.92); bề mặt nội dung dùng translateY (14px), scale (.93). Arrival dùng `cubic-bezier(.16,1,.3,1)`; leave dùng `cubic-bezier(.4,0,.2,1)`. Native backdrop và bề mặt cùng thời lượng/ease ở cả mở và đóng; dialog chỉ rời top layer sau frame trong suốt cuối. Route vào bằng clip/opacity (380ms), ra bằng snapshot (460ms), không transform route root để giữ containing block/hit target fixed. Avatar cùng identity có thể nối vị trí cũ sang portrait/header chi tiết bằng FLIP (460ms). Chỉ tối đa bảy phần tử con được sắp nhịp, delay cách (24ms) và chặn ở (120ms), thời lượng (380ms); danh sách hội thoại không stagger. Status upload riêng giữ (200ms), bubble tin nhắn trong chat dùng (220ms); đây không phải arrival/stagger của hàng danh sách hội thoại. Reduced motion của primitive chung dùng opacity (100ms), không di chuyển/phóng mạnh; vòng lặp không thiết yếu tắt. Thông báo đánh dấu tất cả đã đọc ngay khi mở, không có toolbar đọc tất cả; lỗi hiện toast và có thể đóng/mở lại để thử lại.

Đăng nhập/đăng ký giữ wordmark, form tối giản và một hành động chính; card dùng `paper` phẳng, không bóng, input dùng `paper-soft`, heading/nút giữ Nunito. Feedback hành động dùng chữ `ink` trên chất liệu điều khiển, có nút xác nhận rõ. Phiên thành công điều hướng tải trang đầy đủ đến đích nội bộ hợp lệ trong `/community` hoặc trang hôm nay để bỏ cache chưa đăng nhập. Xác thực email thành công tự vào ứng dụng; không có bước bấm “Vào Tellme” hoặc liên kết ghé thăm thêm.

### Shared arrivals & future features

**The Meaningful Arrival Rule.** Mọi tính năng UI mới phải tích hợp `apps/web/src/lib/ui-motion.ts` và `apps/web/src/components/ui/SurfaceTransition.tsx` cho lần xuất hiện, thay thế trạng thái và đóng bề mặt có ý nghĩa; không animate mỗi React rerender, refetch hoặc lần gõ. `useSurfaceArrival` theo khóa thay đổi, chạy layout effect trước paint; chỉ quan sát direct child ở route root để bắt loader → nội dung đến muộn, riêng họ `/community/messages` dùng chung khóa và tắt quan sát nội dung. List → chat → back trong họ này không replay arrival/exit của main hoặc stagger hàng hội thoại; không tạo snapshot main thoát khi chuyển nội bộ. `SurfacePresence` giữ conditional surface trong exit, hủy/đảo animation theo trạng thái. Shared leave giữ keyframe cuối vô hình bằng WAAPI `fill: forwards` tới khi DOM bị gỡ, tránh repaint trạng thái nghỉ giữa animation và React unmount; arrival dùng `fill: none`, animation mới hủy effect/fill cũ trước khi chạy. Dùng `Modal` để giữ native focus/Escape/backdrop; `closeDisabled` ngăn hành động đóng khi đang xử lý thay vì cho chạy exit rồi bật lại. Không chờ animation trước khi gửi API hoặc chuyển route.

Runtime cài một lần ở AppProviders, ghi nhận nút mở/identity và dùng cùng grammar cho details, native popover cùng fallback Safari. Fallback phát beforetoggle khi panel còn đo được; spatial frame ghép trên CSS transform đang nghỉ để popover được định vị không nhảy góc. Modal bị controller gỡ vẫn có snapshot thoát chỉ để nhìn: inert, aria-hidden, bỏ ID, không bắt pointer; defer tới khi DOM thực sự bị gỡ để tránh exit giả trong StrictMode. Khi không có modal thật thay thế, snapshot dùng native dialog để giữ backdrop và bảo vệ focus/top layer tới hết exit (460ms), rồi close/remove; route/API bắt đầu ngay, còn tương tác nền tiếp tục bị modal giới hạn trong pha đóng. Khi thay modal cùng commit, backdrop mới giữ nguyên độ đậm thay vì fade từ trong suốt; ref handoff của mỗi mount giữ quyết định qua StrictMode. Modal chỉ xử lý cancel có target là chính dialog; Cancel từ file input/nested picker không đóng wizard hay mất tên/ngày/thành viên đã chọn. Native Escape/backdrop/X vẫn đóng theo contract; crop lồng chỉ đóng chính nó. Snapshot/avatar bay phải được gỡ và target được hiện lại sau hoàn tất/hủy. Common Avatar cung cấp identity key; trang đích phải dùng lại identity phù hợp để nối chuyển cảnh. Không tuyên bố giao diện mới tự có motion nếu bỏ qua các primitive/hook này.

Motion theo nghiên cứu [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) về phản hồi có mục đích, liên tục và có thể hủy; [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using) giải thích liên kết danh tính giữa hai trạng thái. Runtime hiện dùng Web Animations API và snapshot/FLIP trong stack sẵn có, không bắt buộc startViewTransition hoặc thêm dependency. Kiểm chứng bằng cả tương tác và keyframe/thời lượng thực tế; ảnh tĩnh không chứng minh được motion hay FPS trên thiết bị thật.

Điều khiển fixed như nút soạn mobile phải đi qua `apps/web/src/components/ui/FloatingActions.tsx`, portal vào host của AppShell bên ngoài main đang fade. Clip/opacity tạo stacking context dù route không scale; vị trí này bảo đảm lần chạm đầu vẫn tới nút khi chuyển trang nhanh. Mở rộng primitive chung khi cần hành vi mới, không tạo bộ arrival/glass riêng cho từng feature. Kiểm tra route chậm thay loader, chuyển nhanh rồi chạm ngay, đóng/mở lại và reduced motion ở cả hai theme.

### Camera-first moment stream

Camera là trang đầu với viewfinder vuông, nút chụp tròn hai lớp (82px), flank (56px) với icon lớn (30px): chồng ảnh bên trái mở Hôm nay, flip bên phải đổi camera. Nhãn Khám phá dưới camera đi vào luồng ảnh hiện có; không khôi phục feed Khám phá đã gỡ. Không có status badge thường trực. Người dùng lần đầu đọc lời giải thích rồi bấm Bật camera; nếu trình duyệt xác nhận đã cấp quyền, preview mở ngay. Tắt media tracks khi trang camera rời active, bị overlay/viewer che, tab bị ẩn hoặc component rời màn hình. Camera trước và sau đều giữ hướng nguồn ở preview và output; không lật ngang theo selfie. `frontFacing` chỉ đổi nhãn; preview scale theo digital zoom và capture vẽ trực tiếp cùng crop. Pinch hoặc +/- thay zoom; chỉ báo số một chữ số thập phân (1.0×, 1.1×…) trong vòng tròn (44px) xuất hiện tạm ở góc trên phải, tự ẩn sau (1400ms), không có slider. Nếu phần cứng báo min/max, giữ đúng phạm vi đó; nếu không có hardware zoom, dùng crop số thật (1–2x), cùng phép crop cho preview và ảnh chụp. Sau chụp giữ nguyên hình học: trái thành X để bỏ ảnh và trở về live, shutter thành paper-plane để đăng. Caption là input một dòng `size=1` với mirror chữ ẩn không nhận pointer để co theo nội dung. Input trong suốt phủ toàn chip, mở vùng chạm thêm (4px) trên/dưới và cao tối thiểu (44px), giữ hình chip hiển thị gọn. Label gắn ID input và focus đồng bộ với `preventScroll` khi bấm để gõ ngay; caret trắng trên ảnh, không khôi phục outline. Caption giữ giới hạn tối đa đồng thời (8 từ) và (40 ký tự), ngay trên ảnh, cùng vị trí caption hiển thị; không thêm form review dưới ảnh. Policy dùng chung `packages/shared/captions.mjs` / `packages/shared/captions.d.mts`, export `./captions`: chuẩn hóa whitespace, giới hạn khi gõ/dán, giữ IME composition khi nhập trước đăng rồi áp dụng giới hạn khi kết thúc. Client và API chỉ áp dụng cho tạo ảnh mới; ảnh/caption đã đăng không chỉnh sửa, không viết lại caption cũ đã lưu. Bộ chụp giữ đăng an toàn; lỗi gửi giữ ảnh để thử lại. Không thay chụp trực tiếp bằng tải ảnh thư viện.

Cuộn dọc có lực hút có chủ ý: touch đi theo (72%) quãng kéo, chỉ chuyển tối đa một trang kề khi vượt ngưỡng (72–112px) đã nhân trọng số hoặc flick cùng hướng có quãng trọng số ít nhất (68px) và vận tốc tối thiểu (0.65px/ms). Kéo ngắn hoặc hủy kéo trả về trang xuất phát. Wheel tích lũy tới (76px) rồi khóa một trang cho mỗi burst, mở khóa sau khoảng nghỉ (190ms). Thả kéo/chuyển trang settle trong (280–380ms) bằng easeOutQuart, cập nhật scrollTop theo animation frame. Gesture mới ngắt settle và bắt đầu tại đích đã commit trước đó, không cần chờ animation xong. CSS snap native là fallback khi không có gesture tùy chỉnh hoặc trang quá khổ. Thêm ngón tay thứ hai hủy gesture cuộn an toàn và cho phép lần vuốt tiếp theo ngay. Giữ pinch, kéo ngang chọn cảm xúc và editable input hoạt động; tap ảnh thường không chuyển trang, chồng nhóm có điều hướng ảnh riêng. Chỉ render card active và hai card liền kề; preload/decode ảnh hàng xóm. Trang không active có `inert`, phần trả lời chỉ mount ở card active. Không ghi React state theo từng frame cuộn. Caption là nút độc lập để mở/thu văn bản trên ảnh, không mở ngày ảnh.

Nút giữa header mặc định “Mọi người”, mở Modal chọn tất cả, một nhóm ảnh hoặc một người đã kết nối, bỏ đối tượng không khả dụng do chặn. Mọi người trộn ảnh thường và một slot cho mỗi nhóm có ảnh; lọc người chỉ hiện ảnh thường, lọc nhóm chỉ hiện chồng được chọn. Chọn một bạn tạo feed có query key/pages riêng (`["tellme", "stories", "pages", author || "all"]`) và tham số `author` trên server, giữ nguyên privacy/quan hệ/chặn. Thứ tự dựa trên thời điểm ảnh mới nhất, không dựa trên lần sửa chuỗi. `startAtPhotos` vào đúng feed đã chọn cả khi đang loading hoặc rỗng, rồi tới ảnh đầu khi có dữ liệu. Chọn Mọi người reset scope; mất kết nối hoặc bắt đầu pending upload cũng bỏ lọc. Mặc định không lọc vẫn camera-first.

Stream có tên vùng truy cập được, tab stop và focus ring. Khi focus ở chính vùng stream, phím lên/xuống, PageUp/PageDown đi giữa các trang, Home về đầu; input giữ phím riêng. Reduced motion đưa đến đích tức thì, bỏ smooth scroll/transition và chuyển snap fallback từ mandatory sang proximity. Các chuyển động điều khiển dùng (360ms) với ease mềm; đổi opacity dùng (240ms).

### Photo groups — round10–16, 15/11/2026

Contract consent/avatar sau round13 giữ nguyên; round14 sửa dismissal/cancel và motion chung như trên. Round13 supersedes motion gần như tĩnh và cách thêm trực tiếp người được chọn; các correction round12 về nơi tạo, kính chung và khung quản lý tiếp tục giữ. Camera chỉ render switch tròn (48px) UserRound ↔ UsersRound khi có nhóm còn đăng được. Không có nhóm thì đăng thường và không có switch; tạo/quản lý nằm trong Góc Tellme. Trước capture, đích không còn dùng được được bỏ khi không có nhóm hoạt động. Ảnh riêng đã chụp vẫn giữ đích; nếu nhóm không còn đăng được, inline “Đăng thường” là quyết định rõ ràng của người dùng trước khi gửi, không tự chuyển ảnh riêng thành ảnh thường. Switch giữ shared glass, scale/rotation (500ms), delay (180ms), ảnh/caption và nhãn truy cập. Đây là chuyển động riêng từ mẫu người dùng, không thay motion chung.

Khung tạo thông tin/thành viên giữ tỷ lệ 4:3, rộng tối đa (560px), giới hạn bởi visualViewport; bước avatar có chiều cao tối thiểu (280px) khi cần để giữ target và thao tác tải lên. Thông tin/thành viên/avatar có header/footer cố định; dialog, content, body và form không cuộn. Chỉ gợi ý bạn cuộn dọc và chip đã chọn cuộn ngang độc lập; danh sách lời mời/quản lý dài giữ cuộn native. Hai bước thông tin/thành viên, avatar là bước lồng; tìm bạn đã kết nối theo tên/Tellme ID và chip có thể bỏ thay cho roster checkbox dài. Màn hẹp hoặc SE (375 × 667px) rút gọn nhãn hiển thị, giữ label/legend truy cập, avatar nhỏ và toàn bộ thao tác. Bạn đang ở nhóm khác vẫn được chọn để mời, kèm nhãn tham gia sau khi rời nhóm cũ; không giả như đã tham gia. Thời hạn chỉ 1/3/7 ngày; nút ngày và primary cùng cao (48px), Nunito (800, 14px/18.2px). Lựa chọn ngày dùng nền kính xám, trạng thái chọn đậm hơn cùng dấu check và chữ `primary`. Lỗi có thể tăng khung tới chiều cao tối thiểu (320px) nhưng vẫn bị chặn bởi chiều cao vùng nhìn thấy để phần khôi phục không bị khuất.

Chi tiết nhóm ôm nội dung, không ép 4:3 hoặc cuộn toàn body; quay lại nằm trong header. Avatar/tóm tắt và một rail thành viên ngang gọn đứng trên hai ô thao tác bằng nhau: Đăng vào nhóm và Xem ảnh cao (64px). Mời bạn là một hàng kính riêng rộng toàn khung cho chủ nhóm đang hoạt động. Hủy nhóm/Rời nhóm thành hàng riêng rộng toàn khung, tối thiểu (44px), nhãn và icon dùng `danger`. Xác nhận có hai nút bằng nhau cao (48px), giữ lại là kính trung tính, hủy/rời là danger đặc. Nhóm lịch sử chỉ giữ Xem ảnh khi có ảnh; rail thành viên dài cuộn ngang, không kéo dài toàn modal. Dùng Modal fitViewport/arrival và theme glass chung. Tiêu đề compact (20px) và control radius (14px) là role cục bộ, không mở rộng scale typography/radius toàn hệ thống.

Góc Tellme luôn ba cột, plate tròn (72px; 64px ở màn 320px), SVG (34px), nhãn căn giữa dưới icon; body cách header (8px). Khi chưa có nhóm hoạt động, entry căn giữa có plate cộng (80px), SVG (40px) và nhãn “Tạo nhóm”; khi không có lời mời, body dùng overflow clip để không wheel/touch scroll. Màn tối đa (360px) dùng plate (64px), action cao tối thiểu (104px), gap (8px), padding (4px) để giữ cả icon và nhãn trong khung. Modal không có disclosure chồng đã lưu; nhóm đã kết thúc vẫn ở luồng ảnh chính theo thời gian, không đổi dữ liệu/quyền xem. Avatar form dùng hai hàng target tối thiểu (44px), artwork thu nhỏ theo màn hẹp/thấp, có Tải ảnh lên và quay lại. Dùng cùng ImageCropper/validation/upload cho ảnh tùy chỉnh ở bước tạo hoặc khi chủ nhóm đang hoạt động bấm avatar. Preview media bảo vệ không qua server image optimization. Nút đóng bị vô hiệu hóa khi đang xử lý crop/upload.

Lời mời dùng danh tính nhóm/người mời và cặp Từ chối/Tham gia bằng nhau, target tối thiểu (44px), trong inbox và Corner. Chủ nhóm thấy người chờ với avatar nhẹ hơn và nhãn Đang chờ, tách khỏi số thành viên đã chấp nhận. Không thêm lời mô tả dài hoặc style mới: dùng glass/action, primary và danger hiện có. Quyền xem ảnh chỉ tới sau chấp nhận; avatar nhóm là danh tính giới hạn của lời mời. Chặn do nhóm cũ có thông báo lỗi và đường khôi phục rõ, không tự rời nhóm thay người dùng.

Chồng nhóm giữ lớp ảnh sau; tác giả hiện trong ngoặc phía trên avatar/tên nhóm, time gọn và count chữ riêng. Không render mũi tên trước/sau; tap, swipe ngang và phím trái/phải tiếp tục đổi ảnh, cuộn dọc giữ feed riêng. Sheet luôn theo ảnh đang chọn, tác giả có thể xóa ảnh của mình; ảnh cũ vẫn đọc/lưu sau expiry/end/leave khi quyền cho phép. Shared arrival, reduced motion, caption material và bố cục landscape giữ nguyên. Không có raster mới. Round12 mở rộng các role kính/selected/danger dùng chung trong frontmatter; round13 mở rộng motion dùng chung và consent/avatar theo [PRODUCT.md](PRODUCT.md), [BACKEND.md](BACKEND.md). Các round trước trong surface brief là lịch sử kiểm thử, không còn là contract cho phần đã supersede.

### Replies & reactions

Trả lời trực tiếp dưới ảnh gửi riêng vào hội thoại gắn đúng khoảnh khắc và giữ người dùng trên màn ảnh; thành công mới xóa bản nháp. Thanh phản hồi chia đôi: input bên trái, ba cảm xúc hiển thị và nút cộng bên phải; vuốt ngang để chọn các cảm xúc còn lại trong bộ năm ảnh có sẵn. Nút cộng mở bộ emoji native dùng chung với chat. Khi có nội dung, nút gửi trả lời riêng xuất hiện ngay trong input. Nút camera-return ở giữa dock chỉ đưa về camera, không trở thành nút gửi trả lời riêng; shutter trong trạng thái đã chụp vẫn đổi thành paper-plane để đăng ảnh theo hợp đồng capture. Bản nháp lưu theo ID ảnh và còn khi cuộn sang trang khác rồi quay lại. Nút gửi vẫn hiển thị khi bàn phím mobile mở. Cảm xúc emoji mới dùng font màu của hệ điều hành, không thay bằng icon glyph giả. Ảnh của chính chủ dùng nút có nhãn Hoạt động với tối đa 5 avatar người phản ứng, chồng một nửa lên nhau; không hiển thị số đếm hoặc lời mô tả số người. Khi chưa có ai, giữ nhãn Hoạt động và biểu tượng để mở trạng thái trống. Danh sách trong dialog căn trái, tên và Tellme ID trên hai dòng, cảm xúc ở cột phải. Thanh trả lời stream cao (63px), trên mobile nằm thấp hơn bản trước (3px), bo theo role `panel`, dùng cùng chất liệu điều khiển bán trong suốt; camera không nằm trong vùng phản hồi. Cột cảm xúc rộng (180px), strip (132px) chứa ba slot (42px) với gap (3px); artwork (48 × 48px) bù padding trong suốt có sẵn. Nút cộng rộng (44px), SVG (32px). Cảm xúc mới tạo một cụm tối đa 12 bong bóng bay rồi vỡ, không chạy khi gỡ cảm xúc hoặc bật giảm chuyển động.

### Brand, media & reused patterns

Wordmark hiện tại lấy từ `/brand/logos/tellme-wordmark-on-light.png`; giữ tỷ lệ tài sản gốc ở `assets/brand/` và bản web trong `apps/web/public/brand/`. Bộ cảm xúc dùng `/images/reactions/{like,love,haha,wow,sad}.png`. Ảnh nội dung lấy từ dữ liệu được phép xem; không sinh ảnh trang trí, danh tính hoặc số tương tác thay cho nội dung thật. Không có shipping raster mới từ lần thay giao diện này.

Giữ các luồng camera, xem chuỗi theo ngày, chat/sticker/emoji, nhạc và hành trình được dùng lại. Home và viewer ngày dùng chung luồng cuộn dọc. Nguồn Uiverse và thông báo MIT của các primitive thích nghi tiếp tục ở [Uiverse references](references/uiverse/README.md), [LICENSES.md](references/uiverse/LICENSES.md) và `/licenses/uiverse.txt`; việc đổi hình thức không xóa provenance. Tài liệu này không biến mọi kích thước cũ trong các luồng đó thành token mới.

## Do's and Don'ts

### Do:

- **Do** giữ canvas trắng/than chì, các lớp xám theo theme và navy cho thao tác.
- **Do** dùng Nunito self-host và kiểm tra dấu tiếng Việt cùng tên dài trên màn hẹp.
- **Do** mở đầu bằng camera và giữ trả lời/gửi ngay dưới đúng ảnh, với bản nháp theo ID ảnh.
- **Do** giữ danh tính, giới thiệu và hành trình theo tháng khi mở rộng hồ sơ.
- **Do** cung cấp focus rõ cho nút/link, caret màu thao tác cho nhập liệu, nhãn thao tác, điều hướng bàn phím dọc và giảm chuyển động.
- **Do** giữ tỷ lệ tài sản thương hiệu, ảnh cảm xúc và nguồn/MIT của primitive được dùng lại.
- **Do** dùng chung ui-motion, SurfaceTransition/Modal, FloatingActions và glass-control cho mọi tính năng UI mới; giữ tương tác ngay trong arrival/exit.

### Don't:

- **Don't** đổi canvas thành xanh bão hòa hoặc thêm sidebar vào desktop.
- **Don't** thay kết bạn bằng Tellme ID và chấp nhận hai chiều bằng gợi ý người lạ/follow một chiều.
- **Don't** chuyển trả lời dưới ảnh thành một bước điều hướng bắt buộc hoặc xóa bản nháp khi gửi lỗi.
- **Don't** dùng kéo ngang hoặc tap ảnh để chuyển trang; giữ cuộn dọc có lực hút, kéo ngắn trả về và mỗi gesture/burst chỉ đi một trang kề.
- **Don't** dựng người dùng, ảnh hoặc số tương tác giả làm nội dung sản phẩm.
- **Don't** diễn giải các màn/luồng lịch sử đã gỡ như chuẩn thiết kế hiện hành.
- **Don't** chạy arrival trên mọi rerender, animate blur hoặc đặt action fixed trong route đang fade.

### Mobile refinements

Hành trình dùng tháng ngắn với năm ở dòng nhỏ, bộ chuyển tháng grid 44/84/44px: hai nút 44px tách khỏi nhãn tháng. Tiêu đề và điều khiển cùng hàng khi đủ chỗ; màn tối đa 360px đặt tiêu đề trên điều khiển để không chồng lấn. Chỉ hai nút mũi tên đổi tháng, không vuốt/kéo ngang; giới hạn từ tháng tạo tài khoản tới tháng sau hiện tại. Map đo kích thước bên trong thật qua ResizeObserver, không cộng margin vào width 100%; dưới 480px map dùng bốn cột, rộng hơn dùng sáu cột, giữ ảnh và nhãn ngày bên trong khoảng lề. Logo nhỏ trong section được ẩn để giữ khoảng thở. Hôm nay có tiêu đề Nunito đậm, nút đóng và lưới hai thẻ mỗi hàng, cuộn dọc; khi chưa có ảnh, lời nhắc không che thao tác chụp. Sticker mobile dùng bốn cột, tab ảnh 24px và ảnh tin nhắn tối đa 112px. Emoji có padding 8px đều hai bên trong shadow root, không giữ gutter của scrollbar đã ẩn.

### Day / night and the single-day viewer

Nền sáng dùng `canvas`, chế độ tối dùng `canvas-night`; các lớp `paper`, `paper-soft`, chữ, đường viền và thao tác đổi theo token tương ứng trong frontmatter. PWA/browser chrome cũng dùng canvas trắng/than chì. Nút mặt trời/mặt trăng do chủ dự án cung cấp đặt cạnh chuông, vùng chạm 64 × 44px, artwork scale 0.68. Riêng trang chủ mobile ẩn nút này để header vừa; các route khác vẫn cho đổi theme. Cookie `tellme_theme` chỉ lưu lựa chọn giao diện; server đọc trước khi render để tránh nháy màu, logo/PWA chrome/picker cùng đổi. Giảm chuyển động tắt loop mây/sao.

Mobile bỏ panel ngoài bọc toàn hồ sơ và tin nhắn. Hồ sơ giữ các bề mặt summary, hành trình và prompt theo theme để các phần có nền rõ ràng; menu ba chấm trên bìa vẫn còn, không có section tài khoản riêng.

Lưới Hôm nay giữ thẻ dọc 3:4, đúng hai cột ở mọi kích thước. Nút chồng ảnh bên trái camera mở shelf này; nút đóng trở về camera. Nút giữa header là bộ chọn bạn như mô tả trong Camera-first moment stream. `StoryMomentViewer` mở một chuỗi của một người trong đúng ngày được chọn; các mốc cũ trong hồ sơ và link ảnh trong tin nhắn vẫn mở được. Viewer là dialog toàn viewport dùng canvas theo theme và cùng `MomentStream`/`MomentCard`: cuộn dọc, caption overlay, trả lời, cảm xúc và nhạc theo ngày. Header có nút đóng; Escape vẫn đóng. Dock dùng chung có shutter giữa để trở về camera. Cuối ngày có lời kết và nút Đóng ngày này, không tự lặp hay tự đóng. Bong bóng cảm xúc portal vào dialog đang mở để nằm trên scrim. Xóa từng ảnh có xác nhận trong StoryMenu; không có sửa ảnh/caption đã đăng; timeline và CSS cũ được gỡ.

### Golden night journey and received reactions

Ở chế độ tối, các mốc hành trình là ngôi sao bo mềm: mốc trống dùng vàng dịu, mốc có ảnh dùng cùng khung sao với ảnh bên trong. Hai asset SVG là hình học của UI; chế độ sáng giữ bubble tròn. Tiêu đề hành trình và bộ chuyển tháng tách rõ; ở 320px tiêu đề nằm trên điều khiển.

Mèo loading, đuôi, tường và chữ ở chế độ tối dùng trắng; loader chuyển trang hiện “Đợi xíu nha…”. Splash giữ chuyển động chữ và Escape/reduced motion, không có nút Vào Tellme hoặc CSS của nút cũ.

Field chữ mobile nằm trong composer (59px); field và wrapper đều không thêm focus ring/border/glow. Caret `primary` là tín hiệu đang nhập, nút/link vẫn giữ keyboard focus. Chữ đọc ban ngày dùng đen, icon/nút thương hiệu giữ navy; ban đêm và trên mặt navy giữ chữ sáng.

Cảm xúc ảnh chính chủ chạy ở trang chủ và viewer bằng cùng MomentReactionBurst. Lượt chưa xem tạo 24–40 bong bóng từ mép dưới viewport, gồm artwork và emoji thực nhận. Chờ splash xong, chỉ đánh dấu khi ảnh đang xem; không tiêu thụ lượt ở trang bị modal che. Preview nhỏ có lịch sử riêng. Counts lưu theo ảnh trong sessionStorage và bộ nhớ, nên home/modal/tải lại trong cùng tab không phát lại lượt cũ; tăng counts mới phát lượt mới. Portal vào dialog khi cần, cleanup khi rời ảnh, tắt với reduced motion và không chặn nhập liệu.


## Finite photo viewing — 2026-11-14

Home starts at the camera. Scrolling down reaches the newest photo, then older photos across API pages, without wrapping. The last page centers the library CircleCheckBig icon, “Đã xem hết rồi” and “Về đầu trang”, without a sticker, paragraph or refresh button. The return action goes to the camera at the start of the stream. Caption expands in place; time and empty space do not launch a historical viewer from home.

The camera’s left stacked-photo control opens the Today shelf, which has a heading, two cards per row and an explicit close button. The centered header control opens the friend selector; it does not open the shelf. Photos keep inline send and reactions; the centered dock returns to camera and opens share/save plus permitted photo actions in its right-hand sheet. A single-author day ends with a close action that returns to the surface that opened it.

The profile month selector sits above the measured journey map, with separate 44px arrows and a two-line month/year label; only these arrows change the month. Full-size sleeping-cat loaders stay at viewport center throughout route and query fallbacks. Settings dialogs, block picker and fields inherit semantic day/night colors.


## Founding members and device fit — 2026-11-14

A small gold sparkle marks the first 100 accounts ever created. Profiles say “Mở lối” beside the Tellme ID; avatars elsewhere use a fine gold orbit and soft star, without a numeric label. The compact themed dialog explains this is a thank-you, without showing an account’s private sequence number. It has an explicit close button, Escape/backdrop dismissal, fit-content height, a maximum viewport height and a width capped at 360px with 16px side clearance. Both themes use gold with readable contrast. The profile mark has a minimum 44px touch target.

Phone photos and camera output are square (1:1), use available width with 16–20px side spacing, and center-crop older images without stretching them. Short phones fit the square photo to available height while leaving metadata/reply above the dock; oversized accessibility pages retain native inner scrolling. On Home, the header floats transparently above a full-height scrolling canvas; only its controls are painted, with no bar, blur, pseudo-layer or clipped strip. On other routes, the header uses the active canvas color to keep scrolling foreground text from crossing the wordmark, theme control and bell. This neutral backing adds no panel, border or shadow. Initial content spacing includes header height and the top safe-area inset. Landscape phones place the image beside the controls. Profile avatars are plain circles; summary, journey and capture prompt use separate themed surfaces with no outer profile frame. The compact journey heading reads “Hành trình”.


Ordinary photos in the vertical stream have no decorative backing cards or rotated stack preview; photo groups use the scoped stack described above. A server-claimed, one-time welcome for founding accounts starts after the brand intro: the soft gold star rises and spins, a brief confetti burst spreads outward, then the single sentence “Chúc mừng bạn là một trong 100 người mở lối cùng Tellme!” appears. Reduced motion keeps the static star and greeting. There is no looping animation or mandatory wait to close.
