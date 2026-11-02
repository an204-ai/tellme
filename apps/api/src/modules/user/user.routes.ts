import { Hono } from "hono";
import { z } from "zod";
import { users, posts, reports, stories } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import { type Post } from "../../backend/models.js";
import { createHash, randomUUID } from "node:crypto";
import {
  internalId,
  relations,
  visibility,
  personDTO,
  postDTO,
  storyDTO,
  notify,
  postFilter,
} from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
import { withMediaChange, scheduleCleanup, publishUpdate, config, enqueue, pushSubscriptions, validPushEndpoint, registerSystemRecipient } from "@tellme/database";
export function registerUserRoutes(api: Hono<Env>) {
  for (const kind of ["followers", "following"] as const) {
    api.get(`/users/:username/${kind}`, async (c) => {
      const me = c.get("user"), viewer = await relations(me);
      const owner = await users.findOne({ username: c.req.param("username") });
      if (!owner || viewer.blocked.includes(owner._id)) fail(404, "Hồ sơ không khả dụng.");
      const { cursor, limit } = v.pageSchema.parse(c.req.query());
      const excluded = [...new Set([...viewer.blocked, ...owner.blocked])];
      const filter = {
        _id: { $nin: excluded, ...(kind === "following" ? { $in: owner.following } : {}) },
        blocked: { $nin: [owner._id, me._id] },
        ...(kind === "followers" ? { following: owner._id } : {}),
      };
      const [people, total] = await Promise.all([
        users.find(filter, { projection: { _id: 1, username: 1, name: 1, avatar: 1 } }).sort({ _id: 1 }).skip(cursor).limit(limit).toArray(),
        users.countDocuments(filter),
      ]);
      // Relationship lists expose identity only, never email, sessions or private profile data.
      return c.json({ items: people.map((person) => ({ id: person._id === me._id ? "me" : person._id, username: person.username, name: person.name, avatar: person.avatar })), total, nextCursor: cursor + limit < total ? cursor + limit : null });
    });
  }
  api.get("/users/:username", async (c) => {
    const user = await users.findOne({ username: c.req.param("username") }, { projection: { passwordHash: 0, email: 0 } });
    if (!user || (await relations(c.get("user"))).blocked.includes(user._id))
      fail(404, "Hồ sơ không khả dụng.");
    const [followersCount, followingCount] = await Promise.all([
      users.countDocuments({ following: user._id, _id: { $nin: user.blocked }, blocked: { $ne: user._id } }),
      users.countDocuments({ _id: { $in: user.following, $nin: user.blocked }, blocked: { $ne: user._id } }),
    ]);
    return c.json({ ...personDTO(user, c.get("user")), followersCount, followingCount });
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
  api.put("/users/:id/follow", async (c) => {
    const me = c.get("user"),
      id = internalId(c.req.param("id"), me),
      { following } = z
        .object({ following: z.boolean() })
        .parse(await c.req.json());
    if (
      id === me._id ||
      !(await users.findOne({ _id: id })) ||
      (await relations(me)).blocked.includes(id)
    )
      fail(400, "Không thể follow tài khoản này.");
    await users.updateOne(
      { _id: me._id },
      following
        ? { $addToSet: { following: id } }
        : { $pull: { following: id } },
    );
    await enqueue("feed.rebuild", {});
    await publishUpdate([me._id, id], "relations");
    if (following && !me.following.includes(id))
      await notify(id, me._id, "đã bắt đầu follow bạn.");
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
      { userId: me._id, postId: `user:${id}` },
      { $setOnInsert: { _id: randomUUID(), at: new Date().toISOString() }, $set: { targetType: "user", targetId: id, reason } },
      { upsert: true },
    );
    return c.json({ ok: true });
  });
  api.delete("/users/me/hidden-posts", async (c) => {
    await users.updateOne(
      { _id: c.get("user")._id },
      { $set: { hiddenPosts: [], hiddenStories: [] } },
    );
    return c.json({ ok: true });
  });
  api.get("/users/:id/journey", async (c) => {
    const me = c.get("user");
    const id = internalId(c.req.param("id"), me);
    const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(c.req.query("month"));
    const relation = await relations(me);
    const owner = await users.findOne({ _id: id }, { projection: { createdAt: 1 } });
    if (!owner || relation.blocked.includes(id)) fail(404, "Hồ sơ không khả dụng.");
    const mutual = relation.mutual;
    const result = await stories.aggregate([
      { $match: { $and: [await visibility(me, "userId"), { userId: id }] } },
      { $project: { day: 1, items: { $filter: { input: "$items", as: "item", cond: { $or: [
        { $eq: ["$userId", me._id] },
        { $eq: [{ $ifNull: ["$$item.privacy", "$privacy"] }, "public"] },
        { $and: [{ $eq: [{ $ifNull: ["$$item.privacy", "$privacy"] }, "connections"] }, { $in: ["$userId", mutual] }] },
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
  api.get("/users/:id/activity", async (c) => {
    const me = c.get("user"),
      id = internalId(c.req.param("id"), me),
      { cursor, limit } = v.pageSchema.parse(c.req.query());
    const mutual = (await relations(me)).mutual;
    // Mongo performs the merge, ordering and pagination; no full feed is sent to the client.
    const filter = await postFilter(me, { view: "profile", authorId: id });
    const pipeline = [
      { $match: filter },
      { $addFields: { kind: { $literal: "post" }, sortAt: "$createdAt" } },
      {
        $unionWith: {
          coll: "stories",
          pipeline: [
            {
              $match: {
                $and: [await visibility(me, "userId"), { userId: id }],
              },
            },
            {
              $addFields: {
                items: {
                  $filter: {
                    input: "$items",
                    as: "item",
                    cond: {
                      $or: [
                        { $eq: ["$userId", me._id] },
                        { $eq: [{ $ifNull: ["$$item.privacy", "$privacy"] }, "public"] },
                        {
                          $and: [
                            { $eq: [{ $ifNull: ["$$item.privacy", "$privacy"] }, "connections"] },
                            { $in: ["$userId", mutual] },
                          ],
                        },
                      ],
                    },
                  },
                },
                kind: { $literal: "day" },
                sortAt: "$updatedAt",
              },
            },
            { $match: { "items.0": { $exists: true } } },
          ],
        },
      },
      { $sort: { sortAt: -1 as const, _id: -1 as const } },
      {
        $facet: {
          items: [{ $skip: cursor }, { $limit: limit }],
          count: [{ $count: "total" }],
        },
      },
    ];
    const result = await posts
      .aggregate<{
        items: (
          | (Post & { kind: "post"; sortAt: string })
          | (import("../../backend/models.js").Story & {
              kind: "day";
              sortAt: string;
            })
        )[];
        count: { total: number }[];
      }>(pipeline)
      .next();
    const total = result?.count[0]?.total || 0;
    type ActivityDTO =
      | { kind: "post"; id: string; at: string; post: ReturnType<typeof postDTO> }
      | { kind: "day"; id: string; at: string; story: ReturnType<typeof storyDTO> };
    const items: ActivityDTO[] = [];
    for (const item of result?.items || []) {
      if (item.kind === "post") {
        items.push({
          kind: "post",
          id: `post-${item._id}`,
          at: item.sortAt,
          post: postDTO(item, me),
        });
      } else {
        const story = storyDTO(item, me, mutual);
        if (story.items.length)
          items.push({ kind: "day", id: `day-${item._id}`, at: item.sortAt, story });
      }
    }
    return c.json({
      items,
      total,
      nextCursor: cursor + limit < total ? cursor + limit : null,
    });
  });
}
