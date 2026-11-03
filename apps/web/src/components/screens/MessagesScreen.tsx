"use client";
import { replyPreview, replyQuote } from "@/lib/message-reply";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { typingUsers } from "@/lib/chat-indicators";
import { useTypingWatch } from "@/hooks/use-typing-watch";
import { useChatSignals } from "@/hooks/use-chat-signals";
import { useChatRealtime } from "@/lib/chat-realtime";
import { optimisticMutations } from "@/lib/optimistic-mutation";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { TooltipIconButton } from "@/components/ui/TooltipIconButton";
import { ConversationTools } from "@/components/app/ConversationTools";
import { usePresenceStore } from "@/stores/presence.store";
import { useQueryClient } from "@tanstack/react-query";
import { GroupComposer } from "@/components/app/GroupComposer";
import { DEFAULT_GROUP_AVATAR } from "@/lib/social-assets";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  PanelRight,
  MessageCircle,
  PencilLine,
  Send,
  Users,
  X,
  Reply,
} from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { MessageHistory } from "@/components/chat/MessageHistory";
import type { Conversation, AppData, Message } from "@/lib/types";
import { apiRepository, newId, timeOf } from "@/lib/api-repository";
import { messageDraftSchema } from "@/lib/validation";
import { getTellmeSticker } from "@tellme/shared/stickers";
import { TellmeStickerButton, TellmeStickerDraft, TellmeStickerSuggestions, type TellmeSticker } from "@/components/ui/TellmeStickers";
import { canMessageConversation, canMessagePerson } from "@/lib/chat-policy";
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
      avatar: chat.avatar || DEFAULT_GROUP_AVATAR,
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
  return <Avatar person={conversationPerson(data, chat)} size={large ? "lg" : "md"} />;
}
export function MessagesScreen({
  conversationId,
}: {
  conversationId?: string;
}) {
  const { data, update, saving } = useCommunity();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [stickerId, setStickerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [creating, setCreating] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const detailsButton = useRef<HTMLButtonElement>(null);
  const closeDetails = () => { setDetailsOpen(false); requestAnimationFrame(() => detailsButton.current?.focus({ preventScroll: true })); };
  const inputRef = useRef<HTMLInputElement>(null);
  const selectReply = useCallback((message: Message) => {
    setReplyTo(message);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }, []);
  const conversations = data
    ? data.conversations
        .filter((entry) => !data.blocked.includes(entry.userId))
        .sort((left, right) => {
          const leftAt = Date.parse(left.messages.at(-1)?.at || "") || 0;
          const rightAt = Date.parse(right.messages.at(-1)?.at || "") || 0;
          return rightAt - leftAt;
        })
    : [];
  const conversation = conversationId
    ? conversations.find((entry) => entry.id === conversationId)
    : conversations[0];
  const activeConversationId = useRef(conversation?.id);
  activeConversationId.current = conversation?.id;
  const person = useMemo(() => conversationPerson(data, conversation), [data, conversation]);
  const online = usePresenceStore((state) => !!person?.id && !!state.online[person.id]);
  useEffect(() => { setDetailsOpen(false); }, [conversation?.id]);
  useEffect(() => { setStickerId(null); setText(""); setReplyTo(null); setError(""); setSending(false); sendingRef.current = false; }, [conversation?.id]);
  const selectSticker = (sticker: TellmeSticker) => {
    setStickerId(sticker.id);
    setError("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const canSend = !!data && !!conversation && canMessageConversation(conversation, data);
  const lastMessage = conversation?.messages.at(-1);
  const chatScroll = useChatScroll(conversation?.id, lastMessage?.id, lastMessage?.own);
  const signals = useChatSignals(conversation, chatScroll.viewport);
  const typingPeers = useChatRealtime((state) => state.peers);
  const typingIds = useMemo(() => typingUsers(typingPeers, conversation?.id || ""), [typingPeers, conversation?.id]);
  const listIds = conversations.map((entry) => entry.id).join(",");
  useTypingWatch(conversation?.id, listIds);

  if (!data) return <Loader />;
  return (
    <>
      <h1 className="sr-only">Tin nhắn</h1>
      <section
        className={`messaging ${conversationId ? "has-selection" : "without-selection"}`}
      >
        <aside className="conversation-list">
          <header>
            <h2>
              Tin nhắn <span>{conversations.length}</span>
            </h2>
            <div className="message-create-actions">
              <TooltipIconButton label="Tạo nhóm chat" onClick={() => setCreatingGroup(true)}><Users size={20} /></TooltipIconButton>
              <TooltipIconButton label="Cuộc trò chuyện mới" onClick={() => setCreating(true)}><PencilLine size={20} /></TooltipIconButton>
            </div>
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
                const entryTypingIds = typingUsers(typingPeers, entry.id);
                return (
                  <Link
                    key={entry.id}
                    data-conversation-id={entry.id}
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
                        {entryTypingIds.length ? <TypingIndicator inline group={entry.kind === "group"} userIds={entryTypingIds} people={data.people} /> : last
                          ? `${last.own ? "Bạn: " : ""}${last.stickerId ? `Sticker · ${getTellmeSticker(last.stickerId)?.label || "Tellme"}${last.text ? " · " : ""}` : ""}${last.text}`
                          : "Bắt đầu câu chuyện…"}
                      </span>
                    </span>
                    {entry.unread > 0 && (
                      <b className="conversation-unread notification-marker">{entry.unread}</b>
                    )}
                  </Link>
                );
              })}
          </div>
        </aside>
        <div className={`chat-workspace ${detailsOpen && conversation ? "details-open" : ""}`} onKeyDown={(event) => {
          if (event.key === "Escape" && detailsOpen && !(event.target as HTMLElement).closest("dialog")) { event.preventDefault(); closeDetails(); }
        }}>
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
                      : online ? "Đang hoạt động" : "Cuộc trò chuyện"}
                  </small>
                </div>
                <button type="button" ref={detailsButton} className={`icon-button chat-details-toggle ${detailsOpen ? "active" : ""}`} aria-label={detailsOpen ? "Đóng thông tin trò chuyện" : "Mở thông tin và chức năng trò chuyện"} aria-controls={detailsId} aria-expanded={detailsOpen} onClick={() => detailsOpen ? closeDetails() : setDetailsOpen(true)}><PanelRight size={21} /></button>
              </header>
              <div className="chat-messages" ref={chatScroll.viewport} role="region" aria-label="Lịch sử tin nhắn" tabIndex={0}>
                <MessageHistory ref={chatScroll.history} data={data} conversation={conversation} person={person} typingIds={typingIds} onReply={selectReply} />
              </div>

              {canSend ? <form
                className="chat-composer"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (saving || sendingRef.current) return;
                  const parsed = messageDraftSchema.safeParse({ text, stickerId: stickerId || undefined, replyToId: replyTo?.id });
                  if (!parsed.success) {
                    setError(
                      parsed.error.issues[0]?.message ||
                        "Kiểm tra lại tin nhắn.",
                    );
                    return;
                  }
                  const message = {
                    id: newId(),
                    text: parsed.data.text,
                    ...(parsed.data.stickerId ? { stickerId: parsed.data.stickerId } : {}),
                    own: true as const,
                    pending: true,
                    ...(replyTo ? { replyTo: replyQuote(replyTo) } : {}),
                    at: new Date().toISOString(),
                  };
                  signals.stop();
                  sendingRef.current = true;
                  setSending(true);
                  const replyDraft = replyTo;
                  setText("");
                  setReplyTo(null);
                  setStickerId(null);
                  setError("");
                  try {
                    await optimisticMutations(queryClient).run({
                      scope: `conversation:${conversation.id}`,
                      matches: (query) => query.queryKey[0] === "tellme" && query.queryKey[1] === "community",
                      apply: (value) => {
                        const current = value as AppData | undefined;
                        return current && ({ ...current, conversations: current.conversations.map((entry) => entry.id !== conversation.id || entry.messages.some((item) => item.id === message.id) ? entry : { ...entry, messages: [...entry.messages, message] }) });
                      },
                      reconcile: (value, result) => {
                        const current = value as AppData | undefined;
                        return current && ({ ...current, conversations: current.conversations.map((entry) => entry.id !== conversation.id ? entry : { ...entry, messages: entry.messages.some((item) => item.id === message.id) ? entry.messages.map((item) => item.id === message.id ? result.message : item) : [...entry.messages, result.message] }) });
                      },
                      execute: () => apiRepository.sendMessage(conversation.id, { id: message.id, text: message.text, ...(parsed.data.replyToId ? { replyToId: parsed.data.replyToId } : {}), ...(parsed.data.stickerId ? { stickerId: parsed.data.stickerId } : {}) }),
                    });
                  } catch (sendError) {
                    // A socket acknowledgement can arrive even if the HTTP response is lost.
                    const acknowledged = queryClient.getQueryData<AppData>(["tellme", "community"])?.conversations
                      .find((entry) => entry.id === conversation.id)?.messages.some((entry) => entry.id === message.id && !entry.pending);
                    if (!acknowledged && activeConversationId.current === conversation.id) {
                      setText((current) => current || parsed.data.text);
                      setReplyTo((current) => current || replyDraft);
                      setStickerId((current) => current || parsed.data.stickerId || null);
                      setError(sendError instanceof Error ? sendError.message : "Chưa gửi được tin nhắn. Bạn thử lại nhé.");
                    }
                  } finally {
                    if (activeConversationId.current === conversation.id) {
                      sendingRef.current = false;
                      setSending(false);
                    }
                  }
                }}
              >
                {replyTo && <div className="chat-reply-draft"><Reply size={17} /><span><strong>Trả lời {replyTo.own ? "chính bạn" : data.people.find((entry) => entry.id === replyTo.userId)?.name || person.name}</strong><span>{replyPreview(replyTo)}</span></span><button type="button" aria-label="Hủy trả lời" onClick={() => setReplyTo(null)}><X size={17} /></button></div>}
                {stickerId ? <TellmeStickerDraft id={stickerId} onRemove={() => setStickerId(null)} />
                  : <TellmeStickerSuggestions key={conversation.id} text={text} onSelect={selectSticker} showLabels={false} />}
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
                  <TellmeStickerButton key={conversation.id} label="Thêm sticker Tellme vào tin nhắn" disabled={saving || sending} onSelect={selectSticker} showLabels={false} />
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
                      signals.input(event.target.value);
                      setError("");
                    }}
                  />
                  <button
                    type="submit"
                    aria-label="Gửi tin nhắn"
                    disabled={(!text.trim() && !stickerId) || saving || sending}
                  >
                    <Send size={20} />
                  </button>
                </div>
                {error && (
                  <p className="field-error" role="alert">
                    {error}
                  </p>
                )}
              </form> : <div className="chat-unavailable" role="status">{conversation.kind === "group" ? "Nhóm hiện không thể gửi tin. Kiểm tra các tài khoản đã chặn hoặc không còn khả dụng." : "Hai người cần follow nhau để tiếp tục nhắn tin. Lịch sử trò chuyện vẫn được giữ lại."}</div>}
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
        {conversation && <ConversationTools key={conversation.id} chat={conversation} data={data} open={detailsOpen} panelId={detailsId} onClose={closeDetails} />}
        </div>
      </section>
      {creatingGroup && <Modal title="Tạo nhóm chat" className="create-group-dialog" onClose={() => setCreatingGroup(false)}><div className="dialog-body"><GroupComposer data={data} onCreated={(id) => { setCreatingGroup(false); router.push(`/community/messages/${id}`); }} /></div></Modal>}
      {creating && (
        <Modal
          title="Bắt đầu một cuộc trò chuyện"
          onClose={() => setCreating(false)}
        >
          <div className="dialog-body new-conversation-list">
            <button onClick={() => { setCreating(false); setCreatingGroup(true); }}><Users size={24} /><span><strong>Tạo nhóm chat</strong><small>Đặt tên và chọn avatar cho hội của bạn</small></span></button>
            {data.people
              .filter(
                (entry) =>
                  canMessagePerson(entry.id, data),
              )
              .map((user) => (
                <button
                  key={user.id}
                  onClick={async () => {
                    try {
                      let id = conversations.find(
                        (entry) => entry.kind !== "group" && entry.userId === user.id,
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
            {!data.people.some((entry) => canMessagePerson(entry.id, data)) && <p>Chưa có bạn bè để nhắn tin. Khi hai người cùng follow nhau, họ sẽ xuất hiện ở đây.</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
