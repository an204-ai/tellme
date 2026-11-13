import { z } from "zod";
import { fail } from "../../backend/security.js";
import * as epidemic from "./epidemic.js";

export const musicProviderSchema = z.literal("epidemic-sound");
export const trackIdSchema = epidemic.trackIdSchema;
export const musicStartSchema = z.number().int().min(0).max(86400).default(0);
export function withMusicStart<T extends { durationSeconds?: number }>(track: T, startSeconds: number) {
  musicStartSchema.parse(startSeconds);
  if (track.durationSeconds && startSeconds >= track.durationSeconds) fail(400, "Mốc bắt đầu cần nằm trước khi bài nhạc kết thúc.");
  return { ...track, startSeconds };
}
export function musicAvailability() {
  const availability = epidemic.musicAvailability();
  return { ...availability, provider: availability.enabled ? "epidemic-sound" as const : null };
}
const cursorSchema = z.object({ offset: z.number().int().min(0).max(1000), term: z.string().max(120) });
export async function searchMusic(term: string, cursor: string, userId: string, preferred?: "epidemic-sound") {
  if (preferred) musicProviderSchema.parse(preferred);
  let offset = 0;
  if (cursor !== "0") {
    try {
      const page = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
      if (page.term !== term) fail(400, "Từ khóa đã đổi. Bạn tìm lại từ đầu nhé.");
      offset = page.offset;
    } catch { fail(400, "Trang nhạc không hợp lệ. Bạn tìm lại nhé."); }
  }
  const result = await epidemic.searchMusic(term, offset, userId);
  return { items: result.items, provider: "epidemic-sound" as const, nextCursor: result.nextCursor !== null && result.nextCursor <= 1000 ? Buffer.from(JSON.stringify({ offset: result.nextCursor, term })).toString("base64url") : null };
}
export async function getMusicTrack(id: string, userId: string, provider: "epidemic-sound" = "epidemic-sound", startSeconds = 0) {
  musicProviderSchema.parse(provider);
  return withMusicStart(await epidemic.getMusicTrack(id, userId), startSeconds);
}
export async function getMusicStream(id: string, userId: string, provider: "epidemic-sound" = "epidemic-sound") {
  musicProviderSchema.parse(provider);
  return { provider, ...await epidemic.getMusicStream(id, userId) };
}
