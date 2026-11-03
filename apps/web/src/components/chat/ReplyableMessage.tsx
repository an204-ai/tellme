"use client";
import { useEffect, useRef, type ReactNode } from 'react';
import { Reply } from 'lucide-react';
import { enableReplyDrag } from '@/lib/reply-drag';
export function ReplyableMessage({ children, own, onReply, disabled }: {
  children: ReactNode; own: boolean; onReply: () => void; disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handler = useRef(onReply); handler.current = onReply;
  useEffect(() => {
    if (!ref.current || disabled) return;
    return enableReplyDrag(ref.current, () => handler.current(), own);
  }, [own, disabled]);
  return <div ref={ref} className="message-replyable">
    {children}
    {!disabled && <button className="message-reply-action" type="button" aria-label="Trả lời tin nhắn" onClick={onReply}><Reply size={16} /></button>}
  </div>;
}
