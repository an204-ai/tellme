"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Avatar, Button, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import { request } from "@/lib/api-repository";
import { reactionOptions } from "@/lib/social-assets";
import type { Reaction } from "@/lib/types";

type Reactor = { id: string; name: string; username: string; avatar: string; reaction: Reaction };

function ReactionPeopleDialog({ storyId, itemId, close, onProfile }: { storyId: string; itemId: string; close: () => void; onProfile: () => void }) {
  const query = useInfiniteQuery({
    queryKey: ["tellme", "moment-reactors", storyId, itemId],
    queryFn: ({ pageParam, signal }) => request<{ items: Reactor[]; nextCursor: number | null }>(
      `/stories/${encodeURIComponent(storyId)}/moments/${encodeURIComponent(itemId)}/reactions?cursor=${pageParam}&limit=20`,
      { signal },
    ),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: false,
  });
  const people = [...new Map(query.data?.pages.flatMap((page) => page.items.map((person) => [person.id, person] as const))).values()];
  return <Modal title="Người đã thả cảm xúc" onClose={close}>
    {query.isPending ? <Loader small /> : <div className="dialog-body">
      <div className="likers-list">
        {people.map((person) => <Link key={person.id} href={`/community/profile/${encodeURIComponent(person.username)}`} onNavigate={onProfile}>
          <Avatar person={person} size="sm" />
          <span><strong>{person.name}</strong><small>@{person.username}</small></span>
          <span aria-label={reactionOptions.find(({ value }) => value === person.reaction)?.label}><ReactionIcon value={person.reaction} /></span>
        </Link>)}
      </div>
      {!people.length && !query.isError && !query.hasNextPage && <p>Chưa có ai thả cảm xúc.</p>}
      {query.isError && <p role="status">Chưa tải được danh sách cảm xúc.</p>}
      {query.hasNextPage ? <Button variant="secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
        {query.isFetchingNextPage ? "Đang tải…" : query.isError ? "Thử lại" : "Xem thêm"}
      </Button> : query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Thử lại</Button>}
    </div>}
  </Modal>;
}

export function MomentReactionPeople({ storyId, itemId, reactions, onProfile }: { storyId: string; itemId: string; reactions?: Reaction[]; onProfile: () => void }) {
  const [open, setOpen] = useState(false);
  const count = reactions?.length ?? 0;
  return <>
    <button className="moment-reaction-people" type="button" onClick={() => setOpen(true)} aria-label="Xem người đã thả cảm xúc">
      {count ? <><span className="reaction-summary-icons">{[...new Set(reactions)].slice(0, 3).map((value) => <ReactionIcon key={value} value={value} size={24} />)}</span>{count.toLocaleString("vi-VN")}</> : "Cảm xúc"}
    </button>
    {open && <ReactionPeopleDialog storyId={storyId} itemId={itemId} close={() => setOpen(false)} onProfile={onProfile} />}
  </>;
}
