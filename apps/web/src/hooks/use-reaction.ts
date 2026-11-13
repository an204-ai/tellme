"use client";

import { useMutation, useQueryClient, type Query } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { apiRepository } from "@/lib/api-repository";
import { patchCachedReaction, readCachedReaction, reconcileCachedStory, type ReactionTarget } from "@/lib/reaction-cache";
import type { Reaction } from "@/lib/types";
import { optimisticMutations } from "@/lib/optimistic-mutation";
import { useAppStore } from "@/stores/app.store";

/** Immediate feedback, field-only rollback, and one narrow server reconciliation. */
export function useReaction(target: ReactionTarget, authenticated: boolean) {
  const client = useQueryClient();
  const router = useRouter(), path = usePathname();
  const key = ["tellme", "reaction", target.storyId, target.itemId];
  const matching = (query: Query) => query.queryKey[0] === "tellme" && readCachedReaction(query.state.data, target) !== undefined;
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: (reaction: Reaction | null) => {
      if (!client.getQueryData(["tellme", "story", target.storyId])) {
        const known = apiRepository.peekStory(target.storyId);
        if (known) client.setQueryData(["tellme", "story", target.storyId], known);
      }
      return optimisticMutations(client).run({
        scope: `story:${target.storyId}`,
        matches: matching,
        apply: (current) => patchCachedReaction(current, target, reaction),
        execute: () => apiRepository.reactToMoment(target.storyId, target.itemId, reaction),
        reconcile: (current, story) => reconcileCachedStory(current, story),
      });
    },
    onError: (error) => {
      useAppStore.getState().notify(error.message || "Chưa lưu được cảm xúc. Bạn thử lại nhé.");
      void client.invalidateQueries({ predicate: matching });
    },
  });
  return {
    pending: mutation.isPending,
    change: (reaction: Reaction | null) => {
      if (!authenticated) { router.push(`/auth/login?next=${encodeURIComponent(path)}`); return; }
      void mutation.mutateAsync(reaction).catch(() => undefined);
    },
  };
}
