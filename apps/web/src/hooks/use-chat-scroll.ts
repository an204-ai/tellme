"use client";

import { useLayoutEffect, useRef } from "react";

/** Native chronological scroll; resize only follows the end if it was in view. */
export function useChatScroll(conversationId?: string, lastId?: string, lastOwn?: boolean) {
  const viewport = useRef<HTMLDivElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const list = viewport.current, content = history.current;
    if (!list || !content) return;
    pinned.current = true;
    const follow = () => { if (pinned.current) list.scrollTop = list.scrollHeight; };
    const scroll = () => { pinned.current = list.scrollHeight - list.clientHeight - list.scrollTop < 72; };
    const observer = new ResizeObserver(follow);
    observer.observe(list);
    observer.observe(content);
    list.addEventListener("scroll", scroll, { passive: true });
    follow();
    return () => { observer.disconnect(); list.removeEventListener("scroll", scroll); };
  }, [conversationId]);
  useLayoutEffect(() => {
    if (lastOwn) pinned.current = true;
    if (pinned.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [lastId, lastOwn]);
  return { viewport, history };
}
