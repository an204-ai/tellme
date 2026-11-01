import { setTimeout as pause } from "node:timers/promises";

type ConnectionError = { name?: string; code?: unknown; cause?: unknown; reason?: { type?: string; servers?: Map<unknown, { error?: unknown }> } };

/** Never log driver messages or full errors: either may contain credentials. */
export function connectionFailure(error: unknown) {
  const seen = new Set<unknown>();
  const codes = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object" || seen.has(value) || seen.size >= 20) return;
    seen.add(value);
    const item = value as ConnectionError;
    if (typeof item.code === "number" && Number.isInteger(item.code)) codes.add(String(item.code));
    if (typeof item.code === "string" && /^[A-Z][A-Z0-9_]{1,79}$/.test(item.code)) codes.add(item.code);
    visit(item.cause);
    if (item.reason?.servers instanceof Map) for (const server of item.reason.servers.values()) visit(server.error);
  };
  visit(error);
  const item = error && typeof error === "object" ? error as ConnectionError : {};
  return { type: item.name || "UnknownError", ...(item.reason?.type ? { topology: item.reason.type } : {}), codes: [...codes] };
}

export function isTransientConnectionError(error: unknown) {
  const failure = connectionFailure(error);
  if (failure.codes.some((code) => ["13", "18", "8000"].includes(code))) return false;
  return ["MongoServerSelectionError", "MongoNetworkError", "MongoNetworkTimeoutError", "MongoPoolClearedError"].includes(failure.type)
    || failure.codes.some((code) => ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "ENETUNREACH", "EHOSTUNREACH", "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR"].includes(code));
}

/** Keep the service alive through a transient outage; do not retry bad credentials. */
export async function waitForDatabase(connect: () => Promise<unknown>, options: {
  signal: AbortSignal;
  onRetry: (failure: ReturnType<typeof connectionFailure>, attempt: number, delay: number) => void;
  wait?: (delay: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
}) {
  const wait = options.wait || (async (delay, signal) => { await pause(delay, undefined, { signal }); });
  const random = options.random || Math.random;
  let attempt = 0;
  while (true) {
    options.signal.throwIfAborted();
    try {
      await connect();
      options.signal.throwIfAborted();
      return;
    } catch (error) {
      options.signal.throwIfAborted();
      if (!isTransientConnectionError(error)) throw error;
      attempt += 1;
      // Small jitter prevents API and three workers reconnecting in lockstep.
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt - 1, 5) + Math.floor(random() * 500));
      options.onRetry(connectionFailure(error), attempt, delay);
      await wait(delay, options.signal);
    }
  }
}

export function databaseUnavailable() {
  return Response.json({ error: "Chưa kết nối được cơ sở dữ liệu. Hệ thống đang thử lại, bạn chờ một chút nhé." }, {
    status: 503,
    headers: { "Retry-After": "5", "Cache-Control": "no-store" },
  });
}
