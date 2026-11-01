FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
ARG WORKER=@tellme/worker-media
COPY . .
RUN pnpm install --frozen-lockfile --filter ${WORKER}... && pnpm --filter ${WORKER}... build
ENV NODE_ENV=production WORKER=${WORKER}
CMD ["sh", "-c", "pnpm --filter \"$WORKER\" start"]
