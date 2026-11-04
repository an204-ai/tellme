"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { usePostPages } from "@/hooks/use-posts";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";
import { useCommunity, communityKey } from "@/hooks/use-community";
import { apiRepository, timeAgo } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Loader, SearchInput, PrivacyIcon, privacyNames } from "@/components/ui/Primitives";
import { PostCard } from "@/components/app/PostCard";

export function ExploreScreen() {
  const { data, update } = useCommunity();
  const client = useQueryClient();
  const params = useSearchParams();
  const router = useRouter();
  const viewStory = useAppStore((s) => s.viewStory);
  const query = params.get("q") || "";
  const topic = params.get("topic") || "";
  const searchTerm = query || topic;
  const showRecommendations = !query.trim() && !topic.trim();
  const [search, setSearch] = useState(query || topic);
  useEffect(() => setSearch(query || topic), [query, topic]);
  const postQuery = usePostPages({ view: "search", search: query, topic }, !!data && !showRecommendations);
  const related = useQuery({ queryKey: ["tellme", "search", searchTerm], queryFn: async () => { const result = await apiRepository.search(searchTerm); client.setQueryData(communityKey, apiRepository.snapshot()); return result; }, enabled: !!data && !showRecommendations });
  const recommendations = useMemo(() => {
    if (!data || !showRecommendations) return [];
    const connectionOrder = new Map(data.connections.map((id, index) => [id, index] as const));
    const followingOrder = new Map(data.following.map((id, index) => [id, index] as const));
    const recentDirectChatOrder = new Map(
      data.conversations
        .filter((conversation) => conversation.kind !== "group" && !data.blocked.includes(conversation.userId))
        .map((conversation, index) => [conversation.userId, index] as const),
    );
    const tier = (id: string) => recentDirectChatOrder.has(id) ? 0 : connectionOrder.has(id) ? 1 : 2;
    return data.people
      .filter((person) => person.id !== "me" && !data.blocked.includes(person.id) && (recentDirectChatOrder.has(person.id) || connectionOrder.has(person.id) || followingOrder.has(person.id)))
      .sort((a, b) => {
        const tierDelta = tier(a.id) - tier(b.id);
        if (tierDelta) return tierDelta;
        if (tier(a.id) === 0) return recentDirectChatOrder.get(a.id)! - recentDirectChatOrder.get(b.id)!;
        return (followingOrder.get(b.id) ?? connectionOrder.get(b.id) ?? 0) - (followingOrder.get(a.id) ?? connectionOrder.get(a.id) ?? 0);
      })
      .slice(0, 5);
  }, [data, showRecommendations]);
  if (!data) return <Loader />;
  const people = showRecommendations ? recommendations : related.data?.people || [];
  const relatedStories = related.data?.stories.filter((story) => story.items.length) || [];
  const authors = [...people, ...(related.data?.authors || []), ...data.people];
  const renderPeople = (entries: typeof people) => <div className="people-list">{entries.map((person) => <article className="person-result" key={person.id}>
    <Link href={`/community/profile/${person.username}`}><Avatar person={person} /></Link>
    <div><Link className="person-name" href={`/community/profile/${person.username}`}>{person.name}</Link><p className="search-person-id" title={`@${person.username}`}>@{person.username}</p>{person.bio && <p className="search-person-bio">{person.bio}</p>}</div>
    <Button variant={data.following.includes(person.id) || data.connections.includes(person.id) ? "secondary" : "primary"} onClick={() => void update((draft) => { draft.following = draft.following.includes(person.id) ? draft.following.filter((id) => id !== person.id) : [...draft.following, person.id]; }).catch(() => undefined)}>{data.connections.includes(person.id) ? "Bạn bè" : data.following.includes(person.id) ? "Đang follow" : "Follow"}</Button>
  </article>)}</div>;
  return <div className="search-results-page">
    <h1 className="sr-only">Tìm kiếm trên Tellme</h1>
    <form className="explore-search" role="search" onSubmit={(event) => { event.preventDefault(); router.push(`/community/explore?q=${encodeURIComponent(search)}`); }}>
      <SearchInput aria-label="Tìm kiếm trên Tellme" placeholder="Tìm người, câu chuyện, khoảnh khắc…" value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} />
      <button type="submit" aria-label="Tìm kiếm"><Search size={19} /></button>
    </form>
    <div className="search-results-summary"><p>{query ? <>Kết quả cho <strong>“{query}”</strong></> : topic ? <>Chủ đề <strong>{topic}</strong></> : ""}</p>{(query || topic) && <Link href="/community/explore" className="clear-filter"><X size={14} /> Xóa bộ lọc</Link>}</div>
    <section className="search-result-section" aria-labelledby="search-people">
      <h2 id="search-people">{showRecommendations ? "Kết nối của bạn" : "Mọi người"}</h2>
      {showRecommendations ? people.length ? renderPeople(people) : <p className="search-section-empty">Kết nối với mọi người trên Tellme để họ xuất hiện ở đây.</p> : related.isPending ? <Loader small /> : related.isError ? <div className="search-section-empty"><p>Chưa tải được tài khoản.</p><button className="text-link" onClick={() => void related.refetch()}>Thử lại</button></div> : people.length ? renderPeople(people) : <p className="search-section-empty">Chưa tìm thấy tài khoản phù hợp.</p>}
    </section>
    {!showRecommendations && <section className="search-result-section" aria-labelledby="search-posts">
      <h2 id="search-posts">Bài viết liên quan</h2>
      {postQuery.isPending ? <Loader small /> : postQuery.isError ? <div className="search-section-empty"><p>Chưa tải được bài viết.</p><button className="text-link" onClick={() => void postQuery.refetch()}>Thử lại</button></div> : postQuery.posts.length ? <div className="posts-list">{postQuery.posts.map((post) => <PostCard key={post.id} post={post} data={data} />)}</div> : <p className="search-section-empty">Chưa tìm thấy bài viết phù hợp.</p>}
    </section>}
    {!showRecommendations && <section className="search-result-section" aria-labelledby="search-moments">
      <h2 id="search-moments">Khoảnh khắc liên quan</h2>
      {related.isPending ? <Loader small /> : related.isError ? <div className="search-section-empty"><p>Chưa tải được khoảnh khắc.</p><button className="text-link" onClick={() => void related.refetch()}>Thử lại</button></div> : relatedStories.length ? <div className="search-moments-grid">{relatedStories.map((story) => {
        const person = authors.find((p) => p.id === story.userId);
        const latest = story.items.at(-1)!;
        return <button type="button" className="search-moment-result" key={story.id} aria-label={`Xem chuỗi khoảnh khắc của ${person?.name || "thành viên Tellme"}`} onClick={() => viewStory(story.id)}>
          <img className="search-moment-cover" src={latest.image} alt={latest.caption || ""} loading="lazy" />
          <span className="search-moment-person"><Avatar person={person} size="sm" /><span className="search-moment-author"><strong>{person?.name || "Thành viên Tellme"}</strong><small><time dateTime={latest.at}>{timeAgo(latest.at)}</time><span title={privacyNames[story.privacy]} aria-label={privacyNames[story.privacy]}><PrivacyIcon value={story.privacy} /></span></small></span></span>
          {latest.caption && <span className="search-moment-caption">{latest.caption}</span>}
        </button>;
      })}</div> : <p className="search-section-empty">Chưa tìm thấy khoảnh khắc phù hợp.</p>}
    </section>}
    {!showRecommendations && <InfiniteTrigger hasNextPage={!!postQuery.hasNextPage} fetching={postQuery.isFetchingNextPage} loadMore={() => postQuery.fetchNextPage()} />}
  </div>;
}
