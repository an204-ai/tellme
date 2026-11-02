# Tellme — Quy ước cấu trúc project

Monorepo giữ bốn ứng dụng, package dùng chung và ba worker. Runtime gồm web Next.js, admin React/Vite, API Hono/Node.js, ba worker BullMQ, MongoDB Atlas, Redis và Cloudinary. Landing là Next.js static export độc lập; mobile còn là scaffold. Xem [FRONTEND.md](FRONTEND.md), [BACKEND.md](BACKEND.md) và [kiến trúc chính](../ARCHITECTURE.md) cho phạm vi đang chạy.

## Vai trò các thư mục

| Vị trí | Trách nhiệm hiện tại |
| --- | --- |
| `apps/web/src/app/` | Route/layout Next.js, auth, cộng đồng và chi tiết bài |
| `apps/web/src/components/screens/` | Các màn tương tác web |
| `apps/web/src/components/app/` | Shell, composer, dialog bài, timeline ngày ảnh |
| `apps/web/src/components/ui/` | Primitive, emoji, media picker và infinite trigger |
| `apps/web/src/hooks/` | `use-community.ts` cho metadata/mutation; `use-posts.ts` cho trang bài/hồ sơ/chi tiết |
| `apps/web/src/lib/` | `api-repository.ts`, type/validation/quyền hiển thị, Giphy proxy client, brand; `seed.ts`/`feed-data.ts` là dữ liệu cũ không nối runtime |
| `apps/web/src/services/` | Scaffold API client cũ; màn hình hiện tại dùng `lib/api-repository.ts` |
| `apps/web/src/stores/` | Zustand cho trạng thái UI |
| `apps/web/src/styles/` | CSS nền, Uiverse, moments và refinements |
| `apps/web/public/` | Brand, ảnh tĩnh và thông báo giấy phép |
| `apps/api/src/app.ts` | Khởi tạo Hono, middleware và gắn route API |
| `apps/api/src/main.ts` | Kết nối database, khởi động HTTP/WebSocket server (loopback ở dev, 0.0.0.0 trong Docker) |
| `apps/api/src/backend/` | Config, MongoDB/index, model, domain/DTO/quyền, session/security, validation và route helper |
| `apps/api/src/modules/` | Route nghiệp vụ và quản trị: auth, bootstrap, user, post, story, message, conversation, notification, media, music, admin |
| `apps/api/tests/` | Kiểm tra API admin dùng dữ liệu kiểm thử riêng |
| `apps/mobile/src/`, `apps/mobile/assets/` | Scaffold Expo/React Native và tài sản mobile |
| `apps/admin/src/` | Dashboard người dùng, kiểm duyệt, báo cáo, job, hạ tầng, log, thống kê và audit |
| `packages/database/` | MongoDB Atlas native driver, models/indexes, config, Redis/BullMQ, job và worker dùng chung |
| `packages/shared/` | Kiểu/validator/hằng số dùng chung, độc lập nền tảng |
| `packages/ui/` | Token/component DOM dùng chung đã có; phần lớn UI web hiện ở app web |
| `packages/config/` | Cấu hình công cụ dùng chung |
| `workers/` | Media processor, feed builder, notification sender nối MongoDB outbox và Redis/BullMQ |
| `infra/dev/` | Compose Redis local, bind 127.0.0.1; project `docker` giữ volume Redis dev cũ |
| `infra/docker/` | Hai Dockerfile dùng chung để build API và worker; production Compose tham chiếu trực tiếp |
| `infra/deploy/` | Production Compose Coolify, image web/admin/landing, Nginx cho ba domain, mẫu env và hướng dẫn Atlas |
| `infra/scripts/` | Công cụ dev: launcher, setup, kiểm tra kết nối Atlas, tạo VAPID |
| `tellme-landing/` | Landing Next.js static export, pnpm project/lockfile độc lập |
| `assets/brand/` | Tài sản thương hiệu gốc và ảnh tham chiếu |
| `docs/`, `.impeccable/` | Tài liệu, nguồn UI, design sidecar và bằng chứng QA |

API hiện không dùng cây `src/common/` hoặc `src/infra/` cũ. Không tạo module controller/service/repository rỗng để khớp kiến trúc dự kiến. Thêm domain hoặc tách service khi mã đang chạy có nhu cầu; không tạo cây `features/` rỗng song song các component/hook hiện tại.

## Route web

```text
apps/web/src/app/
├── layout.tsx
├── page.tsx                         # → /community/today
├── loading.tsx
├── not-found.tsx
├── auth/
│   ├── login/page.tsx
│   └── register/page.tsx
├── community/
│   ├── layout.tsx
│   ├── page.tsx                     # → /community/today
│   ├── feed/page.tsx
│   ├── explore/page.tsx
│   ├── today/page.tsx
│   ├── messages/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── profile/
│   │   ├── page.tsx                 # hồ sơ tài khoản hiện tại
│   │   └── [username]/page.tsx      # username thực từ API
│   ├── saved/page.tsx
│   ├── follow/page.tsx
│   ├── connections/page.tsx         # → /community/follow
│   ├── notifications/page.tsx
│   └── settings/page.tsx
└── post/[id]/page.tsx
```

`auth` và `community` là thư mục thường nên nằm trong URL. Các route cũ như `/feed` không có redirect tương ứng. Web đã chuyển các route group `(public)` và `(app)` sang cây này; mobile vẫn giữ `(auth)` và `(tabs)` do navigator tham chiếu trực tiếp. Ngoặc vuông `[id]`, `[username]` giữ vai trò tham số động. `apps/` là nhóm ứng dụng; `src/app/` là route của framework; `public/` là tài sản tĩnh.

Xác thực được thực thi bởi API session, không suy ra từ tên thư mục route. Web gọi `/api/*` cùng origin, Next rewrite tới API nội bộ; không đặt bí mật dịch vụ ở `NEXT_PUBLIC_*`. `/post/:id` hiện cũng cần đăng nhập; quyền Công khai áp dụng giữa các tài khoản đăng nhập.

## Ranh giới dữ liệu và phụ thuộc

- Web gọi API, không import MongoDB hoặc worker. React Query giữ dữ liệu server; Zustand chỉ giữ UI.
- API và worker dùng Mongo native driver từ `packages/database`; không có MongoDB container, seed hay migration database trong Compose.
- Khóa MongoDB/Cloudinary/Giphy ở môi trường API riêng, bị Git bỏ qua. `.env.example` chỉ ghi tên biến và placeholder.
- `packages/shared` giữ độc lập với DOM, React Native và kết nối database. Mobile dùng component native riêng; không nhập trực tiếp component DOM.
- `assets/brand/` giữ bản gốc; runtime từng app chỉ nhận bản cần phục vụ.

Đây là ranh giới kiến trúc, chưa có rule kiểm tra import tự động toàn monorepo. Những scaffold chưa tích hợp không xác nhận dịch vụ đang vận hành.

## Khái niệm sản phẩm

- Tellme chia sẻ đời sống, không giới hạn vào công sở hoặc nghề nghiệp.
- `story`, `stories`, `today` hiện chỉ chuỗi ảnh theo ngày, tên UI **Tell me · Tell you** / mobile **Tell me** từ `src/lib/brand.ts`; giữ lịch sử hồ sơ, không tự biến mất sau 24 giờ.
- Chủ đề tùy chọn giúp tìm/khám phá. API tính thống kê chủ đề từ nội dung công khai có quyền xem.
- Follow là quan hệ một chiều; Bạn bè (`connections`) trong runtime hiện được API tính từ follow hai chiều. Chặn loại quyền xem/tương tác liên quan.
- Quyền áp dụng ở API cho feed, tìm bài, chi tiết, hồ sơ, chuỗi ngày, bình luận và chia sẻ. UI không phải ranh giới bảo vệ dữ liệu.
- Chuỗi ngày dùng múi giờ `Asia/Ho_Chi_Minh`. Chat và presence dùng WebSocket `/api/realtime`, polling dự phòng; thông báo push cần VAPID và quyền trình duyệt.

## Tài liệu và workspace

[PRODUCT.md](PRODUCT.md) giữ mô tả sản phẩm gốc. [ARCHITECTURE.md ở gốc](../ARCHITECTURE.md) là bản kiến trúc hiện hành; `docs/ARCHITECTURE.md` dẫn tới bản chính. [DESIGN.md](DESIGN.md) ghi thế giới hình ảnh và token; [FRONTEND.md](FRONTEND.md) ghi luồng UI/cách chạy; [BACKEND.md](BACKEND.md) ghi API và giới hạn. Các tài liệu PostgreSQL/deployment cũ cần được đọc như lịch sử scaffold nếu khác runtime hiện tại.

`pnpm-workspace.yaml` khai báo `apps/*`, `packages/*`, `workers/*`. `.gitkeep` giữ thư mục scaffold trống, không cần file code rỗng. Build/TypeScript workspace và build Docker là các bước kiểm tra riêng; kết quả triển khai thật cần được xác nhận trên VPS. Mobile còn là scaffold.
