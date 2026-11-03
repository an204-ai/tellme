import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { MiddlewareHandler } from "hono";
import { logEvent } from "@tellme/database";
import type { Env } from "./security.js";

const minutes = new Map<number, number>();
const minuteMs = 60000;
const trafficMinutes = 24 * 60;

export function requestMetrics() {
  const now = Date.now();
  const minute = Math.floor(now / minuteMs);
  const firstMinute = minute - trafficMinutes + 1;
  const hourly = new Map<number, number>();
  for (const [time, count] of minutes) {
    if (time <= minute - trafficMinutes) continue;
    const bucket = Math.floor((time - firstMinute) / 60);
    hourly.set(bucket, (hourly.get(bucket) || 0) + count);
  }
  return {
    requestsPerMinute: minutes.get(minute - 1) || 0,
    traffic: Array.from({ length: 24 }, (_, index) => {
      return { hour: new Date((firstMinute + index * 60) * minuteMs).toISOString(), count: hourly.get(index) || 0 };
    }),
  };
}

export const observeRequest: MiddlewareHandler<Env> = async (c, next) => {
  const requestId = randomUUID(), start = performance.now();
  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);
  await next();
  const status = c.res.status;
  if (c.req.path === "/api/events") return;
  if (c.req.path.startsWith("/api/") && !c.req.path.startsWith("/api/admin/") && c.req.method !== "OPTIONS") {
    const minute = Math.floor(Date.now() / minuteMs);
    minutes.set(minute, (minutes.get(minute) || 0) + 1);
    for (const time of minutes.keys()) {
      if (time > minute - trafficMinutes) break;
      minutes.delete(time);
    }
  }
  if (c.req.path.startsWith("/api/admin/") && status < 400) return;
  logEvent({ level: status >= 500 ? "error" : status >= 400 ? "warn" : "info", service: "api", event: "http.request", requestId, route: c.req.routePath || "/unmatched", method: c.req.method, status, durationMs: Math.round(performance.now() - start) });
};
