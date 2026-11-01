import type { Hono } from "hono";
import { z } from "zod";
import { conversations, media, messages, mongo, users } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import { externalId, internalId, messageDTO, now, relations, requireConversation } from "../../backend/domain.js";
import type { Conversation } from "../../backend/models.js";
import { canSendInConversation } from "../../backend/chat-policy.js";
import { DEFAULT_GROUP_AVATAR, isGroupAvatarPreset } from "../../backend/social-assets.js";
import { publishUpdate, scheduleCleanup, withMediaChange } from "@tellme/database";

const owner = (chat: Conversation) => chat.ownerId || chat.participants[0];
function requireOwner(chat: Conversation, id: string) {
  if (chat.kind !== "group" || owner(chat) !== id) fail(403, "Chỉ trưởng nhóm có thể thực hiện thao tác này.");
}

export function registerConversationRoutes(api: Hono<Env>) {
  async function memberChat(id: string, userId: string) {
    const chat = await conversations.findOne({ _id: id, participants: userId });
    if (!chat) fail(404, "Cuộc trò chuyện không khả dụng.");
    return chat;
  }

  api.patch("/conversations/:id", async (c) => {
    const me = c.get("user"), chat = await memberChat(c.req.param("id"), me._id);
    requireOwner(chat, me._id);
    const input = z.object({ title: z.string().trim().min(1).max(60), avatar: z.string().max(2048) }).parse(await c.req.json());
    const avatar = input.avatar || DEFAULT_GROUP_AVATAR;
    if (avatar.startsWith("/") && !isGroupAvatarPreset(avatar)) fail(400, "Chọn avatar mẫu hoặc tải ảnh của bạn lên.");
    const changed = avatar !== chat.avatar;
    await withMediaChange(me, changed && !isGroupAvatarPreset(avatar) ? [avatar] : [], async (session) => {
      const current = await conversations.findOne({ _id: chat._id, participants: me._id }, { session });
      if (!current) fail(404, "Cuộc trò chuyện không khả dụng.");
      requireOwner(current, me._id);
      if (!changed && current.avatar !== chat.avatar) fail(409, "Avatar vừa thay đổi. Tải lại rồi thử nhé.");
      await conversations.updateOne({ _id: chat._id }, { $set: { title: input.title, avatar, updatedAt: now() } }, { session });
      if (current.avatar && current.avatar !== avatar) {
        const old = await media.findOne({ url: current.avatar }, { session });
        if (old) await scheduleCleanup(old.ownerId, [old.url], session);
      }
    });
    await publishUpdate(chat.participants, "messages");
    return c.json({ ok: true });
  });

  api.put("/conversations/:id/preferences", async (c) => {
    const me = c.get("user"), chat = await memberChat(c.req.param("id"), me._id);
    const { muted } = z.object({ muted: z.boolean() }).parse(await c.req.json());
    await conversations.updateOne({ _id: chat._id, participants: me._id }, muted ? { $addToSet: { mutedBy: me._id } } : { $pull: { mutedBy: me._id } });
    await publishUpdate([me._id], "messages");
    return c.json({ ok: true });
  });

  api.post("/conversations/:id/members", async (c) => {
    const me = c.get("user"), chat = await memberChat(c.req.param("id"), me._id);
    requireOwner(chat, me._id);
    const input = z.object({ participantIds: z.array(z.string().max(50)).min(1).max(29) }).parse(await c.req.json());
    const ids = [...new Set(input.participantIds.map((id) => internalId(id, me)))].filter((id) => !chat.participants.includes(id));
    const r = await relations(me);
    if (!ids.length || ids.some((id) => !r.mutual.includes(id))) fail(403, "Chỉ có thể thêm bạn bè của bạn vào nhóm.");
    const participants = [...chat.participants, ...ids];
    if (participants.length > 30) fail(400, "Nhóm có tối đa 30 thành viên.");
    const people = await users.find({ _id: { $in: participants } }, { projection: { _id: 1, following: 1, blocked: 1 } }).toArray();
    if (!canSendInConversation({ kind: "group", participants }, people)) fail(403, "Có thành viên không khả dụng hoặc đã chặn tài khoản trong nhóm.");
    const result = await conversations.updateOne({ _id: chat._id, participants: chat.participants }, { $set: { participants, updatedAt: now() } });
    if (!result.modifiedCount) fail(409, "Thành viên vừa thay đổi. Tải lại rồi thử nhé.");
    await publishUpdate(participants, "messages");
    return c.json({ ok: true });
  });

  api.delete("/conversations/:id/members/:userId", async (c) => {
    const me = c.get("user"), chat = await memberChat(c.req.param("id"), me._id);
    if (chat.kind !== "group") fail(400, "Thao tác này chỉ dành cho nhóm chat.");
    const target = internalId(c.req.param("userId"), me);
    if (target !== me._id) requireOwner(chat, me._id);
    if (!chat.participants.includes(target)) fail(404, "Thành viên không còn trong nhóm.");
    const participants = chat.participants.filter((id) => id !== target);
    const session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await conversations.findOne({ _id: chat._id }, { session });
        if (!current || current.participants.join(":") !== chat.participants.join(":")) fail(409, "Thành viên vừa thay đổi. Tải lại rồi thử nhé.");
        if (!participants.length) {
          await conversations.deleteOne({ _id: chat._id }, { session });
          await messages.deleteMany({ conversationId: chat._id }, { session });
          if (chat.avatar) {
            const old = await media.findOne({ url: chat.avatar }, { session });
            if (old) await scheduleCleanup(old.ownerId, [old.url], session);
          }
        } else {
          await conversations.updateOne({ _id: chat._id }, { $set: { participants, ownerId: owner(chat) === target ? participants[0]! : owner(chat)!, updatedAt: now() }, $pull: { mutedBy: target } }, { session });
        }
      });
    } finally { await session.endSession(); }
    await publishUpdate(chat.participants, "messages");
    return c.json({ ok: true, ownerId: participants.length ? externalId(owner(chat) === target ? participants[0]! : owner(chat)!, me) : null });
  });

  // Search the whole conversation, not only the latest fifty loaded messages.
  api.get("/conversations/:id/search", async (c) => {
    const me = c.get("user"), chat = await requireConversation(c.req.param("id"), me);
    const q = z.string().trim().max(100).parse(c.req.query("q") || "");
    const shared = c.req.query("shared") === "true";
    let cursor: { at: string; id: string } | undefined;
    if (c.req.query("cursor")) {
      try { cursor = z.object({ at: z.string().datetime(), id: z.string().uuid() }).parse(JSON.parse(Buffer.from(c.req.query("cursor")!, "base64url").toString())); }
      catch { fail(400, "Mốc tìm kiếm không hợp lệ."); }
    }
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const list = await messages.find({ conversationId: chat._id,
      ...(q ? { text: { $regex: escaped, $options: "i" } } : {}),
      ...(shared ? { $or: [{ postId: { $exists: true } }, { storyReply: { $exists: true } }] } : {}),
      ...(cursor ? { $and: [{ $or: [{ at: { $lt: cursor.at } }, { at: cursor.at, _id: { $lt: cursor.id } }] }] } : {}),
    }).sort({ at: -1, _id: -1 }).limit(21).toArray();
    const page = list.slice(0, 20), last = page.at(-1);
    return c.json({ items: await Promise.all(page.map((item) => messageDTO(item, me))), nextCursor: list.length > 20 && last ? Buffer.from(JSON.stringify({ at: last.at, id: last._id })).toString("base64url") : null });
  });
}
