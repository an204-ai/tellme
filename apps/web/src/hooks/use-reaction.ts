"use client";

import { useIsMutating, useMutation, useQueryClient, type Query } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { apiRepository, ApiError } from "@/lib/api-repository";
import { patchCachedReaction, readCachedReaction, reconcileCachedPost, reconcileCachedStory, type ReactionTarget } from "@/lib/reaction-cache";
import type { Reaction } from "@/lib/types";
import { useAppStore } from "@/stores/app.store";

/** Immediate feedback, field-only rollback, and one narrow server reconciliation. */
export function useReaction(target: ReactionTarget, authenticated: boolean) {
  const client = useQueryClient();
  const router = useRouter(), path = usePathname();
  const key = ["tellme", "reaction", target.kind, target.kind === "post" ? target.id : target.storyId, target.kind === "moment" ? target.itemId : ""];
  const pending = useIsMutating({ mutationKey: key }) > 0;
  const matching = (query: Query) => query.queryKey[0] === "tellme" && readCachedReaction(query.state.data, target) !== undefined;
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: async (reaction: Reaction | null) => {
      if (target.kind === "post") {
        const post = await apiRepository.reactToPost(target.id, reaction);
        if (!post) throw new ApiError("Bài viết không còn khả dụng.", 404);
        return { post };
      }
      return { story: await apiRepository.reactToMoment(target.storyId, target.itemId, reaction) };
    },
    onMutate: async (reaction) => {
      if (target.kind === "moment") {
        const storyKey = ["tellme", "story", target.storyId];
        await client.cancelQueries({ queryKey: storyKey, exact: true });
        // A newly opened timeline may still be showing cached placeholder data.
        // Promote that known story so it participates in the same optimistic update.
        if (!client.getQueryData(storyKey)) {
          const known = apiRepository.peekStory(target.storyId);
          if (known) client.setQueryData(storyKey, known);
        }
      }
      await client.cancelQueries({ predicate: matching });
      const before = client.getQueriesData({ predicate: matching }).map(([queryKey, data]) => ({ queryKey, reaction: readCachedReaction(data, target) ?? null }));
      client.setQueriesData({ predicate: matching }, (current) => patchCachedReaction(current, target, reaction));
      return before;
    },
    onSuccess: (result) => {
      client.setQueriesData({ predicate: matching }, (current) => result.post ? reconcileCachedPost(current, result.post) : reconcileCachedStory(current, result.story!));
    },
    onError: (error, reaction, before) => {
      for (const previous of before || []) client.setQueryData(previous.queryKey, (current: unknown) =>
        readCachedReaction(current, target) === reaction ? patchCachedReaction(current, target, previous.reaction) : current,
      );
      useAppStore.getState().notify(error.message || "Chưa lưu được cảm xúc. Bạn thử lại nhé.");
      // The write may have succeeded before a reconciliation request failed.
      void client.invalidateQueries({ predicate: matching });
    },
  });
  return {
    pending,
    change: (reaction: Reaction | null) => {
      if (!authenticated) { router.push(`/auth/login?next=${encodeURIComponent(path)}`); return; }
      if (client.isMutating({ mutationKey: key })) return;
      void mutation.mutateAsync(reaction).catch(() => undefined);
    },
  };
}
