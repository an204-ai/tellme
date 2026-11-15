"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api-repository";
import { useCommunity } from "./use-community";
import type { GroupPhoto, PhotoGroup, PhotoGroupInvitation } from "@/lib/types";

export const photoGroupsKey = ["tellme", "photo-groups"] as const;
export function usePhotoGroups() {
  const { data } = useCommunity();
  const [clock, setClock] = useState(Date.now());
  const result = useQuery({ queryKey: photoGroupsKey, enabled: !!data && data.authenticated !== false, queryFn: ({ signal }) => request<{ items: PhotoGroup[]; busyMemberIds?: string[]; invitations?: PhotoGroupInvitation[] }>("/photo-groups", { signal }), staleTime: 15000 });
  useEffect(() => {
    const next = Math.min(...[...(result.data?.items || []), ...(result.data?.invitations || [])].map((group) => Date.parse(group.expiresAt || "")).filter((at) => at > clock));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => { setClock(Date.now()); void result.refetch(); }, Math.min(2147483647, Math.max(10, next - Date.now() + 10)));
    return () => clearTimeout(timer);
  }, [result.data, clock]);
  return { ...result, clock };
}
export function useGroupPhotos(id: string, enabled: boolean) {
  return useInfiniteQuery({ queryKey: [...photoGroupsKey, id, "photos"], enabled, initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => request<{ items: GroupPhoto[]; nextCursor: string | null }>(`/photo-groups/${id}/photos${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`, { signal }),
    getNextPageParam: (page) => page.nextCursor, staleTime: 15000,
  });
}
