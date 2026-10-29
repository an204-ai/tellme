"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  ShieldOff,
  Sticker,
  X,
  ThumbsUp,
  Trash2,
  UserRound,
} from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { reactorIds } from "@/lib/visibility";
import { PostLikers, SharePost } from "./PostDialogs";
import { newId, timeAgo } from "@/lib/api-repository";
import { commentSchema } from "@/lib/validation";
import type {
  Comment,
  CommentMedia,
  AppData,
  Post,
  Reaction,
} from "@/lib/types";
import { useAppStore } from "@/stores/app.store";
import {
  Avatar,
  Button,
  HeartButton,
  IconButton,
  PrivacyIcon,
  privacyNames,
} from "@/components/ui/Primitives";
import { EmojiButton } from "@/components/ui/EmojiButton";
import { GiphyPicker } from "./GiphyPicker";
import { Modal } from "@/components/ui/Modal";
import { PostPhoto } from "@/components/ui/PostPhoto";

export const reactions: { value: Reaction; emoji: string; label: string }[] = [
  { value: "like", emoji: "👍", label: "Thích" },
  { value: "cheer", emoji: "👏🏻", label: "Tán thưởng" },
  { value: "celebrate", emoji: "🎉", label: "Chúc mừng" },
  { value: "appreciate", emoji: "✨", label: "Trân trọng" },
  { value: "smile", emoji: "🙂", label: "Vui vẻ" },
];
export function PostCard({
  post,
  data,
  expanded = false,
}: {
  post: Post;
  data: AppData;
  expanded?: boolean;
}) {
  const { update, saving } = useCommunity();
  const notify = useAppStore((state) => state.notify);
  const author =
    data.people.find((person) => person.id === post.authorId) ||
    (post.anonymous
      ? {
          id: "anonymous",
          username: "",
          name: "Một người kể chuyện",
          avatar: "/images/avatar-default.svg",
          bio: "",
          cover: "",
          location: "",
        }
      : undefined);
  const [commentsOpen, setCommentsOpen] = useState(expanded);
  const [media, setMedia] = useState<CommentMedia | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("spam");
  const replyInput = useRef<HTMLTextAreaElement>(null);
  if (!author) return null;
  const count = reactorIds(post, data).length;
  const changePost = (change: (post: Post) => void) =>
    update((draft) => {
      const target = draft.posts.find((entry) => entry.id === post.id);
      if (target) change(target);
    });
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = commentSchema.safeParse({ text, media });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Kiểm tra bình luận.");
      return;
    }
    try {
      await changePost((target) => {
        target.comments.push({
          id: newId(),
          userId: "me",
          content: parsed.data.text,
          ...(parsed.data.media ? { media: parsed.data.media } : {}),
          createdAt: new Date().toISOString(),
          ...(replyTo ? { parentId: replyTo.parentId || replyTo.id } : {}),
        });
      });
      setText("");
      setMedia(null);
      setError("");
      setReplyTo(null);
    } catch {
      /* mutation presents the error */
    }
  };
  const renderComment = (comment: Comment) => {
    if (data.blocked.includes(comment.userId)) return null;
    const person = data.people.find((entry) => entry.id === comment.userId);
    return (
      <div
        className={`comment-row ${comment.parentId ? "is-reply" : ""}`}
        key={comment.id}
      >
        <Avatar person={person} size="sm" />
        <div className="comment-body">
          <div className="comment-bubble">
            <Link
              href={person ? `/community/profile/${person.username}` : "/community/profile"}
              className="person-name"
            >
              {person?.name || "Thành viên"}
            </Link>
            {comment.content && <p>{comment.content}</p>}
            {comment.media && (
              <img
                className={`comment-media ${comment.media.kind}`}
                src={comment.media.url}
                alt={comment.media.alt}
                loading="lazy"
                width={comment.media.width}
                height={comment.media.height}
              />
            )}
          </div>
          <div className="comment-meta">
            <span>{timeAgo(comment.createdAt)}</span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(comment);
                replyInput.current?.focus();
              }}
            >
              Trả lời
            </button>
            <button
              type="button"
              className={comment.liked ? "text-primary" : ""}
              aria-label={
                comment.liked ? "Bỏ thích bình luận" : "Thích bình luận"
              }
              aria-pressed={!!comment.liked}
              onClick={() =>
                void changePost((target) => {
                  const item = target.comments.find(
                    (entry) => entry.id === comment.id,
                  );
                  if (item) item.liked = !item.liked;
                }).catch(() => undefined)
              }
            >
              <Heart size={12} fill={comment.liked ? "currentColor" : "none"} />
              {comment.liked ? "1" : "Thích"}
            </button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <article className="post-card" id={`post-${post.id}`}>
      <header className="post-header">
        <Link
          href={post.anonymous ? "#" : `/community/profile/${author.username}`}
          aria-label={
            post.anonymous ? "Người đăng ẩn danh" : `Hồ sơ ${author.name}`
          }
        >
          {post.anonymous ? (
            <span className="anonymous-avatar">
              <UserRound size={22} />
            </span>
          ) : (
            <Avatar person={author} />
          )}
        </Link>
        <div className="post-author">
          <Link
            href={
              post.anonymous ? "#" : `/community/profile/${author.username}`
            }
            className="person-name"
          >
            {post.anonymous ? "Một người kể chuyện" : author.name}
          </Link>
          <div className="post-meta">
            <Link href={`/post/${post.id}`}>{timeAgo(post.createdAt)}</Link>
            <span>·</span>
            <span title={privacyNames[post.privacy]}>
              <PrivacyIcon value={post.privacy} />
            </span>
            {post.anonymous && <span>Ẩn danh</span>}
          </div>
        </div>
        <details className="post-menu">
          <summary aria-label="Tùy chọn bài viết">
            <MoreHorizontal size={21} />
          </summary>
          <div className="menu-panel">
            <button
              onClick={() => {
                void changePost((target) => {
                  target.saved = !target.saved;
                }).catch(() => undefined);
              }}
            >
              <Bookmark size={16} />
              {post.saved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
            </button>
            {post.authorId !== "me" && (
              <>
                <button
                  onClick={() => {
                    setReport(true);
                  }}
                >
                  <Flag size={16} />
                  Báo cáo bài viết
                </button>
                <button
                  onClick={async () => {
                    try {
                      await update((draft) => {
                        draft.hiddenPosts.push(post.id);
                      });
                      notify("Đã ẩn bài viết. Có thể khôi phục trong Cài đặt.");
                    } catch {
                      /* The mutation error is announced by useCommunity. */
                    }
                  }}
                >
                  <ShieldOff size={16} />
                  Ẩn bài viết
                </button>
              </>
            )}
            {post.authorId === "me" && (
              <button
                className="danger-text"
                onClick={async () => {
                  try {
                    await update((draft) => {
                      draft.posts = draft.posts.filter(
                        (item) => item.id !== post.id,
                      );
                    });
                    notify("Đã xóa bài viết.");
                  } catch {
                    /* The mutation error is announced by useCommunity. */
                  }
                }}
              >
                <Trash2 size={16} />
                Xóa bài viết
              </button>
            )}
          </div>
        </details>
      </header>
      <div className="post-content">
        <p>{post.content}</p>
        {post.topic && (
          <Link
            className="post-topic"
            href={`/community/explore?topic=${encodeURIComponent(post.topic)}`}
          >
            #{post.topic.replaceAll(" ", "")}
          </Link>
        )}
      </div>
      {post.image && (
        <PostPhoto src={post.image} alt={
              post.topic
                ? `Khoảnh khắc trong câu chuyện ${post.topic}`
                : "Ảnh đính kèm bài viết"
            } />
      )}
      <div className="post-statistics">
        <button
          type="button"
          className="reaction-total"
          onClick={() => setLikersOpen(true)}
          aria-label={`Xem ${count} người thả tim`}
        >
          <span className="reaction-tiny">
            <ThumbsUp size={10} fill="currentColor" />
          </span>
          <span className="reaction-tiny heart">
            <Heart size={10} fill="currentColor" />
          </span>
          <span>{count.toLocaleString("vi-VN")}</span>
        </button>
        <button type="button" onClick={() => setCommentsOpen(!commentsOpen)}>
          {post.comments.length} bình luận
        </button>
        <span>{post.shares} lượt chia sẻ</span>
      </div>
      <div className="post-actions">
        <HeartButton
          label="Thích"
          active={!!post.reaction}
          count={count}
          onClick={() =>
            void changePost((target) => {
              target.reaction = target.reaction ? null : "love";
            }).catch(() => undefined)
          }
        />
        <button
          className="post-action"
          type="button"
          aria-expanded={commentsOpen}
          onClick={() => {
            setCommentsOpen(!commentsOpen);
          }}
        >
          <MessageCircle size={18} />
          <span>Bình luận</span>
        </button>
        <button
          type="button"
          className="post-action"
          onClick={() => setShareOpen(true)}
        >
          <Share2 size={18} />
          <span>Chia sẻ</span>
        </button>
      </div>
      {commentsOpen && (
        <section
          className="comments-section uiv-comment-reply"
          aria-label="Bình luận"
        >
          {post.comments
            .filter((comment) => !comment.parentId)
            .map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {post.comments
                  .filter((reply) => reply.parentId === comment.id)
                  .map(renderComment)}
              </div>
            ))}
          {post.comments.length === 0 && (
            <p className="muted text-sm mb-4">
              Câu chuyện sẽ vui hơn khi có bạn. Viết bình luận đầu tiên nhé.
            </p>
          )}
          {replyTo && (
            <div className="replying-to">
              Đang trả lời{" "}
              {data.people.find((person) => person.id === replyTo.userId)?.name}
              <button type="button" onClick={() => setReplyTo(null)}>
                Hủy
              </button>
            </div>
          )}
          <form onSubmit={send} className="text-box">
            <div className="box-container">
              {media && (
                <div className="comment-media-preview">
                  <img src={media.url} alt={media.alt} />
                  <IconButton
                    label="Bỏ GIF hoặc sticker"
                    onClick={() => setMedia(null)}
                  >
                    <X size={17} />
                  </IconButton>
                </div>
              )}
              <textarea
                ref={replyInput}
                aria-label="Viết bình luận"
                placeholder="Viết một lời nhắn dễ thương…"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setError("");
                }}
                rows={2}
                maxLength={1000}
              />
              <div className="formatting">
                <EmojiButton
                  label="Thêm emoji vào bình luận"
                  onSelect={(emoji) => {
                    const input = replyInput.current;
                    const start = input?.selectionStart ?? text.length;
                    const end = input?.selectionEnd ?? text.length;
                    const next = text.slice(0, start) + emoji + text.slice(end);
                    if (next.length > 1000) return;
                    setText(next);
                    setError("");
                    requestAnimationFrame(() => {
                      input?.focus();
                      input?.setSelectionRange(start + emoji.length, start + emoji.length);
                    });
                  }}
                />
                <IconButton
                  label="Thêm GIF hoặc sticker"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  <Sticker size={20} />
                </IconButton>
                <span className="comment-limit">{text.length}/1.000</span>
                <button
                  className="send"
                  type="submit"
                  aria-label="Gửi bình luận"
                  disabled={saving || (!text.trim() && !media)}
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </form>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </section>
      )}
      {mediaPickerOpen && (
        <GiphyPicker
          onSelect={(selection) => {
            setMedia(selection);
            setError("");
          }}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}
      {likersOpen && (
        <PostLikers
          post={post}
          data={data}
          onClose={() => setLikersOpen(false)}
        />
      )}
      {shareOpen && (
        <SharePost
          post={post}
          data={data}
          onClose={() => setShareOpen(false)}
        />
      )}
      {report && (
        <Modal title="Báo cáo bài viết" onClose={() => setReport(false)}>
          <form
            className="dialog-body"
            onSubmit={async (event) => {
              try {
                event.preventDefault();
                await update((draft) => {
                  draft.reports.push({
                    postId: post.id,
                    reason,
                    at: new Date().toISOString(),
                  });
                });
                setReport(false);
                notify("Đã ghi nhận báo cáo.");
              } catch {
                /* The mutation error is announced by useCommunity. */
              }
            }}
          >
            <p className="muted">Chọn lý do phù hợp cho báo cáo.</p>
            <label className="field-label" htmlFor={`reason-${post.id}`}>
              Lý do báo cáo
            </label>
            <select
              id={`reason-${post.id}`}
              className="standard-select"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              <option value="spam">Spam hoặc nội dung lặp lại</option>
              <option value="harassment">Quấy rối hoặc bắt nạt</option>
              <option value="inappropriate">Nội dung không phù hợp</option>
              <option value="other">Lý do khác</option>
            </select>
            <Button type="submit" disabled={saving}>
              Gửi báo cáo
            </Button>
          </form>
        </Modal>
      )}
    </article>
  );
}
