"use client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { attachChatSocket, receiveTyping, pruneTyping } from "@/lib/chat-realtime";
import { request } from "@/lib/api-repository";
import type { AppData, Message } from "@/lib/types";
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
    const prune = setInterval(pruneTyping, 1000);
    let stopped = false, paused = false, failures = 0, lastFrame = 0;
    let noticeRefresh: ReturnType<typeof setTimeout> | undefined;
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
      socket.onopen = () => { attachChatSocket(socket); failures = 0; lastFrame = Date.now(); heartbeat(); };
      socket.onmessage = (event) => {
        if (socket !== current.current) return;
        lastFrame = Date.now();
        if (event.data === "p") return;
        try {
          const value = JSON.parse(event.data);
          if (value.kind === "chat.message") {
            if (typeof value.conversationId !== "string" || !value.message || typeof value.message.id !== "string" || typeof value.message.at !== "string") return;
            const message = value.message as Message;
            const known = queryClient.getQueryData<AppData>(["tellme", "community"])?.conversations.some((chat) => chat.id === value.conversationId);
            if (!known) { void queryClient.invalidateQueries({ queryKey: ["tellme", "community"] }); return; }
            queryClient.setQueryData<AppData>(["tellme", "community"], (data) => data && ({ ...data, conversations: data.conversations.map((chat) => {
              if (chat.id !== value.conversationId) return chat;
              const existing = chat.messages.some((entry) => entry.id === message.id);
              return { ...chat, messages: (existing ? chat.messages.map((entry) => entry.id === message.id ? message : entry) : [...chat.messages, message]).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)), unread: chat.unread + Number(!existing && !message.own && message.at > (chat.readAt?.me || "")) };
            }) }));
          } else if (value.kind === "chat.typing") {
            if (typeof value.conversationId === "string" && typeof value.userId === "string" && typeof value.peerId === "string" && typeof value.active === "boolean") receiveTyping(value);
          } else if (value.kind === "chat.read") {
            if (typeof value.conversationId === "string" && typeof value.userId === "string" && typeof value.at === "string")
              queryClient.setQueryData<AppData>(["tellme", "community"], (data) => data && ({ ...data, conversations: data.conversations.map((chat) => chat.id !== value.conversationId || (chat.readAt?.[value.userId] || "") >= value.at ? chat : { ...chat, readAt: { ...chat.readAt, [value.userId]: value.at }, ...(value.userId === "me" ? { unread: chat.messages.filter((message) => !message.own && message.at > value.at).length } : {}) }) }));
          } else if (value.kind === "presence.snapshot" && typeof value.selfId === "string" && Array.isArray(value.friendIds) && Array.isArray(value.onlineIds) && Number.isSafeInteger(value.revision)) { clearTimeout(resync); store().snapshot(value); store().health(true); }
          else if (value.kind === "presence" && typeof value.userId === "string" && typeof value.online === "boolean" && Number.isSafeInteger(value.revision)) store().change(value);
          else if (value.kind === "presence.unavailable") { store().clear(); retryPresence(); }
          else if (value.kind === "ready" || value.kind === "realtime-ready") { store().clear(); store().health(true); queueInvalidation(); }
          else if (value.kind === "notifications") {
            if (!noticeRefresh) noticeRefresh = setTimeout(() => {
              noticeRefresh = undefined;
              void queryClient.invalidateQueries({ queryKey: ["tellme", "notifications"] });
              void request<{ count: number }>("/notifications/unread").then((result) => {
                if (!stopped) queryClient.setQueryData<AppData>(["tellme", "community"], (data) => data && ({ ...data, unreadNotifications: result.count }));
              }).catch(() => {});
            }, 1000);
          } else if (typeof value.kind === "string") queueInvalidation();
        } catch { /* Ignore malformed server frames. */ }
      };
      socket.onerror = () => socket.close();
      socket.onclose = (event) => {
        if (socket !== current.current) return;
        current.current = null; attachChatSocket(null); clearTimeout(pulse); clearTimeout(resync); store().clear();
        if (event.code === 1008) queueInvalidation();
        if (!stopped && !paused) reconnect = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(++failures, 5)) * (.6 + Math.random() * .8));
      };
    };
    const hide = () => { paused = true; clearTimeout(reconnect); current.current?.close(); };
    const offline = () => { current.current?.close(); attachChatSocket(null); };
    const resume = () => { paused = false; connect(); };
    const visible = () => { if (!document.hidden) { connect(); if (current.current?.readyState === WebSocket.OPEN) { current.current.send("h"); current.current.send("sync"); } } };
    window.addEventListener("pagehide", hide); window.addEventListener("pageshow", resume); window.addEventListener("online", resume); window.addEventListener("offline", offline); document.addEventListener("visibilitychange", visible);
    connect();
    return () => {
      stopped = true; clearTimeout(noticeRefresh); clearInterval(prune); attachChatSocket(null); clearTimeout(reconnect); clearTimeout(pulse); clearTimeout(invalidate); clearTimeout(resync);
      const socket = current.current; current.current = null; socket?.close(); store().clear();
      window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", resume); window.removeEventListener("online", resume); window.removeEventListener("offline", offline); document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, queryClient]);
}
