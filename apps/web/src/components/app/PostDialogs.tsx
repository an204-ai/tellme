"use client";
import { postPersona } from "@/components/ui/AnonymousAvatar";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import { GroupComposer } from "./GroupComposer";
import { DEFAULT_GROUP_AVATAR } from "@/lib/social-assets";
import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Instagram,
  MessageCircle,
  Music2,
  Plus,
  Send,
} from "lucide-react";
import type { AppData, Post } from "@/lib/types";
import { reactorIds } from "@/lib/visibility";
import { canMessageConversation, canMessagePerson } from "@/lib/chat-policy";
import { newId } from "@/lib/api-repository";
import { useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import {
  Avatar,
  Button,
  Empty,
  Input,
  SearchInput,
} from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";

export function PostLikers({
  post,
  data,
  onClose,
}: {
  post: Post;
  data: AppData;
  onClose: () => void;
}) {
  const ids = reactorIds(post, data);
  return (
    <Modal
      title={`Người bày tỏ cảm xúc · ${ids.length}`}
      onClose={onClose}
      className="post-likers-dialog"
    >
      <div className="likers-list">
        {ids.length ? (
          ids.map((id) => {
            const person = data.people.find((entry) => entry.id === id)!;
            return (
              <Link
                href={`/community/profile/${person.username}`}
                key={id}
                onClick={onClose}
              >
                <Avatar person={person} />
                <span>
                  <strong>
                    {person.name}
                    {id === "me" ? " (Bạn)" : ""}
                  </strong>
                  <small>@{person.username}</small>
                </span>
                <ReactionIcon value={id === "me" ? post.reaction || "like" : post.reactorReactions?.[id] || "like"} />
              </Link>
            );
          })
        ) : (
          <Empty
            title="Chưa có lượt cảm xúc"
            text="Hãy là người đầu tiên yêu thích câu chuyện này."
          />
        )}
      </div>
    </Modal>
  );
}

export function SharePost({
  post,
  data,
  onClose,
}: {
  post: Post;
  data: AppData;
  onClose: () => void;
}) {
  const { update, saving } = useCommunity();
  const notify = useAppStore((state) => state.notify);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const [sendError, setSendError] = useState("");
  const url = `${window.location.origin}/post/${post.id}`;
  const friends = data.people.filter(
    (person) => canMessagePerson(person.id, data),
  );
  const groups = data.conversations.filter((chat) => chat.kind === "group" && canMessageConversation(chat, data));
  const targets = new Set([...friends.map((person) => person.id), ...groups.map((group) => `group:${group.id}`)]);
  const chosen = selected.filter((id) => targets.has(id));
  const author = data.people.find((person) => person.id === post.authorId);
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  const copy = async (destination?: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setFailed(false);
      setStatus(
        destination
          ? `Đã sao chép liên kết. Dán vào ${destination} để chia sẻ.`
          : "Đã sao chép liên kết.",
      );
      await update((draft) => {
        const target = draft.posts.find((entry) => entry.id === post.id);
        if (target) target.shares += 1;
      });
    } catch {
      setFailed(true);
      setStatus(
        "Chưa sao chép được. Bạn có thể chọn và sao chép liên kết bên dưới.",
      );
    }
  };
  const send = async () => {
    if (!chosen.length || saving) return;
    setSendError("");
    try {
      await update((draft) => {
        for (const target of chosen) {
          let chat = target.startsWith("group:")
            ? draft.conversations.find(
                (entry) =>
                  entry.id === target.slice(6) && entry.kind === "group",
              )
            : draft.conversations.find(
                (entry) => entry.userId === target && entry.kind !== "group",
              );
          if (!chat && !target.startsWith("group:")) {
            chat = {
              id: newId(),
              userId: target,
              kind: "direct",
              unread: 0,
              messages: [],
            };
            draft.conversations.unshift(chat);
          }
          if (chat)
            chat.messages.push({
              id: newId(),
              text: "Đã chia sẻ một câu chuyện",
              postId: post.id,
              own: true,
              at: new Date().toISOString(),
            });
        }
        const target = draft.posts.find((entry) => entry.id === post.id);
        if (target) target.shares += chosen.length;
      });
      notify(`Đã gửi câu chuyện tới ${chosen.length} cuộc trò chuyện.`);
      onClose();
    } catch (failure) {
      setSendError(failure instanceof Error ? failure.message : "Chưa gửi được. Bạn thử lại nhé.");
    }
  };
  return (
    <Modal
      title="Chia sẻ câu chuyện"
      onClose={onClose}
      className="share-post-dialog"
    >
      <div className="share-body">
        <div className="share-post-preview">
          {post.image && (
            <img src={post.image} alt="Ảnh bài viết được chia sẻ" />
          )}
          <div>
            <strong>
              {post.anonymous ? postPersona(post).name : author?.name}
            </strong>
            <p>{post.content || "Một khoảnh khắc đáng nhớ."}</p>
          </div>
        </div>
        <div className="share-section-heading">
          <h3>Gửi trong Tellme</h3>
          <button
            type="button"
            disabled={friends.length < 2 || saving}
            onClick={() => setCreatingGroup(!creatingGroup)}
          >
            <Plus size={16} />
            Tạo nhóm
          </button>
        </div>
        {creatingGroup && (
          <GroupComposer data={data} onCreated={(id) => { setSelected((current) => [...current, `group:${id}`]); setCreatingGroup(false); }} />
        )}

        <SearchInput
          aria-label="Tìm bạn bè hoặc nhóm để chia sẻ"
          placeholder="Tìm bạn bè hoặc nhóm…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div
          className="share-recipients"
          role="group"
          aria-label="Chọn người nhận, cuộn ngang để xem thêm"
          tabIndex={0}
        >
          {groups
            .filter((group) =>
              group.title
                ?.toLocaleLowerCase("vi")
                .includes(search.toLocaleLowerCase("vi")),
            )
            .map((group) => (
              <label key={group.id}>
                <Avatar person={{ name: group.title || "Nhóm chat", avatar: group.avatar || DEFAULT_GROUP_AVATAR }} />
                <span>
                  <strong>{group.title}</strong>
                  <small>{group.participantIds?.length || 0} thành viên</small>
                </span>
                <input
                  aria-label={`Gửi tới nhóm ${group.title}`}
                  type="checkbox"
                  checked={selected.includes(`group:${group.id}`)}
                  onChange={() => toggle(`group:${group.id}`)}
                />
              </label>
            ))}
          {friends
            .filter((person) =>
              person.name
                .toLocaleLowerCase("vi")
                .includes(search.toLocaleLowerCase("vi")),
            )
            .map((person) => (
              <label key={person.id}>
                <Avatar person={person} />
                <span>
                  <strong>{person.name}</strong>
                  <small>
                    @{person.username}
                  </small>
                </span>
                <input
                  aria-label={`Gửi tới ${person.name}`}
                  type="checkbox"
                  checked={selected.includes(person.id)}
                  onChange={() => toggle(person.id)}
                />
              </label>
            ))}
        </div>
        {!friends.length && !groups.length && <p>Chưa có bạn bè hoặc nhóm phù hợp để gửi. Bạn vẫn có thể sao chép liên kết bên dưới.</p>}
        {sendError && <p className="field-error" role="alert">{sendError}</p>}
        <Button
          className="full-width"
          disabled={!chosen.length || saving}
          onClick={() => void send()}
        >
          <Send size={17} />
          {chosen.length
            ? `Gửi tới ${chosen.length} cuộc trò chuyện`
            : "Chọn người nhận"}
        </Button>
        <div className="share-section-heading">
          <h3>Chia sẻ liên kết</h3>
        </div>
        <div className="share-networks">
          <button type="button" onClick={() => void copy()}>
            <Copy />
            <span>Sao chép</span>
          </button>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Facebook />
            <span>Facebook</span>
          </a>
          <a
            href="https://www.instagram.com/"
            aria-label="Instagram — sao chép liên kết và mở trang"
            target="_blank"
            rel="noreferrer"
            onClick={() => void copy("Instagram")}
          >
            <Instagram />
            <span>Instagram</span>
          </a>
          <a
            href="https://www.tiktok.com/"
            aria-label="TikTok — sao chép liên kết và mở trang"
            target="_blank"
            rel="noreferrer"
            onClick={() => void copy("TikTok")}
          >
            <Music2 />
            <span>TikTok</span>
          </a>
        </div>
        {status && (
          <p className="share-status" role="status">
            {status}
          </p>
        )}
        {failed && (
          <Input
            aria-label="Liên kết bài viết để sao chép"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </div>
    </Modal>
  );
}
