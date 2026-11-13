export type MomentReaction = "like" | "love" | "haha" | "wow" | "sad" | `emoji:${string}`;
export function isMomentReaction(value: unknown): value is MomentReaction;
