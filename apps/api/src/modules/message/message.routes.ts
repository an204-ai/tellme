import { registerConversationRoutes } from "./conversation.routes.js";
import { Hono } from "hono";
import { z } from "zod";
import { users, conversations, messages } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import {
  now,
  internalId,
  relations,
  requirePost,
  requireConversation,
  requireStory,
  canViewMoment,
  messageDTO,
  notify,
  chatAllowed,
} from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
import { isGroupAvatarPreset, DEFAULT_GROUP_AVATAR } from "../../backend/social-assets.js";
import { publishUpdate, withMediaChange } from "@tellme/database";
export function registerMessageRoutes(api: Hono<Env>) {
  registerConversationRoutes(api);
  api.post("/conversations", async (c) => {
    const me = c.get("user"),
      input = v.conversationSchema.parse(await c.req.json());
    const participants = [
      ...new Set([
        me._id,
        ...input.participantIds.map((id) => internalId(id, me)),
      ]),
    ];
    if (
      (input.kind === "direct" && participants.length !== 2) ||
      (input.kind === "group" && (participants.length < 3 || !input.title))
    )
      fail(400, "Chọn đủ thành viên và tên nhóm.");
    const r = await relations(me);
    if (
      participants.some((id) => r.blocked.includes(id)) ||
      (await users.countDocuments({ _id: { $in: participants } })) !==
        participants.length
    )
      fail(400, "Thành viên không khả dụng.");
    if (!await chatAllowed(participants, input.kind === "group" ? me._id : undefined)) fail(403, input.kind === "group" ? "Chỉ có thể mời bạn bè của bạn vào nhóm. Kiểm tra lại các tài khoản đã chặn." : "Hai người cần follow nhau để nhắn tin riêng.");
    const directKey =
      input.kind === "direct" ? [...participants].sort().join(":") : undefined;
    if (directKey) {
      const existing = await conversations.findOne({ directKey });
      if (existing) return c.json({ id: existing._id });
    }
    const avatar = input.kind === "group" ? input.avatar || DEFAULT_GROUP_AVATAR : "";
    if (avatar.startsWith("/") && !isGroupAvatarPreset(avatar)) fail(400, "Chọn avatar mẫu hoặc tải ảnh của bạn lên.");
    await withMediaChange(me, avatar && !isGroupAvatarPreset(avatar) ? [avatar] : [], async (session) => {
      await conversations.insertOne({
        avatar,
        _id: input.id,
        kind: input.kind,
        ...(input.kind === "group" ? { ownerId: me._id, mutedBy: [] } : {}),
        title: input.title,
        participants,
        readAt: {},
        createdAt: now(),
        updatedAt: now(),
        ...(directKey ? { directKey } : {}),
      }, { session });
    });
    await publishUpdate(participants, "messages");
    return c.json({ id: input.id }, 201);
  });
  api.post("/conversations/:id/messages", async (c) => {
    const me = c.get("user"),
      chat = await requireConversation(c.req.param("id"), me, true),
      input = v.messageSchema.parse(await c.req.json());
    if (input.postId) {
      const post = await requirePost(input.postId, me);
      for (const id of chat.participants) {
        const recipient = await users.findOne({ _id: id });
        if (recipient) await requirePost(post._id, recipient);
      }
    }
    if (input.storyReply) {
      const story = await requireStory(input.storyReply.storyId, me);
      if (!(await canViewMoment(story, input.storyReply.momentId, me)))
        fail(404, "Khoảnh khắc không còn khả dụng.");
      if (chat.kind !== "direct" || story.userId === me._id || !chat.participants.includes(story.userId))
        fail(400, "Lời trả lời cần được gửi riêng cho người đăng ảnh.");
    }
    await messages.insertOne({
      _id: input.id,
      conversationId: chat._id,
      senderId: me._id,
      text: input.text,
      at: now(),
      ...(input.postId ? { postId: input.postId } : {}),
      ...(input.storyReply ? { storyReply: input.storyReply } : {}),
    });
    await conversations.updateOne(
      { _id: chat._id },
      { $set: { updatedAt: now(), [`readAt.${me._id}`]: now() } },
    );
    await Promise.all(
      chat.participants
        .filter((id) => id !== me._id && !chat.mutedBy?.includes(id))
        .map((id) =>
          notify(
            id,
            me._id,
            "đã gửi cho bạn một tin nhắn.",
            undefined,
            "message",
          ),
        ),
    );
    await publishUpdate(chat.participants, "messages");
    return c.json({ ok: true }, 201);
  });
  api.get("/conversations/:id/messages", async (c) => {
    const me = c.get("user"),
      chat = await requireConversation(c.req.param("id"), me),
      before = c.req.query("before"),
      filter = {
        conversationId: chat._id,
        ...(before ? { at: { $lt: z.string().datetime().parse(before) } } : {}),
      };
    const list = await messages
      .find(filter)
      .sort({ at: -1, _id: -1 })
      .limit(50)
      .toArray();
    return c.json({
      items: await Promise.all(list.reverse().map((m) => messageDTO(m, me))),
      nextCursor: list.length === 50 ? list[0]?.at : null,
    });
  });
  api.put("/conversations/:id/read", async (c) => {
    const me = c.get("user"),
      chat = await requireConversation(c.req.param("id"), me);
    await conversations.updateOne(
      { _id: chat._id },
      { $set: { [`readAt.${me._id}`]: now() } },
    );
    return c.json({ ok: true });
  });
}
