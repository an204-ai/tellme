"use client";
import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sendTyping, useChatRealtime } from '@/lib/chat-realtime';
import { TypingLease } from "@/lib/typing-lease";
import { optimisticMutations } from "@/lib/optimistic-mutation";
import { request } from '@/lib/api-repository';
import type { AppData, Conversation } from '@/lib/types';

/** One leading typing frame, a 3s lease renewal, and one trailing stop. */
export function useChatSignals(chat: Conversation | undefined, viewport: React.RefObject<HTMLDivElement | null>) {
  const client = useQueryClient();
  const revision = useChatRealtime((state) => state.revision);
  const lease = useMemo(() => new TypingLease((active) => { if (chat) sendTyping(chat.id, active); }), [chat?.id, revision]);
  const stop = () => lease.stop();
  const input = (text: string) => { if (document.hidden) stop(); else lease.input(text); };
  useEffect(() => {
    const leave = () => {
      if (document.hidden || !document.hasFocus()) stop();
    };
    document.addEventListener('visibilitychange', leave); window.addEventListener('blur', leave); window.addEventListener('focus', leave);
    return () => { stop(); document.removeEventListener('visibilitychange', leave); window.removeEventListener('blur', leave); window.removeEventListener('focus', leave); };
  }, [chat?.id, revision]);
  const readAt = chat?.readAt?.me || '';
  useEffect(() => {
    const root = viewport.current;
    if (!chat || !root) return;
    let stopped = false, sending = false, candidate: { id: string; at: string } | undefined;
    let acknowledged = readAt;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const visible = new Map<string, string>();
    const flush = async () => {
      if (stopped || sending || document.hidden || !document.hasFocus() || !candidate || candidate.at <= acknowledged) return;
      const target = candidate;
      sending = true;
      try {
        await optimisticMutations(client).run({
          scope: `read:${chat.id}`,
          matches: (query) => query.queryKey[0] === "tellme" && query.queryKey[1] === "community",
          apply: (value) => {
            const data = value as AppData | undefined;
            return data && ({ ...data, conversations: data.conversations.map((entry) => entry.id !== chat.id ? entry : { ...entry, unread: entry.messages.filter((message) => !message.own && message.at > ((entry.readAt?.me || '') > target.at ? entry.readAt!.me! : target.at)).length }) });
          },
          reconcile: (value) => {
            const data = value as AppData | undefined;
            return data && ({ ...data, conversations: data.conversations.map((entry) => entry.id !== chat.id ? entry : { ...entry, readAt: { ...entry.readAt, me: (entry.readAt?.me || '') > target.at ? entry.readAt!.me! : target.at }, unread: entry.messages.filter((message) => !message.own && message.at > ((entry.readAt?.me || '') > target.at ? entry.readAt!.me! : target.at)).length }) });
          },
          execute: () => request(`/conversations/${encodeURIComponent(chat.id)}/read`, { method: 'PUT', body: JSON.stringify({ messageId: target.id }) }),
        });
        acknowledged = target.at;
      } catch { /* Retry on the next visibility/reconnect signal; no busy retry loop. */ }
      finally { sending = false; }
      if (!stopped && candidate && candidate.at > acknowledged && candidate.at > target.at) timer = setTimeout(() => { void flush(); }, 500);
    };
    const scan = () => {
      if (document.hidden || !document.hasFocus()) { clearTimeout(timer); return; }
      const latest = [...visible].sort((a, b) => b[1].localeCompare(a[1]))[0];
      candidate = latest ? { id: latest[0], at: latest[1] } : undefined;
      clearTimeout(timer); timer = setTimeout(() => { void flush(); }, 750);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        if (entry.isIntersecting && entry.intersectionRatio >= .6) visible.set(node.dataset.messageId!, node.dataset.messageAt!);
        else visible.delete(node.dataset.messageId!);
      }
      scan();
    }, { root, threshold: [.6] });
    root.querySelectorAll<HTMLElement>('[data-message-id]').forEach((node) => observer.observe(node));
    document.addEventListener('visibilitychange', scan); window.addEventListener('focus', scan); window.addEventListener('online', scan);
    return () => { stopped = true; clearTimeout(timer); observer.disconnect(); document.removeEventListener('visibilitychange', scan); window.removeEventListener('focus', scan); window.removeEventListener('online', scan); };
  }, [chat?.id, chat?.messages.at(-1)?.id, readAt, revision, client, viewport]);
  return { input, stop };
}
