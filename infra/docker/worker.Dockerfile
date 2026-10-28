FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install
CMD ["pnpm", "--filter=@tellme/worker-media", "dev"]
