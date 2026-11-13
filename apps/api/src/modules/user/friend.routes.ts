import { Hono } from "hono";
import { z } from "zod";
import { friendRequests, mongo, users } from "../../backend/database.js";
import { externalId, internalId, now, relations } from "../../backend/domain.js";
import { fail, rateLimit, type Env } from "../../backend/security.js";
import { isSuspended, publishUpdate, type User } from "@tellme/database";
import { profileSchema } from "../../backend/validation.js";

const tellmeId = z.string().trim().transform((value) => value.replace(/^@/, "").toLowerCase()).pipe(profileSchema.shape.username);
const requestId = (a: string, b: string) => [a, b].sort().join(":");
const identity = (person: Pick<User, "_id" | "name" | "username" | "avatar">, me: User) => ({
  id: externalId(person._id, me), name: person.name, username: person.username, avatar: person.avatar,
});

export async function pendingFriendRequests(me: User, blocked: string[]) {
  const pending = await friendRequests.find({
    $or: [{ fromId: me._id }, { toId: me._id }],
    fromId: { $nin: blocked }, toId: { $nin: blocked },
  }).sort({ at: -1 }).limit(100).toArray();
  const ids = [...new Set(pending.flatMap((entry) => [entry.fromId, entry.toId]))].filter((id) => id !== me._id);
  const people = ids.length ? await users.find({ _id: { $in: ids } }, {
    projection: { _id: 1, name: 1, username: 1, avatar: 1, suspension: 1 },
  }).toArray() : [];
  const entries = pending.flatMap((entry) => {
    const person = people.find((p) => p._id === (entry.fromId === me._id ? entry.toId : entry.fromId));
    return person && !isSuspended(person) ? [{ id: entry._id, person: identity(person, me), at: entry.at, incoming: entry.toId === me._id }] : [];
  });
  return {
    incoming: entries.filter((entry) => entry.incoming).map(({ incoming: _, ...entry }) => entry),
    outgoing: entries.filter((entry) => !entry.incoming).map(({ incoming: _, ...entry }) => entry),
  };
}

export function registerFriendRoutes(api: Hono<Env>) {
  api.get("/friends/lookup", rateLimit(30, 60000, "friend-lookup"), async (c) => {
    const me = c.get("user"), username = tellmeId.parse(c.req.query("id"));
    const person = await users.findOne({ username });
    const r = await relations(me);
    if (!person || isSuspended(person) || r.blocked.includes(person._id)) fail(404, "Chưa tìm thấy. Bạn kiểm tra lại đầy đủ Tellme ID nhé.");
    const pending = await friendRequests.findOne({ _id: requestId(me._id, person._id) });
    const relationship = person._id === me._id ? "self" : r.mutual.includes(person._id) ? "friends" : pending?.toId === me._id ? "incoming" : pending ? "outgoing" : "none";
    return c.json({ person: identity(person, me), relationship, requestId: pending?._id });
  });

  api.post("/friends/requests", rateLimit(20, 60000, "friend-requests"), async (c) => {
    const me = c.get("user"), input = z.object({ tellmeId }).strict().parse(await c.req.json());
    const target = await users.findOne({ username: input.tellmeId });
    const r = await relations(me);
    if (!target || target._id === me._id || isSuspended(target) || r.blocked.includes(target._id)) fail(400, "Không thể gửi lời mời đến Tellme ID này.");
    if (r.mutual.includes(target._id)) return c.json({ ok: true, relationship: "friends" });
    const id = requestId(me._id, target._id);
    const pending = await friendRequests.findOne({ _id: id });
    if (pending?.toId === me._id) fail(409, "Người bạn này đã gửi lời mời. Chấp nhận trong mục lời mời để kết nối nhé.");
    if (!pending && await friendRequests.countDocuments({ fromId: me._id }) >= 50) fail(400, "Bạn đang có 50 lời mời chờ phản hồi. Hủy bớt lời mời trước khi gửi thêm nhé.");
    await friendRequests.updateOne({ _id: id }, { $setOnInsert: { fromId: me._id, toId: target._id, at: now() } }, { upsert: true });
    // Reciprocal requests never silently accept one another.
    const saved = await friendRequests.findOne({ _id: id });
    if (saved?.fromId !== me._id) fail(409, "Người bạn này đã gửi lời mời. Mở mục lời mời để chấp nhận nhé.");
    await publishUpdate([me._id, target._id], "relations");
    return c.json({ ok: true, relationship: "outgoing" }, 201);
  });

  api.put("/friends/requests/:id", async (c) => {
    const me = c.get("user"), id = c.req.param("id");
    const { accept } = z.object({ accept: z.boolean() }).strict().parse(await c.req.json());
    let senderId: string | undefined;
    const session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        const pending = await friendRequests.findOne({ _id: id, toId: me._id }, { session });
        if (!pending) fail(404, "Lời mời không còn khả dụng.");
        senderId = pending.fromId;
        if (accept) {
          const people = await users.find({ _id: { $in: [me._id, pending.fromId] } }, { session }).toArray();
          const recipient = people.find((p) => p._id === me._id), sender = people.find((p) => p._id === pending.fromId);
          if (!recipient || !sender || isSuspended(recipient) || isSuspended(sender) || recipient.blocked.includes(sender._id) || sender.blocked.includes(recipient._id)) fail(404, "Lời mời không còn khả dụng.");
          await users.updateOne({ _id: recipient._id }, { $addToSet: { following: sender._id } }, { session });
          await users.updateOne({ _id: sender._id }, { $addToSet: { following: recipient._id } }, { session });
        }
        await friendRequests.deleteOne({ _id: id, toId: me._id }, { session });
      });
    } finally { await session.endSession(); }
    await publishUpdate([me._id, ...(senderId ? [senderId] : [])], "relations");
    return c.json({ ok: true });
  });

  api.delete("/friends/requests/:id", async (c) => {
    const me = c.get("user");
    const pending = await friendRequests.findOneAndDelete({ _id: c.req.param("id"), fromId: me._id });
    if (!pending) fail(404, "Lời mời không còn khả dụng.");
    await publishUpdate([me._id, pending.toId], "relations");
    return c.json({ ok: true });
  });

  api.delete("/friends/:id", async (c) => {
    const me = c.get("user"), id = internalId(c.req.param("id"), me);
    if (id === me._id) fail(400, "Không thể gỡ kết nối với chính bạn.");
    const session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        await users.updateOne({ _id: me._id }, { $pull: { following: id } }, { session });
        await users.updateOne({ _id: id }, { $pull: { following: me._id } }, { session });
        await friendRequests.deleteOne({ _id: requestId(me._id, id) }, { session });
      });
    } finally { await session.endSession(); }
    await publishUpdate([me._id, id], "relations");
    return c.json({ ok: true });
  });
}
