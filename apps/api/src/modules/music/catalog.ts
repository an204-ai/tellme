import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { config } from "../../backend/config.js";
import { fail } from "../../backend/security.js";
import * as epidemic from "./epidemic.js";
import { getYouTubeTrack, searchYouTube, youtubeAvailable, YouTubeUnavailable } from "./youtube.js";

export const musicProviderSchema = z.enum(["youtube", "epidemic-sound"]);
export const trackIdSchema = epidemic.trackIdSchema;
export const musicStartSchema = z.number().int().min(0).max(86400).default(0);
export function withMusicStart<T extends { durationSeconds?: number }>(track: T, startSeconds: number) {
  musicStartSchema.parse(startSeconds);
  if (track.durationSeconds && startSeconds >= track.durationSeconds) fail(400, "Mốc bắt đầu cần nằm trước khi bài nhạc kết thúc.");
  return { ...track, startSeconds };
}
export function musicAvailability() {
  const fallback = epidemic.musicAvailability();
  return {
    enabled: !!config.YOUTUBE_API_KEY || fallback.enabled,
    reason: config.YOUTUBE_API_KEY ? null : fallback.reason,
    provider: config.YOUTUBE_API_KEY ? "youtube" : fallback.enabled ? "epidemic-sound" : null,
    providers: {
      youtube: { enabled: !!config.YOUTUBE_API_KEY, reason: config.YOUTUBE_API_KEY ? null : "not-configured" },
      "epidemic-sound": fallback,
    },
  };
}
const cursorSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("youtube"), token: z.string().regex(/^[a-zA-Z0-9_=-]{1,512}$/), term: z.string().max(120) }),
  z.object({ provider: z.literal("epidemic-sound"), offset: z.number().int().min(0).max(1000), term: z.string().max(120) }),
]);
const encode = (data: z.infer<typeof cursorSchema>) => Buffer.from(JSON.stringify(data)).toString("base64url");
export async function searchMusic(term: string, cursor: string, userId: string, preferred?: z.infer<typeof musicProviderSchema>) {
  let page: z.infer<typeof cursorSchema> | undefined;
  if (cursor !== "0") {
    try { page = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))); }
    catch { fail(400, "Trang nhạc không hợp lệ. Bạn tìm lại nhé."); }
    if (page.term !== term) fail(400, "Từ khóa đã đổi. Bạn tìm lại từ đầu nhé.");
    if (preferred && page.provider !== preferred) fail(400, "Kho nhạc đã đổi. Bạn tìm lại từ đầu nhé.");
  }
  if (preferred !== "epidemic-sound" && page?.provider !== "epidemic-sound" && youtubeAvailable()) {
    try {
      const result = await searchYouTube(term, page?.provider === "youtube" ? page.token : undefined);
      return { items: result.items, provider: "youtube" as const, nextCursor: result.nextToken ? encode({ provider: "youtube", token: result.nextToken, term }) : null };
    } catch (error) { if (!(error instanceof YouTubeUnavailable)) throw error; if (preferred === "youtube") fail(503, "YouTube chưa sẵn sàng. Bạn thử lại hoặc chọn kho Epidemic Sound nhé."); }
  }
  if (preferred === "youtube") return fail(503, "YouTube chưa sẵn sàng. Bạn thử lại hoặc chọn kho Epidemic Sound nhé.");
  // A cursor stays on the fallback catalogue after the first failed YouTube
  // page; its offsets must never be interpreted as YouTube page tokens.
  if (epidemic.musicAvailability().enabled) {
    const result = await epidemic.searchMusic(term, page?.provider === "epidemic-sound" ? page.offset : 0, userId);
    return { ...result, provider: "epidemic-sound" as const, nextCursor: result.nextCursor !== null && result.nextCursor <= 1000 ? encode({ provider: "epidemic-sound", offset: result.nextCursor, term }) : null };
  }
  return fail(503, "Chưa kết nối được thư viện nhạc. Bạn thử lại sau nhé.");
}
export async function getMusicTrack(id: string, userId: string, provider: z.infer<typeof musicProviderSchema> = "epidemic-sound", startSeconds = 0, fresh = true) {
  trackIdSchema.parse(id);
  if (provider === "epidemic-sound") return withMusicStart(await epidemic.getMusicTrack(id, userId), startSeconds);
  try { return withMusicStart(await getYouTubeTrack(id, fresh), startSeconds); }
  catch (error) { if (error instanceof YouTubeUnavailable) return fail(503, error.message); throw error; }
}
export async function getMusicStream(id: string, userId: string, provider: z.infer<typeof musicProviderSchema> = "epidemic-sound") {
  if (provider === "youtube") {
    z.string().regex(/^[a-zA-Z0-9_-]{11}$/).parse(id);
    try {
      const track = await getMusicTrack(id, userId, provider, 0, false);
      return { provider, videoId: track.trackId, title: track.title, artists: track.artists, cover: track.cover, durationSeconds: track.durationSeconds, metadataUpdatedAt: track.metadataUpdatedAt };
    } catch (error) {
      // An existing embed does not require a Data API key. Keep the user's
      // chosen video playable when only search/metadata quota is unavailable.
      if (!(error instanceof HTTPException) || error.status !== 503) throw error;
      return { provider, videoId: id, title: "Video YouTube", artists: [], cover: "", durationSeconds: undefined, metadataUpdatedAt: undefined };
    }
  }
  return { provider, ...await epidemic.getMusicStream(id, userId) };
}
