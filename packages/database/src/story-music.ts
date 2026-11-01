import { stories } from "./database.js";
import type { StoryMusic } from "./models.js";

const metadataLifetime = 29 * 86400000;
/** Expire API metadata; the user's selected provider/video ID remains theirs. */
export function visibleStoryMusic(music: StoryMusic): StoryMusic {
  if (music.provider !== "youtube" || (music.metadataUpdatedAt && Date.now() - Date.parse(music.metadataUpdatedAt) < metadataLifetime)) return music;
  return { provider: "youtube", trackId: music.trackId, title: "Video YouTube", artists: [], cover: "", startSeconds: music.startSeconds || 0 };
}
export async function expireYouTubeMetadata() {
  await stories.updateMany({ "music.provider": "youtube", "music.metadataUpdatedAt": { $lt: new Date(Date.now() - metadataLifetime).toISOString() } }, {
    $set: { "music.title": "Video YouTube", "music.artists": [], "music.cover": "" },
    $unset: { "music.metadataUpdatedAt": "", "music.durationSeconds": "" },
  });
}
