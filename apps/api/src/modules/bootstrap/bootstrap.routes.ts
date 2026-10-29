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
    const [people, days, chats, notifications, reportList, counts, topics] =
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
          .find({ recipientId: me._id, userId: { $nin: r.blocked } })
          .sort({ at: -1 })
          .limit(100)
          .toArray(),
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
      people: [...people, ...extra].map((p) => personDTO(p, me)),
      posts: [],
      stories: days.map((s) => storyDTO(s, me)),
      conversations: await Promise.all(
        chats
          .filter(
            (chat) => !chat.participants.some((id) => r.blocked.includes(id)),
          )
          .map((chat) => conversationDTO(chat, me)),
      ),
      notifications: notifications.map((n) => ({
        id: n._id,
        userId: externalId(n.userId, me),
        text: n.text,
        read: n.read,
        at: n.at,
        ...(n.postId ? { postId: n.postId } : {}),
      })),
      following: me.following,
      connections: r.mutual,
      blocked: me.blocked,
      hiddenPosts: me.hiddenPosts,
      reports: reportList.map(({ postId, reason, at }) => ({
        postId,
        reason,
        at,
      })),
      settings: me.settings,
      postCounts: Object.fromEntries(
        counts.map((a) => [externalId(a._id, me), a.count]),
      ),
      topicStats: topics.map((a) => ({ name: a._id, count: a.count })),
    });
  });
}
