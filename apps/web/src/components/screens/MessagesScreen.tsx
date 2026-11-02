"use client";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { TooltipIconButton } from "@/components/ui/TooltipIconButton";
import { ConversationTools } from "@/components/app/ConversationTools";
import { usePresenceStore } from "@/stores/presence.store";
import { useQueryClient } from "@tanstack/react-query";
import { GroupComposer } from "@/components/app/GroupComposer";
import { DEFAULT_GROUP_AVATAR } from "@/lib/social-assets";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  PanelRight,
  MessageCircle,
  PencilLine,
  Send,
  Users,
} from "lucide-react";
import { communityKey, useCommunity } from "@/hooks/use-community";
import { MessageHistory } from "@/components/chat/MessageHistory";
import type { Conversation, AppData } from "@/lib/types";
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
  const conversations =
    data?.conversations.filter(
      (entry) => !data.blocked.includes(entry.userId),
    ) || [];
  const conversation = conversationId
    ? conversations.find((entry) => entry.id === conversationId)
    : conversations[0];
  const activeConversationId = useRef(conversation?.id);
  activeConversationId.current = conversation?.id;
  const person = useMemo(() => conversationPerson(data, conversation), [data, conversation]);
  const online = usePresenceStore((state) => !!person?.id && !!state.online[person.id]);
  useEffect(() => { setDetailsOpen(false); }, [conversation?.id]);
  useEffect(() => { setStickerId(null); setText(""); setError(""); setSending(false); sendingRef.current = false; }, [conversation?.id]);
  const selectSticker = (sticker: TellmeSticker) => {
    setStickerId(sticker.id);
    setError("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const canSend = !!data && !!conversation && canMessageConversation(conversation, data);
  const lastMessage = conversation?.messages.at(-1);
  const chatScroll = useChatScroll(conversation?.id, lastMessage?.id, lastMessage?.own);
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
                          ? `${last.own ? "Bạn: " : ""}${last.stickerId ? `Sticker · ${getTellmeSticker(last.stickerId)?.label || "Tellme"}${last.text ? " · " : ""}` : ""}${last.text}`
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
                <MessageHistory ref={chatScroll.history} data={data} conversation={conversation} person={person} />
              </div>
              {canSend ? <form
                className="chat-composer"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (saving || sendingRef.current) return;
                  const parsed = messageDraftSchema.safeParse({ text, stickerId: stickerId || undefined });
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
                    at: new Date().toISOString(),
                  };
                  sendingRef.current = true;
                  setSending(true);
                  setText("");
                  setStickerId(null);
                  setError("");
                  queryClient.setQueryData<AppData>(communityKey, (current) => current && ({
                    ...current,
                    conversations: current.conversations.map((entry) => entry.id === conversation.id
                      ? { ...entry, messages: [...entry.messages, message] }
                      : entry),
                  }));
                  try {
                    await apiRepository.sendMessage(conversation.id, {
                      id: message.id,
                      text: message.text,
                      ...(parsed.data.stickerId ? { stickerId: parsed.data.stickerId } : {}),
                    });
                    void queryClient.invalidateQueries({ queryKey: communityKey });
                  } catch (sendError) {
                    queryClient.setQueryData<AppData>(communityKey, (current) => current && ({
                      ...current,
                      conversations: current.conversations.map((entry) => entry.id === conversation.id
                        ? { ...entry, messages: entry.messages.filter((item) => item.id !== message.id) }
                        : entry),
                    }));
                    if (activeConversationId.current === conversation.id) {
                      setText((current) => current || parsed.data.text);
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
