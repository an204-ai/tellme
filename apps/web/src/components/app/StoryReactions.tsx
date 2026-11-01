"use client";
import { useCommunity } from "@/hooks/use-community";
import type { Reaction } from "@/lib/types";
import { ReactionControl } from "@/components/ui/ReactionControl";

export function StoryReactions({ storyId, itemId, selected }: { storyId: string; itemId: string; selected?: Reaction | null }) {
  const { update, saving } = useCommunity();
  return <ReactionControl compact selected={selected} disabled={saving} onChange={(reaction) => {
    void update((draft) => {
      const item = draft.stories.find((story) => story.id === storyId)?.items.find((entry) => entry.id === itemId);
      if (item) item.reaction = reaction;
    }).catch(() => undefined);
  }} />;
}
