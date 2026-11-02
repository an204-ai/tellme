import os from "node:os";
import { statfs } from "node:fs/promises";
import type { Hono } from "hono";
import { z } from "zod";
import { config, mongo, redis, prefix, queueFor, users, posts, stories, messages, sessions, reports, media, outbox, serverLogs, adminAudit, activityDays } from "@tellme/database";
import { pageSchema } from "../../backend/validation.js";
import type { Env } from "../../backend/security.js";
import { requestMetrics } from "../../backend/observability.js";
import { auditPeople } from "./admin.service.js";
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const textQuery = z.string().trim().max(100);
const vnDay = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
export function registerMonitoringRoutes(api: Hono<Env>) {
  api.get("/admin/infrastructure", async (c) => {
    const start = Date.now();
    let database = { ready: false, latencyMs: 0, collections: null as number | null, storageBytes: null as number | null, dataBytes: null as number | null };
    try {
      await mongo.db(config.MONGODB_DB).command({ ping: 1 });
      database.ready = true; database.latencyMs = Date.now() - start;
      const stats = await mongo.db(config.MONGODB_DB).command({ dbStats: 1, scale: 1 }).catch(() => null);
      if (stats) database = { ...database, collections: Number(stats.collections), storageBytes: Number(stats.storageSize), dataBytes: Number(stats.dataSize) };
    } catch { /* Report partial health without leaking the driver response. */ }
    const redisStart = Date.now();
    const redisReady = redis.status === "ready" && await redis.ping().then(() => true).catch(() => false);
    const redisLatency = redisReady ? Date.now() - redisStart : null;
    const redisInfo = redisReady ? await redis.info("memory").catch(() => "") : "";
    const redisMemory = /(?:^|\r\n)used_memory:(\d+)/.exec(redisInfo);
    const workers = await Promise.all(["media", "feed", "notification"].map(async (name) => {
      const value = redisReady ? await redis.get(`${prefix}:worker:${name}`).catch(() => null) : null;
      const at = Number(value), ageSeconds = value && Number.isFinite(at) ? Math.max(0, Math.round((Date.now() - at) / 1000)) : null;
      return { name, ready: ageSeconds !== null && ageSeconds <= 30, lastHeartbeat: ageSeconds !== null ? new Date(at).toISOString() : null, ageSeconds };
    }));
    const queues = await Promise.all((["media.process", "feed.rebuild", "notification.deliver"] as const).map(async (kind) => {
      if (!redisReady) return { name: kind.split(".")[0], available: false, counts: null };
      try { return { name: kind.split(".")[0], available: true, counts: await queueFor(kind).getJobCounts("waiting", "active", "delayed", "failed", "completed") }; }
      catch { return { name: kind.split(".")[0], available: false, counts: null }; }
    }));
    const disk = await statfs(process.cwd()).then((value) => ({ totalBytes: value.blocks * value.bsize, availableBytes: value.bavail * value.bsize })).catch(() => null);
    const [oldest, failed] = await Promise.all([outbox.find({ status: { $in: ["pending", "dispatched"] } }).sort({ createdAt: 1 }).limit(1).project({ createdAt: 1 }).toArray(), outbox.countDocuments({ status: "failed" })]);
    return c.json({ at: new Date().toISOString(), environment: config.NODE_ENV, api: { uptimeSeconds: Math.floor(process.uptime()), nodeVersion: process.version, platform: process.platform, memory: process.memoryUsage(), cpuSeconds: process.cpuUsage().user / 1000000, metrics: requestMetrics() }, host: { cpus: os.cpus().length, loadAverage: os.loadavg(), totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem(), disk }, database, redis: { ready: redisReady, latencyMs: redisLatency, memoryBytes: redisMemory ? Number(redisMemory[1]) : null }, workers, queues, backlog: { failed, oldestAt: oldest[0]?.createdAt || null }, integrations: [{ name: "Cloudinary", configured: !!config.CLOUDINARY_URL }, { name: "Email tài khoản", configured: !!config.SMTP_URL && !!config.AUTH_CODE_SECRET }, { name: "Web Push", configured: !!config.VAPID_PRIVATE_KEY && !!config.VAPID_PUBLIC_KEY }, { name: "Giphy", configured: !!config.GIPHY_API_KEY }, { name: "Thời tiết", configured: !!config.OPENWEATHER_API_KEY }, { name: "YouTube", configured: !!config.YOUTUBE_API_KEY }, { name: "Epidemic Sound", configured: !!config.EPIDEMIC_SOUND_API_KEY }] });
  });
  api.get("/admin/logs", async (c) => {
    const { cursor, limit } = pageSchema.parse(c.req.query());
    const hours = z.coerce.number().int().min(1).max(168).parse(c.req.query("hours") || "24");
    const level = z.enum(["info", "warn", "error"]).optional().parse(c.req.query("level"));
    const service = z.enum(["api", "media", "feed", "notification"]).optional().parse(c.req.query("service"));
    const q = textQuery.parse(c.req.query("q") || "");
    const filter = { at: { $gte: new Date(Date.now() - hours * 3600000) }, ...(level ? { level } : {}), ...(service ? { service } : {}), ...(q ? { $or: ["requestId", "event", "route", "jobId"].map((field) => ({ [field]: { $regex: escape(q), $options: "i" } })) } : {}) };
    const [items, total] = await Promise.all([serverLogs.find(filter, { projection: { at: 1, level: 1, service: 1, event: 1, route: 1, requestId: 1, method: 1, status: 1, durationMs: 1, jobId: 1, jobKind: 1, code: 1 } }).sort({ at: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), serverLogs.countDocuments(filter)]);
    return c.json({ items, total, nextCursor: cursor + items.length < total ? cursor + items.length : null, retentionDays: 7 });
  });
  api.get("/admin/audit", async (c) => {
    const { cursor, limit } = pageSchema.parse(c.req.query()), q = textQuery.parse(c.req.query("q") || "");
    const filter = q ? { $or: ["action", "targetId", "actorId"].map((field) => ({ [field]: { $regex: escape(q), $options: "i" } })) } : {};
    const [items, total] = await Promise.all([adminAudit.find(filter).sort({ at: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), adminAudit.countDocuments(filter)]);
    return c.json({ items: await auditPeople(items), total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.get("/admin/analytics", async (c) => {
    const days = z.coerce.number().int().min(7).max(90).parse(c.req.query("days") || "30");
    const today = vnDay(new Date()), midnight = new Date(`${today}T00:00:00+07:00`).getTime(), start = new Date(midnight - (days - 1) * 86400000), since = start.toISOString();
    const groupDay = (field: string) => ({ $dateToString: { format: "%Y-%m-%d", timezone: "Asia/Ho_Chi_Minh", date: { $convert: { input: `$${field}`, to: "date", onError: null, onNull: null } } } });
    const [signups, posting, dailyStories, chat, comments, active, storage, verification, sessionCount, pending, firstActivity] = await Promise.all([
      users.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: groupDay("createdAt"), count: { $sum: 1 } } }]).toArray(),
      posts.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: groupDay("createdAt"), count: { $sum: 1 } } }]).toArray(),
      stories.aggregate([{ $match: { day: { $gte: vnDay(start) } } }, { $group: { _id: "$day", count: { $sum: 1 }, moments: { $sum: { $size: "$items" } } } }]).toArray(),
      messages.aggregate([{ $match: { at: { $gte: since } } }, { $group: { _id: groupDay("at"), count: { $sum: 1 } } }]).toArray(),
      posts.aggregate([{ $match: { "comments.createdAt": { $gte: since } } }, { $unwind: "$comments" }, { $match: { "comments.createdAt": { $gte: since } } }, { $group: { _id: groupDay("comments.createdAt"), count: { $sum: 1 } } }]).toArray(),
      activityDays.aggregate([{ $match: { day: { $gte: vnDay(start) } } }, { $group: { _id: "$day", count: { $sum: 1 } } }]).toArray(),
      media.aggregate([{ $group: { _id: { $ifNull: ["$state", "active"] }, count: { $sum: 1 }, processed: { $sum: { $cond: [{ $ifNull: ["$variants", false] }, 1, 0] } } } }]).toArray(),
      users.aggregate([{ $group: { _id: { $cond: [{ $ifNull: ["$emailVerifiedAt", false] }, "verified", "unverified"] }, count: { $sum: 1 } } }]).toArray(),
      sessions.countDocuments({ expiresAt: { $gt: new Date() } }), reports.countDocuments({ resolution: { $exists: false } }),
      activityDays.find().sort({ at: 1 }).limit(1).project({ at: 1 }).toArray(),
    ]);
    const count = (rows: typeof signups, day: string, key = "count") => Number(rows.find((row) => row._id === day)?.[key] || 0);
    const trackedFrom = firstActivity[0]?.at ? vnDay(firstActivity[0].at) : null;
    const series = Array.from({ length: days }, (_, index) => { const day = vnDay(new Date(start.getTime() + index * 86400000)); return { day, signups: count(signups, day), posts: count(posting, day), stories: count(dailyStories, day), moments: count(dailyStories, day, "moments"), messages: count(chat, day), comments: count(comments, day), activeUsers: trackedFrom && day >= trackedFrom ? count(active, day) : null }; });
    return c.json({ days, timezone: "Asia/Ho_Chi_Minh", at: new Date().toISOString(), activityTrackingSince: firstActivity[0]?.at || null, series, storage, verification, sessions: sessionCount, pendingReports: pending });
  });
}
