"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Bookmark,
  Check,
  CheckCheck,
  MessageCircle,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { usePost, usePostPages } from "@/hooks/use-posts";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";
import { useCommunity } from "@/hooks/use-community";
import { canView, timeAgo, visiblePosts } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import {
  Avatar,
  Button,
  Empty,
  Loader,
  SearchInput,
  Tabs,
} from "@/components/ui/Primitives";
import { PostCard } from "@/components/app/PostCard";

export function SavedScreen() {
  const { data } = useCommunity();
  const saved = usePostPages({ view: "saved" }, !!data);
  if (!data || saved.isPending) return <Loader />;
  const posts = saved.posts;
  return (
    <>
      <header className="page-heading social-page-title">
        <h1>Để dành một chút đồng cảm.</h1>
        <p>Những câu chuyện bạn muốn đọc lại, ở ngay đây.</p>
      </header>
      {posts.length ? (
        <div className="posts-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} data={data} />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Bookmark size={34} />}
          title="Chưa có câu chuyện được lưu"
          text="Mở menu dấu ba chấm trên một bài viết và chọn Lưu bài viết. Bạn có thể quay lại đọc bất cứ lúc nào."
          action={
            <Link href="/community/feed" className="text-link">
              Về bảng tin
            </Link>
          }
        />
      )}
      <InfiniteTrigger
        hasNextPage={!!saved.hasNextPage}
        fetching={saved.isFetchingNextPage}
        loadMore={() => saved.fetchNextPage()}
      />
    </>
  );
}
export function NotificationsScreen() {
  const { data, update } = useCommunity();
  if (!data) return <Loader />;
  const notices = data.notifications.filter(
    (notice) => !data.blocked.includes(notice.userId),
  );
  return (
    <>
      <header className="page-heading page-heading-action social-page-title">
        <div>
          <h1>Những kết nối đang tiếp diễn.</h1>
          <p>Có người vừa lắng nghe câu chuyện của bạn.</p>
        </div>
        <button
          className="text-link"
          onClick={() =>
            void update((draft) => {
              draft.notifications.forEach((notice) => {
                notice.read = true;
              });
            }).catch(() => undefined)
          }
        >
          <CheckCheck size={17} />
          Đọc tất cả
        </button>
      </header>
      <section className="notification-list">
        {notices.length ? (
          notices.map((notice) => {
            const person = data.people.find(
              (entry) => entry.id === notice.userId,
            );
            return (
              <Link
                href={
                  notice.postId
                    ? `/post/${notice.postId}`
                    : `/community/profile/${person?.username}`
                }
                className={`notification-row ${notice.read ? "" : "unread"}`}
                key={notice.id}
                onClick={() =>
                  void update((draft) => {
                    const target = draft.notifications.find(
                      (entry) => entry.id === notice.id,
                    );
                    if (target) target.read = true;
                  }).catch(() => undefined)
                }
              >
                <Avatar person={person} />
                <span>
                  <span>
                    <strong>{person?.name}</strong> {notice.text}
                  </span>
                  <small>{timeAgo(notice.at)}</small>
                </span>
                {!notice.read && (
                  <span className="notice-indicator" aria-label="Chưa đọc" />
                )}
              </Link>
            );
          })
        ) : (
          <Empty
            icon={<Bell size={30} />}
            title="Bạn đã đọc hết thông báo"
            text="Những tương tác mới sẽ xuất hiện ở đây."
          />
        )}
      </section>
    </>
  );
}
export function FollowScreen() {
  const { data, update, saving } = useCommunity();
  const [search, setSearch] = useState("");
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
          variant={following ? "secondary" : "primary"}
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
          {following ? "Following" : "Follow"}
        </Button>
      </article>
    );
  };
  const following = people.filter((person) =>
    data.following.includes(person.id),
  );
  const suggestions = people.filter(
    (person) => !data.following.includes(person.id),
  );
  return (
    <>
      <h1 className="sr-only">Follow</h1>
      <SearchInput
        aria-label="Tìm người để follow"
        placeholder="Tìm tên hoặc username…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
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
                : "Follow một người để nghe thêm những câu chuyện từ họ."}
            </p>
          )}
        </div>
      </section>
      {suggestions.length > 0 && (
        <section className="follow-section">
          <h2>Gợi ý cho bạn</h2>
          <div className="people-list">{suggestions.map(renderPerson)}</div>
        </section>
      )}
      {!people.length && (
        <Empty
          icon={<Users size={30} />}
          title="Chưa tìm thấy tài khoản"
          text="Thử một tên hoặc username khác nhé."
        />
      )}
    </>
  );
}
export function PostDetailScreen({ id }: { id: string }) {
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
          <Link href="/community/feed" className="text-link">
            Về bảng tin
          </Link>
        }
      />
    );
  return (
    <>
      <header className="page-heading social-page-title">
        <Link className="text-link" href="/community/feed">
          ← Quay lại bảng tin
        </Link>
        <h1 className="mt-4">Một câu chuyện được kể.</h1>
      </header>
      <PostCard post={post} data={data} expanded />
    </>
  );
}
