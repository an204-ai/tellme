"use client";
import Link from "next/link";
import { useRef, useState, type RefObject } from "react";
import { Check, Send } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { newId } from "@/lib/api-repository";
import { replySchema } from "@/lib/validation";
import { canMessagePerson } from "@/lib/chat-policy";
import { useAppStore } from "@/stores/app.store";
import { EmojiButton } from "@/components/ui/EmojiButton";
import type { DayStory, Message, MomentItem, Person } from "@/lib/types";

export type MomentReplyComposer = { formId: string; drafts: RefObject<Record<string, string>>; onDraftChange: (ready: boolean) => void; onSendingChange: (sending: boolean) => void };

export function StoryReply({ story, item, person, compact = false, composer }: { story: DayStory; item: MomentItem; person?: Person; compact?: boolean; composer?: MomentReplyComposer }) {
  const { data, update, saving } = useCommunity();
  const [text, setDraft] = useState(() => composer?.drafts.current[item.id] || "");
  const setText = (value: string) => {
    setDraft(value);
    if (composer) {
      composer.drafts.current[item.id] = value;
      composer.onDraftChange(!!value.trim());
    }
  };
  const [error, setError] = useState("");
  const [sentChat, setSentChat] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const viewStory = useAppStore((state) => state.viewStory);
  const notify = useAppStore((state) => state.notify);
  if (!data || story.userId === "me" || data.blocked.includes(story.userId)) return null;
  if (data.authenticated === false) return <Link className="text-link" href="/auth/login?next=%2Fcommunity%2Ftoday">Đăng nhập để trả lời riêng cho người đăng</Link>;
  if (!canMessagePerson(story.userId, data)) return <p className="story-reply-unavailable">Hai người cần là bạn bè để trả lời riêng qua tin nhắn.</p>;
  return <form id={composer?.formId} className={`story-reply ${compact ? "story-reply-direct" : ""}`} aria-label={`Trả lời khoảnh khắc của ${person?.name || "người đăng"}`}
    onSubmit={async (event) => {
      event.preventDefault();
      const parsed = replySchema.safeParse(text);
      if (!parsed.success) { const message = parsed.error.issues[0]?.message || "Nhập lời trả lời."; setError(message); if (compact) notify(message); return; }
      if (saving || submitting.current) return;
      submitting.current = true;
      composer?.onSendingChange(true);
      try {
        const result = await update((draft) => {
          let chat = draft.conversations.find((c) => c.kind !== "group" && c.userId === story.userId);
          if (!chat) {
            chat = { id: newId(), kind: "direct", userId: story.userId, unread: 0, messages: [] };
            draft.conversations.unshift(chat);
          }
          chat.messages.push({ id: newId(), text: parsed.data, own: true, at: new Date().toISOString(),
            storyReply: { storyId: story.id, momentId: item.id } });
        });
        setSentChat(result.conversations.find((c) => c.kind !== "group" && c.userId === story.userId)?.id || "");
        setText(""); setError("");
        if (compact) notify("Đã gửi lời nhắn riêng.");
      } catch (failure) {
        const message = failure instanceof Error ? failure.message : "Chưa gửi được lời nhắn. Bạn thử lại nhé.";
        setError(message);
        if (compact) notify(message);
      } finally {
        submitting.current = false;
        composer?.onSendingChange(false);
      }
    }}>
    <div className="story-reply-input">
      <input ref={input} aria-label="Lời trả lời ảnh" placeholder="Trả lời riêng…"
        value={text} maxLength={1000} disabled={saving}
        onChange={(event) => { setText(event.target.value); setError(""); setSentChat(""); }}/>
      {!compact && <EmojiButton label="Thêm emoji vào lời trả lời" onSelect={(emoji) => {
        const start = input.current?.selectionStart ?? text.length;
        const end = input.current?.selectionEnd ?? text.length;
        const next = text.slice(0, start) + emoji + text.slice(end);
        if (next.length > 1000) return;
        setText(next);
        requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + emoji.length, start + emoji.length); });
      }}/>}
      {!composer && <button type="submit" className="story-reply-send" disabled={saving || !text.trim()} aria-label="Gửi lời trả lời qua tin nhắn"><Send size={18}/></button>}
    </div>
    {!compact && saving && <p role="status">Đang gửi lời trả lời…</p>}
    {!compact && error && <p className="field-error" role="alert">{error}</p>}
    {!compact && sentChat && <p className="story-reply-sent" role="status"><Check size={15}/>Đã gửi riêng qua tin nhắn.
      <Link href={`/community/messages/${sentChat}`} onClick={() => viewStory(null)}>Mở cuộc trò chuyện</Link></p>}
    {compact && <span className="sr-only" role="status">{saving ? "Đang gửi lời trả lời…" : error || (sentChat ? "Đã gửi lời nhắn riêng." : "")}</span>}
  </form>;
}

export function StoryReplyPreview({ reply }: { reply: NonNullable<Message["storyReply"]> }) {
  const viewStory = useAppStore((state) => state.viewStory);
  return reply.image ? <button type="button" className="story-reply-preview"
    onClick={() => viewStory(reply.storyId, 0, reply.momentId)}>
    <img src={reply.image} alt={reply.caption || "Ảnh được trả lời"} loading="lazy"/>
    <span><small>Đã trả lời một khoảnh khắc</small><strong>{reply.caption || "Tell me now"}</strong></span>
  </button> : <div className="story-reply-preview unavailable">Khoảnh khắc không còn khả dụng.</div>;
}
