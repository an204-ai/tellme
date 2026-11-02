import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
try { process.loadEnvFile(".env"); } catch { console.error("Tạo .env ở thư mục gốc từ .env.example trước khi chạy."); process.exit(1); }
const redis = new URL(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const open = await new Promise((resolve) => {
  const socket = net.connect({ host: redis.hostname, port: Number(redis.port || 6379) });
  socket.setTimeout(1000);
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("error", () => resolve(false)); socket.once("timeout", () => { socket.destroy(); resolve(false); });
});
if (!open && ["localhost", "127.0.0.1"].includes(redis.hostname)) {
  const setup = spawnSync("docker", ["compose", "-f", "infra/dev/compose.yaml", "up", "-d", "--wait", "redis"], { stdio: "inherit" });
  if (setup.status !== 0) { console.error("Mở Docker Desktop hoặc cấu hình REDIS_URL tới Redis đang chạy rồi thử lại."); process.exit(1); }
}
const child = spawn("pnpm", ["exec", "turbo", "run", "dev"], { stdio: "inherit", env: process.env });
process.once("SIGINT", () => child.kill("SIGINT"));
process.once("SIGTERM", () => child.kill("SIGTERM"));
child.once("exit", (code) => process.exit(code || 0));
