import { createHash, createHmac, randomInt, randomBytes, timingSafeEqual } from "node:crypto";
import { MongoServerError } from "mongodb";
import { HTTPException } from "hono/http-exception";
import { authTokens, users, sessions, mongo } from "../../backend/database.js";
import { config, sendAccountEmail, enqueue } from "@tellme/database";
import type { User, AuthToken } from "../../backend/models.js";

type CodePurpose = AuthToken["purpose"];
const CODE_TTL = 10 * 60000;
const RESEND_DELAY = 60000;
const MAX_ATTEMPTS = 5;
export const tokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");
const codeHash = (userId: string, purpose: CodePurpose, nonce: string, code: string) => createHmac("sha256", config.AUTH_CODE_SECRET).update(`${purpose}:${userId}:${nonce}:${code}`).digest("hex");
const invalidCode = () => new HTTPException(400, { message: "Mã không đúng, đã hết hạn hoặc đã dùng. Bạn kiểm tra lại hoặc yêu cầu mã mới nhé." });
export function requireAccountCodes() {
  if (!config.SMTP_URL || !config.AUTH_CODE_SECRET) throw new HTTPException(503, { message: "Email xác nhận chưa sẵn sàng. Bạn thử lại sau nhé." });
}

/** Shared generation, resend cooldown and delivery for both email verification and recovery. */
export async function issueAccountCode(user: User, purpose: CodePurpose) {
  requireAccountCodes();
  const code = String(randomInt(0, 1000000)).padStart(6, "0"), codeNonce = randomBytes(16).toString("hex");
  const createdAt = new Date(), tokenHash = codeHash(user._id, purpose, codeNonce, code);
  const _id = `${user._id}:${purpose}`;
  try {
    await authTokens.updateOne({ _id, $or: [{ createdAt: { $lte: new Date(Date.now() - RESEND_DELAY) } }, { createdAt: { $exists: false } }] }, { $set: { userId: user._id, purpose, passwordHash: user.passwordHash, tokenHash, codeNonce, attempts: 0, createdAt, expiresAt: new Date(Date.now() + CODE_TTL) }, $unset: { resetGrantHash: "", codeVerifiedAt: "" } }, { upsert: true });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) throw new HTTPException(429, { message: "Vui lòng đợi một phút trước khi yêu cầu mã mới." });
    throw error;
  }
  try { await sendAccountEmail(user.email, purpose, code); }
  catch {
    await authTokens.deleteOne({ _id, tokenHash });
    throw new HTTPException(503, { message: "Chưa gửi được email. Bạn thử lại sau nhé." });
  }
}

async function reserveCodeAttempt(user: User, purpose: CodePurpose, code: string) {
  if (!config.AUTH_CODE_SECRET) throw new HTTPException(503, { message: "Xác nhận mã chưa sẵn sàng." });
  // Attempts persist outside the consuming transaction, including wrong/concurrent guesses.
  const record = await authTokens.findOneAndUpdate({ _id: `${user._id}:${purpose}`, purpose, passwordHash: user.passwordHash, codeNonce: { $exists: true }, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS }, resetGrantHash: { $exists: false } }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
  if (!record?.codeNonce) throw invalidCode();
  const actual = Buffer.from(codeHash(user._id, purpose, record.codeNonce, code), "hex"), expected = Buffer.from(record.tokenHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw invalidCode();
  return record;
}

export async function verifyEmailCode(user: User, code: string) {
  const record = await reserveCodeAttempt(user, "verify-email", code);
  const session = mongo.startSession();
  try {
    await session.withTransaction(async () => {
      const consumed = await authTokens.findOneAndDelete({ _id: record._id, tokenHash: record.tokenHash, codeNonce: record.codeNonce, expiresAt: { $gt: new Date() } }, { session });
      if (!consumed) throw invalidCode();
      const result = await users.updateOne({ _id: user._id, passwordHash: record.passwordHash }, { $set: { emailVerifiedAt: new Date().toISOString(), emailVerificationRequired: false } }, { session });
      if (!result.matchedCount) throw invalidCode();
    });
  } finally { await session.endSession(); }
}

export async function verifyPasswordResetCode(email: string, code: string) {
  const user = await users.findOne({ email });
  if (!user) throw invalidCode();
  const record = await reserveCodeAttempt(user, "reset-password", code);
  const token = randomBytes(32).toString("base64url");
  const result = await authTokens.updateOne({ _id: record._id, tokenHash: record.tokenHash, resetGrantHash: { $exists: false }, expiresAt: { $gt: new Date() } }, { $set: { resetGrantHash: tokenDigest(token), codeVerifiedAt: new Date(), expiresAt: new Date(Date.now() + CODE_TTL) } });
  if (!result.matchedCount) throw invalidCode();
  return token;
}

export async function resetPasswordWithGrant(token: string, passwordHash: string) {
  const session = mongo.startSession();
  try {
    return await session.withTransaction(async () => {
      const record = await authTokens.findOneAndDelete({ resetGrantHash: tokenDigest(token), codeVerifiedAt: { $exists: true }, purpose: "reset-password", expiresAt: { $gt: new Date() } }, { session });
      if (!record) throw new HTTPException(400, { message: "Phiên khôi phục đã hết hạn hoặc đã dùng. Hãy yêu cầu mã mới." });
      const result = await users.updateOne({ _id: record.userId, passwordHash: record.passwordHash }, { $set: { emailVerifiedAt: new Date().toISOString(), emailVerificationRequired: false, passwordHash } }, { session });
      if (!result.matchedCount) throw new HTTPException(400, { message: "Phiên khôi phục không còn hiệu lực. Hãy yêu cầu mã mới." });
      await sessions.deleteMany({ userId: record.userId }, { session });
      await authTokens.deleteMany({ userId: record.userId }, { session });
      await enqueue("notification.account-email", { userId: record.userId }, { session });
      return record.userId;
    });
  } finally { await session.endSession(); }
}
