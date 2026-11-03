"use client";
import { useCommunity } from "@/hooks/use-community";
import type { Reaction } from "@/lib/types";
import { ReactionControl } from "@/components/ui/ReactionControl";
import { useReaction } from "@/hooks/use-reaction";

export function StoryReactions({ storyId, itemId, selected }: { storyId: string; itemId: string; selected?: Reaction | null }) {
  const { data, saving } = useCommunity();
  const reaction = useReaction({ kind: "moment", storyId, itemId }, !!data && data.authenticated !== false);
  return <ReactionControl compact selected={selected} disabled={saving} onChange={reaction.change} />;
}
