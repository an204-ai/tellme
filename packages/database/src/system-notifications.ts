import { prefix, redis } from "./queue.js";
import type { SystemNotice } from "./system-notice-policy.js";

// Only person-to-person activity remains. Keep compatibility entry points so
// older clients and queued reminder jobs drain without displaying or pushing.
export async function registerSystemRecipient(userId: string, _enabled: boolean) {
  if (redis.status !== "ready") return;
  await redis.zrem(`${prefix}:system:active`, userId);
  await redis.del(`${prefix}:system:weather:${userId}`, `${prefix}:system:seen:${userId}`);
}
export async function listSystemNotices(_userId: string): Promise<SystemNotice[]> { return []; }
export async function readSystemNotices(_userId: string, _ids: string[]) { return; }
export async function deliverSystemNotification(_data: Record<string, unknown>) { return; }
export async function scheduleSystemNotifications(_now = Date.now()) { return; }
// Revoke old weather watches while previously deployed sessions expire.
export async function stopWeatherWatch(userId: string) {
  if (redis.status === "ready") await redis.del(`${prefix}:system:weather:${userId}`);
}
