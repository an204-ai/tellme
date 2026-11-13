import type { Reaction } from "./types";

export type ReactionCounts = Partial<Record<Reaction, number>>;

/** Compare counts, not photo mounts, so reopening a photo cannot replay old reactions. */
export function newReceivedReactions(previous: ReactionCounts, reactions: Reaction[]) {
  const counts: ReactionCounts = {};
  const added: Reaction[] = [];
  for (const reaction of reactions) {
    const count = counts[reaction] = (counts[reaction] || 0) + 1;
    if (count > (previous[reaction] || 0)) added.push(reaction);
  }
  return { counts, added };
}

/** Keep each real incoming icon represented before adding copies for a fuller celebration. */
export function receivedReactionParticles(reactions: Reaction[]): Reaction[] {
  const types = [...new Set(reactions)];
  if (!types.length) return [];
  const total = Math.min(40, Math.max(24, types.length * 3));
  return Array.from({ length: total }, (_, index) => types[index % types.length]!);
}
