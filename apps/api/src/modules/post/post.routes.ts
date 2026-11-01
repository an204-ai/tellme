import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { users, posts, reports } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import {
  now,
  personDTO,
  postDTO,
  requirePost,
  notify,
  postFilter,
} from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
import { cachedPublicFeed, withMediaChange, scheduleCleanup, enqueue, mongo, publishUpdate } from "@tellme/database";
export function registerPostRoutes(api: Hono<Env>) {
  api.get("/posts", async (c) => {
    const me = c.get("user"),
      query = c.req.query(),
      { cursor, limit } = v.pageSchema.parse(query),
      filter = await postFilter(me, query);
    const cached = me._id === "guest" && !query.search && !query.topic && !query.authorId && query.view !== "profile" ? await cachedPublicFeed(cursor, limit) : null;
    const [items, total] = cached ? [cached.items, cached.total] : await Promise.all([
      posts
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(cursor)
        .limit(limit)
        .toArray(),
      posts.countDocuments(filter),
    ]);
    const ids = [
      ...new Set(
        items.flatMap((p) => [
          ...(p.anonymous ? [] : [p.authorId]),
          ...p.comments.filter((i) => !p.anonymous || i.userId !== p.authorId).map((i) => i.userId),
          ...Object.keys(p.reactions),
        ]),
      ),
    ];
    const people = await users.find({ _id: { $in: ids } }, { projection: { passwordHash: 0, email: 0 } }).toArray();
    return c.json({
      items: items.map((p) => postDTO(p, me)),
      total,
      nextCursor: cursor + items.length < total ? cursor + items.length : null,
      people: people.map((p) => personDTO(p, me)),
    });
  });
  api.get("/posts/:id", async (c) => {
    return c.json(
      postDTO(
        await requirePost(c.req.param("id"), c.get("user")),
        c.get("user"),
      ),
    );
  });
  api.post("/posts", async (c) => {
    const me = c.get("user"),
      input = v.postSchema.parse(await c.req.json());
    await withMediaChange(me, [input.image], async (session) => {
      await posts.insertOne({
      _id: input.id,
      authorId: me._id,
      content: input.content,
      image: input.image,
      topic: input.topic,
      privacy: input.privacy,
      anonymous: input.anonymous,
      ...(input.anonymous ? { anonymousVersion: 2 as const } : {}),
      createdAt: now(),
      reactions: {},
      comments: [],
      savedBy: [],
      sharedBy: [],
      }, { session });
      await enqueue("feed.rebuild", {}, { session });
    });
    return c.json({ id: input.id }, 201);
  });
  api.put("/posts/:id/privacy", async (c) => {
    const me = c.get("user"), { privacy } = z.object({ privacy: v.privacy }).parse(await c.req.json());
    const result = await posts.updateOne({ _id: c.req.param("id"), authorId: me._id }, { $set: { privacy } });
    if (!result.matchedCount) fail(404, "Không thể chỉnh quyền riêng tư của bài viết này.");
    await enqueue("feed.rebuild", {});
    await publishUpdate([], "feed");
    return c.json({ ok: true });
  });
  api.delete("/posts/:id", async (c) => {
    const me = c.get("user");
    const session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        const old = await posts.findOneAndDelete({ _id: c.req.param("id"), authorId: me._id }, { session });
        if (!old) fail(404, "Không thể xóa bài viết này.");
        await scheduleCleanup(me._id, [old.image], session);
        await enqueue("feed.rebuild", {}, { session });
      });
    } finally { await session.endSession(); }
    await publishUpdate([], "feed");
    return c.json({ ok: true });
  });
  api.put("/posts/:id/reaction", async (c) => {
    const me = c.get("user"),
      post = await requirePost(c.req.param("id"), me),
      { reaction } = z
        .object({ reaction: v.reaction })
        .parse(await c.req.json());
    await posts.updateOne(
      { _id: post._id },
      reaction
        ? { $set: { [`reactions.${me._id}`]: reaction } }
        : { $unset: { [`reactions.${me._id}`]: "" } },
    );
    if (reaction && !post.reactions[me._id])
      await notify(
        post.authorId,
        me._id,
        "đã bày tỏ cảm xúc về câu chuyện của bạn.",
        post._id,
      );
    return c.json({ ok: true });
  });
  api.put("/posts/:id/saved", async (c) => {
    const me = c.get("user"),
      post = await requirePost(c.req.param("id"), me),
      { saved } = z.object({ saved: z.boolean() }).parse(await c.req.json());
    await posts.updateOne(
      { _id: post._id },
      saved
        ? { $addToSet: { savedBy: me._id } }
        : { $pull: { savedBy: me._id } },
    );
    return c.json({ ok: true });
  });
  api.post("/posts/:id/share", async (c) => {
    const me = c.get("user"),
      post = await requirePost(c.req.param("id"), me);
    await posts.updateOne(
      { _id: post._id },
      { $addToSet: { sharedBy: me._id } },
    );
    return c.json({ ok: true });
  });
  api.post("/posts/:id/comments", async (c) => {
    const me = c.get("user"),
      post = await requirePost(c.req.param("id"), me),
      input = v.commentSchema.parse(await c.req.json());
    if (
      input.parentId &&
      !post.comments.some((comment) => comment.id === input.parentId)
    )
      fail(400, "Bình luận gốc không tồn tại.");
    if (post.comments.length >= 2000)
      fail(400, "Bài viết đã đạt giới hạn bình luận.");
    const { id, content, parentId, media: attachment } = input;
    await posts.updateOne(
      { _id: post._id, "comments.id": { $ne: id } },
      {
        $push: {
          comments: {
            id,
            userId: me._id,
            content,
            createdAt: now(),
            likedBy: [],
            ...(parentId ? { parentId } : {}),
            ...(attachment ? { media: attachment } : {}),
          },
        },
      },
    );
    await notify(
      post.authorId,
      me._id,
      "đã bình luận về câu chuyện của bạn.",
      post._id,
    );
    return c.json({ ok: true }, 201);
  });
  api.put("/posts/:id/comments/:commentId/liked", async (c) => {
    const me = c.get("user"),
      post = await requirePost(c.req.param("id"), me),
      commentId = c.req.param("commentId"),
      { liked } = z.object({ liked: z.boolean() }).parse(await c.req.json());
    if (!post.comments.some((comment) => comment.id === commentId))
      fail(404, "Bình luận không tồn tại.");
    await posts.updateOne(
      { _id: post._id, "comments.id": commentId },
      liked
        ? { $addToSet: { "comments.$.likedBy": me._id } }
        : { $pull: { "comments.$.likedBy": me._id } },
    );
    return c.json({ ok: true });
  });
  api.put("/posts/:id/hidden", async (c) => {
    const me = c.get("user"),
      post = await requirePost(c.req.param("id"), me);
    await users.updateOne(
      { _id: me._id },
      { $addToSet: { hiddenPosts: post._id } },
    );
    return c.json({ ok: true });
  });
  api.delete("/posts/:id/hidden", async (c) => {
    await users.updateOne({ _id: c.get("user")._id }, { $pull: { hiddenPosts: c.req.param("id") } });
    return c.json({ ok: true });
  });
  api.post("/posts/:id/report", async (c) => {
    const me = c.get("user"),
      post = await requirePost(c.req.param("id"), me),
      { reason } = z
        .object({ reason: z.string().min(1).max(500) })
        .parse(await c.req.json());
    await reports.updateOne(
      { userId: me._id, postId: post._id },
      { $setOnInsert: { _id: randomUUID(), at: now() }, $set: { reason } },
      { upsert: true },
    );
    return c.json({ ok: true });
  });
}
