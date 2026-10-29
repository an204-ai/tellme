# Tellme — Social Platform Monorepo

> **Your day. Your stories.**  
> Mạng xã hội dành cho những câu chuyện và khoảnh khắc đời thường. “Chuyện hôm nay” gom các ảnh được bổ sung trong ngày thành một chuỗi và lưu lại theo ngày trên trang cá nhân.

## 📁 Cấu trúc Monorepo (Turborepo)

- **`apps/api`**: Backend REST API (Hono + Node.js, MongoDB, Cloudinary)
- **`apps/web`**: Web Application (Next.js 15 App Router, Tailwind CSS v4, TanStack Query)
- **`apps/mobile`**: Mobile Application iOS & Android (Expo SDK 53, NativeWind, TanStack Query)
- **`apps/admin`**: Admin Management Dashboard (React + Vite)
- **`assets/brand`**: Ảnh nhận diện gốc và nơi chuẩn bị logo, icon, font dùng chung
- **`packages/database`**: Scaffold Drizzle/PostgreSQL cũ, hiện không được API import
- **`packages/shared`**: Types, Zod validators, hằng số, tiện ích dùng chung FE & BE
- **`packages/ui`**: Design tokens dùng chung và component DOM cho Web/Admin; Mobile dùng component React Native riêng
- **`packages/config`**: Cấu hình TypeScript, ESLint dùng chung
- **`workers/`**: Background workers (Xử lý media, tính toán bảng tin, gửi push notification)
- **`infra/`**: Docker compose, Nginx và setup script
- **`docs/`**: Mô tả sản phẩm, quy ước cấu trúc, nhận diện và tài liệu kỹ thuật

## Đọc project

1. [PRODUCT.md](docs/PRODUCT.md): mô tả ứng dụng do chủ dự án cung cấp.
2. [ARCHITECTURE.md](ARCHITECTURE.md): bản kiến trúc chính.
3. [STRUCTURE.md](docs/STRUCTURE.md): vai trò thư mục và các đường dẫn sau khi sắp xếp.
4. [DESIGN.md](docs/DESIGN.md): nhận diện từ ảnh tham chiếu.

Web dùng `src/app/auth/`, `src/app/community/` và `src/app/post/`. Ví dụ: `/auth/login`, `/community/feed`, `/post/123`. Thư mục `apps/web/public/` dành cho tài sản tĩnh.

## Chạy web và backend

Web đã kết nối API Hono + MongoDB Atlas, upload Cloudinary và Giphy proxy. Đăng nhập bằng tài khoản thật; dữ liệu prototype trong trình duyệt không được dùng làm tài khoản thật.

```sh
pnpm install
pnpm --filter @tellme/api dev
# Terminal khác:
pnpm --filter @tellme/web dev
```

Mở [Tạo tài khoản Tellme](http://127.0.0.1:3000/auth/register). Cấu hình và kiểm thử xem [BACKEND.md](docs/BACKEND.md); hướng dẫn giao diện xem [FRONTEND.md](docs/FRONTEND.md). App mobile/admin/workers chưa được phát triển thêm.

Khóa thật chỉ đặt trong file môi trường bị Git bỏ qua. Stack runtime hiện tại là MongoDB + Cloudinary; PostgreSQL/Drizzle/R2 trong bản định hướng cũ không được API sử dụng.
