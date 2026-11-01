import { Hono } from "hono";
import { z } from "zod";
import { users, stories } from "../../backend/database.js";
import { personDTO, relations, storyDTO, visibility } from "../../backend/domain.js";
import type { Env } from "../../backend/security.js";

export function registerSearchRoutes(api: Hono<Env>) {
  api.get("/search", async (c) => {
    const me = c.get("user");
    const query = z.string().trim().max(200).parse(c.req.query("q") || "");
    const scope = z.enum(["all", "people"]).parse(c.req.query("scope") || "all");
    const relationship = z.enum(["all", "friends"]).parse(c.req.query("relationship") || "all");
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = { $regex: escaped, $options: "i" };
    const r = await relations(me);
    const people = await users.find({ _id: { $nin: [me._id, ...r.blocked], ...(relationship === "friends" ? { $in: r.mutual } : {}) }, ...(query ? { $or: [{ name: match }, { username: match }] } : {}) }, { projection: { passwordHash: 0, email: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
    if (scope === "people") return c.json({ people: people.map((p) => personDTO(p, me)) });
    const days = await stories.find({ $and: [await visibility(me, "userId"), { _id: { $nin: me.hiddenStories || [] } }, ...(query ? [{ $or: [{ "items.caption": match }, { userId: { $in: people.map((p) => p._id) } }] }] : [])] }).sort({ updatedAt: -1 }).limit(60).toArray();
    // Match only visible captions after per-photo privacy has been applied.
    const visible = days.map((s) => storyDTO(s, me, r.mutual)).filter((s) => s.items.length && (!query || people.some((p) => p._id === s.userId) || s.items.some((i) => i.caption.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")))));
    const ids = days.map((s) => s.userId).filter((id) => !people.some((p) => p._id === id));
    const authors = await users.find({ _id: { $in: ids } }, { projection: { passwordHash: 0, email: 0 } }).toArray();
    return c.json({ people: people.map((p) => personDTO(p, me)), authors: authors.map((p) => personDTO(p, me)), stories: visible });
  });
}
