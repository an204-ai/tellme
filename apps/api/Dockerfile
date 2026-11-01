# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @tellme/api... && pnpm --filter @tellme/api... build
ENV NODE_ENV=production API_HOST=0.0.0.0
EXPOSE 4000
CMD ["pnpm", "--filter", "@tellme/api", "start"]
