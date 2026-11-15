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
  notify,
} from "../../backend/domain.js";
import { normalizeReaction } from "../../backend/social-assets.js";
import * as v from "../../backend/validation.js";
import { withMediaChange, scheduleCleanup, mongo, publishUpdate } from "@tellme/database";
export function registerStoryRoutes(api: Hono<Env>) {
  api.get("/stories", async (c) => {
    const me = c.get("user"), { cursor, limit } = v.pageSchema.parse(c.req.query());
    const author = z.string().trim().min(1).max(128).optional().parse(c.req.query("author"));
    const r = await relations(me);
    const audience = { $ifNull: ["$$item.privacy", "$privacy"] };
    const items = await stories.aggregate<Story>([
      { $match: await visibility(me, "userId") },
      ...(author ? [{ $match: { userId: author === "me" ? me._id : author } }] : []),
      { $set: { items: { $filter: { input: "$items", as: "item", cond: { $or: [
        { $eq: ["$userId", me._id] },

        { $and: [{ $in: [audience, ["public", "connections"]] }, { $in: ["$userId", r.mutual] }] },
      ] } } } } },
      { $match: { "items.0": { $exists: true } } },
      { $set: { latestMomentAt: { $max: "$items.at" } } },
      { $sort: { latestMomentAt: -1, _id: -1 } }, { $skip: cursor }, { $limit: limit + 1 },
    ]).toArray();
    const page = items.slice(0, limit);
    const people = await users.find({ _id: { $in: [...new Set(page.map((s) => s.userId))] } }, { projection: { passwordHash: 0, email: 0 } }).toArray();
    return c.json({ items: page.map((story) => storyDTO(story, me, r.mutual)), people: people.map((person) => personDTO(person, me)), nextCursor: items.length > limit ? cursor + limit : null });
  });
  api.post("/stories/:id/report", async (c) => {
    const me = c.get("user"), story = await requireStory(c.req.param("id"), me);
    const { reason } = z.object({ reason: z.string().trim().min(1).max(500) }).parse(await c.req.json());
    await reports.updateOne({ userId: me._id, targetType: "story", targetId: story._id }, { $setOnInsert: { _id: randomUUID(), at: now() }, $set: { reason, targetType: "story" } }, { upsert: true });
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
    await withMediaChange(me, [input.image], async (session) => {
    const story = await stories.findOne({ userId: me._id, day: today }, { session });
    if (story && story.items.length >= 50)
      fail(400, "Mỗi ngày tối đa 50 khoảnh khắc.");
    if (story) {
      // Keep previously private photos private when today's new photo is shared.
      if (story.privacy === "private") await stories.updateOne({ _id: story._id }, { $set: { "items.$[].privacy": "private" } }, { session });
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
    });
    await publishUpdate([], "stories");
    return c.json({ ok: true }, 201);
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
      });
    } finally { await session.endSession(); }
    await publishUpdate([], "stories");
    return c.json({ ok: true });
  });
  api.get("/stories/:id/moments/:momentId/reactions", async (c) => {
    const me = c.get("user");
    const { cursor, limit } = v.pageSchema.parse(c.req.query());
    const momentId = c.req.param("momentId");
    const story = await stories.findOne(
      { _id: c.req.param("id"), userId: me._id, "moderation.hidden": { $ne: true }, "items.id": momentId },
      { projection: { items: { $elemMatch: { id: momentId } } } },
    );
    const item = story?.items[0];
    if (!item) return fail(404, "Khoảnh khắc không khả dụng.");
    const blocked = new Set((await relations(me)).blocked);
    const reactions = Object.entries(item.reactions).flatMap(([id, value]) => {
      const reaction = normalizeReaction(value);
      return id !== me._id && !blocked.has(id) && reaction ? [{ id, reaction }] : [];
    });
    const page = reactions.slice(cursor, cursor + limit);
    const people = page.length ? await users.find(
      { _id: { $in: page.map(({ id }) => id) } },
      { projection: { name: 1, username: 1, avatar: 1 } },
    ).toArray() : [];
    const byId = new Map(people.map((person) => [person._id, person]));
    return c.json({
      items: page.flatMap(({ id, reaction }) => {
        const person = byId.get(id);
        return person ? [{ id, reaction, name: person.name, username: person.username, avatar: person.avatar }] : [];
      }),
      nextCursor: cursor + limit < reactions.length ? cursor + limit : null,
    });
  });
  api.put("/stories/:id/moments/:momentId/reaction", async (c) => {
    const me = c.get("user"),
      story = await requireStory(c.req.param("id"), me),
      momentId = c.req.param("momentId"),
      { reaction } = z
        .object({ reaction: v.reaction })
        .parse(await c.req.json());
    if (reaction && story.userId === me._id) fail(403, "Bạn không thể thả cảm xúc vào khoảnh khắc của mình.");
    if (!(await canViewMoment(story, momentId, me)))
      fail(404, "Khoảnh khắc không tồn tại hoặc bạn không có quyền xem.");
    const previouslyReacted = Boolean(story.items.find((item) => item.id === momentId)?.reactions[me._id]);
    const result = await stories.updateOne(
      { _id: story._id, "items.id": momentId },
      reaction
        ? { $set: { [`items.$.reactions.${me._id}`]: reaction } }
        : { $unset: { [`items.$.reactions.${me._id}`]: "" } },
    );
    if (result.modifiedCount && story.userId !== me._id) {
      void publishUpdate([story.userId], "story.reactions", { storyId: story._id, momentId });
      if (reaction && !previouslyReacted)
        void notify(story.userId, me._id, "đã bày tỏ cảm xúc về khoảnh khắc của bạn.", "like", undefined, { storyId: story._id, momentId }).catch(() => undefined);
    }
    return c.json({ ok: true });
  });
}
