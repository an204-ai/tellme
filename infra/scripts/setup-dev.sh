#!/usr/bin/env bash
set -e
echo "Starting Docker services (PostgreSQL & Redis)..."
docker compose -f infra/docker/docker-compose.yml up -d
echo "Running database migrations..."
pnpm --filter=@tellme/database db:push
echo "Setup completed!"
