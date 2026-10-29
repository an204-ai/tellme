"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Heart,
  Instagram,
  MessageCircle,
  Music2,
  Plus,
  Send,
  Users,
} from "lucide-react";
import type { AppData, Post } from "@/lib/types";
import { reactorIds } from "@/lib/visibility";
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
      title={`Người thả tim · ${ids.length}`}
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
                <Heart size={19} fill="currentColor" />
              </Link>
            );
          })
        ) : (
          <Empty
            title="Chưa có lượt thả tim"
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
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const url = `${window.location.origin}/post/${post.id}`;
  const friends = data.people.filter(
    (person) => person.id !== "me" && !data.blocked.includes(person.id),
  );
  const groups = data.conversations.filter((chat) => chat.kind === "group");
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
    try {
      await update((draft) => {
        for (const target of selected) {
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
        if (target) target.shares += selected.length;
      });
      notify(`Đã gửi câu chuyện tới ${selected.length} cuộc trò chuyện.`);
      onClose();
    } catch {
      /* The mutation error is announced by useCommunity. */
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
              {post.anonymous ? "Một người kể chuyện" : author?.name}
            </strong>
            <p>{post.content || "Một khoảnh khắc đáng nhớ."}</p>
          </div>
        </div>
        <div className="share-section-heading">
          <h3>Gửi trong Tellme</h3>
          <button
            type="button"
            onClick={() => setCreatingGroup(!creatingGroup)}
          >
            <Plus size={16} />
            Tạo nhóm
          </button>
        </div>
        {creatingGroup && (
          <div className="share-create-group">
            <Input
              aria-label="Tên nhóm chat"
              placeholder="Tên nhóm của bạn…"
              value={groupName}
              maxLength={60}
              onChange={(event) => setGroupName(event.target.value)}
            />
            <p>Chọn ít nhất 2 người bạn</p>
            <div>
              {friends.map((person) => (
                <label key={person.id}>
                  <input
                    type="checkbox"
                    checked={members.includes(person.id)}
                    onChange={() =>
                      setMembers((current) =>
                        current.includes(person.id)
                          ? current.filter((id) => id !== person.id)
                          : [...current, person.id],
                      )
                    }
                  />
                  <Avatar person={person} size="xs" />
                  {person.name}
                </label>
              ))}
            </div>
            <Button
              variant="secondary"
              disabled={members.length < 2 || !groupName.trim() || saving}
              onClick={async () => {
                try {
                  const id = newId();
                  await update((draft) => {
                    draft.conversations.unshift({
                      id,
                      kind: "group",
                      title: groupName.trim(),
                      participantIds: ["me", ...members],
                      userId: "me",
                      unread: 0,
                      messages: [],
                    });
                  });
                  setSelected((current) => [...current, `group:${id}`]);
                  setCreatingGroup(false);
                  setMembers([]);
                  setGroupName("");
                } catch {
                  /* The mutation error is announced by useCommunity. */
                }
              }}
            >
              Tạo nhóm
            </Button>
          </div>
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
                <span className="group-avatar">
                  <Users size={23} />
                </span>
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
                    {data.following.includes(person.id)
                      ? "Đang follow"
                      : `@${person.username}`}
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
        <Button
          className="full-width"
          disabled={!selected.length || saving}
          onClick={() => void send()}
        >
          <Send size={17} />
          {selected.length
            ? `Gửi tới ${selected.length} cuộc trò chuyện`
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
