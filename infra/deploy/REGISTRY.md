# Build Tellme trên GitHub Actions, chạy image trên Coolify

Mỗi lần push lên `main`, workflow **Publish Tellme images** xuất bản tám image theo cùng SHA. Khi đã bật bước deploy, workflow cập nhật revision của ứng dụng qua API Coolify sau khi cả tám image đã sẵn sàng. Coolify dùng đúng commit đó cho Compose và pull các image tương ứng. Các lần phát hành chạy tuần tự. Nếu `main` đã tiến lên khi một bản build xong, workflow bỏ qua bước deploy bản cũ.

## 1. Xuất bản bộ image đầu tiên

1. Trong GitHub repository, vào **Settings → Secrets and variables → Actions**. Xác nhận hai **Variables** `DOCKERHUB_USERNAME=thanhan1289` và `DOCKERHUB_REPOSITORY=thanhan1289/tellme_production`. **Secret** `DOCKERHUB_TOKEN` dùng token có quyền push. Mặc định build `linux/amd64`. Chỉ thêm `DOCKER_PLATFORMS=linux/arm64` nếu `uname -m` trên VPS trả về `aarch64`.
2. Tắt **Auto Deploy** của resource Tellme trong Coolify trước khi push để ngừng trigger trực tiếp từ GitHub. Ở GitHub, để `COOLIFY_AUTO_DEPLOY` chưa thiết lập trong lần đầu.
3. Push các thay đổi lên `main`, rồi mở **Actions → Publish Tellme images**. Khi cả tám image đã được push, mở **Summary** để lấy hai giá trị cần điền vào Coolify. Có thể kiểm tra đủ tám tag cùng SHA ở tab **Tags** của Docker Hub.

## 2. Chuyển resource Coolify sang pull image

1. Dùng **resource Tellme hiện tại** với Build Pack **Docker Compose**. Giữ branch `main` và Base Directory `/`. Xóa **Custom Build Command** cũ và **Custom Start Command** nếu lệnh đó còn có `--build`. Đổi **Docker Compose Location** sang `infra/deploy/compose.registry.yaml` và lưu. Nếu resource từng ghim commit cũ, đổi **Commit SHA** về `HEAD` để Coolify có thể nạp file mới. [Docker Compose trong Coolify](https://coolify.io/docs/applications/builds/docker-compose)
2. Trong **Environment Variables** của production, thêm `TELLME_IMAGE_REPOSITORY=docker.io/thanhan1289/tellme_production` và `TELLME_IMAGE_REVISION=<SHA đầy đủ trong Summary>`. Giữ các biến runtime hiện có. Nếu Docker Hub repo là private, đăng nhập Docker Hub trên VPS bằng tài khoản mà Coolify dùng để chạy Docker và token chỉ có quyền pull. [Xác thực registry](https://coolify.io/docs/applications/builds/docker-registries)
3. Kiểm tra các domain vẫn gắn đúng service, `tellme.my` vào `web-edge:80`, `about.tellme.my` vào `landing:80`, `admin.tellme.my` vào `admin-edge:80`. Bấm **Deploy** một lần và kiểm tra log pull, healthcheck, đăng nhập và WebSocket. Dùng cùng resource để tiếp tục dùng cấu hình domain và Redis volume hiện tại.

## 3. Bật deploy tự động từ GitHub Actions

1. Trên Coolify self-hosted, bật **API access** trong **Settings → Advanced**. Chọn team chứa resource Tellme, vào **Keys & Tokens → API Tokens** và tạo token có quyền `write` và `deploy` để cập nhật SHA và triển khai. `write` bao gồm `read`. Địa chỉ HTTPS của dashboard/API Coolify cần truy cập được từ GitHub-hosted runner. [Bật và xác thực API](https://coolify.io/docs/api/authorization) · [Quyền API](https://coolify.io/docs/api/permissions)
2. Trong GitHub **Settings → Secrets and variables → Actions**, thêm các giá trị sau.

   | Loại | Tên | Giá trị |
   | --- | --- | --- |
   | Variable | `COOLIFY_URL` | Origin HTTPS của dashboard Coolify, ví dụ `https://coolify.example.com` |
   | Variable | `COOLIFY_APP_UUID` | UUID của resource Tellme, lấy từ mục `uuid=` trong URL deploy webhook của resource |
   | Secret | `COOLIFY_TOKEN` | API token vừa tạo trong Coolify |
   | Variable | `COOLIFY_AUTO_DEPLOY` | `true` |

3. Giữ nút **Auto Deploy** trên Coolify tắt. Dùng **Actions → Publish Tellme images → Run workflow → main** để thử ngay, hoặc chờ lần push tiếp theo. Job **deploy** ghi UUID vào **Summary** và chờ Coolify báo kết quả. Nếu job thất bại sau khi đã nhận UUID, đối chiếu UUID trong **Deployments** của resource trước khi chạy lại. [Chạy workflow thủ công](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow) · [API triển khai Coolify](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid)

Để rollback thủ công, đặt `COOLIFY_AUTO_DEPLOY=false` ở GitHub và đợi các lượt chạy đang triển khai kết thúc. Chọn một SHA đã có đủ tám image. Đặt cả **Commit SHA** và `TELLME_IMAGE_REVISION` của resource Coolify về SHA đó, rồi bấm **Deploy**. Khi sẵn sàng phát hành lại từ `main`, bật lại biến GitHub.

## Dọn dữ liệu giám sát cũ

Sau khi toàn bộ API và worker chạy image mới, mở terminal của service `api` trong Coolify tại `/app`. Container có script và dùng sẵn các biến MongoDB của resource. Chạy lệnh xem trước:

```sh
node packages/database/scripts/drop-monitoring-data.mjs
```

Kiểm tra tên DB và danh sách collection, sau đó chạy lệnh xóa với đúng tên database. Ví dụ với DB `tellme`:

```sh
node packages/database/scripts/drop-monitoring-data.mjs --confirm-drop-monitoring --database=tellme
```

Lệnh chỉ dọn `admin_audit`, `server_logs` và `activity_days` nếu tồn tại. `background_jobs` vẫn phục vụ tác vụ ảnh, feed và thông báo.
