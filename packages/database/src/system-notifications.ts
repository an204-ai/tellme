import { config } from "./config.js";
import { users } from "./database.js";
import { prefix, publishUpdate, queueFor, redis } from "./queue.js";
import { pushToUser } from "./notifications.js";
import { dailyReminder, SYSTEM_INBOX_LIMIT, SYSTEM_TTL, systemNoticeId, type SystemNotice } from "./system-notice-policy.js";

const activeKey = `${prefix}:system:active`;
const inboxKey = (userId: string) => `${prefix}:system:inbox:${userId}`;
const watchKey = (userId: string) => `${prefix}:system:weather:${userId}`;
const appendScript = `local items=cjson.decode(redis.call('GET',KEYS[1]) or '[]'); local kept={}; local found=false; for _,v in ipairs(items) do if v.at>=ARGV[2] then table.insert(kept,v); if v.id==ARGV[3] then found=true end end end; if not found then table.insert(kept,1,cjson.decode(ARGV[1])) end; while #kept>tonumber(ARGV[4]) do table.remove(kept) end; redis.call('SET',KEYS[1],cjson.encode(kept),'EX',ARGV[5]); if found then return 0 else return 1 end`;
const readScript = `local value=redis.call('GET',KEYS[1]); if not value then return 0 end; local ids=cjson.decode(ARGV[1]); local items=cjson.decode(value); for _,v in ipairs(items) do for _,id in ipairs(ids) do if v.id==id then v.read=true end end end; local ttl=redis.call('TTL',KEYS[1]); if ttl>0 then redis.call('SET',KEYS[1],cjson.encode(items),'EX',ttl) end; return 1`;
export async function registerSystemRecipient(userId: string, enabled: boolean) {
  if (redis.status !== "ready") return;
  if (!enabled) { await redis.zrem(activeKey, userId); await redis.del(watchKey(userId), `${prefix}:system:seen:${userId}`); return; }
  if (await redis.set(`${prefix}:system:seen:${userId}`, "1", "EX", 1800, "NX")) await redis.zadd(activeKey, Date.now(), userId);
}
export async function listSystemNotices(userId: string): Promise<SystemNotice[]> {
  if (redis.status !== "ready") return [];
  const raw = await redis.get(inboxKey(userId));
  const items: unknown = raw ? JSON.parse(raw) : [];
  return Array.isArray(items) ? (items as SystemNotice[]).filter((n) => n.kind === "system" && n.systemIcon !== "weather" && Date.now() - Date.parse(n.at) < SYSTEM_TTL * 1000).slice(0, SYSTEM_INBOX_LIMIT) : [];
}
export async function readSystemNotices(userId: string, ids: string[]) {
  if (redis.status === "ready" && ids.length) await redis.eval(readScript, 1, inboxKey(userId), JSON.stringify(ids));
}
// Weather is paused; retain revocation for old sessions until their Redis watches expire.
export async function stopWeatherWatch(userId: string) { if (redis.status === "ready") await redis.del(watchKey(userId)); }
async function queueSystemNotice(userId: string, event: string, content: Pick<SystemNotice, "title" | "text" | "systemIcon">, deliverBy: number) {
  const id = systemNoticeId(userId, event), key = `${prefix}:system:queued:${id}`;
  if (!await redis.set(key, "1", "EX", SYSTEM_TTL, "NX")) return;
  const notice: SystemNotice = { id, userId: "system", kind: "system", ...content, read: false, at: new Date().toISOString(), url: "/community/today" };
  try {
    // Disposable reminders live only in Redis/BullMQ, never in MongoDB outbox.
    await queueFor("notification.system").add("notification.system", { recipientId: userId, notice, deliverBy }, { jobId: `system-${id}`, attempts: 8, removeOnComplete: true, removeOnFail: true });
  } catch (error) { await redis.del(key); throw error; }
}
export async function deliverSystemNotification(data: Record<string, unknown>) {
  const userId = String(data.recipientId), notice = data.notice as SystemNotice | undefined;
  if (!notice || notice.kind !== "system" || !notice.id || !Number.isFinite(data.deliverBy) || Date.now() > Number(data.deliverBy)) return;
  if (notice.systemIcon === "weather") return; // Also discard jobs queued before weather was paused.
  if (redis.status !== "ready") throw new Error("System inbox unavailable");
  const recipient = await users.findOne({ _id: userId }, { projection: { settings: 1 } });
  if (!recipient || recipient.settings.notifySystem === false) return;
  const inserted = await redis.eval(appendScript, 1, inboxKey(userId), JSON.stringify(notice), new Date(Date.now() - SYSTEM_TTL * 1000).toISOString(), notice.id, SYSTEM_INBOX_LIMIT, SYSTEM_TTL);
  if (inserted) await publishUpdate([userId], "notifications", { noticeId: notice.id, systemIcon: notice.systemIcon });
  const sentKey = `${prefix}:system:pushed:${notice.id}`;
  if (!config.VAPID_PRIVATE_KEY || !config.VAPID_PUBLIC_KEY || await redis.exists(sentKey)) return;
  await pushToUser(userId, { title: `Tellme · ${notice.title}`, body: notice.text, url: notice.url, tag: `tellme-system-${notice.id}`, icon: "/images/reactions/like.png" }, Math.max(1, Math.min(1800, Math.ceil((Number(data.deliverBy) - Date.now()) / 1000))));
  await redis.set(sentKey, "1", "EX", SYSTEM_TTL);
}
export async function scheduleSystemNotifications(now = Date.now()) {
  if (redis.status !== "ready") return;
  // One bounded batch per 10s across all notification-worker instances.
  const lock = `${prefix}:system:tick:${Math.floor(now / 10000)}`;
  if (!await redis.set(lock, "1", "EX", 30, "NX")) return;
  await redis.zremrangebyscore(activeKey, "-inf", now - 7 * 86400000);
  const cursorKey = `${prefix}:system:cursor`, cursor = await redis.get(cursorKey) || "0";
  const [next, entries] = await redis.zscan(activeKey, cursor, "COUNT", 100);
  await redis.set(cursorKey, next, "EX", 86400);
  for (let i = 0; i < entries.length; i += 2) {
    const userId = entries[i]!;
    try {
      const reminder = dailyReminder(now);
      if (reminder) await queueSystemNotice(userId, reminder.event, { title: reminder.title, text: reminder.text, systemIcon: reminder.icon }, reminder.deliverBy);
    } catch { /* Retry this recipient on a later bounded scan; never log location or keys. */ }
  }
}
