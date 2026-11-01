import { connectDatabase, mongo } from "./database.js";
import { connectionFailure, waitForDatabase } from "./connection.js";
import { config } from "./config.js";
import { closeQueues, connectRedis, createWorker, enqueue, redis, startDispatcher, prefix } from "./queue.js";
import { cleanMedia, processMedia, sweepMedia } from "./media.js";
import { buildFeed } from "./feed.js";
import { deliverNotification, sendEmail, sendPush } from "./notifications.js";
import { sendAccountEmail } from "./account-email.js";
import { users } from "./database.js";
import { deliverSystemNotification, scheduleSystemNotifications } from "./system-notifications.js";
import type { JobKind } from "./models.js";
import { expireYouTubeMetadata } from "./story-music.js";

export async function handleJob(kind: JobKind, data: Record<string, unknown>, id: string) {
  switch (kind) {
    case "media.process": return processMedia(String(data.mediaId));
    case "media.cleanup": return cleanMedia(String(data.ownerId), String(data.url));
    case "media.sweep": await expireYouTubeMetadata(); return sweepMedia();
    case "feed.rebuild": return buildFeed();
    case "notification.deliver": return deliverNotification(data, id);
    case "notification.email": return sendEmail(data, id);
    case "notification.system": return deliverSystemNotification(data);
    case "notification.push": return sendPush(data);
    case "notification.account-email": {
      const user = await users.findOne({ _id: String(data.userId) });
      if (user) await sendAccountEmail(user.email, "password-changed", undefined, id);
      return;
    }
  }
}
export async function runWorker(name: "media" | "feed" | "notification") {
  const startup = new AbortController();
  let worker: ReturnType<typeof createWorker> | undefined;
  let stopDispatcher = () => {};
  let beat: ReturnType<typeof setInterval> | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopping = false, scheduling = false;
  const shutdown = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    startup.abort();
    clearInterval(timer); clearInterval(beat); stopDispatcher();
    if (worker) await worker.close();
    await redis.del(`${prefix}:worker:${name}`).catch(() => undefined);
    await Promise.allSettled([closeQueues(), mongo.close()]);
    process.exit(code);
  };
  process.once("SIGINT", () => { void shutdown(); });
  process.once("SIGTERM", () => { void shutdown(); });
  try {
    await waitForDatabase(connectDatabase, {
      signal: startup.signal,
      onRetry: (failure, attempt, delay) => console.warn(`MongoDB chưa kết nối được; ${name} worker sẽ tự thử lại.`, { ...failure, attempt, retryInSeconds: Math.ceil(delay / 1000) }),
    });
    await connectRedis();
    startup.signal.throwIfAborted();
    worker = createWorker(name, handleJob);
    stopDispatcher = startDispatcher();
    const heartbeat = () => { void redis.set(`${prefix}:worker:${name}`, String(Date.now()), "EX", 30).catch(() => undefined); };
    heartbeat();
    beat = setInterval(heartbeat, 10000);
    const schedule = () => {
      if (name === "notification" && !scheduling) {
        scheduling = true;
        void scheduleSystemNotifications().catch(() => undefined).finally(() => { scheduling = false; });
      }
      const hour = new Date().toISOString().slice(0, 13).replaceAll(":", "-");
      if (name === "media") void enqueue("media.sweep", {}, { id: `sweep-${hour}` }).catch(() => undefined);
      if (name === "feed") void enqueue("feed.rebuild", {}, { id: `feed-${Math.floor(Date.now() / 30000)}` }).catch(() => undefined);
    };
    schedule();
    timer = setInterval(schedule, name === "notification" ? 10000 : name === "feed" ? 30000 : 3600000);
    console.log(`Tellme ${name} worker ready (${config.NODE_ENV}).`);
  } catch (error) {
    if (!startup.signal.aborted) {
      console.error(`Tellme ${name} worker startup failed. Check MongoDB/Redis configuration.`, connectionFailure(error));
      await shutdown(1);
    }
  }
}
