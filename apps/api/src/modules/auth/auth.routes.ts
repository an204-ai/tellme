import { HTTPException } from "hono/http-exception";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { authTokens, sessions, mongo, users } from "../../backend/database.js";
import {
  authenticate,
  rateLimit,
  hashPassword,
  verifyPassword,
  createSession,
  removeSession,
  type Env,
} from "../../backend/security.js";
import { defaults, type User } from "../../backend/models.js";
import { now, personDTO } from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
import { config, enqueue, publishUpdate } from "@tellme/database";
import { resetPasswordWithGrant, issueAccountCode, verifyEmailCode, verifyPasswordResetCode, requireAccountCodes } from "./account-security.js";
export const authRouter = new Hono<Env>();
authRouter.use("*", rateLimit(60, 60000));
authRouter.post("/register", async (c) => {
  const input = v.registerSchema.parse(await c.req.json());
  requireAccountCodes();
  const id = randomUUID();
  const base =
    input.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 18) || "tellme";
  const user: User = {
    _id: id,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    emailVerificationRequired: true,
    username: `${base}${id.slice(0, 6)}`,
    name: input.name,
    avatar: "/images/avatar-default.svg",
    cover: "/images/cover-default.svg",
    bio: "",
    location: "",
    following: [],
    blocked: [],
    hiddenPosts: [],
    settings: { ...defaults },
    createdAt: now(),
  };
  await users.insertOne(user);
  await createSession(c, id);
  let verificationEmailSent = true;
  try { await issueAccountCode(user, "verify-email"); }
  catch { verificationEmailSent = false; }
  return c.json({ person: personDTO(user, user), verificationRequired: true, verificationEmailSent }, 201);
});
authRouter.post("/login", async (c) => {
  const input = v.loginSchema.parse(await c.req.json());
  const user = await users.findOne({ email: input.email });
  // A dummy hash keeps the password derivation cost similar for unknown emails.
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash || "00000000000000000000000000000000:" + "00".repeat(64),
  );
  if (!user || !valid)
    throw new HTTPException(401, { message: "Email hoặc mật khẩu chưa đúng." });
  await removeSession(c);
  await createSession(c, user._id);
  return c.json({ person: personDTO(user, user), verificationRequired: !!user.emailVerificationRequired && !user.emailVerifiedAt });
});
authRouter.post("/logout", async (c) => {
  await removeSession(c);
  return c.json({ ok: true });
});
authRouter.get("/me", authenticate, (c) =>
  c.json({ person: personDTO(c.get("user"), c.get("user")) }),
);

authRouter.get("/account", authenticate, async (c) => {
  const user = c.get("user");
  const pending = await authTokens.findOne({ _id: `${user._id}:verify-email`, purpose: "verify-email" }, { projection: { createdAt: 1 } });
  const verificationRetryAfter = pending ? Math.max(0, Math.min(60, 60 - Math.floor((Date.now() - pending.createdAt.getTime()) / 1000))) : 0;
  return c.json({ email: user.email, emailVerified: !!user.emailVerifiedAt, verificationRequired: !!user.emailVerificationRequired && !user.emailVerifiedAt, emailAvailable: !!config.SMTP_URL && !!config.AUTH_CODE_SECRET, verificationRetryAfter });
});
authRouter.post("/resend-verification", authenticate, async (c) => {
  const user = c.get("user");
  if (!user.emailVerifiedAt) await issueAccountCode(user, "verify-email");
  return c.json({ ok: true });
});
authRouter.post("/verify-email", authenticate, async (c) => {
  const { code } = v.confirmCodeSchema.parse(await c.req.json());
  await verifyEmailCode(c.get("user"), code);
  return c.json({ ok: true });
});
authRouter.post("/forgot-password", async (c) => {
  const { email } = v.emailSchema.parse(await c.req.json());
  requireAccountCodes();
  const user = await users.findOne({ email });
  if (user) {
    try { await issueAccountCode(user, "reset-password"); }
    catch { /* Keep the same response for unknown, throttled and known addresses. */ }
  }
  return c.json({ ok: true, message: "Nếu email đã có tài khoản Tellme, bạn sẽ nhận được mã xác nhận 6 số. Kiểm tra cả thư mục spam nhé." });
});
authRouter.post("/verify-reset-code", async (c) => {
  const { email, code } = v.resetCodeSchema.parse(await c.req.json());
  const token = await verifyPasswordResetCode(email, code);
  c.header("Cache-Control", "no-store");
  return c.json({ token });
});
authRouter.post("/reset-password", async (c) => {
  const { token, password } = v.resetPasswordSchema.parse(await c.req.json());
  const userId = await resetPasswordWithGrant(token, await hashPassword(password));
  if (userId) await publishUpdate([userId], "session-revoked");
  await removeSession(c);
  return c.json({ ok: true });
});
authRouter.post("/change-password", authenticate, async (c) => {
  const input = v.changePasswordSchema.parse(await c.req.json()), user = c.get("user");
  if (!await verifyPassword(input.currentPassword, user.passwordHash)) throw new HTTPException(400, { message: "Mật khẩu hiện tại chưa đúng." });
  const passwordHash = await hashPassword(input.password), session = mongo.startSession();
  try {
    await session.withTransaction(async () => {
      const result = await users.updateOne({ _id: user._id, passwordHash: user.passwordHash }, { $set: { passwordHash } }, { session });
      if (!result.matchedCount) throw new HTTPException(409, { message: "Tài khoản vừa thay đổi. Bạn đăng nhập lại nhé." });
      await sessions.deleteMany({ userId: user._id }, { session });
      await authTokens.deleteMany({ userId: user._id }, { session });
      if (config.SMTP_URL) await enqueue("notification.account-email", { userId: user._id }, { session });
    });
  } finally { await session.endSession(); }
  await publishUpdate([user._id], "session-revoked");
  await createSession(c, user._id);
  return c.json({ ok: true });
});
