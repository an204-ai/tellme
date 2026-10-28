# Tellme — Brand Identity & Design System

> **Slogan thương hiệu:**  
> **KẾT NỐI • LẮNG NGHE • KIẾN TẠO GIÁ TRỊ**  
> *"Kết nối mọi người bằng những điều quan trọng. Tellme giúp bạn giao tiếp, chia sẻ và kết nối dễ dàng hơn mỗi ngày."*

---

## 1. Bảng Màu Thương Hiệu (Color Palette)

Hệ thống màu sắc thể hiện sự trẻ trung, hiện đại, tin cậy và chuyên nghiệp:

| Tên màu | Hex Code | Ý nghĩa & Đặc tính | Ứng dụng trong UI |
| :--- | :--- | :--- | :--- |
| **Navy (Chủ đạo)** | `#07327F` | **Tin cậy • Chuyên nghiệp • Ổn định** | Primary Brand Color, CTA Buttons, App Icon Background, Header/Active states, Wordmark chính |
| **Trắng** | `#FFFFFF` | **Tinh khiết • Rõ ràng • Tối giản** | Background chính (Web/Mobile), Card Canvas, Logo âm bản, Text trên nền tối |
| **Xám nhạt** | `#E8EDF3` | **Hiện đại • Cân bằng • Thân thiện** | Background phụ (subtle surface), đường viền (Border), Input field background, Tag/Badge background |
| **Xám than** | `#2D3748` | **Chuyên sâu • Vững chắc • Tinh tế** | Body Text, Tiêu đề chính (Headings), Icon trung tính, Contrast cao trên nền trắng |

### Biến thể sắc độ phụ trợ (Derived UI Tokens):
- **Navy Hover**: `#052561`
- **Navy Light / Tint**: `#EBF1FA`
- **Text Muted**: `#718096`
- **Border Dark**: `#CBD5E0`

---

## 2. Kiểu Chữ (Typography)

- **Font Family:** **Poppins**
- **Đặc trưng:** Cảm giác hình học hiện đại, rõ ràng, độ thoáng cao, dễ đọc trên cả màn hình di động lẫn máy tính để bàn. Phù hợp hoàn hảo với thương hiệu công nghệ trẻ trung, chuyên nghiệp.
- **Trọng số sử dụng (Font Weights):**
  - `Regular (400)`: Văn bản nội dung (body text), mô tả, ghi chú.
  - `Medium (500)`: Nhãn (labels), nút phụ, điều hướng menu, metadata.
  - `SemiBold (600)`: Tiêu đề mục (section headings), nút chính (CTA), tên người dùng.
  - `Bold (700)`: Tiêu đề lớn (hero headlines, modal titles).

```css
font-family: 'Poppins', system-ui, -apple-system, sans-serif;
```

---

## 3. Quy Chuẩn Logo & Biểu Tượng

1. **Logo chính (Nền sáng):**
   - Biểu tượng giọt nói (speech droplet) màu Navy `#07327F` kết hợp cùng chữ `tellme` thường bo tròn màu Navy.
   - Sử dụng trên nền Trắng (`#FFFFFF`) hoặc Xám nhạt (`#E8EDF3`).

2. **Logo âm bản (Nền tối):**
   - Toàn bộ biểu tượng và chữ `tellme` chuyển sang màu Trắng (`#FFFFFF`).
   - Sử dụng trên nền Navy `#07327F` hoặc hình ảnh tối màu.

3. **Icon đơn sắc & App Icon:**
   - **Icon đơn sắc:** Biểu tượng giọt nói Navy dùng làm watermark, favicon hoặc biểu tượng loading.
   - **App Icon (iOS / Android):** Khối bo góc (squircle) nền Navy `#07327F` với biểu tượng giọt nói màu Trắng `#FFFFFF` đặt cân đối ở trung tâm.

4. **Tỷ lệ & Khoảng cách an toàn (Clear Space):**
   - Duy trì khoảng cách tối thiểu `X` xung quanh logo (với `X` là chiều rộng chuẩn của một ký tự trong logo).
   - Tuyệt đối không đặt chữ, đường kẻ hay chi tiết đồ họa xâm phạm vào vùng an toàn này.

---

## 4. Hệ Thống Design Tokens trong Code

Toàn bộ thông số thiết kế được đồng bộ tại:
- **Tokens:** [`packages/ui/src/tokens/`](file:///Users/mac/Documents/hk1-2026/mediatoday/tellme/packages/ui/src/tokens/)
  - Colors: [`colors.ts`](file:///Users/mac/Documents/hk1-2026/mediatoday/tellme/packages/ui/src/tokens/colors.ts)
  - Typography: [`typography.ts`](file:///Users/mac/Documents/hk1-2026/mediatoday/tellme/packages/ui/src/tokens/typography.ts)
  - Spacing: [`spacing.ts`](file:///Users/mac/Documents/hk1-2026/mediatoday/tellme/packages/ui/src/tokens/spacing.ts)
- **Tailwind Preset:** [`packages/ui/tailwind.preset.ts`](file:///Users/mac/Documents/hk1-2026/mediatoday/tellme/packages/ui/tailwind.preset.ts)
