import { Hono } from "hono";
import {
  users,
  stories,
  conversations,
  notices,
} from "../../backend/database.js";
import { type Env } from "../../backend/security.js";
import { defaults } from "../../backend/models.js";
import { config, listSystemNotices, registerSystemRecipient } from "@tellme/database";
import { canSendInConversation } from "../../backend/chat-policy.js";
import {
  externalId,
  relations,
  visibility,
  personDTO,
  storyDTO,
  conversationDTO,
} from "../../backend/domain.js";
import { pendingFriendRequests } from "../user/friend.routes.js";
export function registerBootstrapRoutes(api: Hono<Env>) {
  api.get("/bootstrap", async (c) => {
    const me = c.get("user"),
      r = await relations(me);
    await registerSystemRecipient(me._id, me.settings.notifySystem !== false).catch(() => undefined);
    const systemNotices = await listSystemNotices(me._id).catch(() => []);
    const recentCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const [days, chats, notifications, unreadNotificationCount, pending] =
      await Promise.all([
        stories
          .find(await visibility(me, "userId"))
          .sort({ updatedAt: -1 })
          .limit(100)
          .toArray(),
        conversations
          .find({ participants: me._id })
          .sort({ updatedAt: -1 })
          .limit(100)
          .toArray(),
        notices
          .find({ recipientId: me._id, userId: { $nin: r.blocked }, at: { $gte: recentCutoff } })
          .sort({ at: -1 })
          .limit(50)
          .toArray(),
        notices.countDocuments({ recipientId: me._id, userId: { $nin: r.blocked }, read: false }),
        pendingFriendRequests(me, r.blocked),
      ]);
    const related = new Set([
      ...r.mutual,
      ...me.blocked,
      ...notifications.map((notice) => notice.userId),
      ...chats.flatMap((chat) => chat.participants),
      me._id,
    ]);
    const people = await users
      .find(
        {
          _id: {
            $in: [...related],
          },
        },
        { projection: { passwordHash: 0, email: 0 } },
      )
      .toArray();
    return c.json({
      version: 1,
      authenticated: true,
      features: { pushPublicKey: config.VAPID_PUBLIC_KEY || null, emailEnabled: !!config.SMTP_URL },
      people: people.map((p) => personDTO(p, me, p._id === me._id || r.mutual.includes(p._id))),
      stories: days.map((s) => storyDTO(s, me, r.mutual)).filter((s) => s.items.length),
      conversations: await Promise.all(
        chats
          .filter(
            (chat) => !chat.participants.some((id) => r.blocked.includes(id)),
          )
          .map((chat) => conversationDTO(chat, me, canSendInConversation(chat, people))),
      ),
      notifications: [...notifications.map((n) => ({
        id: n._id,
        userId: externalId(n.userId, me),
        kind: n.kind || "like",
        text: n.text,
        read: n.read,
        at: n.at,
        ...(n.storyId ? { storyId: n.storyId } : {}),
        ...(n.momentId ? { momentId: n.momentId } : {}),
        ...(n.conversationId ? { conversationId: n.conversationId } : {}),
      })), ...systemNotices].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100),
      unreadNotifications: unreadNotificationCount + systemNotices.filter((notice) => !notice.read).length,
      friendRequests: pending,
      connections: r.mutual,
      blocked: me.blocked,
      settings: { ...defaults, ...me.settings, audience: "connections" },
    });
  });
}
