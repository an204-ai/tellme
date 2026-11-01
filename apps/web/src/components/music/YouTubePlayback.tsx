"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Pause, Play, X } from "lucide-react";
import { MusicLoader } from "./MusicLoader";
import { musicActiveEvent } from "./media-session";
import { cancelYouTubeLoad, closeYouTube, openYouTube, useYouTubePlayback, markYouTubeUnavailable } from "./youtube-playback";

interface Player {
  playVideo(): void; pauseVideo(): void; destroy(): void; seekTo(seconds: number, allowSeekAhead: boolean): void;
}
interface YouTubeAPI {
  Player: new (element: HTMLElement, options: {
    events: {
      onReady(event: { target: Player }): void;
      onStateChange(event: { data: number }): void;
      onError(event: { data: number }): void;
      onAutoplayBlocked(): void;
    };
  }) => Player;
}
declare global { interface Window { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void } }
let apiPromise: Promise<YouTubeAPI> | undefined;
function loadAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => { apiPromise = undefined; script.remove(); reject(new Error("YouTube đang kết nối chậm. Bấm phát để thử lại nhé.")); }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.(); window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else { apiPromise = undefined; reject(new Error("Chưa mở được trình phát YouTube.")); }
    };
    script.src = "https://www.youtube.com/iframe_api"; script.async = true;
    script.onerror = () => { window.clearTimeout(timeout); apiPromise = undefined; script.remove(); reject(new Error("Chưa kết nối được YouTube. Kiểm tra mạng rồi thử lại nhé.")); };
    document.head.append(script);
  });
  return apiPromise;
}
let currentPlayer: Player | undefined;
export function YouTubePlayButton({ endpoint, title, playingIcon, onPlaybackChange, onError }: {
  endpoint: string; title: string; playingIcon?: React.ReactNode;
  onPlaybackChange?: (state: "idle" | "loading" | "playing") => void;
  onError?: (error: string) => void;
}) {
  const active = useYouTubePlayback((s) => s.active);
  const pending = useYouTubePlayback((s) => s.pending);
  const status = useYouTubePlayback((s) => s.status);
  const error = useYouTubePlayback((s) => s.error);
  const mine = active?.endpoint === endpoint || pending === endpoint;
  const state = mine ? status : "idle";
  const callback = useRef(onPlaybackChange), failure = useRef(onError);
  callback.current = onPlaybackChange; failure.current = onError;
  useEffect(() => () => { if (useYouTubePlayback.getState().active?.endpoint === endpoint || useYouTubePlayback.getState().pending === endpoint) closeYouTube(); }, [endpoint]);
  useEffect(() => { callback.current?.(state); }, [state]);
  useEffect(() => { if (error && mine) failure.current?.(error); }, [error, mine]);
  return <span className="music-player">
    <button type="button" className="music-play" aria-pressed={state === "playing"} aria-busy={state === "loading"} aria-label={`${state === "playing" ? "Tạm dừng" : state === "loading" ? "Dừng tải" : "Phát"} ${title} trên YouTube`} onClick={(event) => {
      if (mine && state !== "idle") { currentPlayer?.pauseVideo(); cancelYouTubeLoad(); }
      else if (active?.endpoint === endpoint && currentPlayer && !error) { window.dispatchEvent(new CustomEvent(musicActiveEvent, { detail: "youtube" })); currentPlayer.seekTo(active.startSeconds, true); currentPlayer.playVideo(); }
      else void openYouTube(endpoint, event.currentTarget.closest("dialog") || document.body);
    }}>{state === "loading" ? <MusicLoader compact /> : state === "playing" ? playingIcon || <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
    {error && mine && !onError && <span className="music-play-error" role="alert">{error}</span>}
  </span>;
}
/** One visible player for both search previews and a story's selected video. */
export function YouTubePlayback() {
  const active = useYouTubePlayback((s) => s.active);
  const error = useYouTubePlayback((s) => s.error);
  const host = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    if (active) element?.showPopover?.();
    return () => { if (element?.isConnected) element.hidePopover?.(); };
  }, [active]);
  useLayoutEffect(() => {
    const element = panel.current, editor = active?.mount.querySelector(".music-start-editor");
    if (!element || !editor) return;
    // Keep the floating preview clear of the time control and confirm button.
    const place = () => {
      if (window.innerWidth > 700) { element.style.removeProperty("top"); element.style.removeProperty("bottom"); return; }
      const top = Math.max(12, editor.getBoundingClientRect().top - element.getBoundingClientRect().height - 12);
      element.style.top = `${top}px`; element.style.bottom = "auto";
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(editor); observer.observe(element);
    window.addEventListener("resize", place);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); };
  }, [active]);
  useEffect(() => {
    const stop = (event: Event) => { if ((event as CustomEvent).detail !== "youtube") { currentPlayer?.pauseVideo(); cancelYouTubeLoad(); } };
    const hide = () => { if (document.hidden) { currentPlayer?.pauseVideo(); cancelYouTubeLoad(); } };
    window.addEventListener(musicActiveEvent, stop);
    document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener(musicActiveEvent, stop); document.removeEventListener("visibilitychange", hide); closeYouTube(); };
  }, []);
  useEffect(() => {
    if (!active || !host.current) return;
    const container = host.current;
    let disposed = false, player: Player | undefined;
    let readyTimeout: ReturnType<typeof setTimeout> | undefined;
    const setState = (status: "idle" | "loading" | "playing", error = "") => {
      if (!disposed && useYouTubePlayback.getState().active?.revision === active.revision) useYouTubePlayback.setState({ status, error });
    };
    void loadAPI().then((YT) => {
      if (disposed) return;
      const iframe = document.createElement("iframe");
      const params = new URLSearchParams({ enablejsapi: "1", origin: window.location.origin, playsinline: "1", controls: "1", autoplay: "0", start: String(active.startSeconds) });
      iframe.src = `https://www.youtube.com/embed/${active.videoId}?${params}`;
      iframe.title = active.title; iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true; iframe.referrerPolicy = "strict-origin-when-cross-origin";
      container.replaceChildren(iframe);
      readyTimeout = setTimeout(() => setState("idle", "Video đang kết nối chậm. Bấm phát để thử lại hoặc mở trên YouTube nhé."), 20000);
      player = new YT.Player(iframe, { events: {
        onReady: ({ target }) => { clearTimeout(readyTimeout); if (!disposed && useYouTubePlayback.getState().status === "loading") { target.seekTo(active.startSeconds, true); target.playVideo(); } },
        onStateChange: ({ data }) => {
          if (data === 1 && document.hidden) { player?.pauseVideo(); setState("idle"); }
          else if (data === 1) setState("playing");
          else if (data === 3) setState("loading");
          else if (data === 0 || data === 2 || data === 5) setState("idle");
        },
        onAutoplayBlocked: () => setState("idle", "Chạm nút phát trong khung YouTube để nghe nhé."),
        onError: ({ data }) => {
          clearTimeout(readyTimeout);
          if (!disposed && [100, 101, 150].includes(data)) markYouTubeUnavailable(active.videoId);
          setState("idle", [100, 101, 150].includes(data) ? "Video này không còn cho phép nhúng. Bạn chọn bài khác nhé." : data === 153 ? "YouTube chưa nhận diện được trang phát. Bạn thử tải lại trang nhé." : "YouTube chưa phát được video. Bấm phát để thử lại nhé.");
        },
      } });
      currentPlayer = player;
    }).catch((failure) => setState("idle", failure instanceof Error ? failure.message : "Chưa mở được YouTube."));
    return () => { disposed = true; clearTimeout(readyTimeout); player?.destroy(); if (currentPlayer === player) currentPlayer = undefined; container.replaceChildren(); };
  }, [active]);
  if (!active) return null;
  return createPortal(<aside ref={panel} popover="manual" className="youtube-playback" aria-label="Trình phát YouTube">
    <div className="youtube-playback-toolbar"><a href={`https://www.youtube.com/watch?v=${active.videoId}`} target="_blank" rel="noreferrer"><span>YouTube</span><ExternalLink size={14} /></a><button type="button" aria-label="Đóng trình phát YouTube" onClick={closeYouTube}><X size={18} /></button></div>
    <div ref={host} className="youtube-playback-video" />
    {error && <p role="status" className="youtube-playback-error">{error}</p>}
  </aside>, active.mount);
}
