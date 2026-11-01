import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { users } from "./database.js";
import { prefix, publishUpdate, queueFor, redis } from "./queue.js";
import { weather } from "./weather-cache.js";
import { pushToUser } from "./notifications.js";
import { dailyReminder, eligibleWeatherChange, SYSTEM_INBOX_LIMIT, SYSTEM_TTL, systemNoticeId, weatherSignature, weatherSummary, type SystemNotice } from "./system-notice-policy.js";
import type { WeatherReport } from "./weather-service.js";

const activeKey = `${prefix}:system:active`;
const inboxKey = (userId: string) => `${prefix}:system:inbox:${userId}`;
const watchKey = (userId: string) => `${prefix}:system:weather:${userId}`;
type WeatherWatch = { token: string; lat: number; lon: number; timezone: number; next: number; previous?: WeatherReport };
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
  return Array.isArray(items) ? (items as SystemNotice[]).filter((n) => n.kind === "system" && Date.now() - Date.parse(n.at) < SYSTEM_TTL * 1000).slice(0, SYSTEM_INBOX_LIMIT) : [];
}
export async function readSystemNotices(userId: string, ids: string[]) {
  if (redis.status === "ready" && ids.length) await redis.eval(readScript, 1, inboxKey(userId), JSON.stringify(ids));
}
export async function watchWeather(userId: string, lat: number, lon: number) {
  lat = Number(lat.toFixed(2)); lon = Number(lon.toFixed(2));
  const fresh: WeatherWatch = { token: randomUUID(), lat, lon, timezone: 25200, next: 0 };
  // Renew atomically so a client heartbeat cannot overwrite a worker's newer snapshot.
  await redis.eval("local value=redis.call('GET',KEYS[1]); if value then local old=cjson.decode(value); if old.lat==tonumber(ARGV[1]) and old.lon==tonumber(ARGV[2]) and old.token then redis.call('EXPIRE',KEYS[1],86400); return 0 end end; redis.call('SET',KEYS[1],ARGV[3],'EX',86400); return 1", 1, watchKey(userId), lat, lon, JSON.stringify(fresh));
}
export async function stopWeatherWatch(userId: string) { if (redis.status === "ready") await redis.del(watchKey(userId)); }
async function updateWatchSnapshot(key: string, raw: string, updated: WeatherWatch) {
  await redis.eval("if redis.call('GET',KEYS[1])==ARGV[1] then local ttl=redis.call('TTL',KEYS[1]); if ttl>0 then redis.call('SET',KEYS[1],ARGV[2],'EX',ttl) end end", 1, key, raw, JSON.stringify(updated));
}
async function queueSystemNotice(userId: string, event: string, content: Pick<SystemNotice, "title" | "text" | "systemIcon">, deliverBy: number, watchToken?: string) {
  const id = systemNoticeId(userId, event), key = `${prefix}:system:queued:${id}`;
  if (!await redis.set(key, "1", "EX", SYSTEM_TTL, "NX")) return;
  const notice: SystemNotice = { id, userId: "system", kind: "system", ...content, read: false, at: new Date().toISOString(), url: "/community/today" };
  try {
    // Disposable reminders live only in Redis/BullMQ, never in MongoDB outbox.
    await queueFor("notification.system").add("notification.system", { recipientId: userId, notice, deliverBy, ...(watchToken ? { watchToken } : {}) }, { jobId: `system-${id}`, attempts: 8, removeOnComplete: true, removeOnFail: true });
  } catch (error) { await redis.del(key); throw error; }
}
export async function deliverSystemNotification(data: Record<string, unknown>) {
  const userId = String(data.recipientId), notice = data.notice as SystemNotice | undefined;
  if (!notice || notice.kind !== "system" || !notice.id || !Number.isFinite(data.deliverBy) || Date.now() > Number(data.deliverBy)) return;
  if (redis.status !== "ready") throw new Error("System inbox unavailable");
  if (notice.systemIcon === "weather") {
    const raw = await redis.get(watchKey(userId));
    if (!raw || (JSON.parse(raw) as WeatherWatch).token !== data.watchToken) return;
  }
  const recipient = await users.findOne({ _id: userId }, { projection: { settings: 1 } });
  if (!recipient || recipient.settings.notifySystem === false) return;
  const inserted = await redis.eval(appendScript, 1, inboxKey(userId), JSON.stringify(notice), new Date(Date.now() - SYSTEM_TTL * 1000).toISOString(), notice.id, SYSTEM_INBOX_LIMIT, SYSTEM_TTL);
  if (inserted) await publishUpdate([userId], "notifications");
  const sentKey = `${prefix}:system:pushed:${notice.id}`;
  if (!config.VAPID_PRIVATE_KEY || !config.VAPID_PUBLIC_KEY || await redis.exists(sentKey)) return;
  await pushToUser(userId, { title: `Tellme · ${notice.title}`, body: notice.text, url: notice.url, tag: `tellme-system-${notice.id}`, icon: notice.systemIcon === "weather" ? "/brand/logos/tellme-symbol-on-light.png" : "/images/reactions/like.png" }, Math.max(1, Math.min(1800, Math.ceil((Number(data.deliverBy) - Date.now()) / 1000))));
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
      const key = watchKey(userId), raw = await redis.get(key), watch: WeatherWatch | undefined = raw ? JSON.parse(raw) : undefined;
      const reminder = dailyReminder(now, watch?.timezone);
      if (reminder) await queueSystemNotice(userId, reminder.event, { title: reminder.title, text: reminder.text, systemIcon: reminder.icon }, reminder.deliverBy);
      if (!watch || now < watch.next || !config.OPENWEATHER_API_KEY) continue;
      const report = await weather.get(watch.lat, watch.lon).catch(() => undefined);
      if (!report || report.stale) {
        await updateWatchSnapshot(key, raw!, { ...watch, next: now + 5 * 60000 + Math.floor(Math.random() * 120000) });
        continue;
      }
      if (watch.previous && report.observedAt < watch.previous.observedAt) {
        await updateWatchSnapshot(key, raw!, { ...watch, next: now + 30 * 60000 });
        continue;
      }
      if (eligibleWeatherChange(watch.previous, report, now)) {
        // At most three weather pushes per local day, with a two-hour quiet gap.
        const day = new Date(now + report.timezone * 1000).toISOString().slice(0, 10);
        const cooldown = `${prefix}:system:weather-gap:${userId}`, countKey = `${prefix}:system:weather-count:${userId}:${day}`;
        const allowed = await redis.eval("if redis.call('EXISTS',KEYS[1])==1 or tonumber(redis.call('GET',KEYS[2]) or '0')>=3 then return 0 end; redis.call('SET',KEYS[1],'1','EX',7200); redis.call('INCR',KEYS[2]); redis.call('EXPIRE',KEYS[2],172800); return 1", 2, cooldown, countKey);
        if (allowed) {
          try { await queueSystemNotice(userId, `weather-${weatherSignature(report)}`, { title: "Thời tiết vừa cập nhật", text: weatherSummary(report, now), systemIcon: "weather" }, now + 30 * 60000, watch.token); }
          catch (error) { await redis.del(cooldown); await redis.decr(countKey); throw error; }
        }
      }
      const updated: WeatherWatch = { ...watch, timezone: report.timezone, previous: report, next: now + 30 * 60000 + Math.floor(Math.random() * 120000) };
      // Do not resurrect permission revoked or a location changed during fetch.
      await updateWatchSnapshot(key, raw!, updated);
    } catch { /* Retry this recipient on a later bounded scan; never log location or keys. */ }
  }
}
