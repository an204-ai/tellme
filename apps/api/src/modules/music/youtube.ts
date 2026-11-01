import { z } from "zod";
import { config } from "../../backend/config.js";
import { fail } from "../../backend/security.js";
import type { StoryMusic } from "../../backend/models.js";

const videoId = z.string().regex(/^[a-zA-Z0-9_-]{11}$/);
const thumbnail = z.object({ url: z.string().url() });
const snippet = z.object({
  title: z.string().max(500), channelTitle: z.string().max(300),
  liveBroadcastContent: z.string().optional(),
  thumbnails: z.object({ medium: thumbnail.optional(), default: thumbnail.optional() }),
});
const video = z.object({
  id: videoId, snippet,
  status: z.object({ embeddable: z.boolean(), privacyStatus: z.string(), uploadStatus: z.string() }),
  contentDetails: z.object({
    duration: z.string(),
    contentRating: z.object({ ytRating: z.string().optional() }).optional(),
    regionRestriction: z.object({ allowed: z.array(z.string()).optional(), blocked: z.array(z.string()).optional() }).optional(),
  }),
});
// Tellme currently serves Vietnam; use the same audience in search and checks.
const region = "VN";
function durationSeconds(value: string) {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
  return match ? Math.floor(Number(match[1] || 0) * 86400 + Number(match[2] || 0) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0)) : 0;
}
function playable(item: z.infer<typeof video>) {
  const rules = item.contentDetails.regionRestriction;
  return item.status.embeddable && item.status.privacyStatus === "public" && item.status.uploadStatus === "processed"
    && (!item.snippet.liveBroadcastContent || item.snippet.liveBroadcastContent === "none")
    && item.contentDetails.contentRating?.ytRating !== "ytAgeRestricted"
    && (!rules?.allowed || rules.allowed.includes(region)) && !rules?.blocked?.includes(region)
    && durationSeconds(item.contentDetails.duration) > 0;
}
export class YouTubeUnavailable extends Error {}
let retryAt = 0;
export const youtubeAvailable = () => !!config.YOUTUBE_API_KEY && Date.now() >= retryAt;

async function youtube(path: string, params: URLSearchParams) {
  if (!youtubeAvailable()) throw new YouTubeUnavailable("YouTube chưa sẵn sàng.");
  let response: Response;
  try {
    response = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${params}`, {
      headers: { "X-Goog-Api-Key": config.YOUTUBE_API_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(10000), redirect: "error",
    });
  } catch { throw new YouTubeUnavailable("YouTube đang kết nối chậm."); }
  if (!response.ok) {
    // Do not expose Google errors or the API key. A brief circuit avoids burning
    // quota on every keystroke; a later search will try YouTube again.
    const problem = response.status === 400 ? await response.json().catch(() => null) : null;
    const invalidKey = /API_KEY_INVALID|keyInvalid|API key not valid/i.test(JSON.stringify(problem));
    if ([401, 403, 429].includes(response.status) || invalidKey) retryAt = Date.now() + 5 * 60000;
    throw new YouTubeUnavailable("YouTube chưa truy cập được. Thử lại sau nhé.");
  }
  try { return await response.json() as unknown; }
  catch { throw new YouTubeUnavailable("Dữ liệu YouTube chưa sẵn sàng."); }
}
function parseUpstream<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new YouTubeUnavailable("Dữ liệu YouTube chưa sẵn sàng.");
  return parsed.data;
}
function dto(item: z.infer<typeof video>): StoryMusic {
  return {
    provider: "youtube", trackId: item.id, title: item.snippet.title,
    // YouTube supplies a channel name, not a verified performer credit.
    artists: [item.snippet.channelTitle],
    cover: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || "",
    metadataUpdatedAt: new Date().toISOString(),
    durationSeconds: durationSeconds(item.contentDetails.duration),
  };
}
const cache = new Map<string, { expires: number; value: StoryMusic }>();
function remember(track: StoryMusic) {
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(track.trackId, { value: track, expires: Date.now() + 5 * 60000 });
  return track;
}
export async function getYouTubeTrack(id: string, fresh = false): Promise<StoryMusic> {
  videoId.parse(id);
  const saved = cache.get(id);
  if (!fresh && saved && saved.expires > Date.now()) return saved.value;
  const raw = parseUpstream(z.object({ items: z.array(video) }), await youtube("videos", new URLSearchParams({ part: "snippet,status,contentDetails", id })));
  const found = raw.items.find((item) => item.id === id && playable(item));
  if (!found) { cache.delete(id); fail(404, "Video này không cho phép nhúng hoặc không phát được tại Việt Nam. Bạn chọn bài khác nhé."); }
  return remember(dto(found));
}
type SearchPage = { items: StoryMusic[]; nextToken: string | null };
const searches = new Map<string, { expires: number; value: SearchPage }>();
const pending = new Map<string, Promise<SearchPage>>();
export async function searchYouTube(term: string, pageToken?: string): Promise<SearchPage> {
  const key = JSON.stringify([term, pageToken || ""]), cached = searches.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    const params = new URLSearchParams({ part: "snippet", type: "video", videoCategoryId: "10", videoEmbeddable: "true", videoSyndicated: "true", safeSearch: "strict", regionCode: region, maxResults: "12", relevanceLanguage: "vi", q: term || "nhạc chill đi làm", ...(pageToken ? { pageToken } : {}) });
    const result = parseUpstream(z.object({ items: z.array(z.object({ id: z.object({ videoId }), snippet })), nextPageToken: z.string().optional() }), await youtube("search", params));
    const ids = result.items.map((item) => item.id.videoId);
    const details = ids.length ? parseUpstream(z.object({ items: z.array(video) }), await youtube("videos", new URLSearchParams({ part: "snippet,status,contentDetails", id: ids.join(",") }))).items : [];
    const available = new Map(details.filter(playable).map((item) => [item.id, item]));
    const value = { items: ids.flatMap((id) => available.has(id) ? [remember(dto(available.get(id)!))] : []), nextToken: result.nextPageToken || null };
    if (searches.size >= 100) searches.delete(searches.keys().next().value!);
    searches.set(key, { value, expires: Date.now() + 5 * 60000 });
    return value;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
