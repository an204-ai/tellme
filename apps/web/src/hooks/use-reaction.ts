"use client";

import { useMutation, useQueryClient, type Query } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { apiRepository, ApiError } from "@/lib/api-repository";
import { patchCachedReaction, readCachedReaction, reconcileCachedPost, reconcileCachedStory, type ReactionTarget } from "@/lib/reaction-cache";
import type { Reaction } from "@/lib/types";
import { optimisticMutations } from "@/lib/optimistic-mutation";
import { useAppStore } from "@/stores/app.store";

/** Immediate feedback, field-only rollback, and one narrow server reconciliation. */
export function useReaction(target: ReactionTarget, authenticated: boolean) {
  const client = useQueryClient();
  const router = useRouter(), path = usePathname();
  const key = ["tellme", "reaction", target.kind,
    target.kind === "post" ? target.id : target.kind === "comment" ? target.postId : target.storyId,
    target.kind === "moment" ? target.itemId : target.kind === "comment" ? target.commentId : ""];
  const matching = (query: Query) => query.queryKey[0] === "tellme" && readCachedReaction(query.state.data, target) !== undefined;
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: (reaction: Reaction | null) => {
      if (target.kind === "moment" && !client.getQueryData(["tellme", "story", target.storyId])) {
        const known = apiRepository.peekStory(target.storyId);
        if (known) client.setQueryData(["tellme", "story", target.storyId], known);
      }
      return optimisticMutations(client).run({
        scope: target.kind === "moment" ? `story:${target.storyId}` : `post:${target.kind === "post" ? target.id : target.postId}`,
        matches: matching,
        apply: (current) => patchCachedReaction(current, target, reaction),
        execute: async () => {
          if (target.kind === "moment") return { story: await apiRepository.reactToMoment(target.storyId, target.itemId, reaction), post: undefined };
          const post = target.kind === "post" ? await apiRepository.reactToPost(target.id, reaction) : await apiRepository.reactToComment(target.postId, target.commentId, reaction);
          if (!post) throw new ApiError("Bài viết không còn khả dụng.", 404);
          return { post, story: undefined };
        },
        reconcile: (current, result) => result.post ? reconcileCachedPost(current, result.post) : reconcileCachedStory(current, result.story!),
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
