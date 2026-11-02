import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ClientSession } from "mongodb";
import { adminAudit, config, mongo, posts, stories, users, sessions, isSuspended } from "@tellme/database";
import type { AdminAudit, User } from "@tellme/database";
import { fail } from "../../backend/security.js";
export const reasonSchema = z.string().trim().min(5, "Nhập lý do ít nhất 5 ký tự.").max(500);
export const idSchema = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/, "Mã không hợp lệ.");
export const hiddenState = (hidden: boolean, actorId: string, reason: string) => ({ hidden, actorId, reason, at: new Date().toISOString() });
export const isAdmin = (user: Pick<User, "email">) => config.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase());
export async function transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = mongo.startSession();
  try { return await session.withTransaction(() => work(session)); }
  finally { await session.endSession(); }
}
export async function audit(actorId: string, action: string, targetType: string, targetId: string, reason: string, session: ClientSession) {
  await adminAudit.insertOne({ _id: randomUUID(), at: new Date(), actorId, action, targetType, targetId, reason }, { session });
}
export async function suspendAccount(id: string, actorId: string, reason: string, until: string | undefined, session: ClientSession) {
  const person = await users.findOne({ _id: id }, { session });
  if (!person) fail(404, "Tài khoản không tồn tại.");
  if (person._id === actorId || isAdmin(person)) fail(403, "Không thể tạm khóa tài khoản quản trị.");
  if (isSuspended(person)) fail(409, "Tài khoản đã tạm khóa. Tải lại dữ liệu nhé.");
  await users.updateOne({ _id: id }, { $set: { suspension: { reason, actorId, at: new Date().toISOString(), ...(until ? { until } : {}) } } }, { session });
  await sessions.deleteMany({ userId: id }, { session });
  await audit(actorId, "user.suspend", "user", id, reason, session);
}
export async function moderateContent(type: "post" | "story" | "comment", id: string, hidden: boolean, actorId: string, reason: string, session: ClientSession, postId?: string) {
  const moderation = hiddenState(hidden, actorId, reason);
  if (type === "comment") {
    if (!postId) fail(400, "Thiếu mã bài viết của bình luận.");
    const result = await posts.updateOne({ _id: postId, comments: { $elemMatch: { id, "moderation.hidden": hidden ? { $ne: true } : true } } }, { $set: { "comments.$.moderation": moderation } }, { session });
    if (!result.matchedCount) fail(409, "Bình luận không tồn tại hoặc trạng thái đã thay đổi.");
  } else {
    const collection = type === "post" ? posts : stories;
    const existing = await collection.findOne({ _id: id }, { session });
    if (!existing) fail(404, "Nội dung không tồn tại.");
    if (!!existing.moderation?.hidden === hidden) fail(409, "Trạng thái nội dung đã thay đổi. Tải lại dữ liệu nhé.");
    await collection.updateOne({ _id: id }, { $set: { moderation } }, { session });
  }
  await audit(actorId, hidden ? "content.hide" : "content.restore", type, postId ? `${postId}/${id}` : id, reason, session);
}
export async function auditPeople(items: AdminAudit[]) {
  const people = await users.find({ _id: { $in: [...new Set(items.map((item) => item.actorId))] } }, { projection: { name: 1 } }).toArray();
  return items.map((item) => ({ ...item, actor: people.find((person) => person._id === item.actorId)?.name || "Tài khoản không còn tồn tại" }));
}
