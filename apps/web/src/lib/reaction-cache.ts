import type { DayStory, Post, Reaction } from "./types";

export type ReactionTarget = { kind: "post"; id: string } | { kind: "moment"; storyId: string; itemId: string };
const slots = ["pages", "items", "posts", "stories", "post", "story"];

/** Visit only social query shapes; retain references for unrelated cached data. */
function visit(value: unknown, post: (entry: Post) => Post, story: (entry: DayStory) => DayStory): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const next = value.map((entry) => visit(entry, post, story));
    return next.some((entry, i) => entry !== value[i]) ? next : value;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && Array.isArray(record.comments) && "reaction" in record) return post(value as Post);
  if (typeof record.id === "string" && typeof record.day === "string" && Array.isArray(record.items)) return story(value as DayStory);
  let next = record;
  for (const key of slots) {
    if (!(key in record)) continue;
    const child = visit(record[key], post, story);
    if (child !== record[key]) { if (next === record) next = { ...record }; next[key] = child; }
  }
  return next;
}

export function readCachedReaction(value: unknown, target: ReactionTarget): Reaction | null | undefined {
  let found: Reaction | null | undefined;
  visit(value, (post) => {
    if (target.kind === "post" && post.id === target.id) found = post.reaction;
    return post;
  }, (story) => {
    if (target.kind === "moment" && story.id === target.storyId) {
      const item = story.items.find((entry) => entry.id === target.itemId);
      if (item) found = item.reaction || null;
    }
    return story;
  });
  return found;
}

export function patchCachedReaction(value: unknown, target: ReactionTarget, reaction: Reaction | null): unknown {
  return visit(value, (post) => {
    if (target.kind !== "post" || post.id !== target.id || post.reaction === reaction) return post;
    const reactorIds = (post.reactorIds || []).filter((id) => id !== "me");
    const reactorReactions = { ...post.reactorReactions };
    delete reactorReactions.me;
    if (reaction) { reactorIds.push("me"); reactorReactions.me = reaction; }
    return { ...post, reaction, likes: Math.max(0, post.likes + Number(!!reaction) - Number(!!post.reaction)), reactorIds, reactorReactions };
  }, (story) => {
    if (target.kind !== "moment" || story.id !== target.storyId) return story;
    const items = story.items.map((item) => item.id === target.itemId && (item.reaction || null) !== reaction ? { ...item, reaction } : item);
    return items.some((item, i) => item !== story.items[i]) ? { ...story, items } : story;
  });
}

export function reconcileCachedPost(value: unknown, confirmed: Post): unknown {
  return visit(value, (post) => post.id === confirmed.id ? confirmed : post, (story) => story);
}
export function reconcileCachedStory(value: unknown, confirmed: DayStory): unknown {
  return visit(value, (post) => post, (story) => story.id === confirmed.id ? confirmed : story);
}
