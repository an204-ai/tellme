import { streamSSE } from "hono/streaming";
import type { Hono } from "hono";
import { eventChannel, redis, prefix, users, sessions } from "@tellme/database";
import { cookieName, type Env } from "./security.js";
import { createHash } from "node:crypto";
import type { Server } from "node:http";
import { origins } from "./config.js";
import { RedisPresence } from "./presence-store.js";
import { attachRealtimeSocket } from "./realtime-socket.js";
const listeners = new Map<string, Set<(data: string) => void>>();
const presence = new RedisPresence(redis, prefix);
let transport: ReturnType<typeof attachRealtimeSocket> | undefined;
export function mountRealtime(server: Server, ready: () => boolean) {
  transport = attachRealtimeSocket(server, {
    ready, presence, origins,
    authenticate: async (request) => {
      const encoded = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
      if (!encoded || encoded.length > 256) return null;
      const sessionId = createHash("sha256").update(decodeURIComponent(encoded)).digest("hex");
      const session = await sessions.findOne({ _id: sessionId, expiresAt: { $gt: new Date() } });
      if (!session || !await users.findOne({ _id: session.userId }, { projection: { _id: 1 } })) return null;
      return { userId: session.userId, sessionId, expiresAt: session.expiresAt.getTime() };
    },
    friends: async (id) => {
      const me = await users.findOne({ _id: id }, { projection: { following: 1, blocked: 1 } });
      if (!me) return [];
      const friends = await users.find({ _id: { $in: me.following, $nin: me.blocked }, following: id, blocked: { $ne: id } }, { projection: { _id: 1 } }).toArray();
      return friends.map((friend) => friend._id);
    },
  });
  return () => { transport?.stop(); transport = undefined; };
}
export async function startRealtime() {
  const subscriber = redis.duplicate({ lazyConnect: false, enableOfflineQueue: true, maxRetriesPerRequest: null });
  subscriber.on("error", () => {});
  subscriber.on("close", () => { void transport?.update({ userIds: [], kind: "presence.unavailable" }); });
  subscriber.on("ready", () => { void subscriber.subscribe(eventChannel, presence.channel).then(() => transport?.update({ userIds: [], kind: "realtime-ready" })).catch(() => {}); });
  subscriber.on("message", (channel, payload) => {
    try {
      if (channel === presence.channel) {
        const event = JSON.parse(payload) as { userId: string; online: boolean; at: number; revision: number };
        if (typeof event.userId === "string" && typeof event.online === "boolean" && Number.isSafeInteger(event.revision)) void transport?.presenceChanged(event).catch(() => transport?.update({ userIds: [], kind: "presence.unavailable" }));
        return;
      }
      const event = JSON.parse(payload) as { userIds: string[]; kind: string; sessionId?: string };
      if (!Array.isArray(event.userIds) || typeof event.kind !== "string") return;
      void transport?.update(event).catch(() => {});
      const value = JSON.stringify({ kind: event.kind });
      for (const [userId, callbacks] of listeners) if (!event.userIds.length || event.userIds.includes(userId)) callbacks.forEach((callback) => callback(value));
    } catch { /* Ignore malformed events; never forward arbitrary payloads. */ }
  });
  return () => subscriber.disconnect();
}
export function registerRealtimeRoutes(api: Hono<Env>) {
  api.get("/events", (c) => {
    const userId = c.get("user")._id;
    if ((listeners.get(userId)?.size || 0) >= 8) return c.json({ error: "Đã mở nhiều kết nối. Đóng bớt tab rồi thử lại." }, 429);
    c.header("X-Accel-Buffering", "no");
    c.header("Cache-Control", "no-cache, no-transform");
    return streamSSE(c, async (stream) => {
      const callbacks = listeners.get(userId) || new Set<(data: string) => void>();
      const callback = (data: string) => { void stream.writeSSE({ data }).catch(() => undefined); };
      callbacks.add(callback); listeners.set(userId, callbacks);
      let stopped = false;
      stream.onAbort(() => { stopped = true; callbacks.delete(callback); if (!callbacks.size) listeners.delete(userId); });
      await stream.writeSSE({ event: "ready", data: "{}", retry: 5000 });
      while (!stopped) { await stream.sleep(15000); if (!stopped) await stream.writeSSE({ event: "heartbeat", data: "{}" }); }
    });
  });
}
