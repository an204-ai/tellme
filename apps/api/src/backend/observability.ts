import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { MiddlewareHandler } from "hono";
import { logEvent } from "@tellme/database";
import type { Env } from "./security.js";
type Minute = { minute: number; count: number; errors: number; totalMs: number; maxMs: number };
const minutes: Minute[] = [];
export function requestMetrics() {
  const now = Math.floor(Date.now() / 60000), recent = minutes.filter((item) => item.minute > now - 15);
  const count = recent.reduce((sum, item) => sum + item.count, 0);
  return { windowMinutes: 15, count, errors: recent.reduce((sum, item) => sum + item.errors, 0), averageMs: count ? Math.round(recent.reduce((sum, item) => sum + item.totalMs, 0) / count) : 0, maxMs: Math.round(Math.max(0, ...recent.map((item) => item.maxMs))), since: new Date(Date.now() - process.uptime() * 1000).toISOString() };
}
export const observeRequest: MiddlewareHandler<Env> = async (c, next) => {
  const requestId = randomUUID(), start = performance.now();
  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);
  await next();
  const durationMs = Math.round(performance.now() - start), status = c.res.status, minute = Math.floor(Date.now() / 60000);
  let bucket = minutes.at(-1);
  if (!bucket || bucket.minute !== minute) { bucket = { minute, count: 0, errors: 0, totalMs: 0, maxMs: 0 }; minutes.push(bucket); }
  while (minutes.length > 60) minutes.shift();
  bucket.count++; bucket.errors += Number(status >= 500); bucket.totalMs += durationMs; bucket.maxMs = Math.max(bucket.maxMs, durationMs);
  if ((c.req.path.startsWith("/api/admin/") && status < 400) || c.req.path === "/api/events") return;
  logEvent({ level: status >= 500 ? "error" : status >= 400 ? "warn" : "info", service: "api", event: "http.request", requestId, route: c.req.routePath || "/unmatched", method: c.req.method, status, durationMs });
};
