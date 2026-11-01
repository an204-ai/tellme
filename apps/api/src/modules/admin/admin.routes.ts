import { Hono } from "hono";
import { z } from "zod";
import { config, outbox, reports, posts, stories, users, mongo, redis, prefix, queueFor, scheduleCleanup, enqueue } from "@tellme/database";
import { fail, type Env } from "../../backend/security.js";
import { pageSchema } from "../../backend/validation.js";
export function registerAdminRoutes(api: Hono<Env>) {
  api.use("/admin/*", async (c, next) => {
    if (!config.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean).includes(c.get("user").email)) fail(403, "Bạn không có quyền quản trị.");
    if (c.req.path !== "/api/admin/me" && !c.get("user").emailVerifiedAt) fail(403, "Xác thực email trước khi truy cập dữ liệu quản trị.");
    c.header("Cache-Control", "no-store");
    await next();
  });
  api.get("/admin/me", (c) => {
    const me = c.get("user");
    return c.json({ name: me.name, email: me.email, verified: !!me.emailVerifiedAt, webUrl: config.APP_URL });
  });
  api.get("/admin/status", async (c) => {
    const workers: Record<string, boolean> = {};
    for (const name of ["media", "feed", "notification"]) workers[name] = redis.status === "ready" && !!(await redis.get(`${prefix}:worker:${name}`).catch(() => null));
    const [userCount, postCount, storyCount, pendingReports, jobs] = await Promise.all([
      users.countDocuments(), posts.countDocuments(), stories.countDocuments(), reports.countDocuments({ resolution: { $exists: false } }),
      outbox.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
    ]);
    return c.json({ redis: redis.status === "ready", workers, email: !!config.SMTP_URL, push: !!config.VAPID_PRIVATE_KEY, jobs, totals: { users: userCount, posts: postCount, stories: storyCount, pendingReports } });
  });
  api.get("/admin/users", async (c) => {
    const { cursor, limit } = pageSchema.parse(c.req.query());
    const search = z.string().trim().max(100).parse(c.req.query("q") || "");
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = search ? { $or: ["name", "username", "email"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } })) } : {};
    const [items, total] = await Promise.all([
      users.find(filter, { projection: { name: 1, username: 1, avatar: 1, email: 1, emailVerifiedAt: 1, createdAt: 1 } }).sort({ createdAt: -1, _id: -1 }).skip(cursor).limit(limit).toArray(),
      users.countDocuments(filter),
    ]);
    return c.json({ items, total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.get("/admin/jobs", async (c) => {
    const status = z.enum(["pending", "dispatched", "failed", "completed"]).optional().parse(c.req.query("status"));
    const { cursor, limit } = pageSchema.parse(c.req.query());
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      outbox.find(filter, { projection: { data: 0, error: 0 } }).sort({ createdAt: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), outbox.countDocuments(filter),
    ]);
    return c.json({ items, total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.post("/admin/jobs/:id/retry", async (c) => {
    const job = await outbox.findOne({ _id: c.req.param("id"), status: "failed" });
    if (!job) fail(404, "Không có tác vụ lỗi này.");
    if (redis.status === "ready") {
      const queued = await queueFor(job.kind).getJob(job._id);
      if (queued) await queued.remove();
    }
    await outbox.updateOne({ _id: job._id, status: "failed" }, { $set: { status: "pending", availableAt: new Date() }, $unset: { error: "" } });
    return c.json({ ok: true });
  });
  api.get("/admin/reports", async (c) => {
    const { cursor, limit } = pageSchema.parse(c.req.query());
    const status = z.enum(["pending", "resolved", "all"]).parse(c.req.query("status") || "pending");
    const filter = status === "all" ? {} : { resolution: { $exists: status === "resolved" } };
    const [items, total] = await Promise.all([reports.find(filter).sort({ at: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), reports.countDocuments(filter)]);
    const reporters = await users.find({ _id: { $in: items.map((item) => item.userId) } }, { projection: { name: 1, username: 1 } }).toArray();
    return c.json({ items: items.map((item) => ({ ...item, reporter: reporters.find((person) => person._id === item.userId)?.name || "Tài khoản không còn tồn tại" })), total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.get("/admin/reports/:id", async (c) => {
    const report = await reports.findOne({ _id: c.req.param("id") });
    if (!report) fail(404, "Báo cáo không tồn tại.");
    let target: { title: string; text: string; images: string[]; href?: string } | null = null;
    if (report.targetType === "user") {
      const person = await users.findOne({ _id: report.targetId || report.postId.replace(/^user:/, "") });
      if (person) target = { title: person.name, text: `@${person.username}\n${person.bio}`, images: person.avatar ? [person.avatar] : [], href: `${config.APP_URL}/community/profile/${person.username}` };
    } else if (report.targetType === "story") {
      const story = await stories.findOne({ _id: report.postId });
      if (story) target = { title: `Chuỗi khoảnh khắc · ${story.day}`, text: story.items.map((item) => item.caption).filter(Boolean).join("\n"), images: story.items.map((item) => item.image).slice(0, 100) };
    } else {
      const post = await posts.findOne({ _id: report.postId });
      if (post) target = { title: "Bài viết được báo cáo", text: post.content, images: post.image ? [post.image] : [], href: `${config.APP_URL}/post/${post._id}` };
    }
    return c.json({ report, target: target ? { ...target, images: target.images.map((image) => image.startsWith("/") ? `${config.APP_URL}${image}` : image) } : null });
  });
  api.post("/admin/reports/:id/resolve", async (c) => {
    const { action } = z.object({ action: z.enum(["dismiss", "remove-post"]) }).parse(await c.req.json());
    const session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        const report = await reports.findOne({ _id: c.req.param("id") }, { session });
        if (!report) fail(404, "Báo cáo không tồn tại.");
        if (report.resolution) fail(409, "Báo cáo đã được xử lý. Tải lại danh sách nhé.");
        if (action === "remove-post" && report.targetType === "user") fail(400, "Đây là báo cáo tài khoản, không phải bài viết.");
        if (action === "remove-post") {
          if (report.targetType === "story") {
            const story = await stories.findOneAndDelete({ _id: report.postId }, { session });
            if (story) await scheduleCleanup(story.userId, story.items.map((item) => item.image), session);
          } else {
          const post = await posts.findOneAndDelete({ _id: report.postId }, { session });
          if (post) await scheduleCleanup(post.authorId, [post.image], session);
          }
          await enqueue("feed.rebuild", {}, { session });
        }
        await reports.updateOne({ _id: report._id }, { $set: { resolution: { action, actorId: c.get("user")._id, at: new Date().toISOString() } } }, { session });
      });
    } finally { await session.endSession(); }
    return c.json({ ok: true });
  });
}
