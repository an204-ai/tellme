# Build Tellme trên GitHub Actions, chạy image trên Coolify

## Thiết lập một lần

1. Tạo repository `tellme` trên Docker Hub. Workflow dùng một repository với tám nhóm tag theo service, ví dụ `web-<commit SHA>` và `api-<commit SHA>`.
2. Tạo token Docker Hub có quyền đọc và ghi repository. Trong GitHub repository của Tellme, vào **Settings → Secrets and variables → Actions**:
   - **Variables** → `DOCKERHUB_USERNAME` là Docker ID dùng để đăng nhập.
   - **Variables** → `DOCKERHUB_REPOSITORY` là `namespace/tellme`, bỏ tiền tố `docker.io/`.
   - **Secrets** → `DOCKERHUB_TOKEN` là token có quyền push.
   - Nếu VPS dùng ARM64, thêm biến `DOCKER_PLATFORMS=linux/arm64`. Mặc định dùng `linux/amd64`. Có thể chạy `uname -m` trên VPS để phân biệt `x86_64` và `aarch64`.
3. Với repository private, vào **Registries** trong Coolify, chọn VPS chạy Tellme và đăng nhập Docker Hub bằng token riêng chỉ có quyền pull. Nếu cấu hình qua SSH, chạy `docker login --username <docker-id>` bằng đúng user mà Coolify dùng để chạy Docker.

MongoDB, Redis, SMTP và khóa dịch vụ vẫn lấy từ các biến môi trường runtime của resource Coolify. Workflow chỉ dùng thông tin đăng nhập Docker Hub để xuất bản image. Ba domain mặc định và định tuyến API/WebSocket vẫn dùng cấu hình Nginx hiện tại.

## Build và chuyển resource hiện tại

1. Tắt **Auto Deploy** trên resource Tellme hiện tại trong Coolify trước khi đưa các file mới lên GitHub. Bước này tránh kích hoạt lệnh build cũ trên VPS khi nhánh `main` được cập nhật.
2. Đưa workflow, Compose và mã nguồn của bản muốn phát hành lên nhánh mặc định `main`. Mở **Actions → Publish Tellme images → Run workflow** và chọn `main`. Đợi cả tám job build thành công. Job **release** in hai biến cần sao chép vào phần **Summary** của lần chạy. [Chạy workflow thủ công](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
3. Trên **resource Tellme hiện tại**, xóa **Custom Build Command** cũ và thêm hai biến Coolify từ **Summary**:
   - `TELLME_IMAGE_REPOSITORY=docker.io/namespace/tellme`
   - `TELLME_IMAGE_REVISION=<commit SHA đã build đủ tám image>`
4. Giữ Base Directory là `/`, đổi Docker Compose Location thành `infra/deploy/compose.registry.yaml` và lưu. Kiểm tra ba domain trỏ đến `web-edge:80`, `landing:80` và `admin-edge:80`, rồi bấm **Deploy**. Compose này chỉ có `image:`. Dùng cùng resource để giữ cấu hình domain và Redis volume hiện tại. [Coolify Docker Compose](https://coolify.io/docs/applications/builds/docker-compose) · [Đăng nhập registry trong Coolify](https://coolify.io/docs/applications/builds/docker-registries)
5. Kiểm tra healthcheck, cả ba domain, đăng nhập và WebSocket. Mỗi lần cập nhật, build đủ tám image trước rồi thay SHA trong Coolify. Có thể quay về một SHA đã xuất bản trước đó bằng cách đổi lại biến và deploy. Nên dọn audit sau khi bản mới đã chạy ổn định vì bản cũ còn đọc và ghi collection đó.

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
