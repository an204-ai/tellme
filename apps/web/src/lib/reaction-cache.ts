import type { DayStory, Reaction } from "./types";

export type ReactionTarget = { kind: "moment"; storyId: string; itemId: string };
const slots = ["pages", "items", "stories", "story"];

/** Visit only story query shapes, preserving unrelated cache references. */
function visit(value: unknown, story: (entry: DayStory) => DayStory): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const next = value.map((entry) => visit(entry, story));
    return next.some((entry, i) => entry !== value[i]) ? next : value;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && typeof record.day === "string" && Array.isArray(record.items)) return story(value as DayStory);
  let next = record;
  for (const key of slots) {
    if (!(key in record)) continue;
    const child = visit(record[key], story);
    if (child !== record[key]) { if (next === record) next = { ...record }; next[key] = child; }
  }
  return next;
}
export function readCachedReaction(value: unknown, target: ReactionTarget): Reaction | null | undefined {
  let found: Reaction | null | undefined;
  visit(value, (story) => {
    if (story.id === target.storyId) {
      const item = story.items.find((entry) => entry.id === target.itemId);
      if (item) found = item.reaction || null;
    }
    return story;
  });
  return found;
}
export function patchCachedReaction(value: unknown, target: ReactionTarget, reaction: Reaction | null): unknown {
  return visit(value, (story) => {
    if (story.id !== target.storyId) return story;
    const items = story.items.map((item) => item.id === target.itemId && (item.reaction || null) !== reaction ? { ...item, reaction } : item);
    return items.some((item, i) => item !== story.items[i]) ? { ...story, items } : story;
  });
}
export function reconcileCachedStory(value: unknown, confirmed: DayStory): unknown {
  return visit(value, (story) => story.id === confirmed.id ? confirmed : story);
}
