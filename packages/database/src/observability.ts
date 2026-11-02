import { randomUUID } from "node:crypto";
import type { ServerLog } from "./models.js";

/** Logs accept a fixed schema, never request bodies, headers, query strings or error messages. */
type LogInput = Omit<ServerLog, "_id" | "at">;
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
  if (input.event !== "http.request" || input.level !== "info") {
    const writer = input.level === "error" ? console.error : input.level === "warn" ? console.warn : console.log;
    writer(JSON.stringify(entry));
  }
}
