import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
// Every run has its own database. Never seed or delete application data.
const testDatabase = `tellme_test_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
process.env.MONGODB_DB = testDatabase;
process.env.NODE_ENV = "test";
const { app } = await import("../app.js");
const db = await import("./database.js");
const { v2: cloudinary } = await import("cloudinary");
const uploads: string[] = [];
before(async () => {
  await db.connectDatabase();
});
after(async () => {
  for (const id of uploads) await cloudinary.uploader.destroy(id);
  assert.equal(db.mongo.db(testDatabase).databaseName, testDatabase);
  try {
    await db.mongo.db(testDatabase).dropDatabase();
  } finally {
    await db.mongo.close();
  }
});
interface Actor {
  cookie: string;
  id: string;
  username: string;
  email: string;
}
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  actor?: Actor,
  origin = "http://127.0.0.1:3000",
) {
  return app.request(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin,
      ...(actor ? { cookie: actor.cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function actor(name: string): Promise<Actor> {
  const email = `${randomUUID()}@example.invalid`;
  const response = await call("/auth/register", "POST", {
    name,
    email,
    password: "Tellme-test-password-42",
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  const user = await db.users.findOne({ email });
  assert.ok(user);
  return { cookie, id: user._id, username: user.username, email };
}
let alice: Actor, bob: Actor, eve: Actor;
let publicPost: string,
  privatePost: string,
  mutualPost: string,
  anonymousPost: string;
test("accounts use hashed passwords and HttpOnly sessions; login, validation, CSRF and logout", async () => {
  alice = await actor("Alice Kiểm thử");
  bob = await actor("Bob Kiểm thử");
  eve = await actor("Eve Kiểm thử");
  const user = await db.users.findOne({ _id: alice.id });
  assert.ok(user);
  assert.notEqual(user.passwordHash, "Tellme-test-password-42");
  assert.equal((await call("/bootstrap")).status, 401);
  assert.equal(
    (
      await call("/auth/register", "POST", {
        name: "XX",
        email: "bad",
        password: "123",
      })
    ).status,
    400,
  );
  const login = await call("/auth/login", "POST", {
    email: alice.email,
    password: "Tellme-test-password-42",
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie")!, /HttpOnly/i);
  assert.match(login.headers.get("set-cookie")!, /SameSite=Lax/i);
  const cookie = login.headers
    .get("set-cookie")!
    .split(",")
    .at(-1)!
    .trim()
    .split(";")[0]!;
  const loggedIn = { ...alice, cookie };
  assert.equal(
    (await call("/auth/me", "GET", undefined, loggedIn)).status,
    200,
  );
  assert.equal(
    (
      await call("/auth/login", "POST", {
        email: alice.email,
        password: "Wrong-password",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        "/auth/logout",
        "POST",
        undefined,
        loggedIn,
        "https://evil.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await call("/auth/logout", "POST", undefined, loggedIn)).status,
    200,
  );
  assert.equal(
    (await call("/auth/me", "GET", undefined, loggedIn)).status,
    401,
  );
});
test("post persistence, visibility, anonymous DTO, ownership and server pagination", async () => {
  const create = async (privacy: string, anonymous = false) => {
    const id = randomUUID();
    assert.equal(
      (
        await call(
          "/posts",
          "POST",
          {
            id,
            content: `Chuyện thật ${id}`,
            image: "",
            topic: "Kiểm thử",
            privacy,
            anonymous,
          },
          alice,
        )
      ).status,
      201,
    );
    return id;
  };
  publicPost = await create("public");
  privatePost = await create("private");
  mutualPost = await create("connections");
  anonymousPost = await create("public", true);
  for (let i = 0; i < 8; i++) await create("public");
  assert.equal(
    (await call(`/posts/${privatePost}`, "GET", undefined, bob)).status,
    404,
  );
  assert.equal(
    (await call(`/posts/${privatePost}`, "GET", undefined, alice)).status,
    200,
  );
  assert.equal(
    (await call(`/posts/${publicPost}`, "DELETE", undefined, bob)).status,
    404,
  );
  const anonymous = await (
    await call(`/posts/${anonymousPost}`, "GET", undefined, bob)
  ).json();
  assert.equal(anonymous.authorId, "anonymous");
  assert.ok(!JSON.stringify(anonymous).includes(alice.id));
  const first = await (
    await call("/posts?limit=6", "GET", undefined, bob)
  ).json();
  assert.equal(first.items.length, 6);
  assert.equal(first.nextCursor, 6);
  assert.equal(first.total, 10);
  const second = await (
    await call(
      `/posts?cursor=${first.nextCursor}&limit=6`,
      "GET",
      undefined,
      bob,
    )
  ).json();
  assert.equal(second.items.length, 4);
  assert.equal(second.nextCursor, null);
  assert.equal(
    new Set([...first.items, ...second.items].map((p) => p.id)).size,
    10,
  );
  const bootstrap = await (
    await call("/bootstrap", "GET", undefined, bob)
  ).json();
  assert.equal(bootstrap.posts.length, 0);
  assert.ok(!JSON.stringify(bootstrap).includes("passwordHash"));
  assert.ok(!JSON.stringify(bootstrap).includes(alice.email));
  const activity = await (
    await call(`/users/${alice.id}/activity?limit=30`, "GET", undefined, bob)
  ).json();
  assert.ok(
    activity.items.every(
      (i: { post: { anonymous: boolean; privacy: string } }) =>
        !i.post.anonymous && i.post.privacy === "public",
    ),
  );
});
test("mutual follow grants connections privacy; unilateral follow and block do not", async () => {
  assert.equal(
    (await call(`/posts/${mutualPost}`, "GET", undefined, bob)).status,
    404,
  );
  assert.equal(
    (await call(`/users/${alice.id}/follow`, "PUT", { following: true }, bob))
      .status,
    200,
  );
  assert.equal(
    (await call(`/posts/${mutualPost}`, "GET", undefined, bob)).status,
    404,
  );
  await call(`/users/${bob.id}/follow`, "PUT", { following: true }, alice);
  assert.equal(
    (await call(`/posts/${mutualPost}`, "GET", undefined, bob)).status,
    200,
  );
  await call(`/users/${bob.id}/block`, "PUT", { blocked: true }, alice);
  assert.equal(
    (await call(`/posts/${publicPost}`, "GET", undefined, bob)).status,
    404,
  );
  assert.equal(
    (await call(`/users/${alice.id}/follow`, "PUT", { following: true }, bob))
      .status,
    400,
  );
  await call(`/users/${bob.id}/block`, "PUT", { blocked: false }, alice);
});
test("concurrent reactions, saves, replies, comment likes, reports and notifications persist", async () => {
  await Promise.all([
    call(`/posts/${publicPost}/reaction`, "PUT", { reaction: "love" }, bob),
    call(`/posts/${publicPost}/reaction`, "PUT", { reaction: "like" }, eve),
  ]);
  let post = await (
    await call(`/posts/${publicPost}`, "GET", undefined, bob)
  ).json();
  assert.equal(post.likes, 2);
  assert.equal(post.reaction, "love");
  await call(`/posts/${publicPost}/saved`, "PUT", { saved: true }, bob);
  assert.equal(
    (await (await call("/posts?view=saved", "GET", undefined, bob)).json())
      .items.length,
    1,
  );
  const commentId = randomUUID();
  assert.equal(
    (
      await call(
        `/posts/${publicPost}/comments`,
        "POST",
        { id: commentId, content: "Một bình luận thật" },
        bob,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await call(
        `/posts/${publicPost}/comments`,
        "POST",
        { id: randomUUID(), content: "Trả lời", parentId: commentId },
        alice,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await call(
        `/posts/${publicPost}/comments`,
        "POST",
        {
          id: randomUUID(),
          content: "",
          media: {
            id: "bad",
            kind: "gif",
            url: "https://evil.example/a.gif",
            alt: "",
            width: 10,
            height: 10,
          },
        },
        eve,
      )
    ).status,
    400,
  );
  await call(
    `/posts/${publicPost}/comments/${commentId}/liked`,
    "PUT",
    { liked: true },
    eve,
  );
  post = await (
    await call(`/posts/${publicPost}`, "GET", undefined, eve)
  ).json();
  assert.equal(post.comments.length, 2);
  assert.equal(post.comments[0].liked, true);
  await call(`/posts/${publicPost}/report`, "POST", { reason: "spam" }, eve);
  assert.equal(
    await db.reports.countDocuments({ userId: eve.id, postId: publicPost }),
    1,
  );
  const bootstrap = await (
    await call("/bootstrap", "GET", undefined, alice)
  ).json();
  assert.ok(bootstrap.notifications.length >= 3);
  await call(
    "/notifications/read",
    "PUT",
    { ids: bootstrap.notifications.map((n: { id: string }) => n.id) },
    alice,
  );
  assert.equal(
    await db.notices.countDocuments({ recipientId: alice.id, read: false }),
    0,
  );
});
test("private direct/group messages enforce membership and attachment visibility", async () => {
  const chat = randomUUID();
  assert.equal(
    (
      await call(
        "/conversations",
        "POST",
        { id: chat, kind: "direct", participantIds: [bob.id] },
        alice,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await call(
        `/conversations/${chat}/messages`,
        "POST",
        { id: randomUUID(), text: "Xin chào" },
        alice,
      )
    ).status,
    201,
  );
  assert.equal(
    (await call(`/conversations/${chat}/messages`, "GET", undefined, eve))
      .status,
    404,
  );
  assert.equal(
    (
      await call(
        `/conversations/${chat}/messages`,
        "POST",
        { id: randomUUID(), text: "Giả mạo" },
        eve,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await call(
        `/conversations/${chat}/messages`,
        "POST",
        { id: randomUUID(), text: "Riêng tư", postId: privatePost },
        alice,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await call(
        `/conversations/${chat}/messages`,
        "POST",
        { id: randomUUID(), text: "Chia sẻ", postId: publicPost },
        alice,
      )
    ).status,
    201,
  );
  const bobData = await (
    await call("/bootstrap", "GET", undefined, bob)
  ).json();
  assert.equal(bobData.conversations[0].messages.length, 2);
  assert.equal(bobData.conversations[0].unread, 2);
  await call(`/conversations/${chat}/read`, "PUT", {}, bob);
  const group = randomUUID();
  assert.equal(
    (
      await call(
        "/conversations",
        "POST",
        {
          id: group,
          kind: "group",
          title: "Nhóm thật",
          participantIds: [bob.id, eve.id],
        },
        alice,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await call(
        `/conversations/${group}/messages`,
        "POST",
        { id: randomUUID(), text: "Cả nhóm ơi" },
        eve,
      )
    ).status,
    201,
  );
});
test("real Cloudinary upload, ownership validation, story timeline and image reactions", async () => {
  const data = await readFile(
    new URL(
      "../../../web/public/images/photo-1441974231531-c6227db76b6e.jpg",
      import.meta.url,
    ),
  );
  const form = new FormData();
  // Mobile file pickers can omit MIME type; inspect the actual bytes on the server.
  form.set("file", new File([data], "forest.jpg", { type: "application/octet-stream" }));
  const response = await app.request("/api/media/upload", {
    method: "POST",
    headers: { cookie: alice.cookie, origin: "http://127.0.0.1:3000" },
    body: form,
  });
  assert.equal(response.status, 201);
  const { url } = await response.json();
  assert.match(url, /^https:\/\/res.cloudinary.com\//);
  const uploaded = await db.media.findOne({ url });
  assert.ok(uploaded);
  uploads.push(uploaded._id);
  assert.equal(
    (
      await call(
        "/users/me",
        "PATCH",
        {
          name: "Alice Kiểm thử",
          avatar: url,
          cover: url,
          bio: "Tiểu sử thật",
          location: "Hồ Chí Minh",
        },
        alice,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        "/users/me",
        "PATCH",
        {
          name: "Bob Kiểm thử",
          avatar: url,
          cover: url,
          bio: "",
          location: "",
        },
        bob,
      )
    ).status,
    400,
  );
  const storyId = randomUUID(),
    momentId = randomUUID();
  assert.equal(
    (
      await call(
        "/stories/moments",
        "POST",
        {
          storyId,
          id: momentId,
          image: url,
          caption: "Khoảnh khắc thật",
          privacy: "public",
        },
        alice,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await call(
        `/stories/${storyId}/moments/${momentId}/reaction`,
        "PUT",
        { reaction: "love" },
        eve,
      )
    ).status,
    200,
  );
  const dataEve = await (
    await call("/bootstrap", "GET", undefined, eve)
  ).json();
  assert.equal(dataEve.stories[0].items[0].reaction, "love");
  assert.equal((await call(`/stories/${storyId}`,"GET",undefined,eve)).status,200);
  const chatResponse = await call("/conversations", "POST", {
    id: randomUUID(), kind: "direct", participantIds: [alice.id],
  }, bob);
  const { id: replyChat } = await chatResponse.json();
  const storyReply = { storyId, momentId };
  assert.equal((await call(`/conversations/${replyChat}/messages`, "POST", {
    id: randomUUID(), text: "Cảnh đẹp quá 😍", storyReply,
  }, bob)).status, 201);
  const replyMessages = await (await call(`/conversations/${replyChat}/messages`, "GET", undefined, bob)).json();
  const sentReply = replyMessages.items.at(-1);
  assert.equal(sentReply.storyReply.image, url);
  assert.equal(sentReply.storyReply.caption, "Khoảnh khắc thật");
  assert.equal(sentReply.text, "Cảnh đẹp quá 😍");
  assert.equal((await call(`/conversations/${replyChat}/messages`, "POST", {
    id: randomUUID(), text: "Ảnh không tồn tại", storyReply: { storyId, momentId: randomUUID() },
  }, bob)).status, 404);
  const wrongChatResponse = await call("/conversations", "POST", {
    id: randomUUID(), kind: "direct", participantIds: [eve.id],
  }, bob);
  const { id: wrongChat } = await wrongChatResponse.json();
  assert.equal((await call(`/conversations/${wrongChat}/messages`, "POST", {
    id: randomUUID(), text: "Gửi sai người", storyReply,
  }, bob)).status, 400);
  assert.equal((await call("/stories/moments","POST",{storyId,id:randomUUID(),image:url,caption:"Chỉ mình tôi",privacy:"private"},alice)).status,201);
  assert.equal((await call(`/stories/${storyId}`,"GET",undefined,eve)).status,404);
  assert.equal((await call(`/conversations/${replyChat}/messages`, "POST", {
    id: randomUUID(), text: "Không còn quyền xem", storyReply,
  }, bob)).status, 404);
  const hiddenReplyMessages = await (await call(`/conversations/${replyChat}/messages`, "GET", undefined, bob)).json();
  assert.equal(hiddenReplyMessages.items.at(-1).storyReply.image, undefined);
  const hiddenBootstrap = await (await call("/bootstrap", "GET", undefined, bob)).json();
  assert.equal(hiddenBootstrap.conversations.find((chat: { id: string }) => chat.id === replyChat).messages.at(-1).storyReply.image, undefined);
  const activity = await (
    await call(`/users/${alice.id}/activity?limit=30`, "GET", undefined, alice)
  ).json();
  assert.ok(activity.items.some((i: { kind: string }) => i.kind === "day"));
  assert.ok(activity.items.some((i: { kind: string }) => i.kind === "post"));
  const gif = await call(
    "/media/giphy?kind=gif&q=hello&offset=0",
    "GET",
    undefined,
    alice,
  );
  assert.equal(gif.status, 200);
  const gifs = await gif.json();
  assert.ok(gifs.data.length > 0);
});
