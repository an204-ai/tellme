#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
docker compose -f infra/dev/compose.yaml up -d --wait redis
pnpm install
pnpm --filter @tellme/database build
printf 'Redis và runtime đã sẵn sàng. Chạy pnpm dev để mở API, web và ba worker.\n'
