import type { Hono } from "hono";
import { z } from "zod";
import type { Filter } from "mongodb";
import { users, posts, stories, sessions, reports, messages, config, enqueue, publishUpdate, isSuspended } from "@tellme/database";
import type { User } from "@tellme/database";
import { fail, type Env } from "../../backend/security.js";
import { pageSchema } from "../../backend/validation.js";
import { idSchema, isAdmin, moderateContent, reasonSchema, suspendAccount, transaction } from "./admin.service.js";
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const queryText = (value?: string) => z.string().trim().max(100).parse(value || "");
const userProjection = { name: 1, username: 1, avatar: 1, email: 1, emailVerifiedAt: 1, createdAt: 1, suspension: 1 };
function userDTO(user: User) { return { ...user, suspended: isSuspended(user), admin: isAdmin(user) }; }
export function registerManagementRoutes(api: Hono<Env>) {
  api.get("/admin/users", async (c) => {
    const { cursor, limit } = pageSchema.parse(c.req.query()), q = queryText(c.req.query("q"));
    const state = z.enum(["all", "active", "suspended", "unverified"]).parse(c.req.query("state") || "all");
    const suspended: Filter<User> = { suspension: { $exists: true }, $or: [{ "suspension.until": { $exists: false } }, { "suspension.until": { $gt: new Date().toISOString() } }] };
    const filter: Filter<User> = { $and: [q ? { $or: ["name", "username", "email", "_id"].map((field) => ({ [field]: { $regex: escaped(q), $options: "i" } })) } : {}, state === "suspended" ? suspended : state === "active" ? { $nor: [suspended] } : state === "unverified" ? { emailVerifiedAt: { $exists: false } } : {}] };
    const [items, total] = await Promise.all([users.find(filter, { projection: userProjection }).sort({ createdAt: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), users.countDocuments(filter)]);
    return c.json({ items: items.map(userDTO), total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.get("/admin/users/:id", async (c) => {
    const id = idSchema.parse(c.req.param("id")), user = await users.findOne({ _id: id }, { projection: userProjection });
    if (!user) fail(404, "Tài khoản không tồn tại.");
    const [postCount, storyCount, commentCount, messageCount, sessionCount, reportCount] = await Promise.all([
      posts.countDocuments({ authorId: id }), stories.countDocuments({ userId: id }),
      posts.aggregate([{ $match: { "comments.userId": id } }, { $unwind: "$comments" }, { $match: { "comments.userId": id } }, { $count: "count" }]).toArray(),
      messages.countDocuments({ senderId: id }), sessions.countDocuments({ userId: id, expiresAt: { $gt: new Date() } }),
      reports.countDocuments({ targetType: "user", targetId: id }),
    ]);
    return c.json({ user: userDTO(user), stats: { posts: postCount, stories: storyCount, comments: Number(commentCount[0]?.count || 0), messages: messageCount, sessions: sessionCount, reports: reportCount } });
  });
  api.post("/admin/users/:id/action", async (c) => {
    const id = idSchema.parse(c.req.param("id")), actor = c.get("user")._id;
    const { action, reason, days } = z.object({ action: z.enum(["suspend", "unsuspend", "revoke-sessions"]), reason: reasonSchema, days: z.union([z.literal(0), z.literal(1), z.literal(7), z.literal(30)]).default(0) }).parse(await c.req.json());
    await transaction(async (session) => {
      const user = await users.findOne({ _id: id }, { session });
      if (!user) fail(404, "Tài khoản không tồn tại.");
      if (id === actor || isAdmin(user)) fail(403, "Tài khoản quản trị được bảo vệ khỏi thao tác này.");
      if (action === "suspend") await suspendAccount(id, actor, reason, days ? new Date(Date.now() + days * 86400000).toISOString() : undefined, session);
      else {
        if (action === "unsuspend") {
          if (!user.suspension) fail(409, "Tài khoản không có lệnh tạm khóa.");
          await users.updateOne({ _id: id }, { $unset: { suspension: "" } }, { session });
        } else await sessions.deleteMany({ userId: id }, { session });
      }
    });
    if (action !== "unsuspend") await publishUpdate([id], "session-revoked");
    return c.json({ ok: true });
  });
  api.get("/admin/content", async (c) => {
    const type = z.enum(["post", "story", "comment"]).parse(c.req.query("type") || "post");
    const state = z.enum(["all", "visible", "hidden"]).parse(c.req.query("state") || "all");
    const q = queryText(c.req.query("q")), author = queryText(c.req.query("author")), { cursor, limit } = pageSchema.parse(c.req.query());
    const field = type === "comment" ? "comments.moderation.hidden" : "moderation.hidden";
    const match = { ...(state === "all" ? {} : { [field]: state === "hidden" ? true : { $ne: true } }), ...(author ? { [type === "post" ? "authorId" : type === "story" ? "userId" : "comments.userId"]: author } : {}), ...(q ? { [type === "post" ? "content" : type === "story" ? "items.caption" : "comments.content"]: { $regex: escaped(q), $options: "i" } } : {}) };
    const collection = type === "story" ? stories : posts;
    const result = await collection.aggregate([
      ...(type === "comment" ? [{ $unwind: "$comments" }] : []), { $match: match },
      { $facet: { count: [{ $count: "total" }], items: [{ $sort: type === "story" ? { updatedAt: -1, _id: -1 } : type === "comment" ? { "comments.createdAt": -1, "comments.id": -1 } : { createdAt: -1, _id: -1 } }, { $skip: cursor }, { $limit: limit }, { $project: type === "post" ? { authorId: 1, content: 1, image: 1, privacy: 1, anonymous: 1, createdAt: 1, moderation: 1 } : type === "story" ? { userId: 1, day: 1, items: 1, updatedAt: 1, privacy: 1, moderation: 1 } : { comments: 1, privacy: 1 } }] } },
    ]).toArray();
    const rows = result[0]?.items || [], total = Number(result[0]?.count[0]?.total || 0);
    const ids = rows.map((row: Record<string, any>) => type === "post" ? row.authorId : type === "story" ? row.userId : row.comments.userId);
    const authors = await users.find({ _id: { $in: ids } }, { projection: { name: 1, username: 1 } }).toArray();
    const image = (url: string) => url.startsWith("/") ? `${config.APP_URL}${url}` : url;
    const items = rows.map((row: Record<string, any>) => {
      const value = type === "comment" ? row.comments : row;
      const authorId = type === "post" ? row.authorId : type === "story" ? row.userId : value.userId;
      return { _id: type === "comment" ? value.id : row._id, postId: type === "comment" ? row._id : undefined, type, authorId, author: authors.find((person) => person._id === authorId)?.name || "Tài khoản không còn tồn tại", text: type === "story" ? row.items.map((item: { caption: string }) => item.caption).filter(Boolean).join("\n").slice(0, 600) : value.content?.slice(0, 600), images: (type === "story" ? row.items.slice(0, 4).map((item: { image: string }) => item.image) : type === "comment" ? value.media ? [value.media.url] : [] : row.image ? [row.image] : []).map(image), at: row.updatedAt || value.createdAt, day: row.day, privacy: row.privacy, anonymous: !!row.anonymous, moderation: value.moderation || null, moments: type === "story" ? row.items.length : undefined };
    });
    return c.json({ items, total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.post("/admin/content/:type/:id/moderate", async (c) => {
    const type = z.enum(["post", "story", "comment"]).parse(c.req.param("type")), id = idSchema.parse(c.req.param("id"));
    const { hidden, reason, postId } = z.object({ hidden: z.boolean(), reason: reasonSchema, postId: idSchema.optional() }).parse(await c.req.json());
    await transaction(async (session) => { await moderateContent(type, id, hidden, c.get("user")._id, reason, session, postId); await enqueue("feed.rebuild", {}, { session }); });
    await publishUpdate([], "community");
    return c.json({ ok: true });
  });
  api.get("/admin/content/:type/:id", async (c) => {
    const type = z.enum(["post", "story", "comment"]).parse(c.req.param("type")), id = idSchema.parse(c.req.param("id"));
    const postId = c.req.query("postId") ? idSchema.parse(c.req.query("postId")) : undefined;
    if (type === "comment" && !postId) fail(400, "Thiếu mã bài viết của bình luận.");
    let entry;
    if (type === "story") {
      const story = await stories.findOne({ _id: id });
      if (!story) fail(404, "Chuỗi ảnh không tồn tại.");
      entry = { _id: id, authorId: story.userId, text: story.items.map((item) => item.caption).filter(Boolean).join("\n\n"), images: story.items.map((item) => item.image), at: story.updatedAt, day: story.day, privacy: story.privacy, moments: story.items.length, moderation: story.moderation || null, anonymous: false };
    } else {
      const post = await posts.findOne(type === "post" ? { _id: id } : { _id: postId, "comments.id": id });
      if (!post) fail(404, "Bài viết không tồn tại.");
      const comment = type === "comment" ? post.comments.find((item) => item.id === id) : undefined;
      if (type === "comment" && !comment) fail(404, "Bình luận không tồn tại.");
      entry = comment ? { _id: id, postId: post._id, authorId: comment.userId, text: comment.content, images: comment.media ? [comment.media.url] : [], at: comment.createdAt, privacy: post.privacy, moderation: comment.moderation || null, anonymous: post.anonymous && comment.userId === post.authorId } : { _id: id, authorId: post.authorId, text: post.content, images: post.image ? [post.image] : [], at: post.createdAt, privacy: post.privacy, moderation: post.moderation || null, anonymous: post.anonymous };
    }
    const author = await users.findOne({ _id: entry.authorId }, { projection: { name: 1 } });
    return c.json({ ...entry, type, author: author?.name || "Tài khoản không còn tồn tại", images: entry.images.map((url) => url.startsWith("/") ? `${config.APP_URL}${url}` : url) });
  });
}
