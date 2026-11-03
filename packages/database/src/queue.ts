import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { Queue, Worker, type Job } from "bullmq";
import type { ClientSession } from "mongodb";
import { config } from "./config.js";
import { outbox } from "./database.js";
import type { JobKind } from "./models.js";
import { logEvent } from "./observability.js";
import { connectionFailure } from "./connection.js";

export const prefix = `tellme-${config.MONGODB_DB.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
export const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 3000 });
redis.on("error", () => {});
export const eventChannel = `${prefix}:events`;
const url = new URL(config.REDIS_URL);
const connection = { host: url.hostname, port: Number(url.port || 6379), username: decodeURIComponent(url.username) || undefined, password: decodeURIComponent(url.password) || undefined, db: Number(url.pathname.slice(1) || 0), ...(url.protocol === "rediss:" ? { tls: {} } : {}) };
const queues = new Map<string, Queue>();
export function queueFor(kind: JobKind) {
  const name = kind.split(".")[0]!;
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection, prefix, defaultJobOptions: { attempts: 8, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: { age: 86400 * 7 }, removeOnFail: { age: 86400 * 30 } } });
    queues.set(name, queue);
  }
  return queue;
}
export async function enqueue(kind: JobKind, data: Record<string, unknown>, options: { session?: ClientSession; delay?: number; id?: string } = {}) {
  const id = options.id || randomUUID();
  await outbox.updateOne({ _id: id }, { $setOnInsert: { kind, data, status: "pending", createdAt: new Date(), availableAt: new Date(Date.now() + (options.delay || 0)), attempts: 0 } }, { upsert: true, session: options.session });
  return id;
}
export async function dispatchOutbox() {
  if (redis.status !== "ready") return;
  for (let i = 0; i < 50; i++) {
    const job = await outbox.findOneAndUpdate(
      { status: { $in: ["pending", "dispatched"] }, availableAt: { $lte: new Date() } },
      { $set: { status: "dispatched", availableAt: new Date(Date.now() + 60000) } },
      { sort: { availableAt: 1 }, returnDocument: "after" },
    );
    if (!job) break;
    try {
      const queue = queueFor(job.kind);
      const existing = await queue.getJob(job._id);
      if (existing) {
        const state = await existing.getState();
        if (state === "completed") {
          await outbox.updateOne({ _id: job._id }, { $set: { status: "completed", finishedAt: new Date() } });
          continue;
        }
        if (state === "failed") await existing.remove();
        else continue;
      }
      await queue.add(job.kind, job.data, { jobId: job._id });
    }
    catch { await outbox.updateOne({ _id: job._id, status: "dispatched" }, { $set: { status: "pending", availableAt: new Date(Date.now() + 5000) } }); break; }
  }
}
export async function publishUpdate(userIds: string[], kind = "community", detail?: Record<string, unknown>) {
  if (redis.status === "ready") await redis.publish(eventChannel, JSON.stringify({ userIds, kind, detail })).catch(() => undefined);
}
export async function connectRedis() {
  if (redis.status === "wait") await redis.connect();
  await redis.ping();
}
export function startDispatcher() {
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void dispatchOutbox().catch(() => undefined).finally(() => { running = false; });
  };
  tick();
  const timer = setInterval(tick, 1000);
  timer.unref();
  return () => clearInterval(timer);
}
export function createWorker(name: "media" | "feed" | "notification", handler: (kind: JobKind, data: Record<string, unknown>, id: string) => Promise<unknown>) {
  const worker = new Worker(name, async (job: Job) => {
    if (job.name === "notification.system") { await handler(job.name, job.data as Record<string, unknown>, job.id!); return; }
    await outbox.updateOne({ _id: job.id! }, { $inc: { attempts: 1 } });
    await handler(job.name as JobKind, job.data as Record<string, unknown>, job.id!);
    await outbox.updateOne({ _id: job.id! }, { $set: { status: "completed", finishedAt: new Date() }, $unset: { error: "" } });
  }, { connection, prefix, concurrency: name === "media" ? 2 : 5 });
  let lastError = 0;
  worker.on("error", () => { if (Date.now() - lastError > 30000) { lastError = Date.now(); logEvent({ service: name, level: "error", event: "worker.connection-unavailable" }); } });
  worker.on("failed", (job, error) => {
    const failure = connectionFailure(error);
    logEvent({ service: name, level: "error", event: "job.failed", code: failure.codes.join(",") || failure.type, ...(job ? { jobId: job.id, jobKind: job.name } : {}) });
    if (job && job.name !== "notification.system" && job.attemptsMade >= (job.opts.attempts || 1)) void outbox.updateOne({ _id: job.id! }, { $set: { status: "failed", error: "Task failed after automatic retries." } }).catch(() => undefined);
  });
  return worker;
}
export async function closeQueues() {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
  if (redis.status !== "end") redis.disconnect();
}
