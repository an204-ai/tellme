import { randomUUID } from "node:crypto";
import { serverLogs, activityDays, users } from "./database.js";
import type { ServerLog } from "./models.js";

/** Logs accept a fixed schema, never request bodies, headers, query strings or error messages. */
type LogInput = Omit<ServerLog, "_id" | "at">;
const buffer: ServerLog[] = [];
let flushing = false;
export function safeLogText(value: string) {
  return value.replace(/[\r\n\t]/g, " ")
    .replace(/(?:mongodb(?:\+srv)?|redis|rediss|cloudinary|https?):\/\/\S+/gi, "[url]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(password|secret|token|cookie|authorization|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]").slice(0, 200);
}
export function logEvent(input: LogInput) {
  const entry: ServerLog = { _id: randomUUID(), at: new Date(), level: input.level, service: safeLogText(input.service), event: safeLogText(input.event) };
  for (const key of ["requestId", "route", "method", "actorId", "jobId", "jobKind", "code"] as const)
    if (typeof input[key] === "string") entry[key] = safeLogText(input[key]!);
  for (const key of ["status", "durationMs"] as const) if (Number.isFinite(input[key])) entry[key] = input[key];
  if (buffer.length >= 500) buffer.shift();
  buffer.push(entry);
  if (input.event !== "http.request" || input.level !== "info") {
    const writer = input.level === "error" ? console.error : input.level === "warn" ? console.warn : console.log;
    writer(JSON.stringify(entry));
  }
}
export async function flushServerLogs() {
  if (flushing || !buffer.length) return;
  flushing = true;
  const batch = buffer.splice(0, 100);
  try { await serverLogs.insertMany(batch, { ordered: false }); }
  catch (error) {
    // Retry transient write failures within the same hard memory bound. Duplicate IDs
    // mean an unordered batch was already partly persisted and need no retry.
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) {
      buffer.unshift(...batch);
      if (buffer.length > 500) buffer.splice(0, buffer.length - 500);
    }
  }
  finally { flushing = false; }
}
export function startLogWriter() {
  const timer = setInterval(() => { void flushServerLogs(); }, 2000);
  timer.unref();
  return () => clearInterval(timer);
}
const activityCache = new Map<string, number>();
export async function trackActivity(userId: string) {
  const at = new Date(), day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const key = `${day}:${userId}`;
  if ((activityCache.get(key) || 0) > at.getTime()) return;
  if (activityCache.size >= 10000) activityCache.delete(activityCache.keys().next().value!);
  activityCache.set(key, at.getTime() + 300000);
  if (activityCache.size > 10000) for (const [id, until] of activityCache) if (until < at.getTime()) activityCache.delete(id);
  try {
    await Promise.all([
      users.updateOne({ _id: userId }, { $set: { lastActiveAt: at.toISOString() } }),
      activityDays.updateOne({ _id: key }, { $setOnInsert: { userId, day, at } }, { upsert: true }),
    ]);
  } catch { activityCache.delete(key); }
}
