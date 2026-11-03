import { realtimeMessage } from "./realtime-message.js";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { PRESENCE_TTL, type PresenceStore } from "./presence-store.js";

export type RealtimeActor = { userId: string; sessionId: string; expiresAt: number };
type Peer = { socket: WebSocket; actor: RealtimeActor; id: string; seen: number; renewed: number; pending: Promise<unknown>; closed: boolean; snapshotVersion: number; watching?: string; watched?: Set<string> };
type Update = { kind: string; userIds: string[]; sessionId?: string; detail?: Record<string, unknown> };
type Options = {
  authenticate: (request: IncomingMessage) => Promise<RealtimeActor | null>;
  friends: (userId: string) => Promise<string[]>;
  presence: PresenceStore;
  origins: Set<string>;
  ready: () => boolean;
  validate?: (actor: RealtimeActor) => Promise<boolean>;
  control?: (actor: RealtimeActor, peerId: string, frame: Record<string, unknown>) => Promise<void>;
  disconnect?: (peerId: string) => void;
  now?: () => number;
};

/** All chat invalidations and presence frames share this one authenticated socket. */
export function attachRealtimeSocket(server: Server, options: Options) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024, perMessageDeflate: false });
  const peers = new Map<string, Peer>();
  const users = new Map<string, Set<Peer>>();
  const audiencePeers = (ids: Iterable<string>) => Array.from(new Set(ids)).flatMap((id) => [...(users.get(id) || [])]);
  const clock = options.now || Date.now;
  let stopped = false;
  const send = (peer: Peer, value: object | string) => {
    if (peer.closed || peer.socket.readyState !== WebSocket.OPEN) return;
    if (peer.socket.bufferedAmount > 128 * 1024) { peer.socket.close(1013, "Reconnect"); return; }
    peer.socket.send(typeof value === "string" ? value : JSON.stringify(value));
  };
  const snapshot = async (peer: Peer) => {
    if (peer.closed) return;
    const generation = ++peer.snapshotVersion;
    const ids = await options.friends(peer.actor.userId);
    const snapshot = await options.presence.online([peer.actor.userId, ...ids]);
    if (generation !== peer.snapshotVersion) return;
    send(peer, { kind: "presence.snapshot", selfId: peer.actor.userId, friendIds: ids, ...snapshot });
  };
  const reject = (socket: import("node:stream").Duplex, status: string) => { socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); };
  const upgrade = (request: IncomingMessage, socket: import("node:stream").Duplex, head: Buffer) => {
    if (request.url?.split("?")[0] !== "/api/realtime") { reject(socket, "404 Not Found"); return; }
    if (stopped || !options.ready()) { reject(socket, "503 Service Unavailable"); return; }
    if (!request.headers.origin || !options.origins.has(request.headers.origin)) { reject(socket, "403 Forbidden"); return; }
    socket.on("error", () => {});
    void options.authenticate(request).then((actor) => {
      if (socket.destroyed) return;
      if (!actor || actor.expiresAt <= clock()) { reject(socket, "401 Unauthorized"); return; }
      if ((users.get(actor.userId)?.size || 0) >= 8) { reject(socket, "429 Too Many Requests"); return; }
      wss.handleUpgrade(request, socket, head, (connection) => {
        const peer: Peer = { socket: connection, actor, id: randomUUID(), seen: clock(), renewed: clock(), pending: Promise.resolve(), closed: false, snapshotVersion: 0 };
        peers.set(peer.id, peer);
        const devices = users.get(actor.userId) || new Set<Peer>();
        devices.add(peer); users.set(actor.userId, devices);
        // Serialize renewal and leave so a late renewal cannot resurrect a closed tab.
        const renew = () => { peer.pending = peer.pending.catch(() => {}).then(() => options.presence.touch(actor.userId, peer.id)); };
        renew();
        void peer.pending.then(() => snapshot(peer)).catch(() => send(peer, { kind: "presence.unavailable" }));
        send(peer, { kind: "ready" });
        connection.on("error", () => {});
        connection.on("close", () => {
          peer.closed = true; peers.delete(peer.id);
          devices.delete(peer); if (!devices.size) users.delete(actor.userId);
          options.disconnect?.(peer.id);
          void peer.pending.catch(() => {}).then(() => { options.disconnect?.(peer.id); return options.presence.leave(actor.userId, peer.id); }).catch(() => {});
        });
        let lastSync = 0, windowStart = clock(), frames = 0;
        connection.on("message", (data, binary) => {
          if (binary) { connection.close(1003, "Text only"); return; }
          const value = data.toString();
          const now = clock();
          if (now - windowStart >= 10000) { windowStart = now; frames = 0; }
          if (++frames > 30) { connection.close(1008, "Too many frames"); return; }
          if (actor.expiresAt <= now) { connection.close(1008, "Sign in again"); return; }
          if (value === "h") {
            peer.seen = now;
            if (now - peer.renewed < 10000) return;
            peer.renewed = now; renew();
            void peer.pending.then(() => send(peer, "p")).catch(() => { send(peer, "p"); send(peer, { kind: "presence.unavailable" }); });
          } else if (value.startsWith("{") && options.control) {
            try {
              const frame = JSON.parse(value);
              if (frame.kind === "chat.watch") {
                const active = typeof frame.conversationId === "string" && frame.conversationId.length <= 100 ? frame.conversationId : undefined;
                if (active !== peer.watching) options.disconnect?.(peer.id);
                peer.watching = active;
                const requested = Array.isArray(frame.conversationIds) ? frame.conversationIds : [];
                peer.watched = new Set([...(active ? [active] : []), ...requested.filter((id: unknown): id is string => typeof id === "string" && id.length <= 100)].slice(0, 16));
                return;
              }
              // Control work is serialized separately from message delivery and heartbeat.
              peer.pending = peer.pending.catch(() => {}).then(() => options.control!(actor, peer.id, frame)).catch(() => {});
            } catch { /* Ignore invalid control frames. */ }
          } else if (value === "sync" && now - lastSync >= 3000) {
            lastSync = now; void snapshot(peer).catch(() => send(peer, { kind: "presence.unavailable" }));
          }
        });
      });
    }).catch(() => reject(socket, "503 Service Unavailable"));
  };
  server.on("upgrade", upgrade);
  let sweeping = false;
  let lastValidation = 0;
  const timer = setInterval(() => {
    if (sweeping) return;
    sweeping = true;
    const now = clock();
    for (const peer of peers.values()) if (now - peer.seen > PRESENCE_TTL || peer.actor.expiresAt <= now) peer.socket.terminate();
    if (options.validate && now - lastValidation >= 30000) {
      lastValidation = now;
      for (const peer of peers.values()) void options.validate(peer.actor).then((valid) => { if (!valid) peer.socket.close(1008, "Sign in again"); }).catch(() => peer.socket.close(1013, "Reconnect"));
    }
    void options.presence.sweep(now).catch(() => {}).finally(() => { sweeping = false; });
  }, 5000 + Math.floor(Math.random() * 2000));
  timer.unref();
  return {
    async presenceChanged(event: { userId: string; online: boolean; at: number; revision: number }) {
      // Recheck the audience only on transitions, never for each heartbeat.
      const audience = new Set([event.userId, ...await options.friends(event.userId)]);
      for (const peer of audiencePeers(audience)) send(peer, { kind: "presence", ...event, userId: event.userId === peer.actor.userId ? "me" : event.userId });
    },
    async update(event: Update) {
      for (const peer of event.userIds.length ? audiencePeers(event.userIds) : peers.values()) {
        if (event.kind === "relations" || event.kind === "messages") options.disconnect?.(peer.id);
        if (event.kind === "chat.typing" && !peer.watched?.has(String(event.detail?.conversationId))) continue;
        if (event.kind === "session-revoked") {
          if (!event.sessionId || event.sessionId === peer.actor.sessionId) peer.socket.close(1008, "Sign in again");
          continue;
        }
        send(peer, { kind: event.kind, ...event.detail,
          ...(event.kind === "chat.message" && event.detail?.message
            ? { message: realtimeMessage(event.detail.message as Parameters<typeof realtimeMessage>[0], peer.actor.userId) }
            : {}),
          ...(event.detail?.userId === peer.actor.userId ? { userId: "me" } : {}),
        });
        if (event.kind === "relations" || event.kind === "realtime-ready") await snapshot(peer).catch(() => {});
      }
    },
    stop() {
      stopped = true; clearInterval(timer); server.off("upgrade", upgrade);
      for (const peer of peers.values()) peer.socket.terminate();
      wss.close();
    },
  };
}
