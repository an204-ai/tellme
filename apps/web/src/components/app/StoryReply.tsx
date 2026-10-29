"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Send } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { newId } from "@/lib/api-repository";
import { replySchema } from "@/lib/validation";
import { useAppStore } from "@/stores/app.store";
import { EmojiButton } from "@/components/ui/EmojiButton";
import type { DayStory, Message, MomentItem, Person } from "@/lib/types";

export function StoryReply({ story, item, person }: { story: DayStory; item: MomentItem; person?: Person }) {
  const { data, update, saving } = useCommunity();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sentChat, setSentChat] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const viewStory = useAppStore((state) => state.viewStory);
  if (!data || story.userId === "me" || data.blocked.includes(story.userId)) return null;
  return <form className="story-reply" aria-label={`Trả lời khoảnh khắc của ${person?.name || "người đăng"}`}
    onSubmit={async (event) => {
      event.preventDefault();
      const parsed = replySchema.safeParse(text);
      if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Nhập lời trả lời."); return; }
      if (saving) return;
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
      } catch (failure) { setError((failure as Error).message); }
    }}>
    <div className="story-reply-input">
      <input ref={input} aria-label="Lời trả lời ảnh" placeholder={`Trả lời riêng cho ${person?.name || "người đăng"}…`}
        value={text} maxLength={1000} disabled={saving}
        onChange={(event) => { setText(event.target.value); setError(""); setSentChat(""); }}/>
      <EmojiButton label="Thêm emoji vào lời trả lời" onSelect={(emoji) => {
        const start = input.current?.selectionStart ?? text.length;
        const end = input.current?.selectionEnd ?? text.length;
        const next = text.slice(0, start) + emoji + text.slice(end);
        if (next.length > 1000) return;
        setText(next);
        requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + emoji.length, start + emoji.length); });
      }}/>
      <button type="submit" className="story-reply-send" disabled={saving || !text.trim()} aria-label="Gửi lời trả lời qua tin nhắn"><Send size={18}/></button>
    </div>
    {saving && <p role="status">Đang gửi lời trả lời…</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {sentChat && <p className="story-reply-sent" role="status"><Check size={15}/>Đã gửi riêng qua tin nhắn.
      <Link href={`/community/messages/${sentChat}`} onClick={() => viewStory(null)}>Mở cuộc trò chuyện</Link></p>}
  </form>;
}

export function StoryReplyPreview({ reply }: { reply: NonNullable<Message["storyReply"]> }) {
  const viewStory = useAppStore((state) => state.viewStory);
  return reply.image ? <button type="button" className="story-reply-preview"
    onClick={() => viewStory(reply.storyId, 0, reply.momentId)}>
    <img src={reply.image} alt={reply.caption || "Ảnh được trả lời"} loading="lazy"/>
    <span><small>Đã trả lời một khoảnh khắc</small><strong>{reply.caption || "Tell me · Tell you"}</strong></span>
  </button> : <div className="story-reply-preview unavailable">Khoảnh khắc không còn khả dụng.</div>;
}
