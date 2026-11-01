import { createHmac } from "node:crypto";
import { z } from "zod";
import { config } from "../../backend/config.js";
import { fail } from "../../backend/security.js";
import type { StoryMusic } from "../../backend/models.js";

export const trackIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/, "Bài nhạc không hợp lệ.");
// Developer Free permits prototyping, not a public launch. This integration uses
// the official preview stream; it does not download/export licensed masters.
export function musicAvailability() {
  return {
    enabled: !!config.EPIDEMIC_SOUND_API_KEY && config.NODE_ENV !== "production",
    reason: config.NODE_ENV === "production" ? "prototype-only" : !config.EPIDEMIC_SOUND_API_KEY ? "not-configured" : null,
  };
}
const upstreamTrack = z.object({
  id: trackIdSchema, title: z.string().min(1).max(500),
  mainArtists: z.array(z.string().max(300)).default([]),
  images: z.object({ S: z.string().optional(), default: z.string().optional() }).optional(),
});
function musicDTO(track: z.infer<typeof upstreamTrack>): StoryMusic {
  const cover = track.images?.S || track.images?.default || "";
  return { provider: "epidemic-sound", trackId: track.id, title: track.title, artists: track.mainArtists, cover: cover.startsWith("https://") ? cover : "" };
}
function ensureMusicAvailable() {
  const availability = musicAvailability();
  if (!availability.enabled) fail(503, availability.reason === "prototype-only"
    ? "Thư viện nhạc đang ở chế độ thử nghiệm, chưa mở trên bản công khai."
    : "Thư viện nhạc chưa được kết nối. Bạn có thể đăng ảnh trước và thêm nhạc sau.");
}
async function epidemic<T>(path: string, userId: string): Promise<T> {
  ensureMusicAvailable();
  const partnerId = createHmac("sha256", config.AUTH_CODE_SECRET || config.EPIDEMIC_SOUND_API_KEY).update(`tellme:${userId}`).digest("hex");
  let response: Response;
  try {
    response = await fetch(`https://api.epidemicsound.com/v0/${path}`, {
      headers: { Authorization: `Bearer ${config.EPIDEMIC_SOUND_API_KEY}`, "x-partner-user-id": partnerId, Accept: "application/json" },
      signal: AbortSignal.timeout(10000), redirect: "error",
    });
  } catch { return fail(503, "Thư viện nhạc đang kết nối chậm. Thử lại sau một chút nhé."); }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) fail(503, "Chưa truy cập được thư viện nhạc. Kiểm tra API key và quyền truy cập Epidemic Sound nhé.");
    if (response.status === 404) fail(404, "Bài nhạc này không còn trong thư viện. Bạn chọn bài khác nhé.");
    if (response.status === 429) fail(503, "Thư viện nhạc đang bận. Chờ một chút rồi thử lại nhé.");
    fail(503, "Thư viện nhạc chưa sẵn sàng. Bạn thử lại sau nhé.");
  }
  return await response.json() as T;
}
// Bounded five-minute metadata cache; no audio/signed URLs or browsed catalogue
// persisted in MongoDB. Only the explicitly selected track belongs to a story.
const selectedCache = new Map<string, { expires: number; track: StoryMusic }>();
export async function getMusicTrack(id: string, userId: string): Promise<StoryMusic> {
  trackIdSchema.parse(id);
  ensureMusicAvailable();
  const key = `${userId}:${id}`, cached = selectedCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.track;
  const raw = await epidemic<unknown>(`tracks/metadata?trackId=${encodeURIComponent(id)}`, userId);
  const track = z.array(upstreamTrack).parse(raw).find((entry) => entry.id === id);
  if (!track) fail(404, "Không tìm thấy bài nhạc này. Bạn chọn bài khác nhé.");
  const dto = musicDTO(track);
  if (selectedCache.size >= 500) selectedCache.delete(selectedCache.keys().next().value!);
  selectedCache.set(key, { track: dto, expires: Date.now() + 5 * 60000 });
  return dto;
}
export async function searchMusic(term: string, offset: number, userId: string) {
  const params = new URLSearchParams({ limit: "12", offset: String(offset), ...(term ? { term } : { sort: "Popularity", order: "desc" }) });
  const raw = z.object({ tracks: z.array(upstreamTrack), links: z.object({ next: z.string().nullish() }).optional() }).parse(
    await epidemic<unknown>(`tracks/search?${params}`, userId),
  );
  return { items: raw.tracks.map(musicDTO), nextCursor: raw.links?.next ? offset + 12 : null };
}
export async function getMusicStream(id: string, userId: string) {
  trackIdSchema.parse(id);
  const stream = z.object({ url: z.string().url(), expires: z.string().datetime({ offset: true }) }).parse(
    await epidemic<unknown>(`tracks/${encodeURIComponent(id)}/stream`, userId),
  );
  if (!stream.url.startsWith("https://")) fail(503, "Luồng nhạc chưa khả dụng.");
  // Preview calls are metered automatically. Do not double-report them or
  // consume the Free download allowance simply for listening.
  return stream;
}
