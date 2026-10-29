"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Camera,
  ImagePlus,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { DAILY_TITLE } from "@/lib/brand";
import { useCommunity } from "@/hooks/use-community";
import { usePostPages } from "@/hooks/use-posts";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Empty, Loader } from "@/components/ui/Primitives";
import { PostCard } from "@/components/app/PostCard";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";

export function FeedScreen() {
  const { data, isPending, error, refetch } = useCommunity();
  const [topic, setTopic] = useState("");
  const feed = usePostPages({ view: "feed", tab: "recent", topic }, !!data);
  const open = useAppStore((state) => state.open);
  if (isPending) return <Loader />;
  if (!data || error)
    return (
      <Empty
        title="Chưa tải được bảng tin"
        text="Kiểm tra kết nối rồi thử lại nhé."
        action={<Button onClick={() => void refetch()}>Thử lại</Button>}
      />
    );
  const me = data.people.find((person) => person.id === "me");
  return (
    <>
      <h1 className="sr-only">Bảng tin</h1>
      <section className="feed-composer" aria-label="Tạo bài viết">
        <div className="composer-prompt">
          <Avatar person={me} />
          <button type="button" onClick={() => open("composer")}>
            Hôm nay của bạn thế nào, {me?.name.split(" ").slice(-1)[0]}?
          </button>
        </div>
        <div className="feed-composer-bottom">
          <button onClick={() => open("composer")}>
            <ImagePlus size={20} />
            <span>Ảnh / Câu chuyện</span>
          </button>
          <span className="composer-divider" />
          <button onClick={() => open("moment")}>
            <Camera size={20} />
            <span>{DAILY_TITLE}</span>
          </button>
          <Button
            onClick={() => open("composer")}
            variant="secondary"
            className="composer-share"
          >
            Chia sẻ <ArrowRight size={16} />
          </Button>
        </div>
      </section>
      <div className="feed-controls">
        <label className="feed-filter">
          <SlidersHorizontal size={20} />
          <select
            aria-label="Lọc chủ đề bảng tin"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          >
            <option value="">Tất cả chủ đề</option>
            {data.topicStats?.map((entry) => (
              <option value={entry.name} key={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="posts-list">
        {feed.isPending ? (
          <Loader />
        ) : feed.isError && !feed.posts.length ? (
          <Empty
            title="Chưa tải được bài viết"
            text="Thử tải lại bảng tin."
            action={
              <Button onClick={() => void feed.refetch()}>Thử lại</Button>
            }
          />
        ) : feed.posts.length ? (
          feed.posts.map((post) => (
            <PostCard key={post.id} post={post} data={data} />
          ))
        ) : (
          <Empty
            icon={<Users size={30} />}
            title="Chưa có câu chuyện ở đây"
            text="Thử chọn chủ đề khác hoặc theo dõi thêm bạn bè."
            action={
              <Link href="/community/follow" className="text-link">
                Tìm người để follow <ArrowRight size={15} />
              </Link>
            }
          />
        )}
      </div>
      <InfiniteTrigger
        hasNextPage={!!feed.hasNextPage}
        fetching={feed.isFetchingNextPage}
        error={feed.isFetchNextPageError}
        loadMore={() => feed.fetchNextPage()}
      />
      {!feed.hasNextPage && !feed.isPending && feed.posts.length > 0 && (
        <p className="feed-end">Bạn đã xem hết các câu chuyện.</p>
      )}
    </>
  );
}
