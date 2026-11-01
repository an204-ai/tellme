# Build from the repository root: docker build -f workers/media-processor/Dockerfile .
FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @tellme/worker-media... && pnpm --filter @tellme/worker-media... build
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@tellme/worker-media", "start"]
