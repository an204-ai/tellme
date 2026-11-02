import { posts } from "./database.js";
import { prefix, redis, publishUpdate } from "./queue.js";

export async function buildFeed() {
  const items = await posts.find({ privacy: "public", "moderation.hidden": { $ne: true } }, { projection: { _id: 1, createdAt: 1 } }).sort({ createdAt: -1, _id: -1 }).limit(5000).toArray();
  const topics = await posts.aggregate<{ _id: string; count: number }>([
    { $match: { privacy: "public", "moderation.hidden": { $ne: true }, topic: { $ne: "" } } },
    { $group: { _id: "$topic", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } }, { $limit: 20 },
  ]).toArray();
  const total = await posts.countDocuments({ privacy: "public", "moderation.hidden": { $ne: true } });
  await redis.multi()
    .set(`${prefix}:feed:public`, JSON.stringify({ ids: items.map((p) => p._id), total }), "EX", 60)
    .set(`${prefix}:trending`, JSON.stringify(topics.map((t) => ({ name: t._id, count: t.count }))), "EX", 300)
    .exec();
  await publishUpdate([], "feed");
}
export async function cachedPublicFeed(cursor: number, limit: number) {
  if (redis.status !== "ready") return null;
  try {
    const value = await redis.get(`${prefix}:feed:public`);
    if (!value) return null;
    const page = JSON.parse(value) as { ids: string[]; total: number };
    if (cursor + limit > page.ids.length && page.ids.length < page.total) return null;
    const ids = page.ids.slice(cursor, cursor + limit);
    const current = await posts.find({ _id: { $in: ids }, privacy: "public", "moderation.hidden": { $ne: true } }).toArray();
    if (current.length !== ids.length) return null;
    const byId = new Map(current.map((post) => [post._id, post]));
    return { items: ids.map((id) => byId.get(id)!), total: page.total };
  } catch { return null; }
}
