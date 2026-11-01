import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { HTTPException } from "hono/http-exception";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import { sessions, users } from "./database.js";
import { config, origins } from "./config.js";
import type { User } from "./models.js";
import { defaults } from "./models.js";
import { redis, prefix, eventChannel, stopWeatherWatch } from "@tellme/database";
const scrypt = promisify(scryptCallback);
// A disposable QA server on another localhost port must not replace a real session.
export const cookieName = config.NODE_ENV === "test" ? "tellme_qa_session" : "tellme_session";
export type Env = { Variables: { user: User } };
export const guestUser: User = { _id: "guest", email: "", passwordHash: "", username: "", name: "Khách", avatar: "", cover: "", bio: "", location: "", following: [], blocked: [], hiddenPosts: [], settings: { ...defaults }, createdAt: "" };
export const optionalAuthenticate: MiddlewareHandler<Env> = async (c, next) => {
  const token = getCookie(c, cookieName);
  const session = token ? await sessions.findOne({ _id: digest(token), expiresAt: { $gt: new Date() } }) : null;
  const user = session ? await users.findOne({ _id: session.userId }) : null;
  c.set("user", user || guestUser);
  await next();
};
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(":");
  if (!salt || !encoded) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(encoded, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function createSession(c: Context, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const maxAge = 60 * 60 * 24 * 30;
  await sessions.insertOne({
    _id: digest(token),
    userId,
    expiresAt: new Date(Date.now() + maxAge * 1000),
  });
  setCookie(c, cookieName, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: config.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}
export async function removeSession(c: Context) {
  const token = getCookie(c, cookieName);
  if (token) {
    const session = await sessions.findOneAndDelete({ _id: digest(token) });
    if (session) await stopWeatherWatch(session.userId).catch(() => undefined);
    if (session && redis.status === "ready") await redis.publish(eventChannel, JSON.stringify({ userIds: [session.userId], kind: "session-revoked", sessionId: session._id })).catch(() => {});
  }
  deleteCookie(c, cookieName, {
    path: "/",
    secure: config.NODE_ENV === "production",
  });
}
export const authenticate: MiddlewareHandler<Env> = async (c, next) => {
  const token = getCookie(c, cookieName);
  const session = token
    ? await sessions.findOne({
        _id: digest(token),
        expiresAt: { $gt: new Date() },
      })
    : null;
  const user = session ? await users.findOne({ _id: session.userId }) : null;
  if (!user)
    throw new HTTPException(401, { message: "Bạn cần đăng nhập để tiếp tục." });
  c.set("user", user);
  await next();
};
export const checkOrigin: MiddlewareHandler = async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    if (
      (origin && !origins.has(origin)) ||
      c.req.header("sec-fetch-site") === "cross-site"
    )
      throw new HTTPException(403, {
        message: "Nguồn yêu cầu không được phép.",
      });
  }
  await next();
};
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(limit: number, windowMs: number, scope = "api"): MiddlewareHandler {
  return async (c, next) => {
    // Do not trust client-supplied X-Forwarded-For. API is bound to loopback;
    // production ingress must authenticate a client IP before enabling IP keys.
    const key = c.req.path.startsWith("/api/auth/")
      ? "auth"
      : (c.get("user") as User | undefined)?._id || "guest";
    const now = Date.now();
    if (redis.status === "ready") {
      const bucket = `${prefix}:rate:${c.req.path.startsWith("/api/auth/") ? "auth" : scope}:${key}:${Math.floor(now / windowMs)}`;
      const count = Number(await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n", 1, bucket, windowMs));
      if (count > limit) {
        c.header("Retry-After", String(Math.ceil(windowMs / 1000)));
        throw new HTTPException(429, { message: "Thao tác quá nhanh. Bạn thử lại sau một phút nhé." });
      }
      await next(); return;
    }
    const memoryKey = `${scope}:${key}`;
    let entry = buckets.get(memoryKey);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      buckets.set(memoryKey, entry);
    }
    if (++entry.count > limit) {
      c.header("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      throw new HTTPException(429, {
        message: "Thao tác quá nhanh. Bạn thử lại sau một phút nhé.",
      });
    }
    if (buckets.size > 10000)
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    await next();
  };
}
export function fail(
  status: 400 | 403 | 404 | 409 | 503,
  message: string,
): never {
  throw new HTTPException(status, { message });
}
export const uuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
