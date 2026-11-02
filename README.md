# Tellme — Social Platform Monorepo

Hướng dẫn deploy production lên Coolify với `tellme.my`, `about.tellme.my` và `admin.tellme.my`: [infra/deploy/README.md](infra/deploy/README.md).

> **Your day. Your stories.**  
> Mạng xã hội dành cho những câu chuyện và khoảnh khắc đời thường. “Chuyện hôm nay” gom các ảnh được bổ sung trong ngày thành một chuỗi và lưu lại theo ngày trên trang cá nhân.

## 📁 Cấu trúc Monorepo (Turborepo)

- **`apps/api`**: Backend REST API (Hono + Node.js, MongoDB, Cloudinary)
- **`apps/web`**: Web Application (Next.js 15 App Router, Tailwind CSS v4, TanStack Query)
- **`apps/mobile`**: Mobile scaffold (Expo SDK 52); chưa nằm trong phạm vi runtime hiện tại
- **`apps/admin`**: Admin Management Dashboard (React + Vite)
- **`assets/brand`**: Ảnh nhận diện gốc và nơi chuẩn bị logo, icon, font dùng chung
- **`packages/database`**: MongoDB models/indexes, cấu hình gốc, Redis/BullMQ và tác vụ nền dùng chung cho API/workers
- **`packages/shared`**: Types, Zod validators, hằng số, tiện ích dùng chung FE & BE
- **`packages/ui`**: Design tokens dùng chung và component DOM cho Web/Admin; Mobile dùng component React Native riêng
- **`packages/config`**: Cấu hình TypeScript, ESLint dùng chung
- **`workers/`**: Background workers (Xử lý media, tính toán bảng tin, gửi push notification)
- **`infra/dev/`**: Redis local; **`infra/deploy/`**: production Coolify; **`infra/docker/`**: Dockerfile API/worker dùng chung; **`infra/scripts/`**: công cụ dev
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

Mở [Tạo tài khoản Tellme](http://127.0.0.1:3000/auth/register). Cấu hình và kiểm tra vận hành xem [BACKEND.md](docs/BACKEND.md); hướng dẫn giao diện xem [FRONTEND.md](docs/FRONTEND.md). Admin và ba worker đã kết nối backend; mobile chưa triển khai thêm. Chạy toàn bộ môi trường phát triển bằng `pnpm dev` tại gốc (Redis local cần Docker Desktop).

Khóa thật chỉ đặt trong file môi trường bị Git bỏ qua. Stack runtime hiện tại là MongoDB + Cloudinary; PostgreSQL/Drizzle/R2 trong bản định hướng cũ không được API sử dụng.

## Chuẩn bị push và deploy

- Chỉ mẫu `.env.example` và `infra/deploy/coolify-env.example` được đưa lên Git; cấu hình thật giữ trong `.env` gốc và điền lại trong môi trường của dịch vụ deploy.
- Chạy `pnpm install --frozen-lockfile`, `pnpm build` và `pnpm check-types` trước khi push. Giữ `pnpm-lock.yaml` để deploy dùng đúng phiên bản dependency.
- `.next*`, `dist`, `node_modules`, cache, báo cáo kiểm tra và file riêng tư đã được loại trong `.gitignore`/`.dockerignore`. Không cần đưa build output từ máy cá nhân lên Git.
- CI trên GitHub thực hiện build và kiểm tra TypeScript. Deploy dùng cấu hình của dịch vụ hosting; không còn workflow chỉ in thông báo deploy giả lập.
- Docker API dùng build context ở gốc repo: `docker build -f infra/docker/api.Dockerfile .`. Worker dùng `infra/docker/worker.Dockerfile`.
