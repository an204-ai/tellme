"use client";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ProfileConnection } from "@/lib/types";
import { request } from "@/lib/api-repository";
import { Avatar, Button, Empty, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";

type ConnectionPage = { items: ProfileConnection[]; total: number; nextCursor: number | null };

export function ProfileConnections({ username, kind, onClose }: {
  username: string;
  kind: "followers" | "following";
  onClose: () => void;
}) {
  const query = useInfiniteQuery({
    queryKey: ["tellme", "profile-connections", username, kind],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => request<ConnectionPage>(`/users/${encodeURIComponent(username)}/${kind}?cursor=${pageParam}&limit=20`, { signal }),
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const people = [...new Map((query.data?.pages.flatMap((page) => page.items) || []).map((person) => [person.id, person])).values()];
  const total = query.data?.pages[0]?.total;
  const title = kind === "followers" ? "Follower" : "Đang follow";
  return <Modal title={`${title}${total === undefined ? "" : ` · ${total}`}`} onClose={onClose} className="profile-connections-dialog">
    <div className="profile-connections-list" aria-busy={query.isFetching}>
      {query.isPending ? <Loader small label="Đang tải danh sách…" /> : query.isError && !people.length ? <Empty title="Chưa tải được danh sách" text="Kết nối tạm gián đoạn. Bạn thử lại nhé." action={<Button variant="secondary" onClick={() => void query.refetch()}>Thử lại</Button>} /> : !people.length ? <Empty title={kind === "followers" ? "Chưa có follower" : "Chưa follow ai"} text="Những người bạn sẽ xuất hiện ở đây." /> : <ul>
        {people.map((person) => <li key={person.id}><Link href={`/community/profile/${person.username}`} onClick={onClose}>
          <Avatar person={person} />
          <span><strong>{person.name}{person.id === "me" ? " (Bạn)" : ""}</strong><small>@{person.username}</small></span>
        </Link></li>)}
      </ul>}
      <InfiniteTrigger hasNextPage={!!query.hasNextPage} fetching={query.isFetchingNextPage} error={query.isFetchNextPageError} loadMore={() => query.fetchNextPage()} label="Đang tải thêm tài khoản…" />
    </div>
  </Modal>;
}
