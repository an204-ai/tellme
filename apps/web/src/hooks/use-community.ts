"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { apiRepository, ApiError } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import type { AppData } from "@/lib/types";

export const communityKey = ["tellme", "community"] as const;
const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function useCommunity() {
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
    refetchInterval: 10000,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 401) && count < 1,
    enabled: hydrated,
  });
  const queryClient = useQueryClient();
  const notify = useAppStore((state) => state.notify);
  const mutation = useMutation({
    mutationFn: (change: (draft: AppData) => void) =>
      apiRepository.update(change),
    onSuccess: (data) => {
      queryClient.setQueryData(communityKey, data);
      void queryClient.invalidateQueries({ queryKey: ["tellme", "posts"] });
      void queryClient.invalidateQueries({ queryKey: ["tellme", "story"] });
      void queryClient.invalidateQueries({ queryKey: ["tellme", "person"] });
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
