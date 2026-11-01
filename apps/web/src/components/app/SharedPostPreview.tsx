"use client";
import Link from "next/link";
import { usePost } from "@/hooks/use-posts";
import { MessageCircle } from "lucide-react";
export function SharedPostPreview({ id }: { id: string }) {
  const { data: post, isPending } = usePost(id, true);
  if (isPending)
    return <span className="chat-shared-loading">Đang mở câu chuyện…</span>;
  if (!post)
    return (
      <span className="chat-shared-unavailable">
        Bài viết không còn khả dụng hoặc bạn không có quyền xem.
      </span>
    );
  return (
    <Link className="chat-shared-post" href={`/post/${id}`}>
      {post.image && (
        <img
          src={post.image}
          alt="Ảnh trong câu chuyện được chia sẻ"
          loading="lazy"
        />
      )}
      <span>
        <small>
          <MessageCircle size={13} />
          Câu chuyện trên Tellme
        </small>
        <strong>{post.content || "Một khoảnh khắc đáng nhớ"}</strong>
        <span>Xem bài viết</span>
      </span>
    </Link>
  );
}
