import { listSystemNotices, readSystemNotices, redis, registerSystemRecipient, stopWeatherWatch, watchWeather } from "@tellme/database";
import type { Notice } from "@tellme/database";
import { fail } from "../../backend/security.js";
import { Hono } from "hono";
import { z } from "zod";
import type { Filter } from "mongodb";
import { notices } from "../../backend/database.js";
import { type Env } from "../../backend/security.js";
import * as v from "../../backend/validation.js";
export function registerNotificationRoutes(api: Hono<Env>) {
  api.get("/notifications/unread", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const me = c.get("user");
    const [count, system] = await Promise.all([
      notices.countDocuments({ recipientId: me._id, userId: { $nin: me.blocked }, read: false }),
      listSystemNotices(me._id).catch(() => []),
    ]);
    return c.json({ count: count + system.filter((notice) => !notice.read).length });
  });
  api.get("/notifications/inbox", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { cursor, limit } = v.pageSchema.parse(c.req.query());
    const scope = z.enum(["recent", "older"]).parse(c.req.query("scope") || "recent");
    const me = c.get("user");
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const dateFilter = scope === "recent" ? { $gte: cutoff } : { $lt: cutoff };
    const match = { recipientId: me._id, userId: { $nin: me.blocked }, at: dateFilter };
    const pipeline = [
      { $match: match },
      { $sort: { at: -1 as const, _id: -1 as const } },
      { $group: {
        _id: {
          userId: "$userId",
          kind: { $ifNull: ["$kind", "like"] },
        },
        latest: { $first: "$$ROOT" },
        groupCount: { $sum: 1 },
        unreadCount: { $sum: { $cond: ["$read", 0, 1] } },
      } },
      { $sort: { "latest.at": -1 as const, "latest._id": -1 as const } },
      { $skip: cursor },
      { $limit: limit + 1 },
      { $project: {
        _id: "$latest._id", userId: "$latest.userId", kind: { $ifNull: ["$latest.kind", "like"] },
        text: "$latest.text", at: "$latest.at", postId: "$latest.postId", storyId: "$latest.storyId", momentId: "$latest.momentId", conversationId: "$latest.conversationId", groupCount: 1, unreadCount: 1,
      } },
    ];
    const [rows, olderCount, systemNotices] = await Promise.all([
      notices.aggregate(pipeline).toArray(),
      scope === "recent" ? notices.countDocuments({ recipientId: me._id, userId: { $nin: me.blocked }, at: { $lt: cutoff } }) : Promise.resolve(0),
      scope === "recent" && cursor === 0 ? listSystemNotices(me._id).catch(() => []) : Promise.resolve([]),
    ]);
    const hasNext = rows.length > limit;
    const groups = rows.slice(0, limit).map((row) => ({
      id: String(row._id), userId: String(row.userId), kind: row.kind as "like" | "message",
      text: String(row.text), at: String(row.at), read: Number(row.unreadCount) === 0,
      groupCount: Number(row.groupCount), unreadCount: Number(row.unreadCount),
      ...(row.postId ? { postId: String(row.postId) } : {}),
      ...(row.storyId ? { storyId: String(row.storyId) } : {}),
      ...(row.momentId ? { momentId: String(row.momentId) } : {}),
      ...(row.conversationId ? { conversationId: String(row.conversationId) } : {}),
    }));
    const systems = systemNotices.map((notice) => ({ ...notice, groupCount: 1, unreadCount: Number(!notice.read) }));
    const items = [...groups, ...systems].sort((a, b) => b.at.localeCompare(a.at));
    return c.json({ items, nextCursor: hasNext ? cursor + limit : null, olderAvailable: olderCount > 0 });
  });
  api.get("/notifications/system", async (c) => { c.header("Cache-Control", "private, no-store"); return c.json(await listSystemNotices(c.get("user")._id)); });
  api.put("/weather/watch", async (c) => {
    const { lat, lon } = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).parse(await c.req.json());
    if (redis.status !== "ready") fail(503, "Thông báo thời tiết đang gián đoạn. Bạn thử lại sau nha.");
    const me = c.get("user");
    if (me.settings.notifySystem === false) return c.json({ enabled: false });
    await registerSystemRecipient(me._id, true);
    await watchWeather(me._id, lat, lon);
    return c.json({ enabled: true });
  });
  api.delete("/weather/watch", async (c) => { await stopWeatherWatch(c.get("user")._id); return c.json({ ok: true }); });
  api.put("/notifications/read", async (c) => {
    const { ids } = z
      .object({ ids: z.array(v.idSchema).max(100) })
      .parse(await c.req.json());
    await notices.updateMany(
      { recipientId: c.get("user")._id, _id: { $in: ids } },
      { $set: { read: true } },
    );
    await readSystemNotices(c.get("user")._id, ids);
    return c.json({ ok: true });
  });
  api.put("/notifications/group-read", async (c) => {
    const input = z.object({ userId: v.idSchema, kind: z.enum(["like", "message"]) }).parse(await c.req.json());
    const filter: Filter<Notice> = {
      recipientId: c.get("user")._id,
      userId: input.userId,
      ...(input.kind === "like" ? { $or: [{ kind: "like" }, { kind: { $exists: false } }] } : { kind: "message" }),
    };
    await notices.updateMany(filter, { $set: { read: true } });
    return c.json({ ok: true });
  });
  api.put("/notifications/read-all", async (c) => {
    const userId = c.get("user")._id;
    const [unread, result] = await Promise.all([
      listSystemNotices(userId).catch(() => []),
      notices.updateMany({ recipientId: userId, read: false }, { $set: { read: true } }),
    ]);
    await readSystemNotices(userId, unread.map((notice) => notice.id));
    return c.json({ ok: true, modified: result.modifiedCount + unread.filter((notice) => !notice.read).length });
  });
}
