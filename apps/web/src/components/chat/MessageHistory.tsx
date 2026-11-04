"use client";
import { ReplyableMessage } from "./ReplyableMessage";
import { messageReaders } from "@/lib/chat-indicators";
import { forwardRef, memo } from "react";
import { getTellmeSticker } from "@tellme/shared/stickers";
import { Avatar } from "@/components/ui/Primitives";
import { SharedPostPreview } from "@/components/app/SharedPostPreview";
import { StoryReplyPreview } from "@/components/app/StoryReply";
import { timeOf } from "@/lib/api-repository";
import type { AppData, Conversation, Person, Message } from "@/lib/types";

type HistoryProps = { data: AppData; conversation: Conversation; person: Person; onReply: (message: Message) => void };

/** Typing a draft must not rebuild an unchanged conversation history. */
export const MessageHistory = memo(forwardRef<HTMLDivElement, HistoryProps>(function MessageHistory({ data, conversation, person, onReply }, ref) {
  const readers = messageReaders(conversation);
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
        <ReplyableMessage own={message.own} disabled={message.pending} onReply={() => onReply(message)}>
          {message.replyTo && <span className="message-quote"><strong>{message.replyTo.userId === "me" ? "Bạn" : data.people.find((entry) => entry.id === message.replyTo?.userId)?.name || (conversation.kind !== "group" ? person.name : "Thành viên")}</strong><span>{message.replyTo.text || "Sticker"}</span></span>}
          {message.storyReply && <StoryReplyPreview reply={message.storyReply} />}
          {sticker && <img className="message-sticker" src={sticker.src} alt={`Sticker ${sticker.label}`} width={sticker.width} height={sticker.height} loading="lazy" />}
          {message.postId ? <SharedPostPreview id={message.postId} /> : message.text ? <p className="message-bubble">{message.text}</p> : null}
          <span className="chat-message-meta"><time data-message-id={message.own ? undefined : message.id} data-message-at={message.at}>{timeOf(message.at)}</time>
          {message.own && <span className="chat-read-avatars" role="group" aria-label="Người đã xem tin nhắn">{(readers.get(message.id) || []).map((id) => {
            const reader = data.people.find((entry) => entry.id === id) || (conversation.kind !== "group" ? person : undefined);
            return <span key={id} title={`${reader?.name || "Thành viên"} đã xem`}><Avatar person={reader} size="xs" /></span>;
          })}</span>}</span>
        </ReplyableMessage>
      </div>;
    })}
  </div>;
}));
