# Dockerfile API và worker dùng chung

Giữ `api.Dockerfile` và `worker.Dockerfile` tại đây vì `infra/deploy/compose.yaml` tham chiếu trực tiếp. Build context luôn là gốc repository.

```sh
docker build -f infra/docker/api.Dockerfile -t tellme-api:production .
docker build -f infra/docker/worker.Dockerfile --build-arg WORKER=@tellme/worker-media -t tellme-worker-media:production .
```

Redis dev ở `infra/dev/`; Compose, proxy và image giao diện production ở `infra/deploy/`. Các bản Dockerfile lặp tại `apps/api/` và `workers/media-processor/` đã được loại; không dùng các đường dẫn đó để build.
