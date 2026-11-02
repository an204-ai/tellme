import { Hono } from "hono";
import { z } from "zod";
import { config, outbox, reports, posts, stories, users, redis, prefix, queueFor, enqueue, publishUpdate } from "@tellme/database";
import { fail, type Env, rateLimit } from "../../backend/security.js";
import { pageSchema } from "../../backend/validation.js";
import { audit, idSchema, isAdmin, moderateContent, reasonSchema, suspendAccount, transaction } from "./admin.service.js";
import { registerManagementRoutes } from "./management.routes.js";
import { registerMonitoringRoutes } from "./monitoring.routes.js";

export function registerAdminRoutes(api: Hono<Env>) {
  api.use("/admin/*", async (c, next) => {
    const user = c.get("user");
    if (!isAdmin(user)) fail(403, "Bạn không có quyền quản trị.");
    if (!c.req.path.endsWith("/admin/me") && !user.emailVerifiedAt) fail(403, "Xác thực email trước khi truy cập dữ liệu quản trị.");
    c.header("Cache-Control", "no-store");
    await next();
  });
  api.use("/admin/*", async (c, next) => {
    if (c.req.method !== "GET") return rateLimit(30, 60000, "admin-write")(c, next);
    await next();
  });
  api.get("/admin/me", (c) => {
    const me = c.get("user");
    return c.json({ name: me.name, email: me.email, verified: !!me.emailVerifiedAt, webUrl: config.APP_URL, environment: config.NODE_ENV });
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
  api.get("/admin/jobs", async (c) => {
    const status = z.enum(["pending", "dispatched", "failed", "completed"]).optional().parse(c.req.query("status"));
    const kind = z.enum(["media", "feed", "notification"]).optional().parse(c.req.query("kind"));
    const { cursor, limit } = pageSchema.parse(c.req.query());
    const filter = { ...(status ? { status } : {}), ...(kind ? { kind: { $regex: `^${kind}\\.` } } : {}) };
    const [items, total] = await Promise.all([
      outbox.find(filter, { projection: { data: 0, error: 0 } }).sort({ createdAt: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), outbox.countDocuments(filter),
    ]);
    return c.json({ items, total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.post("/admin/jobs/:id/retry", async (c) => {
    const id = idSchema.parse(c.req.param("id")), { reason } = z.object({ reason: reasonSchema }).parse(await c.req.json());
    const job = await outbox.findOne({ _id: id, status: "failed" });
    if (!job) fail(409, "Tác vụ không còn ở trạng thái lỗi.");
    if (redis.status === "ready") {
      const queued = await queueFor(job.kind).getJob(job._id);
      if (queued && await queued.getState() !== "failed") fail(409, "Tác vụ đang được xử lý.");
    }
    await transaction(async (session) => {
      const result = await outbox.updateOne({ _id: id, status: "failed" }, { $set: { status: "pending", attempts: 0, availableAt: new Date() }, $unset: { error: "", finishedAt: "" } }, { session });
      if (!result.matchedCount) fail(409, "Tác vụ vừa được quản trị viên khác xử lý.");
      await audit(c.get("user")._id, "job.retry", "job", id, reason, session);
    });
    return c.json({ ok: true });
  });
  api.post("/admin/operations/rebuild-feed", async (c) => {
    const { reason } = z.object({ reason: reasonSchema }).parse(await c.req.json());
    const id = `admin-feed-${Math.floor(Date.now() / 60000)}`;
    await transaction(async (session) => { await enqueue("feed.rebuild", {}, { id, session }); await audit(c.get("user")._id, "feed.rebuild", "job", id, reason, session); });
    return c.json({ ok: true, id });
  });
  api.get("/admin/reports", async (c) => {
    const { cursor, limit } = pageSchema.parse(c.req.query());
    const status = z.enum(["pending", "resolved", "all"]).parse(c.req.query("status") || "pending");
    const type = z.enum(["post", "story", "user"]).optional().parse(c.req.query("type"));
    const filter = { ...(status === "all" ? {} : { resolution: { $exists: status === "resolved" } }), ...(type ? type === "post" ? { targetType: { $nin: ["story", "user"] as const } } : { targetType: type } : {}) };
    const [items, total] = await Promise.all([reports.find(filter).sort({ at: -1, _id: -1 }).skip(cursor).limit(limit).toArray(), reports.countDocuments(filter)]);
    const reporters = await users.find({ _id: { $in: items.map((item) => item.userId) } }, { projection: { name: 1 } }).toArray();
    return c.json({ items: items.map((item) => ({ ...item, reporter: reporters.find((person) => person._id === item.userId)?.name || "Tài khoản không còn tồn tại" })), total, nextCursor: cursor + items.length < total ? cursor + items.length : null });
  });
  api.get("/admin/reports/:id", async (c) => {
    const report = await reports.findOne({ _id: idSchema.parse(c.req.param("id")) });
    if (!report) fail(404, "Báo cáo không tồn tại.");
    let target: { title: string; text: string; images: string[]; href?: string; hidden?: boolean } | null = null;
    if (report.targetType === "user") {
      const person = await users.findOne({ _id: report.targetId || report.postId.replace(/^user:/, "") });
      if (person) target = { title: person.name, text: `@${person.username}\n${person.bio}`, images: person.avatar ? [person.avatar] : [], href: `${config.APP_URL}/community/profile/${person.username}` };
    } else if (report.targetType === "story") {
      const story = await stories.findOne({ _id: report.targetId || report.postId });
      if (story) target = { title: `Chuỗi khoảnh khắc · ${story.day}`, text: story.items.map((item) => item.caption).filter(Boolean).join("\n"), images: story.items.map((item) => item.image).slice(0, 50), hidden: !!story.moderation?.hidden };
    } else {
      const post = await posts.findOne({ _id: report.targetId || report.postId });
      if (post) target = { title: "Bài viết được báo cáo", text: post.content, images: post.image ? [post.image] : [], href: `${config.APP_URL}/post/${post._id}`, hidden: !!post.moderation?.hidden };
    }
    return c.json({ report, target: target ? { ...target, images: target.images.map((image) => image.startsWith("/") ? `${config.APP_URL}${image}` : image) } : null });
  });
  api.post("/admin/reports/:id/resolve", async (c) => {
    const input = z.object({ action: z.enum(["dismiss", "remove-post", "hide-content", "suspend-user"]), reason: reasonSchema }).parse(await c.req.json());
    const action = input.action === "remove-post" ? "hide-content" : input.action;
    let revoked: string | undefined;
    await transaction(async (session) => {
      const report = await reports.findOne({ _id: idSchema.parse(c.req.param("id")) }, { session });
      if (!report) fail(404, "Báo cáo không tồn tại.");
      if (report.resolution) fail(409, "Báo cáo đã được xử lý. Tải lại danh sách nhé.");
      const actor = c.get("user")._id;
      if (action === "hide-content") {
        if (report.targetType === "user") fail(400, "Đây là báo cáo tài khoản.");
        const type = report.targetType === "story" ? "story" : "post", collection = type === "story" ? stories : posts, targetId = report.targetId || report.postId;
        const target = await collection.findOne({ _id: targetId }, { session });
        if (!target) fail(404, "Nội dung không còn tồn tại. Có thể bỏ qua báo cáo.");
        if (!target.moderation?.hidden) await moderateContent(type, targetId, true, actor, input.reason, session);
        await enqueue("feed.rebuild", {}, { session });
      }
      if (action === "suspend-user") {
        if (report.targetType !== "user") fail(400, "Chỉ tạm khóa từ báo cáo tài khoản.");
        revoked = report.targetId || report.postId.replace(/^user:/, "");
        await suspendAccount(revoked, actor, input.reason, undefined, session);
      }
      await reports.updateOne({ _id: report._id }, { $set: { resolution: { action, actorId: actor, at: new Date().toISOString(), reason: input.reason } } }, { session });
      await audit(actor, `report.${action}`, "report", report._id, input.reason, session);
    });
    if (revoked) await publishUpdate([revoked], "session-revoked");
    await publishUpdate([], "community");
    return c.json({ ok: true });
  });
  registerManagementRoutes(api);
  registerMonitoringRoutes(api);
}
