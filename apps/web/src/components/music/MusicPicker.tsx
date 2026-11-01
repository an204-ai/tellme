"use client";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Check, Clock3, Music2, Pause, Play, Search, X } from "lucide-react";
import type { StoryMusic } from "@/lib/types";
import { request } from "@/lib/api-repository";
import { Modal } from "@/components/ui/Modal";
import { Button, SearchInput } from "@/components/ui/Primitives";
import { MusicPlayer, pauseMusic } from "./MusicPlayer";
import { MusicLoader } from "./MusicLoader";
import { closeYouTube, openYouTube, useYouTubePlayback } from "./youtube-playback";
import { formatMusicTime, parseMusicTime } from "./music-time";

type MusicSource = StoryMusic["provider"];
type MusicConfig = { enabled: boolean; reason: string | null; provider: MusicSource | null; providers: Record<MusicSource, { enabled: boolean; reason: string | null }> };

export function MusicPicker({ selected, onSelect, onClose, onRemove }: {
  selected?: StoryMusic;
  onSelect: (track: StoryMusic) => void | Promise<void>;
  onClose: () => void;
  onRemove?: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ id: string; state: "loading" | "playing" } | null>(null);
  const [draft, setDraft] = useState<StoryMusic | undefined>(selected);
  const [startText, setStartText] = useState(formatMusicTime(selected?.startSeconds || 0));
  const [source, setSource] = useState<MusicSource>(selected?.provider || "youtube");
  const sourceInitialized = useRef(false);
  const unavailableIds = useYouTubePlayback((state) => state.unavailableIds);
  const activeVideo = useYouTubePlayback((state) => state.active);
  const videoState = useYouTubePlayback((state) => state.status);
  const pendingVideo = useYouTubePlayback((state) => state.pending);
  const list = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const config = useQuery({ queryKey: ["tellme", "music", "config"], queryFn: () => request<MusicConfig>("/music/config"), staleTime: 0, refetchOnWindowFocus: false, retry: false });
  useEffect(() => {
    if (!config.data || sourceInitialized.current) return;
    sourceInitialized.current = true;
    if (!selected && config.data.provider) setSource(config.data.provider);
  }, [config.data, selected]);
  const sourceConfig = config.data?.providers[source];
  const tracks = useInfiniteQuery({
    queryKey: ["tellme", "music", "search", source, term],
    queryFn: ({ pageParam, signal }) => request<{ items: StoryMusic[]; nextCursor: string | null; provider: "youtube" | "epidemic-sound" }>(`/music/tracks?q=${encodeURIComponent(term)}&cursor=${encodeURIComponent(pageParam)}&provider=${source}`, { signal }),
    initialPageParam: "0", getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: sourceConfig?.enabled === true && term === search.trim(),
    placeholderData: (previous) => previous?.pages[0]?.provider === source ? previous : undefined,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: 50 * 60000,
    staleTime: 60000, gcTime: 5 * 60000, retry: false,
  });
  const unavailable = config.isError || config.data?.enabled === false || sourceConfig?.enabled === false;
  const searching = config.isPending || (!unavailable && (tracks.isPending || tracks.isPlaceholderData || term !== search.trim()));
  const items = [...new Map(tracks.data?.pages.flatMap((page) => page.items).map((track) => [`${track.provider}:${track.trackId}`, track]) || []).values()].filter((track) => track.provider !== "youtube" || !unavailableIds.includes(track.trackId));
  const startSeconds = parseMusicTime(startText);
  const maxStart = Math.min(86400, draft?.durationSeconds ? Math.max(0, draft.durationSeconds - 1) : 86400);
  const validStart = startSeconds !== null && startSeconds <= maxStart;
  const endpoint = (track: StoryMusic, start = 0) => `/music/tracks/${encodeURIComponent(track.trackId)}/stream?provider=${track.provider}&startSeconds=${start}`;
  const draftEndpoint = draft ? endpoint(draft, validStart ? startSeconds! : 0) : "";
  const draftPlaying = activeVideo?.endpoint === draftEndpoint && videoState === "playing";
  const draftLoading = (activeVideo?.endpoint === draftEndpoint || pendingVideo === draftEndpoint) && videoState === "loading";
  useEffect(() => {
    const dialog = list.current?.closest("dialog");
    return () => { if (useYouTubePlayback.getState().active?.mount === dialog) closeYouTube(); };
  }, []);
  useEffect(() => {
    if (draft?.provider === "youtube" && unavailableIds.includes(draft.trackId)) {
      setDraft(undefined); setError("Video này không phát được khi nhúng, mình đã bỏ khỏi danh sách. Bạn chọn bài khác nhé.");
    }
  }, [unavailableIds, draft]);
  useEffect(() => { list.current?.scrollTo({ top: 0, behavior: "instant" }); }, [term, source]);
  useEffect(() => { if (searching) pauseMusic(); }, [searching]);
  useEffect(() => {
    const root = list.current, target = sentinel.current;
    if (!root || !target || unavailable || searching || busy || !tracks.hasNextPage || tracks.isFetching || tracks.isError) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || loadingMore.current) return;
      loadingMore.current = true;
      observer.disconnect();
      void tracks.fetchNextPage({ cancelRefetch: false }).finally(() => { loadingMore.current = false; });
    }, { root, rootMargin: "0px 0px 120px 0px", threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [unavailable, searching, busy, items.length, tracks.hasNextPage, tracks.isFetching, tracks.isError, tracks.fetchNextPage]);
  const provider = source;
  const choose = async (track?: StoryMusic) => {
    setBusy(track ? `${track.provider}:${track.trackId}` : "remove"); setError(""); pauseMusic();
    try { if (track) await onSelect(track); else await onRemove?.(); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa lưu được nhạc. Bạn thử lại nhé."); setBusy(null); }
  };
  const beginChoice = (track: StoryMusic) => {
    const start = selected?.trackId === track.trackId && selected.provider === track.provider ? selected.startSeconds || 0 : 0;
    setDraft(track); setStartText(formatMusicTime(start)); setError("");
    pauseMusic();
  };
  return <Modal title="Nhạc cho một ngày" onClose={() => { if (!busy) onClose(); }} className="music-picker-dialog">
    <div className="music-picker-body">
      <p className="music-picker-note">Một giai điệu cho cả ngày đi làm.</p>
      <div className="music-sources" role="group" aria-label="Chọn kho nhạc">
        {(["youtube", "epidemic-sound"] as const).map((value) => <button type="button" key={value} aria-pressed={source === value} disabled={!!busy} onClick={() => { if (source !== value) { pauseMusic(); closeYouTube(); setSource(value); setDraft(undefined); setError(""); } }}>
          {value === "youtube" ? <Play size={16} /> : <Music2 size={16} />}<span>{value === "youtube" ? "YouTube" : "Epidemic Sound"}</span>{source === value && <Check size={14} />}
        </button>)}
      </div>
      <p className="music-source-note">{source === "youtube" ? "Nhạc từ các kênh YouTube, phát kèm video. Một số bài có giới hạn khu vực." : "Kho nhạc sáng tạo theo tâm trạng, nghe trực tiếp trong chuỗi. Hiện dùng thử."}</p>
      <SearchInput aria-label="Tìm bài hát, nghệ sĩ hoặc tâm trạng" placeholder="Tên bài, nghệ sĩ, tâm trạng…" value={search} maxLength={120} disabled={!!busy || unavailable} onChange={(event) => setSearch(event.target.value)} />
      {selected && !draft && <div className="music-current"><Music2 size={17} /><span><small>Đang chọn · Từ {formatMusicTime(selected.startSeconds || 0)}</small><strong>{selected.title}</strong></span>{onRemove && <button type="button" className="music-text-button" disabled={!!busy} onClick={() => void choose()}><X size={15} /> Bỏ nhạc</button>}</div>}
      <div className="music-library">
        <div ref={list} className="music-track-list" role="region" tabIndex={0} aria-label="Thư viện nhạc" aria-busy={searching || tracks.isFetchingNextPage}>
          {unavailable ? <div className="music-empty"><Music2 size={27} /><strong>Kho nhạc này chưa sẵn sàng</strong><p>{sourceConfig?.reason === "prototype-only" ? "Epidemic Sound đang dùng thử, chưa mở trên bản công khai. Bạn chọn YouTube nhé." : "Bạn có thể chọn kho nhạc còn lại, hoặc thêm nhạc sau."}</p><Button variant="secondary" onClick={() => void config.refetch()}>Thử kết nối lại</Button></div> : <>
            <div className="music-track-results" data-searching={searching} inert={searching || !!busy}>
              {items.map((track) => <div className="music-track" key={`${track.provider}:${track.trackId}`} data-selected={track.trackId === selected?.trackId && track.provider === selected?.provider} data-preview={preview?.id === `${track.provider}:${track.trackId}` ? preview.state : undefined}>
                <span className="music-cover">{track.cover ? <img src={track.cover} alt="" loading="lazy" /> : <Music2 size={20} />}<span className="music-equalizer" aria-hidden="true"><i /><i /><i /><i /></span></span>
                <span className="music-track-copy"><strong>{track.title}</strong><span>{track.artists.join(", ") || (track.provider === "youtube" ? "YouTube" : "Epidemic Sound")}{track.provider === "youtube" && " · YouTube"}</span></span>
                <MusicPlayer provider={track.provider} endpoint={endpoint(track, draft?.trackId === track.trackId && draft.provider === track.provider && validStart ? startSeconds! : 0)} title={track.title} onError={setError} onPlaybackChange={(state) => setPreview((current) => state === "idle" ? current?.id === `${track.provider}:${track.trackId}` ? null : current : { id: `${track.provider}:${track.trackId}`, state })} />
                <button type="button" className="music-select" disabled={!!busy} aria-label={`Chọn ${track.title}`} onClick={() => beginChoice(track)}>{busy === `${track.provider}:${track.trackId}` ? "Đang lưu…" : draft?.trackId === track.trackId && draft.provider === track.provider ? <Check size={18} /> : "Chọn"}</button>
              </div>)}
            </div>
            {!searching && !items.length && !tracks.isError && <div className="music-empty"><Search size={25} /><p>Chưa tìm thấy bài phù hợp. Thử tên nghệ sĩ hoặc “chill” nhé.</p></div>}
            {!searching && tracks.isError && <div className="music-empty" role="alert"><p>{tracks.error.message}</p><Button variant="secondary" onClick={() => void (tracks.isFetchNextPageError ? tracks.fetchNextPage() : tracks.refetch())}>Thử lại</Button></div>}
            <div ref={sentinel} className="music-load-more">{tracks.isFetchingNextPage && <MusicLoader compact label="Đang tìm thêm nhạc…" />}</div>
          </>}
        </div>
        {searching && <div className="music-search-loading"><MusicLoader label={config.isPending ? "Đang mở thư viện nhạc…" : "Đang tìm giai điệu…"} /></div>}
      </div>
      {draft && <section className="music-start-editor" aria-label="Chọn đoạn bắt đầu">
        <div className="music-start-track"><strong>{draft.title}</strong>{selected && onRemove && <button type="button" className="music-text-button" disabled={!!busy} onClick={() => void choose()}><X size={14} /> Bỏ nhạc</button>}</div>
        <div className="music-start-heading"><span><Clock3 size={16} /> Bắt đầu từ</span><label><span className="sr-only">Mốc bắt đầu, phút:giây</span><input aria-invalid={!validStart} value={startText} maxLength={10} inputMode="text" placeholder="00:30" disabled={!!busy} onChange={(event) => setStartText(event.target.value)} onBlur={() => { if (validStart) setStartText(formatMusicTime(startSeconds!)); }} /></label></div>
        <input type="range" min={0} max={draft.durationSeconds ? maxStart : Math.max(600, startSeconds || 0)} step={1} value={Math.min(startSeconds || 0, maxStart)} aria-label="Kéo chọn đoạn bắt đầu" disabled={!!busy} onChange={(event) => setStartText(formatMusicTime(Number(event.target.value)))} />
        {!validStart ? <p role="alert">Nhập phút:giây, trước {formatMusicTime(maxStart + (draft.durationSeconds ? 1 : 0))} nhé.</p> : <p>Cả chuỗi sẽ bắt đầu từ {formatMusicTime(startSeconds!)}.</p>}
        <div className="music-start-actions">
          {draft.provider === "youtube" ? <button type="button" className="music-text-button" disabled={!!busy || !validStart} onClick={(event) => { if (draftPlaying || draftLoading) pauseMusic(); else void openYouTube(draftEndpoint, event.currentTarget.closest("dialog") || document.body); }}>{draftLoading ? <MusicLoader compact /> : draftPlaying ? <Pause size={16} /> : <Play size={16} />}{draftPlaying ? "Tạm dừng" : "Nghe đoạn này"}</button> : <MusicPlayer provider={draft.provider} endpoint={draftEndpoint} title={draft.title} onError={setError} />}
          <Button disabled={!!busy || !validStart} onClick={() => void choose({ ...draft, startSeconds: startSeconds! })}>{busy ? "Đang lưu…" : "Dùng đoạn này"}</Button>
        </div>
      </section>}
      <div className="music-picker-feedback">{error && <p role="alert" className="field-error">{error}</p>}</div>
      <a className="music-attribution" href={provider === "youtube" ? "https://www.youtube.com/" : "https://www.epidemicsound.com/"} target="_blank" rel="noreferrer">{provider === "youtube" ? "Video từ YouTube · Tên kênh hiển thị dưới tiêu đề" : "Music by Epidemic Sound"}</a>
    </div>
  </Modal>;
}
