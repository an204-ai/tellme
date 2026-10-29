"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  MessageCircle,
  PencilLine,
  Send,
  Users,
} from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { SharedPostPreview } from "@/components/app/SharedPostPreview";
import { StoryReplyPreview } from "@/components/app/StoryReply";
import type { Conversation, AppData } from "@/lib/types";
import { newId, timeOf } from "@/lib/api-repository";
import { replySchema } from "@/lib/validation";
import {
  Avatar,
  Button,
  Empty,
  IconButton,
  Loader,
  SearchInput,
} from "@/components/ui/Primitives";
import { EmojiButton } from "@/components/ui/EmojiButton";
import { Modal } from "@/components/ui/Modal";

function conversationPerson(
  data: AppData | undefined,
  chat: Conversation | undefined,
) {
  if (chat?.kind === "group")
    return {
      id: chat.id,
      name: chat.title || "Nhóm trò chuyện",
      username: "",
      avatar: "",
      bio: "",
      cover: "",
      location: "",
    };
  return data?.people.find((person) => person.id === chat?.userId);
}
function ChatAvatar({
  data,
  chat,
  large = false,
}: {
  data: AppData;
  chat: Conversation;
  large?: boolean;
}) {
  return chat.kind === "group" ? (
    <span className={`group-avatar ${large ? "large" : ""}`}>
      <Users size={large ? 32 : 23} />
    </span>
  ) : (
    <Avatar
      person={conversationPerson(data, chat)}
      size={large ? "lg" : "md"}
    />
  );
}
export function MessagesScreen({
  conversationId,
}: {
  conversationId?: string;
}) {
  const { data, update, saving } = useCommunity();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversations =
    data?.conversations.filter(
      (entry) => !data.blocked.includes(entry.userId),
    ) || [];
  const conversation = conversationId
    ? conversations.find((entry) => entry.id === conversationId)
    : conversations[0];
  const person = conversationPerson(data, conversation);
  useEffect(() => {
    const list = bottom.current?.parentElement;
    if (list) list.scrollTop = list.scrollHeight;
  }, [conversation?.messages.length, conversation?.id]);
  useEffect(() => {
    if (conversation?.unread && (conversationId || window.innerWidth > 640)) {
      void update((draft) => {
        const chat = draft.conversations.find(
          (entry) => entry.id === conversation.id,
        );
        if (chat) chat.unread = 0;
      }).catch(() => undefined);
    }
  }, [conversation?.unread, conversationId]);
  if (!data) return <Loader />;
  return (
    <>
      <header className="page-heading social-page-title">
        <h1>Giữ câu chuyện tiếp nối.</h1>
        <p>Một lời hỏi thăm, một cuộc trò chuyện gần hơn.</p>
      </header>
      <section
        className={`messaging ${conversationId ? "has-selection" : "without-selection"}`}
      >
        <aside className="conversation-list">
          <header>
            <h2>
              Tin nhắn <span>{conversations.length}</span>
            </h2>
            <IconButton
              label="Cuộc trò chuyện mới"
              onClick={() => setCreating(true)}
            >
              <PencilLine size={20} />
            </IconButton>
          </header>
          <SearchInput
            placeholder="Tìm cuộc trò chuyện…"
            aria-label="Tìm cuộc trò chuyện"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="conversation-rows">
            {conversations
              .filter((entry) =>
                conversationPerson(data, entry)
                  ?.name.toLocaleLowerCase("vi")
                  .includes(search.toLocaleLowerCase("vi")),
              )
              .map((entry) => {
                const user = conversationPerson(data, entry);
                const last = entry.messages.at(-1);
                return (
                  <Link
                    key={entry.id}
                    className={`conversation-row ${entry.id === conversation?.id ? "selected" : ""}`}
                    href={`/community/messages/${entry.id}`}
                  >
                    <ChatAvatar data={data} chat={entry} />
                    <span>
                      <span className="conversation-row-name">
                        <strong>{user?.name}</strong>
                        <small>{last ? timeOf(last.at) : ""}</small>
                      </span>
                      <span
                        className={`conversation-preview ${entry.unread ? "has-unread" : ""}`}
                      >
                        {last
                          ? `${last.own ? "Bạn: " : ""}${last.text}`
                          : "Bắt đầu câu chuyện…"}
                      </span>
                    </span>
                    {entry.unread > 0 && (
                      <b className="conversation-unread">{entry.unread}</b>
                    )}
                  </Link>
                );
              })}
          </div>
        </aside>
        <div className="chat-content">
          {conversation && person ? (
            <>
              <header className="chat-header">
                <Link
                  href="/community/messages"
                  className="chat-back"
                  aria-label="Về danh sách tin nhắn"
                >
                  <ArrowLeft size={21} />
                </Link>
                <ChatAvatar data={data} chat={conversation} />
                <div>
                  {conversation.kind === "group" ? (
                    <strong className="person-name">{person.name}</strong>
                  ) : (
                    <Link
                      href={`/community/profile/${person.username}`}
                      className="person-name"
                    >
                      {person.name}
                    </Link>
                  )}
                  <small>
                    {conversation.kind === "group"
                      ? `${conversation.participantIds?.length || 0} thành viên · Nhóm chat`
                      : "Cuộc trò chuyện"}
                  </small>
                </div>
                {conversation.kind !== "group" && (
                  <Link
                    href={`/community/profile/${person.username}`}
                    className="icon-button"
                    aria-label={`Xem hồ sơ ${person.name}`}
                  >
                    <ArrowUpRight size={20} />
                  </Link>
                )}
              </header>
              <div className="chat-messages">
                <div className="chat-intro">
                  <ChatAvatar data={data} chat={conversation} large />
                  <strong>{person.name}</strong>
                  <span>Những câu chuyện bắt đầu từ một lời chào.</span>
                </div>
                <span className="chat-day-label">Cuộc trò chuyện của bạn</span>
                {conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-row ${message.own ? "own" : ""}`}
                  >
                    {!message.own && (
                      <Avatar
                        person={
                          data.people.find((p) => p.id === message.userId) ||
                          person
                        }
                        size="xs"
                      />
                    )}
                    <div>
                      {message.storyReply && <StoryReplyPreview reply={message.storyReply}/>}
                      {message.postId ? (
                        <SharedPostPreview id={message.postId} />
                      ) : (
                        <p className="message-bubble">{message.text}</p>
                      )}
                      <time>{timeOf(message.at)}</time>
                    </div>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <form
                className="chat-composer"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const parsed = replySchema.safeParse(text);
                  if (!parsed.success) {
                    setError(
                      parsed.error.issues[0]?.message ||
                        "Kiểm tra lại tin nhắn.",
                    );
                    return;
                  }
                  try {
                    await update((draft) => {
                      const target = draft.conversations.find(
                        (entry) => entry.id === conversation.id,
                      );
                      if (target)
                        target.messages.push({
                          id: newId(),
                          text: parsed.data,
                          own: true,
                          at: new Date().toISOString(),
                        });
                    });
                    setText("");
                    setError("");
                  } catch {
                    /* mutation handles errors */
                  }
                }}
              >
                <div className="chat-input-line">
                  <EmojiButton
                    label="Thêm biểu cảm vào tin nhắn"
                    onSelect={(emoji) => {
                      setText((current) =>
                        current.length + emoji.length <= 1000
                          ? current + emoji
                          : current,
                      );
                      setError("");
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                  />
                  <input
                    ref={inputRef}
                    aria-label="Nhập tin nhắn"
                    value={text}
                    maxLength={1000}
                    placeholder={
                      conversation.kind === "group"
                        ? "Nhắn vào nhóm…"
                        : `Nhắn gì đó cho ${person.name.split(" ").slice(-1)[0]}…`
                    }
                    onChange={(event) => {
                      setText(event.target.value);
                      setError("");
                    }}
                  />
                  <button
                    type="submit"
                    aria-label="Gửi tin nhắn"
                    disabled={!text.trim() || saving}
                  >
                    <Send size={20} />
                  </button>
                </div>
                {error && (
                  <p className="field-error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </>
          ) : (
            <Empty
              icon={<MessageCircle size={35} />}
              title="Một lời chào đang đợi"
              text="Chọn một người bạn để bắt đầu cuộc trò chuyện."
              action={
                <Button onClick={() => setCreating(true)}>Tin nhắn mới</Button>
              }
            />
          )}
        </div>
      </section>
      {creating && (
        <Modal
          title="Bắt đầu một cuộc trò chuyện"
          onClose={() => setCreating(false)}
        >
          <div className="dialog-body new-conversation-list">
            {data.people
              .filter(
                (entry) =>
                  entry.id !== "me" && !data.blocked.includes(entry.id),
              )
              .map((user) => (
                <button
                  key={user.id}
                  onClick={async () => {
                    try {
                      let id = conversations.find(
                        (entry) => entry.userId === user.id,
                      )?.id;
                      if (!id) {
                        id = newId();
                        const created = id;
                        await update((draft) => {
                          draft.conversations.push({
                            id: created,
                            userId: user.id,
                            unread: 0,
                            messages: [],
                          });
                        });
                      }
                      setCreating(false);
                      router.push(`/community/messages/${id}`);
                    } catch {
                      /* The mutation error is announced by useCommunity. */
                    }
                  }}
                >
                  <Avatar person={user} />
                  <span>
                    <strong>{user.name}</strong>
                    <small>@{user.username}</small>
                  </span>
                  <MessageCircle size={19} />
                </button>
              ))}
          </div>
        </Modal>
      )}
    </>
  );
}
