"use client";
import { forwardRef, memo } from "react";
import { getTellmeSticker } from "@tellme/shared/stickers";
import { Avatar } from "@/components/ui/Primitives";
import { SharedPostPreview } from "@/components/app/SharedPostPreview";
import { StoryReplyPreview } from "@/components/app/StoryReply";
import { timeOf } from "@/lib/api-repository";
import type { AppData, Conversation, Person } from "@/lib/types";

type HistoryProps = { data: AppData; conversation: Conversation; person: Person };

/** Typing a draft must not rebuild an unchanged conversation history. */
export const MessageHistory = memo(forwardRef<HTMLDivElement, HistoryProps>(function MessageHistory({ data, conversation, person }, ref) {
  return <div className="chat-message-history" ref={ref}>
    <div className="chat-intro">
      <Avatar person={person} size="lg" />
      <strong>{person.name}</strong>
      <span>Bắt chuyện bằng một lời chào nhé.</span>
    </div>
    <span className="chat-day-label">Cuộc trò chuyện của bạn</span>
    {conversation.messages.map((message) => {
      const sticker = getTellmeSticker(message.stickerId);
      return <div key={message.id} className={`message-row ${message.own ? "own" : ""}`}>
        {!message.own && <Avatar person={data.people.find((entry) => entry.id === message.userId) || person} size="xs" />}
        <div>
          {message.storyReply && <StoryReplyPreview reply={message.storyReply} />}
          {sticker && <img className="message-sticker" src={sticker.src} alt={`Sticker ${sticker.label}`} width={sticker.width} height={sticker.height} loading="lazy" />}
          {message.postId ? <SharedPostPreview id={message.postId} /> : message.text ? <p className="message-bubble">{message.text}</p> : null}
          <time>{timeOf(message.at)}</time>
        </div>
      </div>;
    })}
  </div>;
}));
