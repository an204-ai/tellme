import { randomUUID, createHash } from "node:crypto";
// Every test run creates an isolated database. Never run against the configured application DB.
export async function createAdminFixture() {
  process.env.NODE_ENV = "test";
  process.env.MONGODB_DB = `tellme_admin_qa_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  process.env.ADMIN_EMAILS = "admin@tellme-qa.example,other-admin@tellme-qa.example,unverified@tellme-qa.example";
  process.env.ADMIN_APP_URL = "http://127.0.0.1:3111";
  const db = await import("@tellme/database");
  const { app } = await import("../src/app.js");
  const { hashPassword } = await import("../src/backend/security.js");
  const now = new Date().toISOString(), today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const ids = { admin: randomUUID(), user: randomUUID(), other: randomUUID(), unverified: randomUUID(), post: randomUUID(), story: randomUUID(), comment: randomUUID(), reply: randomUUID(), report: randomUUID(), accountReport: randomUUID(), job: randomUUID() };
  const password = "Tellme-QA-only-2026!", passwordHash = await hashPassword(password);
  const person = (id: string, name: string, email: string, username: string, verified = true) => ({ _id: id, name, email, username, passwordHash, avatar: "/images/avatar-default.svg", cover: "/images/cover-default.svg", bio: "Dữ liệu kiểm thử quản trị", location: "", following: [], blocked: [], hiddenPosts: [], settings: { ...db.defaults }, createdAt: now, ...(verified ? { emailVerifiedAt: now } : {}) });
  try { await db.connectDatabase(); }
  catch { await db.mongo.close(); throw new Error("Không kết nối được MongoDB cho cơ sở dữ liệu QA riêng."); }
  await db.users.insertMany([person(ids.admin, "Quản trị viên QA", "admin@tellme-qa.example", "adminqa"), person(ids.user, "Bubu thử nghiệm", "bubu@tellme-qa.example", "bubuqa"), person(ids.other, "Quản trị viên thứ hai", "other-admin@tellme-qa.example", "otheradminqa"), person(ids.unverified, "Chưa xác thực", "unverified@tellme-qa.example", "unverifiedqa", false)]);
  const tokens = Object.fromEntries(["admin", "user", "other", "unverified"].map((key) => [key, `qa-${randomUUID()}`]));
  for (const key of ["admin", "user", "other", "unverified"] as const) await db.sessions.insertOne({ _id: createHash("sha256").update(tokens[key]!).digest("hex"), userId: ids[key], expiresAt: new Date(Date.now() + 3600000) });
  await db.posts.insertOne({ _id: ids.post, authorId: ids.user, content: "Cà phê đầu ca — bài viết QA", image: "/brand/stickers/bubu-coffee.png", topic: "Chuyện đi làm", privacy: "public", anonymous: false, createdAt: now, reactions: {}, savedBy: [], sharedBy: [], comments: [{ id: ids.comment, userId: ids.user, content: "Bình luận cần xem xét", createdAt: now, likedBy: [] }, { id: ids.reply, userId: ids.user, parentId: ids.comment, content: "Trả lời bình luận", createdAt: now, likedBy: [] }] });
  await db.stories.insertOne({ _id: ids.story, userId: ids.user, day: today, privacy: "public", items: [{ id: randomUUID(), image: "/brand/stickers/bubu-work.png", caption: "Một ngày làm việc QA", at: now, reactions: {} }], updatedAt: now });
  await db.reports.insertMany([{ _id: ids.report, userId: ids.admin, postId: ids.post, reason: "spam", at: now }, { _id: ids.accountReport, userId: ids.admin, postId: `user:${ids.user}`, targetType: "user", targetId: ids.user, reason: "harassment", at: now }]);
  await db.outbox.insertOne({ _id: ids.job, kind: "media.process", data: { sensitive: "not-returned" }, error: "Not public", status: "failed", createdAt: new Date(), availableAt: new Date(), attempts: 8, finishedAt: new Date() });
  await db.serverLogs.insertOne({ _id: randomUUID(), at: new Date(), service: "api", level: "error", event: "qa.test-failure", requestId: randomUUID(), route: "/api/posts/:id", method: "GET", status: 503, durationMs: 120 });
  await db.messages.insertOne({ _id: randomUUID(), conversationId: randomUUID(), senderId: ids.user, text: "PRIVATE_QA_MESSAGE_MUST_NOT_LEAK", at: now });
  async function request(path: string, options: { actor?: keyof typeof tokens | "guest"; method?: string; body?: unknown; origin?: string } = {}) {
    const headers: Record<string, string> = { "Content-Type": "application/json", Origin: options.origin || "http://127.0.0.1:3111" };
    const actor = options.actor || "admin";
    if (actor !== "guest") headers.Cookie = `tellme_qa_session=${tokens[actor]}`;
    return app.request(path, { method: options.method || "GET", headers, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) });
  }
  async function cleanup() {
    if (!db.config.MONGODB_DB.startsWith("tellme_admin_qa_") || db.config.NODE_ENV !== "test") throw new Error("Refusing cleanup outside QA database.");
    await db.mongo.db(db.config.MONGODB_DB).dropDatabase();
    await db.closeQueues();
    await db.mongo.close();
  }
  return { db, app, ids, request, password, cleanup, today };
}
