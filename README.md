# Tellme — Social Platform Monorepo

> **Your day. Your stories.**  
> Mạng xã hội thế hệ mới dành cho người trẻ chia sẻ khoảnh khắc, kết nối chân thực.

## 📁 Cấu trúc Monorepo (Turborepo)

- **`apps/api`**: Backend REST & Realtime API Server (Hono + Bun / Node.js)
- **`apps/web`**: Web Application (Next.js 15 App Router, Tailwind CSS v4, TanStack Query)
- **`apps/mobile`**: Mobile Application iOS & Android (Expo SDK 53, NativeWind, TanStack Query)
- **`apps/admin`**: Admin Management Dashboard (React + Vite)
- **`packages/database`**: Drizzle ORM Schema, migrations, database client
- **`packages/shared`**: Types, Zod validators, hằng số, tiện ích dùng chung FE & BE
- **`packages/ui`**: Design System, Design Tokens, bộ UI Components tùy biến riêng của Tellme
- **`packages/config`**: Cấu hình TypeScript, ESLint dùng chung
- **`workers/`**: Background workers (Xử lý media, tính toán bảng tin, gửi push notification)
- **`infra/`**: Docker compose, Nginx và setup script
- **`docs/`**: Tài liệu kỹ thuật chi tiết (`ARCHITECTURE.md`, `API.md`, `DATABASE.md`, `DESIGN.md`)

Xem chi tiết kiến trúc tại: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
