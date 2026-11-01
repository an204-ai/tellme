"use client";
import { create } from "zustand";
import { request } from "@/lib/api-repository";
import { musicActiveEvent } from "./media-session";

export type YouTubeSelection = { endpoint: string; videoId: string; title: string; startSeconds: number; revision: number; mount: HTMLElement };
export const useYouTubePlayback = create<{
  active: YouTubeSelection | null; pending: string | null;
  status: "idle" | "loading" | "playing"; error: string;
  unavailableIds: string[];
}>(() => ({ active: null, pending: null, status: "idle", error: "", unavailableIds: [] }));
export function markYouTubeUnavailable(id: string) {
  useYouTubePlayback.setState((state) => ({ unavailableIds: [...state.unavailableIds.filter((value) => value !== id), id].slice(-200) }));
}
let revision = 0;
let abort: AbortController | undefined;
export function closeYouTube() {
  revision++; abort?.abort();
  useYouTubePlayback.setState({ active: null, pending: null, status: "idle", error: "" });
}
export function cancelYouTubeLoad() {
  revision++; abort?.abort();
  useYouTubePlayback.setState({ pending: null, status: "idle" });
}
export async function openYouTube(endpoint: string, mount: HTMLElement) {
  const version = ++revision;
  abort?.abort(); abort = new AbortController();
  // A YouTube video always has a visible official player, never an audio URL.
  window.dispatchEvent(new CustomEvent(musicActiveEvent, { detail: "youtube" }));
  useYouTubePlayback.setState({ active: null, pending: endpoint, status: "loading", error: "" });
  try {
    const result = await request<{ provider: string; videoId: string; title: string; startSeconds?: number }>(endpoint, { signal: abort.signal });
    if (version !== revision) return;
    if (result.provider !== "youtube" || !/^[a-zA-Z0-9_-]{11}$/.test(result.videoId)) throw new Error("Video chưa khả dụng. Bạn chọn bài khác nhé.");
    const startSeconds = result.startSeconds || 0;
    if (!Number.isInteger(startSeconds) || startSeconds < 0 || startSeconds > 86400) throw new Error("Mốc bắt đầu chưa hợp lệ.");
    useYouTubePlayback.setState({ pending: null, active: { endpoint, videoId: result.videoId, title: result.title, startSeconds, revision: version, mount } });
  } catch (error) {
    if (version === revision) useYouTubePlayback.setState({ pending: endpoint, status: "idle", error: error instanceof Error ? error.message : "Chưa mở được YouTube." });
  }
}
