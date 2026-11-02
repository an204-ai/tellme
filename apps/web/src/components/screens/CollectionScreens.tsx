"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  MessageCircle,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { usePost } from "@/hooks/use-posts";
import { useCommunity } from "@/hooks/use-community";
import { canView, visiblePosts } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import { NotificationList, useReadAllNotifications } from "@/components/app/NotificationList";
import {
  Avatar,
  Button,
  Empty,
  Loader,
  SearchInput,
  Tabs,
} from "@/components/ui/Primitives";
import { PostCard } from "@/components/app/PostCard";

export function NotificationsScreen() {
  const { data } = useCommunity();
  const markAll = useReadAllNotifications();
  if (!data) return <Loader />;
  return (
    <>
      <header className="page-heading page-heading-action social-page-title">
        <div>
          <h1>Những kết nối đang tiếp diễn.</h1>
          <p>Có người vừa lắng nghe câu chuyện của bạn.</p>
        </div>
        <button
          className="text-link"
          disabled={!data.unreadNotifications}
          onClick={() => void markAll().catch(() => undefined)}
        >
          <Check size={17} />
          Đọc tất cả
        </button>
      </header>
      <NotificationList active fullPage />
    </>
  );
}
export function FriendsScreen() {
  const { data, update, saving } = useCommunity();
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (data && window.location.hash === "#suggestions") {
      const frame = requestAnimationFrame(() => document.getElementById("suggestions")?.scrollIntoView({ block: "start" }));
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [data?.authenticated]);
  const notify = useAppStore((state) => state.notify);
  if (!data) return <Loader />;
  const people = data.people.filter(
    (person) =>
      person.id !== "me" &&
      !data.blocked.includes(person.id) &&
      `${person.name} ${person.username}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  const renderPerson = (person: (typeof people)[number]) => {
    const following = data.following.includes(person.id);
    const friend = data.connections.includes(person.id);
    return (
      <article className="person-result" key={person.id}>
        <Link href={`/community/profile/${person.username}`}>
          <Avatar person={person} size="lg" />
        </Link>
        <div>
          <Link
            className="person-name"
            href={`/community/profile/${person.username}`}
          >
            {person.name}
          </Link>
          <p className="muted text-xs">@{person.username}</p>
          <p>{person.bio}</p>
        </div>
        <Button
          variant={following || friend ? "secondary" : "primary"}
          disabled={saving}
          aria-pressed={following}
          onClick={async () => {
            try {
              await update((draft) => {
                draft.following = following
                  ? draft.following.filter((id) => id !== person.id)
                  : [...draft.following, person.id];
              });
              notify(
                following
                  ? `Đã bỏ follow ${person.name}.`
                  : `Đã follow ${person.name}.`,
              );
            } catch {
              /* The mutation error is announced by useCommunity. */
            }
          }}
        >
          {following ? <Check size={15} /> : <UserPlus size={15} />}
          {friend ? "Bạn bè" : following ? "Đang follow" : "Follow"}
        </Button>
      </article>
    );
  };
  const friends = people.filter((person) => data.connections.includes(person.id));
  const following = people.filter((person) =>
    data.following.includes(person.id) && !data.connections.includes(person.id),
  );
  const suggestions = people.filter(
    (person) => !data.following.includes(person.id),
  );
  return (
    <>
      <h1 className="sr-only">Bạn bè</h1>
      <SearchInput
        aria-label="Tìm bạn bè hoặc người đang follow"
        placeholder="Tìm tên hoặc Tellme ID…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <section className="follow-section">
        <h2>
          Bạn bè <span>{friends.length}</span>
        </h2>
        <div className="people-list">
          {friends.length ? (
            friends.map(renderPerson)
          ) : (
            <p className="follow-empty">Khi hai người cùng follow nhau, họ sẽ xuất hiện ở đây.</p>
          )}
        </div>
      </section>
      <section className="follow-section">
        <h2>
          Đang follow <span>{following.length}</span>
        </h2>
        <div className="people-list">
          {following.length ? (
            following.map(renderPerson)
          ) : (
            <p className="follow-empty">
              {search
                ? "Không có người đang follow khớp tìm kiếm."
                : "Follow ai đó để xem ngày đi làm của họ có gì mới."}
            </p>
          )}
        </div>
      </section>
      <section className="follow-section" id="suggestions" aria-labelledby="suggestions-heading">
        <h2 id="suggestions-heading">Gợi ý cho bạn</h2>
        <div className="people-list">{suggestions.length ? suggestions.map(renderPerson) : <p className="follow-empty">{search ? "Chưa có gợi ý khớp tìm kiếm." : "Bạn đã follow hết những người đang được gợi ý. Quay lại sau nhé."}</p>}</div>
      </section>
      {!people.length && (
        <Empty
          icon={<Users size={30} />}
          title="Chưa tìm thấy tài khoản"
          text="Thử một tên hoặc Tellme ID khác nhé."
        />
      )}
    </>
  );
}
export function PostDetailScreen({ id, fromArchive = false, archiveView = "saved" }: { id: string; fromArchive?: boolean; archiveView?: "saved" | "hidden" }) {
  const { data } = useCommunity();
  const postQuery = usePost(id, !!data);
  if (!data || postQuery.isPending) return <Loader />;
  const post = postQuery.data;
  if (!post || !canView(post.authorId, post.privacy, data))
    return (
      <Empty
        icon={<Search size={30} />}
        title="Câu chuyện không khả dụng"
        text="Bài viết có thể đã được xóa hoặc bạn không thuộc đối tượng được xem."
        action={
          <Link href={fromArchive ? `/community/archive?view=${archiveView}` : "/community/feed"} className="text-link">
            {fromArchive ? "Về kho lưu trữ" : "Về Khám phá"}
          </Link>
        }
      />
    );
  return (
    <>
      <header className="page-heading social-page-title">
        <Link className="text-link" href={fromArchive ? `/community/archive?view=${archiveView}` : "/community/feed"}>
          ← {fromArchive ? "Quay lại kho lưu trữ" : "Quay lại Khám phá"}
        </Link>
        <h1 className="mt-4">Một câu chuyện được kể.</h1>
      </header>
      <PostCard post={post} data={data} expanded />
    </>
  );
}
