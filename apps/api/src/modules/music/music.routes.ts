import type { Hono } from "hono";
import { z } from "zod";
import { fail, rateLimit, type Env } from "../../backend/security.js";
import { stories } from "../../backend/database.js";
import { requireStory, storyDTO, relations } from "../../backend/domain.js";
import { publishUpdate } from "@tellme/database";
import { getMusicTrack, getMusicStream, musicAvailability, searchMusic, trackIdSchema, musicProviderSchema, musicStartSchema, withMusicStart } from "./catalog.js";

export function registerMusicRoutes(api: Hono<Env>) {
  api.get("/music/config", (c) => c.json(musicAvailability()));
  api.get("/music/tracks", rateLimit(40, 60000, "music-search"), async (c) => {
    const { q, cursor, provider } = z.object({ q: z.string().trim().max(120).default(""), cursor: z.string().max(1400).default("0"), provider: musicProviderSchema.optional() }).parse(c.req.query());
    return c.json(await searchMusic(q, cursor, c.get("user")._id, provider));
  });
  api.get("/music/tracks/:id/stream", rateLimit(30, 60000, "music-preview"), async (c) => {
    c.header("Cache-Control", "private, no-store");
    const provider = musicProviderSchema.default("epidemic-sound").parse(c.req.query("provider"));
    const startSeconds = musicStartSchema.parse(Number(c.req.query("startSeconds") || 0));
    const stream = await getMusicStream(trackIdSchema.parse(c.req.param("id")), c.get("user")._id, provider);
    return c.json(withMusicStart({ ...stream, durationSeconds: "durationSeconds" in stream ? stream.durationSeconds : undefined }, startSeconds));
  });
  api.put("/stories/:id/music", rateLimit(20, 60000, "music-write"), async (c) => {
    const me = c.get("user"), id = c.req.param("id");
    if (!await stories.findOne({ _id: id, userId: me._id }, { projection: { _id: 1 } })) fail(404, "Không thể sửa nhạc của chuỗi này.");
    const { trackId, provider, startSeconds } = z.object({ trackId: trackIdSchema.nullable(), provider: musicProviderSchema.default("epidemic-sound"), startSeconds: musicStartSchema }).parse(await c.req.json());
    const music = trackId ? await getMusicTrack(trackId, me._id, provider, startSeconds) : null;
    const result = await stories.updateOne({ _id: id, userId: me._id }, music ? { $set: { music } } : { $unset: { music: "" } });
    if (!result.matchedCount) fail(404, "Chuỗi ảnh đã bị xóa. Bạn tải lại trang nhé.");
    await publishUpdate([], "stories");
    return c.json({ music });
  });
  api.get("/stories/:id/music/stream", rateLimit(30, 60000, "music-preview"), async (c) => {
    const me = c.get("user"), story = await requireStory(c.req.param("id"), me);
    const visible = storyDTO(story, me, (await relations(me)).mutual);
    if (!visible.items.length || !story.music) fail(404, "Chuỗi này chưa có nhạc hoặc không còn khả dụng.");
    c.header("Cache-Control", "private, no-store");
    const stream = await getMusicStream(story.music.trackId, me._id, story.music.provider);
    if (stream.provider === "youtube" && stream.metadataUpdatedAt) {
      await stories.updateOne({ _id: story._id, "music.provider": "youtube", "music.trackId": stream.videoId }, { $set: { "music.title": stream.title, "music.artists": stream.artists, "music.cover": stream.cover, "music.durationSeconds": stream.durationSeconds, "music.metadataUpdatedAt": new Date().toISOString() } });
    }
    const duration = "durationSeconds" in stream ? stream.durationSeconds : undefined;
    const startSeconds = Math.min(story.music.startSeconds || 0, duration ? Math.max(0, duration - 1) : 86400);
    return c.json({ ...stream, startSeconds });
  });
}
