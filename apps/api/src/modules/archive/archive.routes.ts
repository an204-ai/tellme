import { Hono } from "hono";
import { anonymousIdentity } from "../../backend/anonymous.js";
import { z } from "zod";
import { posts, users } from "../../backend/database.js";
import { relations, visibility, personDTO } from "../../backend/domain.js";
import { pageSchema } from "../../backend/validation.js";
import type { Post, Story } from "../../backend/models.js";
import type { Env } from "../../backend/security.js";

type Entry = (Post & { kind: "post"; sortAt: string }) | (Story & { kind: "story"; sortAt: string });
export function registerArchiveRoutes(api: Hono<Env>) {
  api.get("/archive", async (c) => {
    const me = c.get("user");
    const view = z.enum(["saved", "hidden"]).parse(c.req.query("view") || "saved");
    const { cursor, limit } = pageSchema.parse(c.req.query());
    const r = await relations(me);
    // Hidden items are intentionally readable here, but current privacy and blocks still apply.
    const postMatch = { $and: [await visibility(me, "authorId"), view === "saved" ? { savedBy: me._id } : { _id: { $in: me.hiddenPosts } }] };
    const storyMatch = { $and: [await visibility(me, "userId"), { _id: { $in: (view === "saved" ? me.savedStories : me.hiddenStories) || [] } }] };
    const audience = { $ifNull: ["$$item.privacy", "$privacy"] };
    const result = await posts.aggregate<{ items: Entry[]; count: { total: number }[] }>([
      { $match: postMatch },
      { $addFields: { kind: { $literal: "post" }, sortAt: "$createdAt" } },
      { $unionWith: { coll: "stories", pipeline: [
        { $match: storyMatch },
        { $set: { items: { $filter: { input: "$items", as: "item", cond: { $or: [
          { $eq: ["$userId", me._id] }, { $eq: [audience, "public"] },
          { $and: [{ $eq: [audience, "connections"] }, { $in: ["$userId", r.mutual] }] },
        ] } } } } },
        { $match: { "items.0": { $exists: true } } },
        { $addFields: { kind: { $literal: "story" }, sortAt: "$updatedAt" } },
      ] } },
      { $sort: { sortAt: -1, _id: -1, kind: 1 } },
      { $facet: { items: [{ $skip: cursor }, { $limit: limit }], count: [{ $count: "total" }] } },
    ]).next();
    const entries = result?.items || [];
    const ids = [...new Set(entries.flatMap((entry) => entry.kind === "post" ? entry.anonymous ? [] : [entry.authorId] : [entry.userId]))];
    const authors = await users.find({ _id: { $in: ids } }, { projection: { passwordHash: 0, email: 0 } }).toArray();
    const total = result?.count[0]?.total || 0;
    return c.json({
      items: entries.map((entry) => {
        const authorId = entry.kind === "post" ? entry.anonymous ? null : entry.authorId : entry.userId;
        const author = authors.find((person) => person._id === authorId);
        return {
          id: entry._id, kind: entry.kind, at: entry.sortAt, privacy: entry.privacy,
          person: author ? personDTO(author, me) : null,
          ...(entry.kind === "post" && entry.anonymous ? { anonymousIdentity: anonymousIdentity(entry._id, entry.anonymousVersion) } : {}),
          text: (entry.kind === "post" ? entry.content : entry.items.at(-1)?.caption || "").slice(0, 300),
          image: entry.kind === "post" ? entry.image : entry.items.at(-1)?.image || "",
          count: entry.kind === "story" ? entry.items.length : undefined,
        };
      }),
      total, nextCursor: cursor + entries.length < total ? cursor + entries.length : null,
    });
  });
}
