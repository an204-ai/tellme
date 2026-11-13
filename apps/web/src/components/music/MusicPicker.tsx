"use client";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Check, Clock3, Music2, Search, X } from "lucide-react";
import type { StoryMusic } from "@/lib/types";
import { request } from "@/lib/api-repository";
import { Modal } from "@/components/ui/Modal";
import { Button, SearchInput } from "@/components/ui/Primitives";
import { MusicPlayer, pauseMusic } from "./MusicPlayer";
import { MusicLoader } from "./MusicLoader";
import { formatMusicTime, parseMusicTime } from "./music-time";

type MusicConfig = { enabled: boolean; reason: string | null };
export function MusicPicker({ selected, onSelect, onClose, onRemove }: {
  selected?: StoryMusic; onSelect: (track: StoryMusic) => void | Promise<void>; onClose: () => void; onRemove?: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState(""), [term, setTerm] = useState("");
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState("");
  const [draft, setDraft] = useState(selected), [startText, setStartText] = useState(formatMusicTime(selected?.startSeconds || 0));
  const list = useRef<HTMLDivElement>(null), sentinel = useRef<HTMLDivElement>(null);
  const config = useQuery({ queryKey: ["tellme", "music", "config"], queryFn: () => request<MusicConfig>("/music/config"), staleTime: 0, refetchOnWindowFocus: false, retry: false });
  useEffect(() => { const t = setTimeout(() => setTerm(search.trim()), 350); return () => clearTimeout(t); }, [search]);
  const tracks = useInfiniteQuery({ queryKey: ["tellme", "music", "search", term], initialPageParam: "0",
    queryFn: ({ pageParam, signal }) => request<{ items: StoryMusic[]; nextCursor: string | null }>(`/music/tracks?q=${encodeURIComponent(term)}&cursor=${encodeURIComponent(pageParam)}`, { signal }),
    getNextPageParam: (page) => page.nextCursor ?? undefined, enabled: config.data?.enabled === true && term === search.trim(), staleTime: 60000, refetchOnWindowFocus: false, retry: false,
  });
  const items = [...new Map(tracks.data?.pages.flatMap(p => p.items).map(track => [track.trackId, track]) || []).values()];
  const start = parseMusicTime(startText), maxStart = Math.min(86400, draft?.durationSeconds ? Math.max(0, draft.durationSeconds - 1) : 86400);
  const valid = start !== null && start <= maxStart;
  const endpoint = (track: StoryMusic) => `/music/tracks/${encodeURIComponent(track.trackId)}/stream?startSeconds=${valid ? start : 0}`;
  useEffect(() => { list.current?.scrollTo({ top: 0, behavior: "instant" }); pauseMusic(); }, [term]);
  useEffect(() => {
    if (!list.current || !sentinel.current || !tracks.hasNextPage || tracks.isFetching || tracks.isError) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); void tracks.fetchNextPage(); } }, { root: list.current, rootMargin: "0px 0px 120px 0px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [items.length, tracks.hasNextPage, tracks.isFetching, tracks.isError, tracks.fetchNextPage]);
  const choose = async (track?: StoryMusic) => {
    setBusy(track?.trackId || "remove"); setError(""); pauseMusic();
    try { if (track) await onSelect(track); else await onRemove?.(); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa lưu được nhạc. Bạn thử lại nhé."); setBusy(null); }
  };
  return <Modal title="Nhạc cho một ngày" onClose={() => { if (!busy) onClose(); }} className="music-picker-dialog">
    {config.data?.enabled === false ? <div className="dialog-body music-coming-soon"><Music2 size={30} /><h3>Giai điệu đang lên dây</h3><p>Tellme đang chuẩn bị nhạc cho những ngày của bạn. Cứ giữ lại khoảnh khắc trước nhé.</p></div>
      : config.isError ? <div className="dialog-body music-empty"><p>Chưa mở được thư viện nhạc.</p><Button onClick={() => void config.refetch()}>Thử lại</Button></div>
      : <div className="music-picker-body"><SearchInput aria-label="Tìm nhạc" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên bài hát hoặc nghệ sĩ…" />
        <div className="music-library"><div className="music-track-list" ref={list}>
          {items.map(track => <div className="music-track" data-selected={draft?.trackId === track.trackId} key={track.trackId}>
            {track.cover ? <img className="music-cover" src={track.cover} alt="" /> : <span className="music-cover"><Music2 size={20} /></span>}
            <span className="music-track-copy"><strong>{track.title}</strong><span>{track.artists.join(", ") || "Epidemic Sound"}</span></span>
            <MusicPlayer endpoint={endpoint(track)} title={track.title} onError={setError} />
            <button className="music-select" disabled={!!busy} aria-label={`Chọn ${track.title}`} onClick={() => { pauseMusic(); setDraft(track); setStartText(formatMusicTime(selected?.trackId === track.trackId ? selected.startSeconds || 0 : 0)); }}>{draft?.trackId === track.trackId ? <Check size={18} /> : "Chọn"}</button>
          </div>)}
          {!tracks.isPending && !items.length && !tracks.isError && <div className="music-empty"><Search size={25} /><p>Chưa có bài phù hợp. Thử tên khác nhé.</p></div>}
          {tracks.isError && <div className="music-empty"><p>{tracks.error.message}</p><Button onClick={() => void tracks.refetch()}>Thử lại</Button></div>}
          <div ref={sentinel} className="music-load-more">{tracks.isFetchingNextPage && <MusicLoader compact label="Đang tìm thêm nhạc…" />}</div>
        </div>{(config.isPending || tracks.isPending && config.data?.enabled) && <div className="music-search-loading"><MusicLoader label="Đợi xíu nha…" /></div>}</div>
        {draft && <section className="music-start-editor" aria-label="Chọn đoạn bắt đầu">
          <div className="music-start-track"><strong>{draft.title}</strong>{selected && onRemove && <button className="music-text-button" disabled={!!busy} onClick={() => void choose()}><X size={14} />Bỏ nhạc</button>}</div>
          <div className="music-start-heading"><span><Clock3 size={16} />Bắt đầu từ</span><label><span className="sr-only">Mốc bắt đầu, phút:giây</span><input value={startText} aria-invalid={!valid} disabled={!!busy} onChange={e => setStartText(e.target.value)} placeholder="00:30" maxLength={10} /></label></div>
          <input type="range" min={0} max={draft.durationSeconds ? maxStart : Math.max(600, start || 0)} value={Math.min(start || 0, maxStart)} aria-label="Kéo chọn đoạn bắt đầu" disabled={!!busy} onChange={e => setStartText(formatMusicTime(Number(e.target.value)))} />
          {!valid && <p role="alert">Mốc bắt đầu cần nằm trước khi bài nhạc kết thúc.</p>}
          <div className="music-start-actions"><MusicPlayer endpoint={endpoint(draft)} title={draft.title} onError={setError} /><Button disabled={!!busy || !valid} onClick={() => void choose({ ...draft, startSeconds: start! })}>{busy ? "Đang lưu…" : "Dùng đoạn này"}</Button></div>
        </section>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <a className="music-attribution" href="https://www.epidemicsound.com/" target="_blank" rel="noreferrer">Music by Epidemic Sound</a>
      </div>}
  </Modal>;
}
