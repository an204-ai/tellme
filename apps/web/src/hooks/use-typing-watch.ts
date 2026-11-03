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
    const publish = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.hidden) watchConversation();
        else watchConversation(activeId, [...visible]);
      }, 80);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.conversationId;
        if (!id) continue;
        if (entry.isIntersecting) visible.add(id); else visible.delete(id);
      }
      publish();
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
