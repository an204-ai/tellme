import type { Hono } from "hono";
import { z } from "zod";
import type { Filter } from "mongodb";
import { users, stories, sessions, reports, messages, config, publishUpdate, isSuspended } from "@tellme/database";
import type { User } from "@tellme/database";
import { fail, type Env } from "../../backend/security.js";
import { pageSchema } from "../../backend/validation.js";
import { idSchema, isAdmin, moderateStory, reasonSchema, suspendAccount, transaction } from "./admin.service.js";
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
    const [storyCount, messageCount, sessionCount, reportCount] = await Promise.all([
      stories.countDocuments({ userId: id }),
      messages.countDocuments({ senderId: id }), sessions.countDocuments({ userId: id, expiresAt: { $gt: new Date() } }),
      reports.countDocuments({ targetType: "user", targetId: id }),
    ]);
    return c.json({ user: userDTO(user), stats: { stories: storyCount, messages: messageCount, sessions: sessionCount, reports: reportCount } });
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
    z.literal("story").parse(c.req.query("type") || "story");
    const state = z.enum(["all", "visible", "hidden"]).parse(c.req.query("state") || "all");
    const q = queryText(c.req.query("q")), author = queryText(c.req.query("author")), { cursor, limit } = pageSchema.parse(c.req.query());
    const match = { ...(state === "all" ? {} : { "moderation.hidden": state === "hidden" ? true : { $ne: true } }), ...(author ? { userId: author } : {}), ...(q ? { "items.caption": { $regex: escaped(q), $options: "i" } } : {}) };
    const [rows, total] = await Promise.all([
      stories.find(match).sort({ updatedAt: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), stories.countDocuments(match),
    ]);
    const authors = await users.find({ _id: { $in: rows.map((row) => row.userId) } }, { projection: { name: 1 } }).toArray();
    return c.json({ items: rows.map((row) => ({ _id: row._id, type: "story", authorId: row.userId,
      author: authors.find((person) => person._id === row.userId)?.name || "Tài khoản không còn tồn tại",
      text: row.items.map((item) => item.caption).filter(Boolean).join("\n").slice(0, 600),
      images: row.items.slice(0, 4).map((item) => item.image.startsWith("/") ? `${config.APP_URL}${item.image}` : item.image),
      at: row.updatedAt, day: row.day, privacy: row.privacy, moderation: row.moderation || null, moments: row.items.length,
    })), total, nextCursor: cursor + rows.length < total ? cursor + rows.length : null });
  });
  api.post("/admin/content/:type/:id/moderate", async (c) => {
    z.literal("story").parse(c.req.param("type"));
    const id = idSchema.parse(c.req.param("id"));
    const { hidden, reason } = z.object({ hidden: z.boolean(), reason: reasonSchema }).parse(await c.req.json());
    await transaction(async (session) => { await moderateStory(id, hidden, c.get("user")._id, reason, session); });
    await publishUpdate([], "community");
    return c.json({ ok: true });
  });
  api.get("/admin/content/:type/:id", async (c) => {
    const type = z.literal("story").parse(c.req.param("type")), id = idSchema.parse(c.req.param("id"));
    const story = await stories.findOne({ _id: id });
    if (!story) fail(404, "Chuỗi ảnh không tồn tại.");
    const entry = { _id: id, authorId: story.userId, text: story.items.map((item) => item.caption).filter(Boolean).join("\n\n"), images: story.items.map((item) => item.image), at: story.updatedAt, day: story.day, privacy: story.privacy, moments: story.items.length, moderation: story.moderation || null };
    const author = await users.findOne({ _id: entry.authorId }, { projection: { name: 1 } });
    return c.json({ ...entry, type, author: author?.name || "Tài khoản không còn tồn tại", images: entry.images.map((url) => url.startsWith("/") ? `${config.APP_URL}${url}` : url) });
  });
}
