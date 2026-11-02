"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiRepository } from "@/lib/api-repository";

export type NotificationScope = "recent" | "older";

export function useNotificationPages(scope: NotificationScope, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["tellme", "notifications", scope],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiRepository.getNotificationsPage(scope, pageParam, 20),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}
