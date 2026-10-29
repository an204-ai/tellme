import { Hono } from "hono";
import { z } from "zod";
import { users, posts } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import { type Post } from "../../backend/models.js";
import {
  internalId,
  relations,
  visibility,
  personDTO,
  postDTO,
  storyDTO,
  ownedImage,
  notify,
  postFilter,
} from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
export function registerUserRoutes(api: Hono<Env>) {
  api.get("/users/:username", async (c) => {
    const user = await users.findOne({ username: c.req.param("username") });
    if (!user || (await relations(c.get("user"))).blocked.includes(user._id))
      fail(404, "Hồ sơ không khả dụng.");
    return c.json(personDTO(user, c.get("user")));
  });
  api.patch("/users/me", async (c) => {
    const input = v.profileSchema.parse(await c.req.json()),
      me = c.get("user");
    await Promise.all([
      ownedImage(input.avatar, me),
      ownedImage(input.cover, me),
    ]);
    await users.updateOne({ _id: me._id }, { $set: input });
    return c.json({ ok: true });
  });
  api.put("/users/me/settings", async (c) => {
    const settings = v.settingsSchema.parse(await c.req.json());
    await users.updateOne({ _id: c.get("user")._id }, { $set: { settings } });
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
    return c.json({ ok: true });
  });
  api.delete("/users/me/hidden-posts", async (c) => {
    await users.updateOne(
      { _id: c.get("user")._id },
      { $set: { hiddenPosts: [] } },
    );
    return c.json({ ok: true });
  });
  api.get("/users/:id/activity", async (c) => {
    const me = c.get("user"),
      id = internalId(c.req.param("id"), me),
      { cursor, limit } = v.pageSchema.parse(c.req.query());
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
            { $addFields: { kind: { $literal: "day" }, sortAt: "$updatedAt" } },
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
    return c.json({
      items: (result?.items || []).map((item) =>
        item.kind === "post"
          ? {
              kind: "post",
              id: `post-${item._id}`,
              at: item.sortAt,
              post: postDTO(item, me),
            }
          : {
              kind: "day",
              id: `day-${item._id}`,
              at: item.sortAt,
              story: storyDTO(item, me),
            },
      ),
      total,
      nextCursor: cursor + limit < total ? cursor + limit : null,
    });
  });
}
