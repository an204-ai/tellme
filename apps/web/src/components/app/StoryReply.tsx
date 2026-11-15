"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { newId } from "@/lib/api-repository";
import { replySchema } from "@/lib/validation";
import { canMessagePerson } from "@/lib/chat-policy";
import { useAppStore } from "@/stores/app.store";
import { Modal } from "@/components/ui/Modal";
import type { DayStory, Message, MomentItem, Person } from "@/lib/types";

type ReplyProps = { story: DayStory; item: MomentItem; person?: Person; groupId?: string };

/** The feed is only an entry point. Unsent text belongs to the open editor. */
export function StoryReply({ story, item, person, groupId }: ReplyProps) {
  const { data } = useCommunity();
  const [editing, setEditing] = useState(false);
  if (!data || !canMessagePerson(story.userId, data)) return null;
  return <>
    <button type="button" className="story-reply story-reply-trigger" aria-haspopup="dialog" aria-label={`Trả lời riêng ${person?.name || "người đăng"}`} onClick={() => {
      setEditing(true);
    }}>Trả lời riêng…</button>
    {editing && <PrivateReplyEditor story={story} item={item} person={person} groupId={groupId} onClose={() => setEditing(false)} />}
  </>;
}

function PrivateReplyEditor({ story, item, person, groupId, onClose }: ReplyProps & { onClose: () => void }) {
  const { data, update, saving } = useCommunity();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const notify = useAppStore((state) => state.notify);
  useLayoutEffect(() => { input.current?.focus({ preventScroll: true }); }, []);
  const allowed = !!data && canMessagePerson(story.userId, data);
  return <Modal title={`Trả lời ${person?.name || "người đăng"}`} className="moment-reply-dialog" fitViewport motionKind="panel" dismissOnEmptySpace closeDisabled={saving} onClose={onClose}>
    <form className="moment-private-reply glass-control" aria-label={`Trả lời khoảnh khắc của ${person?.name || "người đăng"}`} onSubmit={async (event) => {
      event.preventDefault();
      const parsed = replySchema.safeParse(text);
      if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Nhập lời trả lời."); return; }
      if (saving || submitting.current || !allowed) return;
      submitting.current = true;
      try {
        await update((draft) => {
          let chat = draft.conversations.find((entry) => entry.kind !== "group" && entry.userId === story.userId);
          if (!chat) {
            chat = { id: newId(), kind: "direct", userId: story.userId, unread: 0, messages: [] };
            draft.conversations.unshift(chat);
          }
          chat.messages.push({ id: newId(), text: parsed.data, own: true, at: new Date().toISOString(),
            storyReply: { storyId: groupId || story.id, momentId: item.id, ...(groupId ? { groupId } : {}) } });
        });
        setText(""); notify("Đã gửi lời nhắn riêng."); onClose();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Chưa gửi được. Bạn thử lại nhé.");
      } finally { submitting.current = false; }
    }}>
      <input ref={input} aria-label="Lời trả lời ảnh" placeholder="Trả lời riêng…" value={text} maxLength={1000} readOnly={saving} onChange={(event) => { setText(event.target.value); setError(""); }} />
      <button type="submit" className="story-reply-send" disabled={saving || !allowed || !text.trim()} aria-label="Gửi lời trả lời qua tin nhắn"><Send size={23} /></button>
    </form>
    {(error || !allowed) && <p className="moment-reply-error" role="alert">{error || "Hai người cần là bạn bè để trả lời riêng."}</p>}
    <span className="sr-only" role="status">{saving ? "Đang gửi lời trả lời…" : ""}</span>
  </Modal>;
}

export function StoryReplyPreview({ reply }: { reply: NonNullable<Message["storyReply"]> }) {
  const viewStory = useAppStore((state) => state.viewStory);
  if (reply.groupId) return reply.image ? <Link className="story-reply-preview" href={`/community/today?group=${encodeURIComponent(reply.groupId)}&moment=${encodeURIComponent(reply.momentId)}`} onClick={() => viewStory(null)}><img src={reply.image} alt={reply.caption || "Ảnh được trả lời"} loading="lazy"/><span><small>Đã trả lời một ảnh nhóm</small><strong>{reply.caption || "Tell me now"}</strong></span></Link> : <div className="story-reply-preview unavailable">Khoảnh khắc không còn khả dụng.</div>;
  return reply.image ? <button type="button" className="story-reply-preview"
    onClick={() => viewStory(reply.storyId, 0, reply.momentId)}>
    <img src={reply.image} alt={reply.caption || "Ảnh được trả lời"} loading="lazy"/>
    <span><small>Đã trả lời một khoảnh khắc</small><strong>{reply.caption || "Tell me now"}</strong></span>
  </button> : <div className="story-reply-preview unavailable">Khoảnh khắc không còn khả dụng.</div>;
}
