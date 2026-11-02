import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createAdminFixture } from "./admin-fixtures.js";
let fixture: Awaited<ReturnType<typeof createAdminFixture>>;
before(async () => { fixture = await createAdminFixture(); });
after(async () => { if (fixture) await fixture.cleanup(); });
const reason = "Kiểm tra chức năng quản trị trong QA";
test("admin endpoints require an authenticated, verified, allowlisted account", async () => {
  for (const [actor, status] of [["guest", 401], ["user", 403], ["unverified", 403]] as const) assert.equal((await fixture.request("/api/admin/users", { actor })).status, status);
  assert.equal((await fixture.request("/api/admin/me", { actor: "unverified" })).status, 200);
  const response = await fixture.request("/api/admin/me"); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
});
test("user listing and detail return safe projections and usage counts, not chat text or credentials", async () => {
  const list = await (await fixture.request("/api/admin/users?q=bubu")).json(); assert.equal(list.total, 1); assert.equal(list.items[0].username, "bubuqa");
  const response = await fixture.request(`/api/admin/users/${fixture.ids.user}`), text = await response.text();
  for (const secret of ["passwordHash", "PRIVATE_QA_MESSAGE", "tellme_qa_session"]) assert.ok(!text.includes(secret));
  const detail = JSON.parse(text); assert.equal(detail.stats.messages, 1); assert.equal(detail.stats.comments, 2); assert.equal(detail.stats.sessions, 1);
});
test("invalid reasons, protected administrators and foreign origins cannot mutate accounts", async () => {
  for (const id of [fixture.ids.admin, fixture.ids.other]) assert.equal((await fixture.request(`/api/admin/users/${id}/action`, { method: "POST", body: { action: "suspend", reason } })).status, 403);
  assert.equal((await fixture.request(`/api/admin/users/${fixture.ids.user}/action`, { method: "POST", body: { action: "suspend", reason: "x" } })).status, 400);
  assert.equal((await fixture.request(`/api/admin/users/${fixture.ids.user}/action`, { method: "POST", origin: "https://evil.invalid", body: { action: "suspend", reason } })).status, 403);
  assert.equal(await fixture.db.adminAudit.countDocuments(), 0);
});
test("hiding a post removes it from direct, feed, bootstrap topics, search and profile reads; restoring retains media", async () => {
  const path = `/api/admin/content/post/${fixture.ids.post}/moderate`;
  assert.equal((await fixture.request(path, { method: "POST", body: { hidden: true, reason } })).status, 200);
  assert.equal((await fixture.request(`/api/posts/${fixture.ids.post}`, { actor: "guest" })).status, 404);
  const feed = await (await fixture.request("/api/posts", { actor: "guest" })).json(); assert.equal(feed.items.length, 0);
  const activity = await (await fixture.request(`/api/users/${fixture.ids.user}/activity`, { actor: "guest" })).json(); assert.ok(!JSON.stringify(activity).includes("Cà phê đầu ca"));
  const bootstrap = await (await fixture.request("/api/bootstrap", { actor: "guest" })).json(); assert.equal(bootstrap.topicStats.length, 0);
  assert.equal((await fixture.db.posts.findOne({ _id: fixture.ids.post }))?.image, "/brand/stickers/bubu-coffee.png");
  assert.equal((await fixture.request(path, { method: "POST", body: { hidden: false, reason } })).status, 200);
  assert.equal((await fixture.request(`/api/posts/${fixture.ids.post}`, { actor: "guest" })).status, 200);
});
test("hidden comments and their replies are omitted and cannot receive reactions or new replies", async () => {
  const path = `/api/admin/content/comment/${fixture.ids.comment}/moderate`;
  assert.equal((await fixture.request(path, { method: "POST", body: { hidden: true, postId: fixture.ids.post, reason } })).status, 200);
  const post = await (await fixture.request(`/api/posts/${fixture.ids.post}`, { actor: "guest" })).json(); assert.equal(post.comments.length, 0);
  assert.equal((await fixture.request(`/api/posts/${fixture.ids.post}/comments`, { method: "POST", body: { id: randomUUID(), parentId: fixture.ids.comment, content: "Không được trả lời bình luận đã ẩn" } })).status, 400);
  assert.equal((await fixture.request(`/api/posts/${fixture.ids.post}/comments/${fixture.ids.reply}/liked`, { method: "PUT", body: { liked: true } })).status, 404);
  assert.equal((await fixture.request(path, { method: "POST", body: { hidden: false, postId: fixture.ids.post, reason } })).status, 200);
  const restored = await (await fixture.request(`/api/posts/${fixture.ids.post}`, { actor: "guest" })).json(); assert.equal(restored.comments.length, 2); assert.ok(!JSON.stringify(restored).includes('"actorId"')); assert.ok(restored.comments.every((comment: { moderation?: unknown }) => !comment.moderation));
});
test("hidden stories disappear from direct read, guest bootstrap and profile journey", async () => {
  assert.equal((await fixture.request(`/api/admin/content/story/${fixture.ids.story}/moderate`, { method: "POST", body: { hidden: true, reason } })).status, 200);
  assert.equal((await fixture.request(`/api/stories/${fixture.ids.story}`, { actor: "guest" })).status, 404);
  const bootstrap = await (await fixture.request("/api/bootstrap", { actor: "guest" })).json(); assert.equal(bootstrap.stories.length, 0);
  const journey = await (await fixture.request(`/api/users/${fixture.ids.user}/journey?month=${fixture.today.slice(0, 7)}`, { actor: "guest" })).json(); assert.equal(journey.days.length, 0);
});
test("content listing paginates and supports comment/author/hidden filters", async () => {
  const result = await (await fixture.request(`/api/admin/content?type=comment&author=${fixture.ids.user}&limit=1`)).json(); assert.equal(result.items.length, 1); assert.equal(result.total, 2); assert.equal(result.nextCursor, 1);
  const hidden = await (await fixture.request("/api/admin/content?type=story&state=hidden")).json(); assert.equal(hidden.total, 1);
});
test("resolving a report hides content transactionally, preserves assets and rejects duplicate resolution", async () => {
  const path = `/api/admin/reports/${fixture.ids.report}/resolve`, payload = { method: "POST", body: { action: "hide-content", reason } };
  const results = await Promise.all([fixture.request(path, payload), fixture.request(path, payload)]); assert.deepEqual(results.map(r=>r.status).sort(), [200, 409]);
  assert.ok((await fixture.db.posts.findOne({ _id: fixture.ids.post }))?.moderation?.hidden);
  assert.equal(await fixture.db.adminAudit.countDocuments({ action: "report.hide-content" }), 1);
});
test("jobs hide payloads and errors, retry resets terminal metadata, repeated retry is rejected", async () => {
  const text = await (await fixture.request("/api/admin/jobs?status=failed")).text(); assert.ok(!text.includes("not-returned")); assert.ok(!text.includes("Not public"));
  const path = `/api/admin/jobs/${fixture.ids.job}/retry`, body = { reason };
  assert.equal((await fixture.request(path, { method: "POST", body })).status, 200);
  const job = await fixture.db.outbox.findOne({ _id: fixture.ids.job }); assert.equal(job?.attempts, 0); assert.equal(job?.status, "pending"); assert.equal(job?.finishedAt, undefined);
  assert.equal((await fixture.request(path, { method: "POST", body })).status, 409);
});
test("suspension revokes sessions and blocks login; restoring allows login but not old sessions", async () => {
  const path = `/api/admin/users/${fixture.ids.user}/action`;
  assert.equal((await fixture.request(path, { method: "POST", body: { action: "suspend", days: 1, reason } })).status, 200);
  assert.equal(await fixture.db.sessions.countDocuments({ userId: fixture.ids.user }), 0);
  assert.equal((await fixture.request("/api/auth/login", { method: "POST", actor: "guest", body: { email: "bubu@tellme-qa.example", password: fixture.password } })).status, 403);
  assert.equal((await fixture.request(path, { method: "POST", body: { action: "unsuspend", reason } })).status, 200);
  assert.equal((await fixture.request("/api/auth/me", { actor: "user" })).status, 401);
  assert.equal((await fixture.request("/api/auth/login", { method: "POST", actor: "guest", body: { email: "bubu@tellme-qa.example", password: fixture.password } })).status, 200);
  assert.equal((await fixture.request(path, { method: "POST", body: { action: "revoke-sessions", reason } })).status, 200);
  assert.equal(await fixture.db.sessions.countDocuments({ userId: fixture.ids.user }), 0);
});
test("analytics uses Vietnam days, counts stored data and never includes message bodies", async () => {
  const response = await fixture.request("/api/admin/analytics?days=7"), text = await response.text(); assert.equal(response.status, 200); assert.ok(!text.includes("PRIVATE_QA_MESSAGE"));
  const result = JSON.parse(text); assert.equal(result.series.length, 7); const today = result.series.find((d: { day: string }) => d.day === fixture.today); assert.equal(today.posts, 1); assert.equal(today.messages, 1); assert.equal(today.comments, 2);
});
test("log filtering, request ids, redaction, audit and infrastructure work without secret configuration output", async () => {
  const { safeLogText, isSuspended } = fixture.db;
  const safe = safeLogText("token=abcdef Bearer xyz mongodb+srv://user:pass@host/path https://example.test?key=private");
  for (const secret of ["abcdef", "xyz", "pass@", "key=private"]) assert.ok(!safe.includes(secret));
  assert.equal(isSuspended({ suspension: { at: "", actorId: "", reason: "", until: new Date(Date.now()-1000).toISOString() } }), false);
  const response = await fixture.request("/api/admin/logs?level=error&service=api&q=qa.test"); assert.ok(response.headers.get("x-request-id")); assert.equal((await response.json()).total, 1);
  const audit = await (await fixture.request("/api/admin/audit?q=user.suspend")).json(); assert.equal(audit.total, 1); assert.equal(audit.items[0].reason, reason);
  const infra = await fixture.request("/api/admin/infrastructure"); const text = await infra.text(); assert.equal(infra.status, 200);
  for (const key of ["MONGODB_URI", "CLOUDINARY_URL", "GIPHY_API_KEY", "SMTP_URL"]) assert.ok(!text.includes(key));
});
test("nested comment hiding cascades and invalid suspension expiry fails closed", () => {
  const moderation = { hidden: true, reason, actorId: fixture.ids.admin, at: new Date().toISOString() };
  const hidden = fixture.db.hiddenCommentIds([{ id: "grandchild", parentId: "child" }, { id: "child", parentId: "root" }, { id: "root", moderation }, { id: "other" }]);
  assert.deepEqual([...hidden].sort(), ["child", "grandchild", "root"]);
  assert.equal(fixture.db.isSuspended({ suspension: { reason, actorId: "admin", at: "", until: "invalid" } }), true);
});
test("full content review and structured log persistence do not expose payloads or query strings", async () => {
  const text = "Lời kể đầy đủ ".repeat(100);
  await fixture.db.posts.updateOne({ _id: fixture.ids.post }, { $set: { content: text } });
  const detail = await (await fixture.request(`/api/admin/content/post/${fixture.ids.post}`)).json(); assert.equal(detail.text, text); assert.equal(detail.images.length, 1); assert.ok(!("comments" in detail));
  const response = await fixture.request(`/api/posts/${randomUUID()}?secret=DO_NOT_LOG_THIS`, { actor: "guest" });
  await fixture.db.flushServerLogs(); await fixture.db.flushServerLogs();
  const entry = await fixture.db.serverLogs.findOne({ requestId: response.headers.get("x-request-id")! });
  assert.equal(entry?.status, 404); assert.equal(entry?.route, "/api/posts/:id"); assert.ok(!JSON.stringify(entry).includes("DO_NOT_LOG_THIS"));
});
