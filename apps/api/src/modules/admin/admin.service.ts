import { z } from "zod";
import type { ClientSession } from "mongodb";
import { config, mongo, stories, users, sessions, isSuspended } from "@tellme/database";
import type { User } from "@tellme/database";
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
export async function suspendAccount(id: string, actorId: string, reason: string, until: string | undefined, session: ClientSession) {
  const person = await users.findOne({ _id: id }, { session });
  if (!person) fail(404, "Tài khoản không tồn tại.");
  if (person._id === actorId || isAdmin(person)) fail(403, "Không thể tạm khóa tài khoản quản trị.");
  if (isSuspended(person)) fail(409, "Tài khoản đã tạm khóa. Tải lại dữ liệu nhé.");
  await users.updateOne({ _id: id }, { $set: { suspension: { reason, actorId, at: new Date().toISOString(), ...(until ? { until } : {}) } } }, { session });
  await sessions.deleteMany({ userId: id }, { session });
}
export async function moderateStory(id: string, hidden: boolean, actorId: string, reason: string, session: ClientSession) {
  const existing = await stories.findOne({ _id: id }, { session });
  if (!existing) fail(404, "Chuỗi khoảnh khắc không tồn tại.");
  if (!!existing.moderation?.hidden === hidden) fail(409, "Trạng thái nội dung đã thay đổi. Tải lại dữ liệu nhé.");
  await stories.updateOne({ _id: id }, { $set: { moderation: hiddenState(hidden, actorId, reason) } }, { session });
}
