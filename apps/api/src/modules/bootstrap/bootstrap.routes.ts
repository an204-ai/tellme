import { Hono } from "hono";
import {
  users,
  posts,
  stories,
  conversations,
  notices,
  reports,
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
export function registerBootstrapRoutes(api: Hono<Env>) {
  api.get("/bootstrap", async (c) => {
    const me = c.get("user"),
      r = await relations(me);
    if (me._id === "guest") {
      const [people, days, topics] = await Promise.all([
        users.find({}, { projection: { passwordHash: 0, email: 0 } }).sort({ createdAt: -1 }).limit(500).toArray(),
        stories.find({ privacy: "public", "moderation.hidden": { $ne: true } }).sort({ updatedAt: -1 }).limit(100).toArray(),
        posts.aggregate<{ _id: string; count: number }>([{ $match: { privacy: "public", "moderation.hidden": { $ne: true }, topic: { $ne: "" } } }, { $group: { _id: "$topic", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]).toArray(),
      ]);
      const missing = days.map((story) => story.userId).filter((id) => !people.some((p) => p._id === id));
      const extra = missing.length ? await users.find({ _id: { $in: missing } }, { projection: { passwordHash: 0, email: 0 } }).toArray() : [];
      return c.json({ version: 1, authenticated: false, features: { pushPublicKey: config.VAPID_PUBLIC_KEY || null, emailEnabled: !!config.SMTP_URL }, people: [...people, ...extra].map((p) => personDTO(p, me)), posts: [], stories: days.map((s) => storyDTO(s, me)).filter((s) => s.items.length), conversations: [], notifications: [], unreadNotifications: 0, following: [], connections: [], blocked: [], hiddenPosts: [], reports: [], settings: { ...defaults }, postCounts: {}, topicStats: topics.map((t) => ({ name: t._id, count: t.count })) });
    }
    await registerSystemRecipient(me._id, me.settings.notifySystem !== false).catch(() => undefined);
    const systemNotices = await listSystemNotices(me._id).catch(() => []);
    const recentCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const [people, days, chats, notifications, unreadNotificationCount, reportList, counts, topics] =
      await Promise.all([
        users
          .find({}, { projection: { passwordHash: 0, email: 0 } })
          .sort({ createdAt: -1 })
          .limit(500)
          .toArray(),
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
        reports.find({ userId: me._id }).limit(100).toArray(),
        posts
          .aggregate<{
            _id: string;
            count: number;
          }>([{ $match: { $and: [await visibility(me, "authorId"), { anonymous: false }] } }, { $group: { _id: "$authorId", count: { $sum: 1 } } }])
          .toArray(),
        posts
          .aggregate<{
            _id: string;
            count: number;
          }>([{ $match: { $and: [await visibility(me, "authorId"), { privacy: "public", topic: { $ne: "" } }] } }, { $group: { _id: "$topic", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }])
          .toArray(),
      ]);
    const related = new Set([
      ...me.following,
      ...me.blocked,
      ...chats.flatMap((chat) => chat.participants),
      me._id,
    ]);
    const extra = await users
      .find(
        {
          _id: {
            $in: [...related].filter((id) => !people.some((p) => p._id === id)),
          },
        },
        { projection: { passwordHash: 0, email: 0 } },
      )
      .toArray();
    return c.json({
      version: 1,
      authenticated: true,
      features: { pushPublicKey: config.VAPID_PUBLIC_KEY || null, emailEnabled: !!config.SMTP_URL },
      people: [...people, ...extra].map((p) => personDTO(p, me)),
      posts: [],
      stories: days.map((s) => storyDTO(s, me, r.mutual)).filter((s) => s.items.length),
      conversations: await Promise.all(
        chats
          .filter(
            (chat) => !chat.participants.some((id) => r.blocked.includes(id)),
          )
          .map((chat) => conversationDTO(chat, me, canSendInConversation(chat, [...people, ...extra]))),
      ),
      notifications: [...notifications.map((n) => ({
        id: n._id,
        userId: externalId(n.userId, me),
        kind: n.kind || "like",
        text: n.text,
        read: n.read,
        at: n.at,
        ...(n.postId ? { postId: n.postId } : {}),
      })), ...systemNotices].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100),
      unreadNotifications: unreadNotificationCount + systemNotices.filter((notice) => !notice.read).length,
      following: me.following,
      connections: r.mutual,
      blocked: me.blocked,
      hiddenPosts: me.hiddenPosts,
      hiddenStories: me.hiddenStories || [],
      savedStories: me.savedStories || [],
      reports: reportList.map(({ postId, reason, at }) => ({
        postId,
        reason,
        at,
      })),
      settings: { ...defaults, ...me.settings },
      postCounts: Object.fromEntries(
        counts.map((a) => [externalId(a._id, me), a.count]),
      ),
      topicStats: topics.map((a) => ({ name: a._id, count: a.count })),
    });
  });
}
