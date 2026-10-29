"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Compass, Search, Users, X } from "lucide-react";
import { usePostPages } from "@/hooks/use-posts";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";
import { useCommunity } from "@/hooks/use-community";
import { visiblePosts } from "@/lib/api-repository";
import {
  Avatar,
  Button,
  Empty,
  Loader,
  SearchInput,
  Tabs,
} from "@/components/ui/Primitives";
import { PostCard } from "@/components/app/PostCard";

export function ExploreScreen() {
  const { data, update } = useCommunity();
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") || "";
  const topic = params.get("topic") || "";
  const [search, setSearch] = useState(query);
  const [tab, setTab] = useState("stories");
  useEffect(() => setSearch(query), [query]);
  const postQuery = usePostPages(
    { view: "search", search: query, topic },
    !!data && tab === "stories",
  );
  if (!data) return <Loader />;
  const needle = query.toLocaleLowerCase("vi");
  const topics = data.topicStats?.map((entry) => entry.name) || [];
  const posts = postQuery.posts;
  const people = data.people.filter(
    (person) =>
      person.id !== "me" &&
      !data.blocked.includes(person.id) &&
      (!needle ||
        `${person.name} ${person.username}`
          .toLocaleLowerCase("vi")
          .includes(needle)),
  );
  return (
    <>
      <header className="page-heading social-page-title">
        <h1>Thế giới ngoài vòng quen thuộc.</h1>
        <p>
          Những câu chuyện mới, những góc nhìn khác. Có thể bạn sẽ tìm thấy mình
          ở đó.
        </p>
      </header>
      <form
        className="explore-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(`/community/explore?q=${encodeURIComponent(search)}`);
        }}
      >
        <SearchInput
          key={query}
          aria-label="Tìm kiếm trên trang Khám phá"
          placeholder="Bạn đang muốn tìm điều gì?"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit" aria-label="Tìm trên Khám phá">
          <Search size={19} />
        </button>
      </form>
      <div className="explore-topics">
        <Link href="/community/explore" className={!topic ? "selected" : ""}>
          Tất cả
        </Link>
        {topics.map((entry) => (
          <Link
            key={entry}
            href={`/community/explore?topic=${encodeURIComponent(entry)}`}
            className={topic === entry ? "selected" : ""}
          >
            #{entry}
          </Link>
        ))}
      </div>
      <div className="section-heading explore-section-heading">
        <Tabs
          items={[
            { value: "stories", label: "Câu chuyện" },
            { value: "people", label: "Mọi người" },
            { value: "topics", label: "Chủ đề" },
          ]}
          value={tab}
          onChange={setTab}
          label="Loại kết quả khám phá"
        />
        {(query || topic) && (
          <Link href="/community/explore" className="clear-filter">
            <X size={14} />
            Xóa bộ lọc
          </Link>
        )}
      </div>
      {query && (
        <p className="result-heading">
          Kết quả cho <strong>“{query}”</strong>
        </p>
      )}
      {tab === "stories" && postQuery.isPending && <Loader />}
      {tab === "stories" &&
        !postQuery.isPending &&
        (posts.length ? (
          <>
            {!query && (
              <div className="explore-photo-grid">
                {posts
                  .filter((post) => post.image)
                  .slice(0, 4)
                  .map((post, index) => {
                    const author = data.people.find(
                      (person) => person.id === post.authorId,
                    );
                    return (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className={`explore-photo photo-${index}`}
                      >
                        <img src={post.image} alt={post.topic} loading="lazy" />
                        <div>
                          <span>#{post.topic.replaceAll(" ", "")}</span>
                          <h2>{post.content.split("\n")[0]}</h2>
                          <span className="explore-author">
                            <Avatar person={author} size="xs" />
                            {author?.name}
                            <ArrowUpRight size={20} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
            <h2 className="subheading">
              {query
                ? `${postQuery.total} câu chuyện tìm thấy`
                : "Có thể bạn sẽ đồng cảm"}
            </h2>
            <div className="posts-list">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} data={data} />
              ))}
            </div>
          </>
        ) : (
          <Empty
            icon={<Compass size={32} />}
            title="Chưa tìm thấy câu chuyện phù hợp"
            text="Thử một từ khóa ngắn hơn hoặc khám phá chủ đề khác nhé."
            action={
              <Link className="text-link" href="/community/explore">
                Xem tất cả câu chuyện
              </Link>
            }
          />
        ))}
      {tab === "people" && (
        <section className="people-list">
          {people.length ? (
            people.map((person) => (
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
                  <p className="muted text-xs">
                    @{person.username} · {person.location}
                  </p>
                  <p>{person.bio}</p>
                </div>
                <Button
                  variant={
                    data.following.includes(person.id) ? "secondary" : "primary"
                  }
                  onClick={() =>
                    void update((draft) => {
                      draft.following = draft.following.includes(person.id)
                        ? draft.following.filter((id) => id !== person.id)
                        : [...draft.following, person.id];
                    }).catch(() => undefined)
                  }
                >
                  {data.following.includes(person.id)
                    ? "Đang theo dõi"
                    : "Theo dõi"}
                </Button>
              </article>
            ))
          ) : (
            <Empty
              icon={<Users />}
              title="Chưa tìm thấy tài khoản"
              text="Thử tìm bằng tên hoặc tên người dùng."
            />
          )}
        </section>
      )}
      {tab === "topics" && (
        <section className="topic-results">
          {topics
            .filter(
              (entry) =>
                !needle || entry.toLocaleLowerCase("vi").includes(needle),
            )
            .map((entry) => (
              <Link
                key={entry}
                href={`/community/explore?topic=${encodeURIComponent(entry)}`}
                onClick={() => setTab("stories")}
              >
                <span className="topic-hash">#</span>
                <span>
                  <strong>{entry}</strong>
                  <small>
                    {data.topicStats?.find((item) => item.name === entry)
                      ?.count || 0}{" "}
                    câu chuyện công khai
                  </small>
                </span>
                <ArrowUpRight size={22} />
              </Link>
            ))}
        </section>
      )}
      {tab === "stories" && (
        <InfiniteTrigger
          hasNextPage={!!postQuery.hasNextPage}
          fetching={postQuery.isFetchingNextPage}
          loadMore={() => postQuery.fetchNextPage()}
        />
      )}
    </>
  );
}
