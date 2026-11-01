"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type Hls from "hls.js";
import { request } from "@/lib/api-repository";
import { MusicLoader } from "./MusicLoader";
import { musicActiveEvent as activeEvent } from "./media-session";
import { YouTubePlayButton } from "./YouTubePlayback";
export { pauseMusic } from "./media-session";

type PlayerProps = {
  endpoint: string; title: string; provider?: "youtube" | "epidemic-sound";
  onPlaybackChange?: (state: "idle" | "loading" | "playing") => void;
  onError?: (message: string) => void; playingIcon?: React.ReactNode;
};
export function MusicPlayer({ provider, ...props }: PlayerProps) {
  return provider === "youtube" ? <YouTubePlayButton {...props} /> : <HlsMusicPlayer {...props} />;
}
/** Fetch a signed HLS URL only after a play gesture; keep the API key server-side. */
function HlsMusicPlayer({ endpoint, title, onPlaybackChange, onError, playingIcon }: PlayerProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const engine = useRef<Hls | null>(null);
  const abort = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const streamExpiry = useRef(0);
  const startSeconds = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const playbackCallback = useRef(onPlaybackChange);
  const errorCallback = useRef(onError);
  playbackCallback.current = onPlaybackChange;
  errorCallback.current = onError;
  const playbackState = busy ? "loading" : playing ? "playing" : "idle";
  useEffect(() => { playbackCallback.current?.(playbackState); }, [playbackState]);
  useEffect(() => { errorCallback.current?.(error); }, [error]);
  useEffect(() => {
    const media = audio.current;
    const stop = () => { generation.current++; abort.current?.abort(); media?.pause(); setBusy(false); };
    const otherPlaying = (event: Event) => { if ((event as CustomEvent).detail !== media) stop(); };
    const hide = () => { if (document.hidden) stop(); };
    window.addEventListener(activeEvent, otherPlaying);
    document.addEventListener("visibilitychange", hide);
    return () => {
      generation.current++; abort.current?.abort(); media?.pause();
      engine.current?.destroy(); engine.current = null;
      media?.removeAttribute("src"); media?.load(); streamExpiry.current = 0;
      window.removeEventListener(activeEvent, otherPlaying);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [endpoint]);
  const toggle = async () => {
    const media = audio.current;
    if (!media) return;
    if (playing || busy) { generation.current++; abort.current?.abort(); media.pause(); setBusy(false); return; }
    window.dispatchEvent(new CustomEvent(activeEvent, { detail: media }));
    const version = ++generation.current;
    setBusy(true); setError("");
    const play = async () => {
      if (version !== generation.current) return;
      const seek = () => {
        if (version !== generation.current) return;
        media.currentTime = Number.isFinite(media.duration) ? Math.min(startSeconds.current, Math.max(0, media.duration - .1)) : startSeconds.current;
      };
      if (media.readyState > 0) seek(); else media.addEventListener("loadedmetadata", seek, { once: true });
      try { await media.play(); }
      catch { if (version === generation.current) { setBusy(false); setError("Chạm phát để nghe nhạc nhé."); } }
    };
    try {
      if (streamExpiry.current > Date.now() + 30000 && media.readyState > 0) { await play(); return; }
      abort.current?.abort(); abort.current = new AbortController();
      const stream = await request<{ url: string; expires: string; startSeconds?: number }>(endpoint, { signal: abort.current.signal });
      if (version !== generation.current) return;
      streamExpiry.current = Date.parse(stream.expires);
      startSeconds.current = stream.startSeconds || 0;
      engine.current?.destroy(); engine.current = null;
      if (media.canPlayType("application/vnd.apple.mpegurl")) { media.src = stream.url; await play(); }
      else {
        const { default: HLS } = await import("hls.js");
        if (version !== generation.current) return;
        if (!HLS.isSupported()) throw new Error("Trình duyệt chưa hỗ trợ phát nhạc này.");
        const hls = new HLS({ maxBufferLength: 15, maxMaxBufferLength: 30, startPosition: startSeconds.current });
        engine.current = hls;
        hls.on(HLS.Events.MANIFEST_PARSED, () => { void play(); });
        hls.on(HLS.Events.ERROR, (_, data) => {
          if (!data.fatal || version !== generation.current) return;
          hls.destroy(); engine.current = null; streamExpiry.current = 0;
          setBusy(false); setPlaying(false); setError("Nhạc bị gián đoạn. Bấm phát để thử lại nhé.");
        });
        hls.loadSource(stream.url); hls.attachMedia(media);
      }
    } catch (failure) {
      if (version === generation.current) { setBusy(false); setError(failure instanceof Error ? failure.message : "Chưa phát được nhạc."); }
    }
  };
  return <span className="music-player">
    <button type="button" className="music-play" aria-label={`${playing ? "Tạm dừng" : busy ? "Dừng tải" : "Phát"} ${title}`} aria-pressed={playing} aria-busy={busy} onClick={() => void toggle()}>
      {busy ? <MusicLoader compact /> : playing ? playingIcon || <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
    </button>
    <audio ref={audio} preload="none" onPlaying={() => { setPlaying(true); setBusy(false); }} onWaiting={() => { if (!audio.current?.paused) setBusy(true); }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setBusy(false); }} onError={() => { setBusy(false); setPlaying(false); streamExpiry.current = 0; setError("Chưa phát được nhạc. Bấm phát để thử lại nhé."); }} />
    {error && !onError && <span className="music-play-error" role="alert">{error}</span>}
  </span>;
}
