import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379
};

export const mediaQueue = new Queue("media-processing", { connection: redisConnection });
export const notificationQueue = new Queue("notification-delivery", { connection: redisConnection });
export const feedQueue = new Queue("feed-building", { connection: redisConnection });
