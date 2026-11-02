# Hạ tầng phát triển

`compose.yaml` chỉ chạy Redis local tại `127.0.0.1:6379`. MongoDB tiếp tục dùng Atlas theo `.env` gốc.

Từ gốc repo, chạy `pnpm infra:up`, `pnpm infra:down` (chỉ stop) hoặc `pnpm dev` để launcher tự kiểm tra Redis. `bash infra/scripts/setup-dev.sh` cài dependency và build package database.

File được chuyển từ `infra/docker/docker-compose.yml`. Giữ `name: docker` để Compose mặc định tiếp tục dùng project và volume `docker_redis_data` đã có. Nếu trước đây dùng `-p` hoặc `COMPOSE_PROJECT_NAME` tùy chỉnh, tiếp tục dùng cùng giá trị đó. Đổi đường dẫn file không cần xóa, tạo lại hay di chuyển volume. Production dùng file riêng tại `infra/deploy/compose.yaml`.
