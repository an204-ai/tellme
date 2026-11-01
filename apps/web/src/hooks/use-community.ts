"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { apiRepository, ApiError } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import type { AppData } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import { usePresenceStore } from "@/stores/presence.store";

export const communityKey = ["tellme", "community"] as const;
const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function useCommunity() {
  const realtimeHealthy = usePresenceStore((state) => state.healthy);
  const router = useRouter();
  const pathname = usePathname();
  // Late-hydrating Suspense boundaries must start with the same empty data as SSR,
  // even when a parent has already populated the browser-only query cache.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const query = useQuery({
    queryKey: communityKey,
    queryFn: apiRepository.get,
    staleTime: 10000,
    refetchInterval: realtimeHealthy ? 60000 : 10000,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 401) && count < 1,
    enabled: hydrated,
  });
  const queryClient = useQueryClient();
  const notify = useAppStore((state) => state.notify);
  const mutation = useMutation({
    mutationFn: (change: (draft: AppData) => void) => {
      if (query.data?.authenticated === false) {
        router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
        return Promise.reject(new ApiError("Đăng nhập để sử dụng chức năng này.", 401));
      }
      return apiRepository.update(change);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(communityKey, data);
      void queryClient.invalidateQueries({ queryKey: ["tellme", "posts"] });
      void queryClient.invalidateQueries({ queryKey: ["tellme", "story"] });
      void queryClient.invalidateQueries({ queryKey: ["tellme", "stories"] });
      void queryClient.invalidateQueries({ queryKey: ["tellme", "person"] });
      void queryClient.invalidateQueries({ queryKey: ["tellme", "archive"] });
      void queryClient.invalidateQueries({ queryKey: ["tellme", "chat-tools"] });
    },
    onError: (error) =>
      notify(error.message || "Chưa lưu được thay đổi. Bạn thử lại nhé."),
  });
  return {
    ...query,
    data: hydrated ? query.data : undefined,
    isPending: !hydrated || query.isPending,
    update: mutation.mutateAsync,
    saving: mutation.isPending,
  };
}
