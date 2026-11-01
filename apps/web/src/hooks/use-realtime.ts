"use client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePresenceStore } from "@/stores/presence.store";
export function useRealtime(enabled: boolean, friendIds: string[] = []) {
  const queryClient = useQueryClient();
  const current = useRef<WebSocket | null>(null);
  const friendsKey = [...friendIds].sort().join(",");
  useEffect(() => {
    usePresenceStore.getState().prune(friendIds);
    if (current.current?.readyState === WebSocket.OPEN) current.current.send("sync");
  }, [friendsKey]);
  useEffect(() => {
    const store = () => usePresenceStore.getState();
    store().clear();
    if (!enabled) return;
    let stopped = false, paused = false, failures = 0, lastFrame = 0;
    let reconnect: ReturnType<typeof setTimeout> | undefined, pulse: ReturnType<typeof setTimeout> | undefined, invalidate: ReturnType<typeof setTimeout> | undefined, resync: ReturnType<typeof setTimeout> | undefined;
    const retryPresence = () => {
      clearTimeout(resync);
      resync = setTimeout(() => { if (!stopped && !paused && current.current?.readyState === WebSocket.OPEN) current.current.send("sync"); }, 12000 + Math.random() * 8000);
    };
    const queueInvalidation = () => {
      clearTimeout(invalidate);
      // Social events do not change the external music catalogue. Refetching it
      // here would reload every browsed page while the user is choosing a song.
      invalidate = setTimeout(() => { void queryClient.invalidateQueries({ queryKey: ["tellme"], predicate: (query) => query.queryKey[1] !== "music" }); }, 150);
    };
    const heartbeat = () => {
      clearTimeout(pulse);
      // Fresh jitter for every packet, including the first one after reconnect.
      pulse = setTimeout(() => {
        const socket = current.current;
        if (stopped || paused || !socket || socket.readyState !== WebSocket.OPEN) return;
        if (Date.now() - lastFrame > 70000) { socket.close(); return; }
        socket.send("h"); heartbeat();
      }, 22000 + Math.random() * 10000);
    };
    const connect = () => {
      if (stopped || paused || !navigator.onLine || current.current && current.current.readyState < WebSocket.CLOSING) return;
      clearTimeout(reconnect);
      const url = new URL("/api/realtime", window.location.href); url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(url);
      current.current = socket;
      socket.onopen = () => { failures = 0; lastFrame = Date.now(); heartbeat(); };
      socket.onmessage = (event) => {
        if (socket !== current.current) return;
        lastFrame = Date.now();
        if (event.data === "p") return;
        try {
          const value = JSON.parse(event.data);
          if (value.kind === "presence.snapshot" && typeof value.selfId === "string" && Array.isArray(value.friendIds) && Array.isArray(value.onlineIds) && Number.isSafeInteger(value.revision)) { clearTimeout(resync); store().snapshot(value); store().health(true); }
          else if (value.kind === "presence" && typeof value.userId === "string" && typeof value.online === "boolean" && Number.isSafeInteger(value.revision)) store().change(value);
          else if (value.kind === "presence.unavailable") { store().clear(); retryPresence(); }
          else if (value.kind === "ready" || value.kind === "realtime-ready") { store().clear(); store().health(true); queueInvalidation(); }
          else if (typeof value.kind === "string") queueInvalidation();
        } catch { /* Ignore malformed server frames. */ }
      };
      socket.onerror = () => socket.close();
      socket.onclose = (event) => {
        if (socket !== current.current) return;
        current.current = null; clearTimeout(pulse); clearTimeout(resync); store().clear();
        if (event.code === 1008) queueInvalidation();
        if (!stopped && !paused) reconnect = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(++failures, 5)) * (.6 + Math.random() * .8));
      };
    };
    const hide = () => { paused = true; clearTimeout(reconnect); current.current?.close(); };
    const resume = () => { paused = false; connect(); };
    const visible = () => { if (!document.hidden) { connect(); if (current.current?.readyState === WebSocket.OPEN) { current.current.send("h"); current.current.send("sync"); } } };
    window.addEventListener("pagehide", hide); window.addEventListener("pageshow", resume); window.addEventListener("online", resume); document.addEventListener("visibilitychange", visible);
    connect();
    return () => {
      stopped = true; clearTimeout(reconnect); clearTimeout(pulse); clearTimeout(invalidate); clearTimeout(resync);
      const socket = current.current; current.current = null; socket?.close(); store().clear();
      window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", resume); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, queryClient]);
}
