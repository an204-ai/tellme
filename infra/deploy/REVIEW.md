# Kết quả rà soát hạ tầng — 02/11/2026

Các kiểm tra dưới đây chạy thực tế tại máy phát triển, không kết nối MongoDB Atlas, không khởi chạy stack production và không xóa volume. Docker dùng Linux/arm64, Node 22 trong image; đây chưa phải kiểm thử trực tiếp trên VPS hoặc Linux/amd64.

| Kiểm tra | Kết quả |
| --- | --- |
| Compose dev | Hợp lệ; project `docker`, volume `docker_redis_data`, Redis bind 127.0.0.1 |
| Compose production | Hợp lệ; 9 service, chỉ volume `redis_data`, 0 cổng host publish, không có MongoDB service |
| Cấu hình Atlas | API và cả 3 worker nhận cùng `MONGODB_URI`; không có seed/migration/init replica set |
| Thiếu `ADMIN_EMAILS` | Compose từ chối đúng như yêu cầu; mẫu env để trống, không có email mặc định |
| `pnpm build --concurrency=1` | 7/7 tác vụ build workspace thành công, không dùng cache Turbo |
| `pnpm check-types --concurrency=1` | 7/7 tác vụ TypeScript thành công |
| `pnpm --dir tellme-landing check-types` | Thành công |
| Docker production build | Cả 8 image API/worker/web/proxy/landing/admin build thành công |
| Nginx trong image | `nginx -t` thành công cho web-edge, admin, landing trong container tạm không có mạng |
| Script dev/build | Shell/JavaScript syntax checks thành công |
| `git diff --check` | Thành công |

Lần build Docker sạch đầu tiên phát hiện admin thiếu font: admin import CSS từ web nhưng image chỉ cài dependency admin. Dockerfile admin đã được sửa để cài cả dependency web cần cho CSS; lượt build lại thành công. Vite vẫn cảnh báo chunk admin lớn hơn 500 kB, không phải lỗi build. Dependency native tùy chọn `msgpackr-extract` không biên dịch được trên image slim arm64 thiếu Python; pnpm tiếp tục và API/worker build thành công. Chưa kiểm thử xử lý queue trong phạm vi rà hạ tầng này.

## Thử giới hạn RAM cho VPS 5 GB

Hai image Next.js (`Dockerfile.web`, `Dockerfile.landing`) đã được build lại bằng builder riêng `tellme-infra-memory-check` giới hạn **3 GiB RAM, không dùng swap** (`Memory=MemorySwap=3221225472`). Cả hai thành công. Giá trị cgroup `memory.peak` cuối cùng là **3117834240 byte (~2.90 GiB)**; `oom=0`, `oom_kill=0`. Đỉnh này bao gồm cache của builder, không phải tổng RAM VPS hay mức RAM của ứng dụng đang chạy.

Dockerfile bật một worker Next.js, tối ưu bộ nhớ Webpack và heap old-space 2048 MB/process cho riêng bước build. Với VPS 5 GB, vẫn cần chừa RAM cho OS, Docker, Coolify và các container đang phục vụ người dùng. Kết quả arm64 này cho thấy build tuần tự khả thi trong ngân sách đã thử, nhưng không bảo đảm VPS đang có tải hoặc kiến trúc khác luôn đủ RAM.

`--parallel 1` và `COMPOSE_BAKE=false` vẫn build nhiều target đồng thời ở Compose/Buildx trên máy kiểm tra. Vì thế `build-images.sh` gọi Compose riêng cho từng service, dừng ngay nếu lỗi. Coolify cần Concurrent builds = 1 và Custom Build Command như README. Builder kiểm tra đã được dừng, giữ nguyên cache volume.

## Bổ sung: lỗi admin khi deploy từ Git

Tái hiện bằng `git archive HEAD` (không đưa các file local bị Git ignore vào build context): bản cũ dừng đúng ở `pnpm --filter @tellme/admin build` với **exit 2**, `TS2307` cho hai logo PNG được import trong `App.tsx`. File local `apps/admin/src/vite-env.d.ts` bị rule `.gitignore` loại khỏi Git, nên lượt build local trước đây chưa phản ánh đúng fresh checkout trên Coolify.

Bản sửa khai báo `types: ["vite/client"]` trong `apps/admin/tsconfig.json`. Dockerfile admin buộc cài build dependencies bằng `--prod=false`, giữ kiểm tra TypeScript, tách riêng bước TypeScript/Vite và giới hạn heap 2048 MB. Script build luôn bật plain progress, báo service lỗi và giữ nguyên exit code.

Kiểm chứng mới: Docker build **Linux/amd64** từ source Git sạch cộng bản sửa, không có `vite-env.d.ts` local, đồng thời mô phỏng `ARG NODE_ENV=production`, đã thành công cả TypeScript, Vite và image Nginx. Build admin local và Compose config cũng thành công. Kiểm tra script với compiler giả trả lỗi 42 xác nhận dừng ở đúng service và giữ mã lỗi; không chạy bất kỳ service hoặc tác vụ database nào.
