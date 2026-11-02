import assert from "node:assert/strict";
import test from "node:test";
import { patchCachedReaction, readCachedReaction, reconcileCachedPost, reconcileCachedStory } from "./reaction-cache.ts";

const post = () => ({ id: "p1", reaction: null, likes: 2, comments: [], reactorIds: ["other-1", "other-2"], reactorReactions: { "other-1": "love", "other-2": "like" } });
const target = { kind: "post", id: "p1" };
const story = () => ({ id: "s1", day: "2026-11-03", userId: "me", items: [{ id: "m1" }, { id: "m2", reaction: "like" }] });

test("post reaction updates every query shape without touching unrelated entries", () => {
  const p = post(), other = { ...post(), id: "p2" };
  const original = { pages: [{ items: [p, other] }], pageParams: [0] };
  const next = patchCachedReaction(original, target, "love");
  assert.equal(readCachedReaction(next, target), "love");
  assert.equal(next.pages[0].items[0].likes, 3);
  assert.deepEqual(next.pages[0].items[0].reactorIds, ["other-1", "other-2", "me"]);
  assert.equal(next.pages[0].items[1], other);
  assert.equal(next.pageParams, original.pageParams);
  assert.equal(p.reaction, null);
});

test("switching reaction does not increment twice; removing restores count and actor list", () => {
  const added = patchCachedReaction(post(), target, "love");
  const switched = patchCachedReaction(added, target, "haha");
  assert.equal(switched.likes, 3);
  assert.equal(switched.reactorReactions.me, "haha");
  const removed = patchCachedReaction(switched, target, null);
  assert.equal(removed.likes, 2);
  assert.deepEqual(removed.reactorIds, ["other-1", "other-2"]);
  assert.equal(removed.reactorReactions.me, undefined);
});

test("field-only rollback preserves comments or other updates received while saving", () => {
  const optimistic = patchCachedReaction(post(), target, "love");
  const comment = { id: "new-comment", content: "Arrived during request" };
  const concurrent = { ...optimistic, comments: [comment], shares: 5 };
  const reverted = patchCachedReaction(concurrent, target, null);
  assert.equal(reverted.likes, 2);
  assert.equal(reverted.comments[0], comment);
  assert.equal(reverted.shares, 5);
});

test("moment cache covers bootstrap, story pages, detail and profile activity", () => {
  const s = story(), t = { kind: "moment", storyId: "s1", itemId: "m1" };
  for (const cache of [{ stories: [s] }, { pages: [{ items: [s] }] }, s, { items: [{ kind: "day", story: s }] }]) {
    const next = patchCachedReaction(cache, t, "wow");
    assert.equal(readCachedReaction(next, t), "wow");
    assert.equal(readCachedReaction(cache, t), null);
    assert.equal(readCachedReaction(next, { ...t, itemId: "m2" }), "like");
    assert.equal(patchCachedReaction(next, t, "wow"), next);
  }
});

test("authoritative server result reconciles matching cache only", () => {
  const confirmed = { ...post(), reaction: "love", likes: 8 };
  assert.equal(reconcileCachedPost({ post: post() }, confirmed).post, confirmed);
  const confirmedStory = { ...story(), privacy: "connections" };
  assert.equal(reconcileCachedStory({ stories: [story()] }, confirmedStory).stories[0], confirmedStory);
  assert.equal(readCachedReaction(undefined, target), undefined);
  const unrelated = { items: [{ id: "person-1", name: "Person" }] };
  assert.equal(patchCachedReaction(unrelated, target, "love"), unrelated);
});
