---
name: "Tellme"
description: "Your day. Your stories. — không gian ảnh thân mật giữa bạn bè đã kết nối"
colors:
  primary: "#07327F"
  primary-hover: "#052561"
  canvas: "#DCEAFA"
  paper: "#FFFFFF"
  ink: "#000000"
  muted: "#000000"
  primary-tint: "#E5EEFB"
  icon-surface: "#E4EDFA"
  line: "#C7D7EB"
  focus: "#8CA7D8"
  field-error: "#B12642"
  notification-marker: "#E54858"
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
    fontSize: "22px"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-0.025em"
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
rounded:
  thumbnail: "12px"
  control: "18px"
  response: "23px"
  card: "24px"
  panel: "28px"
  navigation: "26px"
  photo-mobile: "30px"
  photo: "32px"
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
    textColor: "{colors.paper}"
    typography: "{typography.button-label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-secondary:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary}"
    typography: "{typography.button-label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button-label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  tellme-id-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
  floating-navigation:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.navigation}"
    padding: "5px"
    height: "60px"
  moment-photo:
    rounded: "{rounded.photo}"
    width: "min(100%, 420px, calc(100dvh - 508px))"
  reply-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.response}"
    padding: "5px 8px"
  camera-shutter:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.circle}"
    padding: "5px"
    size: "86px"
  profile-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    width: "100%"
---

# Design System: Tellme

## Overview

**Creative North Star: "Tellme close friends"**

Một không gian ảnh thân mật, nhẹ và gần gũi giữa những người đã chấp nhận kết nối. Nền xanh biển dịu nâng ảnh đời thường lên trước; navy giữ nhịp cho hành động, chữ Nunito tròn và đậm tạo tiếng nói ấm áp. Bề mặt trắng, ảnh bo mềm và camera tròn nối các màn hình thành cùng một thế giới.

Tài liệu ghi hệ thống web responsive đã triển khai và được duyệt ngày 14/11/2026. Desktop giữ trải nghiệm ở giữa màn hình; native Expo vẫn là scaffold. Giữ wordmark và tài sản thương hiệu do dự án cung cấp, tagline **Your day. Your stories.**, ảnh thật của người dùng và bộ ảnh cảm xúc có sẵn. Màu hỗ trợ UI là phần mở rộng của giao diện, không được coi là màu gốc mới của bộ nhận diện. [PRODUCT.md](PRODUCT.md) giữ phạm vi sản phẩm; [API.md](API.md) giữ hành vi và quyền truy cập.

**Key Characteristics:**

- Nền xanh biển dịu, bề mặt trắng và navy dành cho hành động.
- Nunito self-host có tiếng Việt; tiêu đề đậm, nội dung dễ đọc.
- Ảnh thật bo mềm, camera tròn và điều hướng nổi gọn.
- Cùng một trải nghiệm trên điện thoại và desktop, không thêm sidebar.
- Giữ danh tính, giới thiệu và hành trình theo tháng trên hồ sơ.

## Colors

Bảng màu xanh biển dịu, bề mặt sáng và navy rõ nét; frontmatter là nguồn giá trị chuẩn, tên dưới đây diễn giải vai trò.

### Primary

- **Navy thương hiệu** (`primary`): nút chính, liên kết, biểu tượng camera và điều hướng được chọn.
- **Navy sâu** (`primary-hover`): phản hồi hover trên phần trong nút chụp.
- **Xanh kết nối nhạt** (`primary-tint`): nút phụ và bề mặt lời mời.
- **Xanh biểu tượng** (`icon-surface`): nền tròn của lối vào bạn bè và các điểm thao tác nhẹ.

### Neutral

- **Nền ban ngày** (`canvas`): nền chung của ứng dụng và phần mở đầu.
- **Giấy trắng** (`paper`): thanh trả lời, điều hướng, menu, hồ sơ và dialog.
- **Mực đen** (`ink`): chữ đọc và tiêu đề ở chế độ sáng; chế độ tối giữ chữ sáng để dễ đọc.
- **Chữ bổ trợ** (`muted`): dùng đen ở chế độ sáng, phân cấp bằng cỡ/độ đậm thay vì màu xanh xám.
- **Nét xám mát** (`line`): đường phân cách và viền của các mẫu dùng lại.

Trạng thái dùng **xanh focus** (`focus`), **đỏ lỗi** (`field-error`) và **đỏ thông báo** (`notification-marker`). Giữ nhãn chữ/trạng thái truy cập được; không truyền thông tin chỉ bằng màu.

**The Blue Daylight Rule.** Giữ canvas xanh biển dịu; navy xác nhận thao tác, không phủ thành nền xanh bão hòa toàn màn hình.

## Typography

**Display Font:** Nunito, sans-serif.
**Body Font:** Nunito, sans-serif.

Nunito được self-host qua `@fontsource/nunito`, đủ bốn weight (600–900), gồm dấu tiếng Việt. Wordmark dùng tài sản ảnh riêng, không thay bằng chữ gõ lại. Không thêm font trưng bày thứ hai cho các màn mới.

### Hierarchy

- **Headline:** tên hồ sơ và tiêu đề nổi bật; role `headline`, thu xuống (29px) ở hồ sơ mobile.
- **Section title:** tiêu đề các nhóm nội dung; role `section-title`, thường xuống (21px) trên mobile.
- **Moment caption:** role `moment-caption`, tối đa hai dòng trong khung ảnh hiện tại; giảm theo chiều cao viewport, mở toàn văn trong ngày ảnh.
- **Body:** role `body`; phần diễn giải dài dùng nhịp dòng (1.6) nơi nguồn triển khai quy định.
- **Button label:** role `button-label`; trên mobile nút dùng (15px), weight giữ nguyên.
- **Supporting label:** thời gian và thông tin phụ; không lấy nhãn điều hướng nhỏ làm chuẩn cho văn bản hướng dẫn.

**The Rounded Voice Rule.** Dùng Nunito đậm và kiểm tra dấu tiếng Việt trong tên dài, placeholder và nhãn nút; không kế thừa Be Vietnam Pro/Poppins từ tài liệu cũ làm font UI mới.

## Layout

Ứng dụng có header gọn, logo luôn bên trái và nội dung căn giữa. Trên desktop từ 900px, hồ sơ, bạn bè và tin nhắn dùng chung khung ngoài tối đa 1040px với padding ngang 24px. Ảnh khoảnh khắc giữ sân khấu hẹp riêng. Khung ứng dụng cố định theo visual viewport; html/body không cuộn, nội dung dài chỉ cuộn trong main. Header và nav giữ nguyên vị trí. Header cao 88px, chuyển thành 76px ở màn hẹp; gutter mobile là 20px. Mốc responsive chính là 640px. Khoảng cách lặp lại dựa trên scale trong frontmatter.

Trang Tellme now là viewport cố định với khung ảnh vuông, vùng danh tính/chú thích, vùng trả lời và dock chụp. Bản thường dành các hàng dưới (112px / 68px / 100px); các viewport thấp thu nhỏ ảnh và caption trước khi giảm dock. Khi caption rỗng hoặc ảnh thuộc chính chủ, vẫn giữ vùng danh tính và phản hồi để camera không nhảy vị trí. Chú thích đầy đủ và ngày ảnh vẫn mở được từ nội dung liên quan. Chi tiết các ngưỡng chiều cao nằm trong `close-friends.css`; không áp bố cục viewport cố định này cho mọi trang.

Thanh nổi ở giữa sát đáy, tính safe area; chừa khoảng cuộn cuối nội dung để thao tác không bị che. Ba icon Bạn bè / Trang chủ / Tin nhắn chung một pill, không hiện nhãn chữ, launcher bốn ô nằm riêng bên cạnh. Desktop dùng cùng cấu trúc, không bổ sung rail trái/phải. Hồ sơ, Tin nhắn và Bạn bè dùng chung khung ngoài tối đa 1040px với padding ngang 24px; logo luôn căn trái header ở mọi trang. Ảnh bìa phủ hết bề ngang panel hồ sơ. Khi bàn phím mobile mở trong luồng trả lời/chat, header và thanh nổi tạm ẩn để dành chỗ cho nhập liệu.

Trang thêm bạn bắt đầu bằng label và ô Tellme ID; tiêu đề h1 chỉ dành cho trình đọc màn hình. Không có tiêu đề Bạn bè, Tellme ID của chính mình hoặc nút quay lại hiển thị trên màn này. Đây là quyết định của bề mặt thêm bạn, không phải quy tắc cấm tiêu đề trên các trang khác.

## Elevation & Depth

Chiều sâu đến từ giấy trắng trên canvas nhạt, bo góc và lớp ảnh sau xoay nhẹ. Bóng mềm nâng thanh trả lời, điều hướng và popover; hồ sơ và thẻ lời mời phần lớn phẳng. Không biến mọi vùng nội dung thành card nổi.

### Shadow Vocabulary

- **Reply lift:** `0 4px 18px #17345308` — thanh trả lời dưới ảnh.
- **Navigation lift:** `0 6px 28px #17345317` — pill điều hướng và launcher.
- **Launcher panel:** `0 12px 45px #17345326` — popover thêm tính năng.
- **Button hover:** `0 5px 12px #07327f20` — phản hồi hover được giữ từ primitive nút.

**The Gentle Lift Rule.** Dùng bóng mềm để phân biệt lớp thao tác nổi; ảnh và nội dung giữ vai trò chính.

## Shapes

Ngôn ngữ hình học gồm ảnh vuông bo rộng, mặt giấy bo mềm và điều khiển tròn. Scale `rounded` phân biệt thumbnail, input/nút, thanh phản hồi, card, panel và ảnh; ảnh mobile dùng role riêng trong frontmatter. Avatar, nút icon và camera dùng hình tròn thực. Giữ tỷ lệ ảnh, crop bằng `object-fit: cover`, không kéo méo ảnh hoặc wordmark.

Lớp ảnh thật kế tiếp nằm sau ảnh hiện tại, xoay nhẹ (4deg). Thumbnail Hôm nay có silhouette chồng ảnh nhỏ; đây là cách nối chức năng vào cùng thế giới, không phải hiệu ứng trang trí áp cho mọi card.

## Components

### Buttons

Nút chắc, mềm và dễ chạm. Primary dùng navy/trắng; secondary dùng xanh nhạt/navy và nét navy inset được kế thừa; ghost trong suốt/navy. Role `button-*` trong frontmatter ghi padding và chữ bản desktop; chiều cao tối thiểu (46px), mobile (44px). Hover nhấc nhẹ (1px) với bóng mềm; focus có outline xanh (3px), offset (4px); disabled giảm opacity và không nhấc. Không phục hồi các viền gradient giả của phiên bản nút trước.

### Inputs / Fields

Ô Tellme ID là giấy trắng bo mềm, viền mảnh và chữ body. Label luôn hiển thị, không chỉ dùng placeholder. Input giữ `aria-invalid`, thông báo lỗi và trạng thái đang tìm/đang gửi. Focus dùng outline xanh chung. Ô trả lời là một phần của thanh phản hồi trắng: focus vào input làm nổi outline quanh thanh; lỗi giữ bản nháp, có toast và status truy cập được.

### Cards / Containers

Kết quả tìm ID dùng giấy trắng; lời mời đến dùng nền xanh nhạt, cùng role `card`. Danh sách bạn bè là hàng thoáng thay vì thẻ lặp nặng. Hồ sơ là panel trắng với ảnh bìa, avatar, tên, Tellme ID và bio; hành trình theo tháng nằm bên dưới. Không còn số đếm hoặc phần Một chút về mình. Prompt chụp ảnh có khoảng lùi hai bên và padding riêng.

### Loading

Loading chuyển trang dùng SVG mèo ngủ do chủ dự án cung cấp: đuôi đung đưa và hai chữ Z. Animation chỉ ở loader đang hiển thị, không thêm thời gian chờ giả; tắt chuyển động khi bật reduced motion. Loading nhỏ và trạng thái upload vẫn giữ primitive đang dùng.

### Messages

Tin nhắn dùng hai bề mặt trắng tách nhau bằng khoảng 16px trên desktop: danh sách 300px, khu hội thoại co giãn, cả hai bo 28px. Trên điện thoại chỉ hiện danh sách hoặc hội thoại đã chọn, khung bo 26px. Tên đậm, chữ đen ở chế độ sáng; bong bóng nhận dùng xanh rất nhạt, gửi dùng navy và bo mềm 21px. Ô nhập nằm trong bề mặt xanh biển, nút gửi tròn. Header và composer cố định trong chat, chỉ lịch sử và danh sách cuộn. Giữ thao tác trả lời, sticker, nhóm, thông tin cuộc trò chuyện và trạng thái đã xem.

### Navigation

Thanh điều hướng nổi chỉ dùng SVG (26px), nét đậm 2.4–2.8; mỗi link vẫn có aria-label và aria-current. Glider dùng chuyển động ngắn (340ms) và tắt khi giảm chuyển động. Thanh cao 60px, rộng tối đa 350px; launcher bốn ô là nút riêng mở Góc Tellme với trạng thái trống. Chưa đưa chức năng thường dùng vào góc này. Avatar header mở thẳng hồ sơ; chỉnh sửa/cài đặt/ủng hộ/đăng xuất nằm trong nút ba chấm tròn bán trong suốt trên ảnh bìa.

### Photo stack & camera

Khoảng cách từ ảnh đến hàng người đăng và từ hàng đó đến caption là 16px ở khung thường, 10px ở màn rất thấp; vẫn dành chỗ cho hai dòng caption.

Kéo ngang ảnh thật để lật chồng ảnh, ảnh đi theo con trỏ và nghiêng nhẹ. Thả đủ ngưỡng đưa ảnh trên rời chồng trong 400ms; ảnh kế tiếp ổn định trong 320ms. Dùng Web Animations API, dọn animation khi unmount, chỉ cập nhật vị trí kéo một lần mỗi frame. Tải và giải mã trước hai ảnh liền kề để giảm khựng. Tap và phím trái/phải là đường thao tác thay thế, có hướng dẫn truy cập được. Khi chỉ còn một ảnh, thao tác mở ngày ảnh. Reduced motion bỏ động tác toss. Không thêm mũi tên điều khiển hiển thị để thay thế chữ ký kéo ảnh.

Camera là nút tròn hai lớp navy với viền ngoài và khoảng hở; đặt giữa dock, thumbnail Hôm nay bên trái. Bộ chụp hiện có giữ xem lại/chụp lại, caption và nhạc theo ngày; không tự thêm bộ chọn quyền xem hoặc thay chụp trực tiếp bằng tải ảnh thư viện.

### Replies & reactions

Trả lời trực tiếp dưới ảnh gửi riêng vào hội thoại gắn đúng khoảnh khắc và giữ người dùng trên màn ảnh; thành công mới xóa bản nháp. Thanh phản hồi chia đôi: input bên trái, ba cảm xúc hiển thị và nút cộng bên phải; vuốt ngang để chọn các cảm xúc còn lại trong bộ năm ảnh có sẵn. Nút cộng mở bộ emoji native dùng chung với chat. Khi có nội dung, nút chụp chính đổi thành nút gửi cùng kích thước và vị trí; gửi xong hoặc xóa hết nội dung thì trở lại camera. Nút gửi vẫn hiển thị khi bàn phím mobile mở. Cảm xúc emoji mới dùng font màu của hệ điều hành, không thay bằng icon glyph giả. Ảnh của chính chủ dùng nút gọn với tối đa 5 avatar người phản ứng, chồng một nửa lên nhau; không hiển thị số đếm hoặc lời mô tả số người. Khi chưa có ai, giữ một biểu tượng nhỏ để mở trạng thái trống. Danh sách trong dialog căn trái, tên và Tellme ID trên hai dòng, cảm xúc ở cột phải. Vùng chứa vẫn giữ chỗ để camera không dịch. Cảm xúc mới tạo một cụm tối đa 12 bong bóng bay rồi vỡ, không chạy khi gỡ cảm xúc hoặc bật giảm chuyển động.

### Brand, media & reused patterns

Wordmark hiện tại lấy từ `/brand/logos/tellme-wordmark-on-light.png`; giữ tỷ lệ tài sản gốc ở `assets/brand/` và bản web trong `apps/web/public/brand/`. Bộ cảm xúc dùng `/images/reactions/{like,love,haha,wow,sad}.png`. Ảnh nội dung lấy từ dữ liệu được phép xem; không sinh ảnh trang trí, danh tính hoặc số tương tác thay cho nội dung thật. Không có shipping raster mới từ lần thay giao diện này.

Giữ các luồng camera, xem chuỗi bằng chồng ảnh, chat/sticker/emoji, nhạc và hành trình được dùng lại. Nguồn Uiverse và thông báo MIT của các primitive thích nghi tiếp tục ở [Uiverse references](references/uiverse/README.md), [LICENSES.md](references/uiverse/LICENSES.md) và `/licenses/uiverse.txt`; việc đổi hình thức không xóa provenance. Tài liệu này không biến mọi kích thước cũ trong các luồng đó thành token mới.

## Do's and Don'ts

### Do:

- **Do** giữ canvas xanh biển dịu, mặt giấy trắng và navy cho thao tác.
- **Do** dùng Nunito self-host và kiểm tra dấu tiếng Việt cùng tên dài trên màn hẹp.
- **Do** giữ camera ổn định giữa ảnh có/không caption và ảnh của chính chủ/bạn bè.
- **Do** giữ danh tính, giới thiệu và hành trình theo tháng khi mở rộng hồ sơ.
- **Do** cung cấp focus, nhãn thao tác, đường bàn phím/tap và giảm chuyển động.
- **Do** giữ tỷ lệ tài sản thương hiệu, ảnh cảm xúc và nguồn/MIT của primitive được dùng lại.

### Don't:

- **Don't** đổi canvas thành xanh bão hòa hoặc thêm sidebar vào desktop.
- **Don't** thay kết bạn bằng Tellme ID và chấp nhận hai chiều bằng gợi ý người lạ/follow một chiều.
- **Don't** chuyển trả lời dưới ảnh thành một bước điều hướng bắt buộc hoặc xóa bản nháp khi gửi lỗi.
- **Don't** thay thao tác kéo chồng ảnh thật bằng các nút mũi tên hiển thị.
- **Don't** dựng người dùng, ảnh hoặc số tương tác giả làm nội dung sản phẩm.
- **Don't** diễn giải các màn/luồng lịch sử đã gỡ như chuẩn thiết kế hiện hành.

### Mobile refinements

Hành trình dùng tháng ngắn với năm ở dòng nhỏ, hai nút 44px, bỏ pill dài. Trên điện thoại, tiêu đề và điều khiển cùng hàng; logo nhỏ trong section được ẩn để giữ khoảng thở. Hôm nay có tiêu đề Nunito đậm, một dòng giới thiệu và lưới hai thẻ mỗi hàng, cuộn dọc; khi chưa có ảnh, lời nhắc không che thao tác chụp. Sticker mobile dùng bốn cột, tab ảnh 24px và ảnh tin nhắn tối đa 112px. Emoji có padding 8px đều hai bên trong shadow root, không giữ gutter của scrollbar đã ẩn.

### Day / night and the single-day viewer

Nền sáng `#DCEAFA` rõ xanh hơn bản `#F3F7FD`. Chế độ tối dùng canvas `#102238`, paper `#1B324C`, ink `#E9F2FF`, muted `#B0C5DF` và primary `#A5CCFF`. Nút mặt trời/mặt trăng do chủ dự án cung cấp đặt cạnh chuông, vùng chạm 64 × 44px, artwork scale 0.68. Cookie `tellme_theme` chỉ lưu lựa chọn giao diện; server đọc trước khi render để tránh nháy màu, logo/PWA chrome/picker cùng đổi. Giảm chuyển động tắt loop mây/sao.

Mobile bỏ panel trắng bọc hồ sơ, hành trình và tin nhắn; thành phần nằm trực tiếp trên canvas, chỉ field/menu/dialog có bề mặt riêng. Nút ba chấm ảnh bìa có hình tròn 36px và vùng chạm 44px.

Lưới Hôm nay giữ thẻ dọc 3:4, đúng hai cột ở mọi kích thước và không còn kéo ngang. `StoryMomentViewer` mở một chuỗi của một người trong đúng ngày được chọn; các mốc cũ trong hồ sơ vẫn mở được. Modal trong suốt, scrim navy có alpha, xếp chồng ảnh dùng chung `MomentCard`; lật bằng kéo/tap/phím, trả lời, cảm xúc và nhạc vẫn hoạt động. Bấm vùng trống, nút đóng hoặc Escape để đóng. Bong bóng cảm xúc được portal vào dialog đang mở để luôn nằm trên scrim. Sửa/xóa từng ảnh nằm trong StoryMenu; timeline và CSS cũ được gỡ.

### Golden night journey and received reactions

Ở chế độ tối, các mốc hành trình là ngôi sao bo mềm: mốc trống dùng vàng dịu, mốc có ảnh dùng cùng khung sao với ảnh bên trong. Hai asset SVG là hình học của UI; chế độ sáng giữ bubble tròn. Tiêu đề hành trình và bộ chuyển tháng có hai nền riêng, vẫn vừa 320px.

Mèo loading, đuôi, tường và chữ ở chế độ tối dùng trắng; loader chuyển trang hiện “Đợi xíu nha…”. Splash giữ chuyển động chữ và Escape/reduced motion, không có nút Vào Tellme hoặc CSS của nút cũ.

Thanh soạn tin mobile cao 42px, field không tự vẽ outline; chỉ container có focus ring. Chữ đọc ban ngày dùng đen, icon/nút thương hiệu giữ navy; ban đêm và trên mặt navy giữ chữ sáng.

Cảm xúc ảnh chính chủ chạy ở trang chủ và viewer bằng cùng MomentReactionBurst. Lượt chưa xem tạo 24–40 bong bóng từ mép dưới viewport, gồm artwork và emoji thực nhận. Chờ splash xong, chỉ đánh dấu khi ảnh đang xem; không tiêu thụ lượt ở trang bị modal che. Preview nhỏ có lịch sử riêng. Counts lưu theo ảnh trong sessionStorage và bộ nhớ, nên home/modal/tải lại trong cùng tab không phát lại lượt cũ; tăng counts mới phát lượt mới. Portal vào dialog khi cần, cleanup khi rời ảnh, tắt với reduced motion và không chặn nhập liệu.


## Finite photo viewing — 2026-11-14

Home starts at the newest photo and advances toward older photos across API pages. It never wraps. The final card gives way to “Hết ảnh rồi nè.”; revisiting the newest photo is an explicit action. Caption, time and empty space do not launch a historical viewer from home.

The home dock places Today on the left, camera/send in the center, and share/download on the right. The Today shelf has two cards per row and a close button, with no heading, description or bottom camera dock. A single-author day closes back to the shelf after its final photo.

The profile month selector is a small waypoint with a dotted stem leading into the journey map; no full-width title bar. Full-size sleeping-cat loaders stay at viewport center throughout route and query fallbacks. Settings dialogs, block picker and fields inherit semantic day/night colors.
