"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Music2, Pencil } from "lucide-react";
import { apiRepository, request } from "@/lib/api-repository";
import type { DayStory, StoryMusic as Track } from "@/lib/types";
import { communityKey, useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Primitives";
import { MusicPlayer } from "./MusicPlayer";
import { MusicPicker } from "./MusicPicker";
import { YouTubePlayback } from "./YouTubePlayback";

export function StoryMusic({ story }: { story: DayStory }) {
  const edit = useAppStore((s) => s.editStoryMusic);
  const [playback, setPlayback] = useState<"idle" | "loading" | "playing">("idle");
  if (!story.music) return story.userId === "me" ? <button type="button" className="story-music-add" onClick={() => edit(story.id)}><Music2 size={16} />Thêm nhạc của ngày</button> : null;
  const artists = story.music.artists.join(", ") || (story.music.provider === "youtube" ? "YouTube" : "Epidemic Sound");
  return <div className="story-music story-header-music" data-playing={playback === "playing"} aria-label="Nhạc của ngày">
    <MusicPlayer provider={story.music.provider} key={`${story.music.provider}:${story.music.trackId}:${story.music.startSeconds || 0}`} endpoint={`/stories/${story.id}/music/stream`} title={story.music.title} onPlaybackChange={setPlayback} playingIcon={<span className="story-music-waves" aria-hidden="true"><i /><i /><i /><i /></span>} />
    <span className="story-music-flip" title={`${story.music.title} — ${artists}`}>
      <span className="sr-only">{story.music.title} — {artists}</span>
      <span className="story-music-prism" aria-hidden="true">
        <span className="story-music-face">{story.music.title}</span>
        <span className="story-music-face">{artists}</span>
        <span className="story-music-face">{story.music.title}</span>
        <span className="story-music-face">{artists}</span>
      </span>
    </span>
    {story.userId === "me" && <button type="button" className="music-edit" aria-label="Đổi nhạc của ngày" onClick={() => edit(story.id)}><Pencil size={16} /></button>}
  </div>;
}
function StoryMusicEditor({ storyId, close }: { storyId: string; close: () => void }) {
  const query = useQueryClient();
  const notify = useAppStore((s) => s.notify);
  const story = useQuery({ queryKey: ["tellme", "story", storyId], queryFn: () => apiRepository.getStory(storyId), staleTime: 0, retry: false });
  const save = async (track?: Track) => {
    await request(`/stories/${storyId}/music`, { method: "PUT", body: JSON.stringify({ trackId: track?.trackId || null, provider: track?.provider, startSeconds: track?.startSeconds || 0 }) });
    const updated = await apiRepository.getStory(storyId);
    query.setQueryData(["tellme", "story", storyId], updated);
    await Promise.all([communityKey, ["tellme", "stories"], ["tellme", "person"], ["tellme", "archive"]].map((queryKey) => query.invalidateQueries({ queryKey })));
    notify(track ? "Đã chọn nhạc cho cả chuỗi ngày." : "Đã bỏ nhạc khỏi chuỗi ngày.");
  };
  if (story.isPending || story.isError || story.data?.userId !== "me") return <Modal title="Nhạc cho một ngày" onClose={close}><div className="dialog-body music-empty">{story.isPending ? <p role="status">Đang mở chuỗi của bạn…</p> : <><p role="alert">{story.error?.message || "Chỉ chủ nhân của chuỗi mới có thể thay đổi bài nhạc."}</p>{story.isError && <Button onClick={() => void story.refetch()}>Thử lại</Button>}</>}</div></Modal>;
  return <MusicPicker selected={story.data.music} onClose={close} onSelect={(track) => save(track)} onRemove={story.data.music ? () => save() : undefined} />;
}
export function MusicOverlays() {
  const { data } = useCommunity();
  const { musicStoryId, editStoryMusic, musicInvitationStoryId, inviteMusic } = useAppStore();
  const authenticated = data?.authenticated === true;
  useEffect(() => { if (!authenticated) { editStoryMusic(null); inviteMusic(null); } }, [authenticated, editStoryMusic, inviteMusic]);
  return <>
    <YouTubePlayback />
    {authenticated && musicInvitationStoryId && !musicStoryId && <aside className="music-invitation" aria-label="Thêm nhạc cho chuỗi hôm nay">
      <Music2 size={22} aria-hidden="true" /><div><strong>Ngày hôm nay nghe như thế nào?</strong><p>Đã lưu khoảnh khắc. Thêm một bài nhạc cho cả chuỗi nhé?</p></div>
      <button className="music-text-button" onClick={() => { editStoryMusic(musicInvitationStoryId); inviteMusic(null); }}>Chọn nhạc</button>
      <button className="music-skip" onClick={() => inviteMusic(null)}>Bỏ qua</button>
    </aside>}
    {authenticated && musicStoryId && <StoryMusicEditor key={musicStoryId} storyId={musicStoryId} close={() => editStoryMusic(null)} />}
  </>;
}
