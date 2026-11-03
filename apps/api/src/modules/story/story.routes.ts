import { getMusicTrack } from "../music/catalog.js";
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { Story } from "../../backend/models.js";
import { z } from "zod";
import { stories, users, reports } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import {
  now,
  day,
  requireStory,
  storyDTO,
  relations,
  canViewMoment,
  visibility,
  personDTO,
} from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
import { withMediaChange, scheduleCleanup, enqueue, mongo, publishUpdate } from "@tellme/database";
export function registerStoryRoutes(api: Hono<Env>) {
  api.get("/stories", async (c) => {
    const me = c.get("user"), { cursor, limit } = v.pageSchema.parse(c.req.query());
    const r = await relations(me);
    const audience = { $ifNull: ["$$item.privacy", "$privacy"] };
    const items = await stories.aggregate<Story>([
      { $match: { $and: [await visibility(me, "userId"), { _id: { $nin: me.hiddenStories || [] } }] } },
      { $set: { items: { $filter: { input: "$items", as: "item", cond: { $or: [
        { $eq: ["$userId", me._id] },
        { $eq: [audience, "public"] },
        { $and: [{ $eq: [audience, "connections"] }, { $in: ["$userId", r.mutual] }] },
      ] } } } } },
      { $match: { "items.0": { $exists: true } } },
      { $sort: { updatedAt: -1, _id: -1 } }, { $skip: cursor }, { $limit: limit + 1 },
    ]).toArray();
    const page = items.slice(0, limit);
    const people = await users.find({ _id: { $in: [...new Set(page.map((s) => s.userId))] } }, { projection: { passwordHash: 0, email: 0 } }).toArray();
    return c.json({ items: page.map((story) => storyDTO(story, me, r.mutual)), people: people.map((person) => personDTO(person, me)), nextCursor: items.length > limit ? cursor + limit : null });
  });
  api.get("/stories/saved", async (c) => {
    const me = c.get("user"), mutual = (await relations(me)).mutual;
    const saved = await stories.find({ $and: [{ _id: { $in: me.savedStories || [] } }, await visibility(me, "userId")] }).sort({ updatedAt: -1 }).limit(100).toArray();
    return c.json({ items: saved.map((story) => storyDTO(story, me, mutual)).filter((story) => story.items.length) });
  });
  api.put("/stories/:id/saved", async (c) => {
    const me = c.get("user"), story = await requireStory(c.req.param("id"), me);
    const { saved } = z.object({ saved: z.boolean() }).parse(await c.req.json());
    await users.updateOne({ _id: me._id }, saved ? { $addToSet: { savedStories: story._id } } : { $pull: { savedStories: story._id } });
    return c.json({ ok: true });
  });
  api.put("/stories/:id/hidden", async (c) => {
    const me = c.get("user"), story = await requireStory(c.req.param("id"), me);
    await users.updateOne({ _id: me._id }, { $addToSet: { hiddenStories: story._id } });
    return c.json({ ok: true });
  });
  api.delete("/stories/:id/hidden", async (c) => {
    await users.updateOne({ _id: c.get("user")._id }, { $pull: { hiddenStories: c.req.param("id") } });
    return c.json({ ok: true });
  });
  api.post("/stories/:id/report", async (c) => {
    const me = c.get("user"), story = await requireStory(c.req.param("id"), me);
    const { reason } = z.object({ reason: z.string().trim().min(1).max(500) }).parse(await c.req.json());
    await reports.updateOne({ userId: me._id, postId: story._id }, { $setOnInsert: { _id: randomUUID(), at: now() }, $set: { reason, targetType: "story" } }, { upsert: true });
    return c.json({ ok: true });
  });
  api.get("/stories/:id", async (c) => {
    const me = c.get("user"), story = await requireStory(c.req.param("id"), me);
    return c.json(storyDTO(story, me, (await relations(me)).mutual, true));
  });
  api.post("/stories/moments", async (c) => {
    const me = c.get("user"),
      input = v.momentSchema.parse(await c.req.json());
    const today = day();
    const existing = await stories.findOne({ userId: me._id, day: today }, { projection: { _id: 1 } });
    const music = !existing && input.musicTrackId ? await getMusicTrack(input.musicTrackId, me._id, input.musicProvider, input.musicStartSeconds) : undefined;
    await withMediaChange(me, [input.image], async (session) => {
    const story = await stories.findOne({ userId: me._id, day: today }, { session });
    if (story && story.items.length >= 50)
      fail(400, "Mỗi ngày tối đa 50 khoảnh khắc.");
    if (story) {
      await stories.updateOne(
        { _id: story._id, "items.id": { $ne: input.id } },
        {
          $set: { privacy: input.storyPrivacy, updatedAt: now() },
          $push: {
            items: {
              id: input.id,
              image: input.image,
              caption: input.caption,
              at: now(),
              ...(input.privacy ? { privacy: input.privacy } : {}),
              reactions: {},
            },
          },
        },
        { session },
      );
    } else
      await stories.insertOne({
        _id: input.storyId,
        userId: me._id,
        day: today,
        privacy: input.storyPrivacy,
        ...(music ? { music } : {}),
        updatedAt: now(),
        items: [
          {
            id: input.id,
            image: input.image,
            caption: input.caption,
            at: now(),
            ...(input.privacy ? { privacy: input.privacy } : {}),
            reactions: {},
          },
        ],
      }, { session });
    await enqueue("feed.rebuild", {}, { session });
    });
    await publishUpdate([], "stories");
    return c.json({ ok: true }, 201);
  });
  api.put("/stories/:id/privacy", async (c) => {
    const me = c.get("user"), id = c.req.param("id"),
      { privacy } = z.object({ privacy: v.privacy }).parse(await c.req.json());
    const result = await stories.updateOne(
      { _id: id, userId: me._id },
      { $set: { privacy, updatedAt: now() } },
    );
    if (!result.matchedCount)
      fail(404, "Không thể chỉnh quyền riêng tư của chuỗi ảnh này.");
    await enqueue("feed.rebuild", {});
    await publishUpdate([], "stories");
    return c.json({ ok: true });
  });
  api.patch("/stories/:id/moments/:momentId", async (c) => {
    const me = c.get("user"), id = c.req.param("id"), momentId = c.req.param("momentId"),
      input = z.object({ caption: z.string().trim().max(300), privacy: v.privacy.nullable() }).parse(await c.req.json());
    const filter = { _id: id, userId: me._id, "items.id": momentId };
    const result = input.privacy === null
      ? await stories.updateOne(filter, {
        $set: { "items.$.caption": input.caption, updatedAt: now() },
        $unset: { "items.$.privacy": "" },
      })
      : await stories.updateOne(filter, {
        $set: { "items.$.caption": input.caption, "items.$.privacy": input.privacy, updatedAt: now() },
      });
    if (!result.matchedCount) fail(404, "Không thể chỉnh sửa khoảnh khắc này.");
    await enqueue("feed.rebuild", {});
    await publishUpdate([], "stories");
    return c.json({ ok: true });
  });
  api.delete("/stories/:id/moments/:momentId", async (c) => {
    const me = c.get("user"), id = c.req.param("id"), momentId = c.req.param("momentId");
    const session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        const story = await stories.findOne({ _id: id, userId: me._id }, { session });
        const item = story?.items.find((entry) => entry.id === momentId);
        if (!story || !item) fail(404, "Không thể xóa khoảnh khắc này.");
        if (story.items.length === 1) await stories.deleteOne({ _id: id, userId: me._id }, { session });
        else await stories.updateOne({ _id: id, userId: me._id }, { $pull: { items: { id: momentId } }, $set: { updatedAt: now() } }, { session });
        await scheduleCleanup(me._id, [item.image], session);
        await enqueue("feed.rebuild", {}, { session });
      });
    } finally { await session.endSession(); }
    await publishUpdate([], "stories");
    return c.json({ ok: true });
  });
  api.delete("/stories/:id", async (c) => {
    const me = c.get("user"), session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        const story = await stories.findOneAndDelete({ _id: c.req.param("id"), userId: me._id }, { session });
        if (!story) fail(404, "Không thể xóa chuỗi ảnh này.");
        await scheduleCleanup(me._id, story.items.map((item) => item.image), session);
        await enqueue("feed.rebuild", {}, { session });
      });
    } finally { await session.endSession(); }
    await publishUpdate([], "stories");
    return c.json({ ok: true });
  });
  api.put("/stories/:id/moments/:momentId/reaction", async (c) => {
    const me = c.get("user"),
      story = await requireStory(c.req.param("id"), me),
      momentId = c.req.param("momentId"),
      { reaction } = z
        .object({ reaction: v.reaction })
        .parse(await c.req.json());
    if (!(await canViewMoment(story, momentId, me)))
      fail(404, "Khoảnh khắc không tồn tại hoặc bạn không có quyền xem.");
    await stories.updateOne(
      { _id: story._id, "items.id": momentId },
      reaction
        ? { $set: { [`items.$.reactions.${me._id}`]: reaction } }
        : { $unset: { [`items.$.reactions.${me._id}`]: "" } },
    );
    return c.json({ ok: true });
  });
}
