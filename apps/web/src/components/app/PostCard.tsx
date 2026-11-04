"use client";
import { ReactionControl, ReactionIcon } from "@/components/ui/ReactionControl";
import { Select } from "@/components/ui/Select";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Bookmark,
  ChevronRight,
  Check,
  ChevronDown,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  EyeOff,
  Film,
  X,
  Trash2,
} from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { useReaction } from "@/hooks/use-reaction";
import { reactorIds } from "@/lib/visibility";
import { PostLikers, SharePost } from "./PostDialogs";
import { newId, timeAgo } from "@/lib/api-repository";
import { commentSchema } from "@/lib/validation";
import type {
  Comment,
  CommentMedia,
  AppData,
  Post,
  Privacy,
} from "@/lib/types";
import { useAppStore } from "@/stores/app.store";
import {
  Avatar,
  Button,
  IconButton,
  AudiencePicker,
  PrivacyIcon,
  privacyNames,
} from "@/components/ui/Primitives";
import { EmojiButton } from "@/components/ui/EmojiButton";
import { GiphyPicker } from "./GiphyPicker";
import { TellmeStickerButton, TellmeStickerSuggestions, stickerMedia, type TellmeSticker } from "@/components/ui/TellmeStickers";
import { Modal } from "@/components/ui/Modal";
import { PostPhoto } from "@/components/ui/PostPhoto";
import { AnonymousAvatar, postPersona } from "@/components/ui/AnonymousAvatar";

function CommentReaction({ postId, comment, authenticated }: { postId: string; comment: Comment; authenticated: boolean }) {
  const reaction = useReaction({ kind: "comment", postId, commentId: comment.id }, authenticated);
  return <ReactionControl
    className="comment-reaction"
    sound="pop"
    selected={comment.reaction ?? (comment.liked ? "like" : null)}
    onChange={reaction.change}
  />;
}

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
  const reaction = useReaction({ kind: "post", id: post.id }, data.authenticated !== false);
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
  const [editingPrivacy, setEditingPrivacy] = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>(post.privacy);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("spam");
  const replyInput = useRef<HTMLTextAreaElement>(null);
  const selectSticker = (sticker: TellmeSticker) => {
    setMedia(stickerMedia(sticker));
    setError("");
    requestAnimationFrame(() => {
      replyInput.current?.focus();
      replyInput.current?.closest("form")?.scrollIntoView({ block: "nearest" });
    });
  };
  const reactionCount = useRef<HTMLSpanElement>(null);
  const persona = postPersona(post);
  const isAnonymousAuthor = (comment: Comment) => post.anonymous && (comment.isAuthor || comment.userId === "anonymous" || post.authorId === "me" && comment.userId === "me");
  if (!author) return null;
  const count = reactorIds(post, data).length;
  const changePost = (change: (post: Post) => void) =>
    update((draft) => {
      const target = draft.posts.find((entry) => entry.id === post.id);
      if (target) change(target);
    });
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
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
    const anonymousAuthor = isAnonymousAuthor(comment);
    return (
      <div
        className={`comment-row ${comment.parentId ? "is-reply" : ""}`}
        key={comment.id}
      >
        {anonymousAuthor ? <AnonymousAvatar identity={persona} small /> : <Avatar person={person} size="sm" />}
        <div className="comment-body">
          <div className="comment-bubble">
            {anonymousAuthor ? <span className="anonymous-comment-byline"><span className="person-name">{persona.name}</span><small>Tác giả</small></span> : <Link
              href={person ? `/community/profile/${person.username}` : "/community/profile"}
              className="person-name"
            >
              {person?.name || "Thành viên"}
            </Link>}
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
            <CommentReaction postId={post.id} comment={comment} authenticated={data.authenticated !== false} />
          </div>
        </div>
      </div>
    );
  };
  return (
    <article className={`post-card${post.anonymous ? " is-anonymous" : ""}`} id={`post-${post.id}`}>
      <header className="post-header">
        {post.anonymous ? <AnonymousAvatar identity={persona} /> : <Link href={`/community/profile/${author.username}`} aria-label={`Hồ sơ ${author.name}`}><Avatar person={author} /></Link>}
        <div className="post-author">
          <div className="post-author-line">
          {post.anonymous ? <span className="person-name" title={persona.name}>{persona.name}</span> : <Link href={`/community/profile/${author.username}`} className="person-name" title={author.name}>{author.name}</Link>}
          {post.topic && <Link
            className="post-topic"
            href={`/community/explore?topic=${encodeURIComponent(post.topic)}`}
            aria-label={`Xem bài viết trong chủ đề ${post.topic}`}
            title={post.topic}
          ><ChevronRight size={14} aria-hidden="true" /><span>{post.topic}</span></Link>}
          </div>
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
          <div className="menu-panel" onClick={(event) => { const details = event.currentTarget.closest("details"); if (details) details.open = false; }}>
            <button
              onClick={() => {
                void changePost((target) => {
                  target.saved = !target.saved;
                }).catch(() => undefined);
              }}
            >
              <Bookmark size={16} />
              {post.saved ? "Bỏ lưu bài viết" : "Lưu vào kho lưu trữ"}
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
              </>
            )}
                <button
                  onClick={async () => {
                    try {
                      await update((draft) => {
                        draft.hiddenPosts.push(post.id);
                      });
                      notify("Đã ẩn khỏi bảng tin của bạn. Có thể hiện lại trong Kho lưu trữ.");
                    } catch {
                      /* The mutation error is announced by useCommunity. */
                    }
                  }}
                >
                  <EyeOff size={16} />
                  Ẩn khỏi bảng tin của bạn
                </button>
            {post.authorId === "me" && <button onClick={() => { setPrivacy(post.privacy); setEditingPrivacy(true); }}><PrivacyIcon value={post.privacy} size={16} /> Đổi quyền riêng tư</button>}
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
          aria-label={`Xem ${count} người bày tỏ cảm xúc`}
        >
          <span className="reaction-summary-icons">
            {[...new Set(Object.values(post.reactorReactions || {}).concat(post.reaction ? [post.reaction] : []))].slice(0, 3).map((value) => <ReactionIcon key={value} value={value} size={24} />)}
            {!count && <ReactionIcon value="like" size={24} />}
          </span>
          <span ref={reactionCount}>{count.toLocaleString("vi-VN")}</span>
        </button>
        <button type="button" onClick={() => setCommentsOpen(!commentsOpen)}>
          {post.comments.length} bình luận
        </button>
        <span>{post.shares} lượt chia sẻ</span>
      </div>
      <div className="post-actions">
        <ReactionControl selected={post.reaction} disabled={saving} flightTarget={reactionCount} onChange={reaction.change} />
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
              {isAnonymousAuthor(replyTo) ? persona.name : data.people.find((person) => person.id === replyTo.userId)?.name}
              <button type="button" onClick={() => setReplyTo(null)}>
                Hủy
              </button>
            </div>
          )}
          {data.authenticated === false ? <Link className="text-link" href={`/auth/login?next=${encodeURIComponent(`/post/${post.id}`)}`}>Đăng nhập để bình luận</Link> : <form onSubmit={send} className="text-box">
            <div className="box-container">
              {!media && <TellmeStickerSuggestions text={text} onSelect={selectSticker} />}
              {media && (
                <div className="comment-media-preview">
                  <img src={media.url} alt={media.alt} />
                  <IconButton
                    label="Bỏ GIF hoặc sticker"
                    tooltip={false}
                    onClick={() => setMedia(null)}
                  >
                    <X size={13} />
                  </IconButton>
                </div>
              )}
              <textarea
                ref={replyInput}
                aria-label="Viết bình luận"
                placeholder="Bạn nghĩ sao? Cùng trò chuyện nhé…"
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
                  <Film size={20} />
                </IconButton>
                <TellmeStickerButton label="Thêm sticker Tellme vào bình luận" disabled={saving} onSelect={selectSticker} />
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
          </form>}
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
      {editingPrivacy && <Modal title="Ai có thể xem bài viết?" onClose={() => setEditingPrivacy(false)}><form className="dialog-body story-settings-form" onSubmit={async (event) => { event.preventDefault(); try { await changePost((target) => { target.privacy = privacy; }); setEditingPrivacy(false); } catch { /* Mutation announces errors. */ } }}><AudiencePicker value={privacy} onChange={setPrivacy} /><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</Button></form></Modal>}
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
            <Select
              id={`reason-${post.id}`}
              className="select-control"
              value={reason}
              onValueChange={(value) => setReason(value)}
            >
              <option value="spam">Spam hoặc nội dung lặp lại</option>
              <option value="harassment">Quấy rối hoặc bắt nạt</option>
              <option value="inappropriate">Nội dung không phù hợp</option>
              <option value="other">Lý do khác</option>
            </Select>
            <Button type="submit" disabled={saving}>
              Gửi báo cáo
            </Button>
          </form>
        </Modal>
      )}
    </article>
  );
}
