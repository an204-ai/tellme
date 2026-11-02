import { serve } from "@hono/node-server";
import { Server as HttpServer } from "node:http";
import { app } from "./app.js";
import { config } from "./backend/config.js";
import { connectDatabase, mongo } from "./backend/database.js";
import { closeQueues, connectRedis, startDispatcher, waitForDatabase, connectionFailure, databaseUnavailable, startLogWriter, flushServerLogs, logEvent } from "@tellme/database";
import { startRealtime, mountRealtime } from "./backend/realtime.js";

const startup = new AbortController();
let ready = false;
let stopping = false;
let stopDispatcher = () => {};
let stopRealtime = () => {};
let stopLogs = () => {};

// Keep the port available during a database outage, with an explicit 503 response.
const server = serve({
  fetch: (request) => ready ? app.fetch(request) : databaseUnavailable(),
  port: config.PORT,
  hostname: config.API_HOST,
}, ({ port }) => console.log(`Tellme API listening on http://${config.API_HOST}:${port}; waiting for MongoDB.`));
if (!(server instanceof HttpServer)) throw new Error("Realtime requires an HTTP/1 server with WebSocket upgrade support.");
const stopSockets = mountRealtime(server, () => ready);

const shutdown = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  ready = false;
  startup.abort();
  stopDispatcher();
  stopRealtime();
  stopSockets();
  logEvent({ service: "api", level: "info", event: "process.stopping" });
  stopLogs();
  await flushServerLogs();
  server.close();
  await Promise.allSettled([closeQueues(), mongo.close()]);
  process.exit(code);
};
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
server.once("error", (error) => {
  console.error("API HTTP server unavailable.", connectionFailure(error));
  void shutdown(1);
});

try {
  await waitForDatabase(connectDatabase, {
    signal: startup.signal,
    onRetry: (failure, attempt, delay) => { console.warn("MongoDB chưa kết nối được; API sẽ tự thử lại.", { ...failure, attempt, retryInSeconds: Math.ceil(delay / 1000) }); logEvent({ service: "api", level: "warn", event: "database.retry", code: failure.codes.join(",") || failure.type }); },
  });
  stopLogs = startLogWriter();
  try { await connectRedis(); } catch { console.warn("Redis chưa sẵn sàng; tác vụ được giữ trong MongoDB để chạy lại."); }
  startup.signal.throwIfAborted();
  stopDispatcher = startDispatcher();
  try { stopRealtime = await startRealtime(); } catch { console.warn("Realtime tạm dùng polling."); }
  startup.signal.throwIfAborted();
  ready = true;
  logEvent({ service: "api", level: "info", event: "process.ready" });
  console.log(`Tellme API ready on http://${config.API_HOST}:${config.PORT}`);
} catch (error) {
  if (!startup.signal.aborted) {
    console.error("API startup failed. Check MongoDB access and environment configuration.", connectionFailure(error));
    logEvent({ service: "api", level: "error", event: "process.startup-failed", code: connectionFailure(error).codes.join(",") });
    await shutdown(1);
  }
}
