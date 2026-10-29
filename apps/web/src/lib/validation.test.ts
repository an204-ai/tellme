import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commentSchema,
  localDay,
  postSchema,
  profileSchema,
  replySchema,
} from "./validation.ts";
import { canView, visiblePosts, postsPage, profileActivityPage, reactorIds } from "./visibility.ts";
import type { AppData, Post, DayStory } from "./types.ts";

const input = {
  content: "",
  image: "",
  topic: "",
  privacy: "public" as const,
  anonymous: false,
};
test("sharing requires a story or an image, and topics remain optional", () => {
  assert.equal(
    postSchema.safeParse({ ...input, content: "   " }).success,
    false,
  );
  assert.equal(
    postSchema.safeParse({ ...input, content: " Một ngày dễ chịu. " }).success,
    true,
  );
  assert.equal(
    postSchema.parse({ ...input, content: " Chuyện nhỏ " }).content,
    "Chuyện nhỏ",
  );
  assert.equal(
    postSchema.safeParse({ ...input, image: "data:image/png;base64,a" })
      .success,
    true,
  );
  assert.equal(
    postSchema.safeParse({ ...input, content: "a".repeat(5001) }).success,
    false,
  );
});
test("replies cannot be empty or exceed their limit", () => {
  assert.equal(replySchema.safeParse(" \n ").success, false);
  assert.equal(replySchema.safeParse("a".repeat(1001)).success, false);
  assert.equal(
    replySchema.parse(" Chúc bạn một ngày vui. "),
    "Chúc bạn một ngày vui.",
  );
});
test("profile values preserve a real display name and bounded biography", () => {
  assert.equal(
    profileSchema.safeParse({ name: " ", bio: "", location: "" }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      name: "Minh An",
      bio: "a".repeat(201),
      location: "",
    }).success,
    false,
  );
});
test("daily moments cross into a new day at midnight in Vietnam", () => {
  assert.equal(localDay(new Date("2026-10-28T16:59:59Z")), "2026-10-28");
  assert.equal(localDay(new Date("2026-10-28T17:00:00Z")), "2026-10-29");
});
test("privacy respects ownership, connections, blocks, and hidden posts", () => {
  const relations = { connections: ["friend"], blocked: ["blocked"] };
  assert.equal(canView("me", "private", relations), true);
  assert.equal(canView("other", "private", relations), false);
  assert.equal(canView("friend", "connections", relations), true);
  assert.equal(canView("other", "connections", relations), false);
  assert.equal(canView("blocked", "public", relations), false);
  const posts = [
    { id: "1", authorId: "friend", privacy: "connections" },
    { id: "2", authorId: "other", privacy: "private" },
    { id: "3", authorId: "other", privacy: "public" },
  ] as Post[];
  assert.deepEqual(
    visiblePosts({ ...relations, posts, hiddenPosts: ["3"] } as AppData).map(
      (post) => post.id,
    ),
    ["1"],
  );
});

test("comments allow GIF or sticker without text and reject empty or invalid media", () => {
  const media = {
    id: "sample",
    kind: "gif",
    url: "https://media.giphy.com/media/sample/giphy.gif",
    alt: "Wave",
    width: 200,
    height: 150,
  };
  assert.equal(commentSchema.safeParse({ text: "", media }).success, true);
  assert.equal(
    commentSchema.safeParse({ text: "", media: { ...media, kind: "sticker" } })
      .success,
    true,
  );
  assert.equal(
    commentSchema.safeParse({ text: " ", media: null }).success,
    false,
  );
  assert.equal(
    commentSchema.safeParse({
      text: "",
      media: { ...media, url: "javascript:alert(1)" },
    }).success,
    false,
  );
});
test("feed pages stay bounded, continue without duplicates and respect privacy before pagination", () => {
  const data = {
    people: [],
    following: ["friend"],
    blocked: ["blocked"],
    connections: ["friend"],
    hiddenPosts: ["hidden"],
    posts: [
      { id: "private", authorId: "other", privacy: "private" },
      { id: "hidden", authorId: "friend", privacy: "public" },
      { id: "blocked", authorId: "blocked", privacy: "public" },
      ...Array.from({ length: 14 }, (_, i) => ({
        id: String(i),
        authorId: "friend",
        privacy: "public",
        content: "Chuyện nhỏ",
        topic: "Ngày mới",
      })),
    ] as Post[],
  };
  const first = postsPage(data, { view: "feed" });
  const second = postsPage(data, { view: "feed" }, first.nextCursor);
  const final = postsPage(data, { view: "feed" }, second.nextCursor);
  assert.equal(first.total, 14);
  assert.equal(first.items.length, 6);
  assert.equal(second.items.length, 6);
  assert.equal(final.items.length, 2);
  assert.equal(final.nextCursor, undefined);
  assert.equal(
    new Set(
      [...first.items, ...second.items, ...final.items].map((post) => post.id),
    ).size,
    14,
  );
  assert.equal(postsPage(data, { view: "search", topic: "Không có" }).total, 0);
});

test("profile journal paginates posts and day stories together without exposing private or anonymous entries", () => {
  const post = { id: "public", authorId: "friend", privacy: "public", createdAt: "2026-10-29T02:00:00Z", anonymous: false } as Post;
  const story = { id: "day1", userId: "friend", day: "2026-10-29", privacy: "public", items: [{ id: "photo1", image: "/test.jpg", caption: "Hi", at: "2026-10-29T04:00:00Z" }] } as DayStory;
  const data = { blocked: [], connections: [], hiddenPosts: ["hidden"], posts: [post, { ...post, id: "private", privacy: "private" as const }, { ...post, id: "anonymous", anonymous: true }, { ...post, id: "hidden" }], stories: [story, { ...story, id: "private-day", privacy: "private" as const }] };
  const first = profileActivityPage(data, "friend", 0, 1);
  const second = profileActivityPage(data, "friend", first.nextCursor, 1);
  assert.equal(first.total, 2);
  assert.equal(first.items[0]?.id, "day-day1");
  assert.equal(second.items[0]?.id, "post-public");
  assert.equal(second.nextCursor, undefined);
  assert.equal(profileActivityPage({ ...data, blocked: ["friend"] }, "friend").total, 0);
});
test("reaction people stay unique, omit blocked accounts and include the viewer only while liked", () => {
  const post = { reactorIds: ["friend", "blocked", "friend", "missing"], reaction: "love" } as Post;
  const data = { blocked: ["blocked"], people: [{ id: "friend" }, { id: "me" }, { id: "blocked" }] } as Pick<AppData, "people" | "blocked">;
  assert.deepEqual(reactorIds(post, data), ["friend", "me"]);
  assert.deepEqual(reactorIds({ ...post, reaction: null }, data), ["friend"]);
});
