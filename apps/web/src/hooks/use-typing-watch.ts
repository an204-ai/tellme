"use client";
import { useEffect } from 'react';
import { useChatRealtime, watchConversation } from '@/lib/chat-realtime';

/** Subscribe to the open chat and visible inbox rows, never the whole account history. */
export function useTypingWatch(activeId: string | undefined, listKey: string) {
  const revision = useChatRealtime((state) => state.revision);
  useEffect(() => () => watchConversation(), []);
  useEffect(() => {
    const visible = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = "";
    const publish = () => {
      clearTimeout(timer);
      const active = document.hidden ? undefined : activeId;
      const rows = document.hidden ? [] : [...visible];
      const key = JSON.stringify([active, rows]);
      if (key === last) return;
      last = key;
      watchConversation(active, rows);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.conversationId;
        if (!id) continue;
        if (entry.isIntersecting) visible.add(id); else visible.delete(id);
      }
      clearTimeout(timer);
      timer = setTimeout(publish, 80);
    });
    document.querySelectorAll('[data-conversation-id]').forEach((row) => observer.observe(row));
    publish();
    document.addEventListener('visibilitychange', publish);
    window.addEventListener('focus', publish);
    return () => {
      clearTimeout(timer); observer.disconnect();
      document.removeEventListener('visibilitychange', publish); window.removeEventListener('focus', publish);
    };
  }, [activeId, listKey, revision]);
}
