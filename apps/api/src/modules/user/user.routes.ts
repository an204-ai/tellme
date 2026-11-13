import { Hono } from "hono";
import { z } from "zod";
import { users, reports, stories } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import { createHash, randomUUID } from "node:crypto";
import {
  internalId,
  relations,
  visibility,
  personDTO,
} from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
import { withMediaChange, scheduleCleanup, publishUpdate, config, pushSubscriptions, validPushEndpoint, registerSystemRecipient } from "@tellme/database";
export function registerUserRoutes(api: Hono<Env>) {
  api.get("/users/:username", async (c) => {
    const user = await users.findOne({ username: c.req.param("username") }, { projection: { passwordHash: 0, email: 0 } });
    if (!user || (await relations(c.get("user"))).blocked.includes(user._id))
      fail(404, "Hồ sơ không khả dụng.");
    const me = c.get("user"), r = await relations(me);
    if (user._id !== me._id && !r.mutual.includes(user._id)) fail(404, "Kết nối hai chiều để xem trang cá nhân của nhau.");
    return c.json(personDTO(user, me));
  });
  api.patch("/users/me", async (c) => {
    const input = v.profileSchema.parse(await c.req.json()),
      me = c.get("user");
    if (
      input.username !== me.username &&
      (await users.findOne({ username: input.username }))
    )
      fail(409, "Tellme ID này đã có người sử dụng.");
    try {
      await withMediaChange(me, [input.avatar, input.cover], async (session) => {
        const previous = await users.findOne({ _id: me._id }, { session });
        await users.updateOne({ _id: me._id }, { $set: input }, { session });
        await scheduleCleanup(
          me._id,
          [previous?.avatar, previous?.cover].filter(
            (url): url is string =>
              !!url && url !== input.avatar && url !== input.cover,
          ),
          session,
        );
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      )
        fail(409, "Tellme ID này đã có người sử dụng.");
      throw error;
    }
    await publishUpdate([], "profiles");
    return c.json({ ok: true });
  });
  api.put("/users/me/settings", async (c) => {
    const settings = v.settingsSchema.parse(await c.req.json());
    if (settings.emailUpdates && !config.SMTP_URL) fail(400, "Email thông báo chưa được cấu hình trên máy chủ.");
    await users.updateOne({ _id: c.get("user")._id }, { $set: { settings } });
    await registerSystemRecipient(c.get("user")._id, settings.notifySystem).catch(() => undefined);
    return c.json({ ok: true });
  });
  api.put("/users/me/push-subscription", async (c) => {
    if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) fail(400, "Thông báo trên thiết bị chưa được cấu hình.");
    const subscription = v.pushSubscriptionSchema.parse(await c.req.json());
    if (!validPushEndpoint(subscription.endpoint)) fail(400, "Địa chỉ thông báo không hợp lệ.");
    const id = createHash("sha256").update(subscription.endpoint).digest("hex");
    await pushSubscriptions.updateOne(
      { "subscription.endpoint": subscription.endpoint },
      { $set: { userId: c.get("user")._id, subscription }, $setOnInsert: { _id: id, createdAt: new Date() } },
      { upsert: true },
    );
    return c.json({ ok: true });
  });
  api.delete("/users/me/push-subscription", async (c) => {
    const { endpoint } = z.object({ endpoint: z.string().url().max(2048) }).parse(await c.req.json());
    if (!validPushEndpoint(endpoint)) fail(400, "Địa chỉ thông báo không hợp lệ.");
    await pushSubscriptions.deleteOne({ userId: c.get("user")._id, "subscription.endpoint": endpoint });
    return c.json({ ok: true });
  });
  api.put("/users/:id/block", async (c) => {
    const me = c.get("user"),
      id = internalId(c.req.param("id"), me),
      { blocked } = z
        .object({ blocked: z.boolean() })
        .parse(await c.req.json());
    if (id === me._id || !(await users.findOne({ _id: id })))
      fail(400, "Tài khoản không hợp lệ.");
    await users.updateOne(
      { _id: me._id },
      blocked
        ? { $addToSet: { blocked: id }, $pull: { following: id } }
        : { $pull: { blocked: id } },
    );
    await publishUpdate([me._id, id], "relations");
    return c.json({ ok: true });
  });
  api.post("/users/:id/report", async (c) => {
    const me = c.get("user"), id = internalId(c.req.param("id"), me);
    const { reason } = z.object({ reason: z.enum(["spam", "impersonation", "harassment", "scam", "inappropriate", "other"]) }).parse(await c.req.json());
    if (id === me._id) fail(400, "Bạn không thể báo cáo chính mình.");
    if (!(await users.findOne({ _id: id })) || (await relations(me)).blocked.includes(id)) fail(404, "Hồ sơ không khả dụng.");
    await reports.updateOne(
      { userId: me._id, targetType: "user", targetId: id },
      { $setOnInsert: { _id: randomUUID(), at: new Date().toISOString() }, $set: { targetType: "user", targetId: id, reason } },
      { upsert: true },
    );
    return c.json({ ok: true });
  });
  api.get("/users/:id/journey", async (c) => {
    const me = c.get("user");
    const id = internalId(c.req.param("id"), me);
    const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(c.req.query("month"));
    const relation = await relations(me);
    const owner = await users.findOne({ _id: id }, { projection: { createdAt: 1 } });
    if (!owner || relation.blocked.includes(id) || id !== me._id && !relation.mutual.includes(id)) fail(404, "Hồ sơ không khả dụng.");
    const mutual = relation.mutual;
    const result = await stories.aggregate([
      { $match: { $and: [await visibility(me, "userId"), { userId: id }] } },
      { $project: { day: 1, items: { $filter: { input: "$items", as: "item", cond: { $or: [
        { $eq: ["$userId", me._id] },
        { $and: [{ $in: [{ $ifNull: ["$$item.privacy", "$privacy"] }, ["public", "connections"]] }, { $in: ["$userId", mutual] }] },
      ] } } } } },
      { $match: { "items.0": { $exists: true } } },
      { $project: { day: 1, count: { $size: "$items" }, cover: { $arrayElemAt: ["$items.image", -1] } } },
      { $facet: {
        days: [
          { $match: { day: { $gte: `${month}-01`, $lte: `${month}-31` } } },
          { $sort: { day: 1, _id: 1 } },
          { $group: { _id: "$day", storyId: { $first: "$_id" }, image: { $first: "$cover" }, count: { $sum: "$count" } } },
          { $sort: { _id: 1 } },
          { $limit: 31 },
        ],
        bounds: [{ $group: { _id: null, firstDay: { $min: "$day" }, latestDay: { $max: "$day" } } }],
      } },
    ]).next();
    return c.json({
      days: (result?.days || []).map((entry: { _id: string; storyId: string; image: string; count: number }) => ({ day: entry._id, storyId: entry.storyId, image: entry.image, count: entry.count })),
      firstDay: result?.bounds[0]?.firstDay || null,
      accountCreatedAt: owner.createdAt,
      latestDay: result?.bounds[0]?.latestDay || null,
    });
  });
}
