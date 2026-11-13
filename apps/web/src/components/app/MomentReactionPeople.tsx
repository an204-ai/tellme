"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { RefreshCw, Smile } from "lucide-react";
import { Avatar, Button, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import { request } from "@/lib/api-repository";
import { reactionOptions } from "@/lib/social-assets";
import type { Reaction } from "@/lib/types";

type Reactor = { id: string; name: string; username: string; avatar: string; reaction: Reaction };

export function MomentReactionPeople({ storyId, itemId, onProfile, loadPreview = true }: {
  storyId: string; itemId: string; onProfile: () => void; loadPreview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // The compact preview and full list share one paginated cache; fetch only five initially.
  const query = useInfiniteQuery({
    queryKey: ["tellme", "moment-reactors", storyId, itemId],
    queryFn: ({ pageParam, signal }) => request<{ items: Reactor[]; nextCursor: number | null }>(
      `/stories/${encodeURIComponent(storyId)}/moments/${encodeURIComponent(itemId)}/reactions?cursor=${pageParam}&limit=5`, { signal },
    ),
    enabled: loadPreview || open,
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: false,
  });
  const people = [...new Map(query.data?.pages.flatMap((page) => page.items.map((person) => [person.id, person] as const))).values()];
  return <>
    <button className="moment-reaction-people" type="button" onClick={() => setOpen(true)} aria-label="Xem người đã thả cảm xúc" aria-busy={query.isFetching && !people.length}>
      {people.length ? <span className="reaction-avatar-stack">{people.slice(0, 5).map((person) => <Avatar key={person.id} person={{ name: person.name, avatar: person.avatar }} size="sm" />)}</span>
        : query.isError ? <RefreshCw size={21} aria-hidden="true" /> : <Smile size={23} aria-hidden="true" />}
    </button>
    {open && <Modal title="Người đã thả cảm xúc" className="reaction-people-dialog" onClose={() => setOpen(false)}>
      {query.isPending ? <Loader small /> : <div className="dialog-body">
        <div className="reaction-people-list">
          {people.map((person) => <Link key={person.id} href={`/community/profile/${encodeURIComponent(person.username)}`} onNavigate={() => { setOpen(false); onProfile(); }}>
            <Avatar person={{ name: person.name, avatar: person.avatar }} size="sm" />
            <span className="reaction-person-name"><strong title={person.name}>{person.name}</strong><small title={`@${person.username}`}>@{person.username}</small></span>
            <span aria-label={reactionOptions.find(({ value }) => value === person.reaction)?.label || (person.reaction.startsWith("emoji:") ? `Cảm xúc ${person.reaction.slice(6)}` : "Cảm xúc")}><ReactionIcon value={person.reaction} /></span>
          </Link>)}
        </div>
        {!people.length && !query.isError && !query.hasNextPage && <p>Chưa có ai thả cảm xúc.</p>}
        {query.isError && <p role="status">Chưa tải được danh sách cảm xúc.</p>}
        {query.hasNextPage ? <Button variant="secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? "Đang tải…" : query.isError ? "Thử lại" : "Xem thêm"}
        </Button> : query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Thử lại</Button>}
      </div>}
    </Modal>}
  </>;
}
