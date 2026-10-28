FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --filter=@tellme/worker-media...
CMD ["node", "dist/index.js"]
