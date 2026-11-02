#!/usr/bin/env sh
set -eu

# Accept the complete Compose command prefix, including Coolify-generated -f,
# --env-file and --project-directory flags. Never print the argument values.
if [ "$#" -eq 0 ]; then
  echo 'Usage: sh infra/deploy/build-images.sh docker compose [global Compose options]' >&2
  exit 2
fi
for service in api worker-media worker-feed worker-notification web-app web-edge landing admin-edge; do
  echo "Building Tellme service: $service"
  "$@" build "$service"
done
