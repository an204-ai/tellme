import { MongoClient } from "mongodb";
import { config } from "./config.js";
import type {
  AuthToken,
  User,
  Session,
  Post,
  Story,
  Conversation,
  Message,
  Notice,
  Media,
  Report,
  BackgroundJob,
  PushSubscriptionRecord,
  ServerLog, AdminAudit, ActivityDay,
} from "./models.js";
export const mongo = new MongoClient(config.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 20,
});
const db = mongo.db(config.MONGODB_DB);
export const authTokens = db.collection<AuthToken>("auth_tokens");
export const users = db.collection<User>("users");
export const sessions = db.collection<Session>("sessions");
export const posts = db.collection<Post>("posts");
export const stories = db.collection<Story>("stories");
export const conversations = db.collection<Conversation>("conversations");
export const messages = db.collection<Message>("messages");
export const notices = db.collection<Notice>("notifications");
export const media = db.collection<Media>("media");
export const reports = db.collection<Report>("reports");
export const outbox = db.collection<BackgroundJob>("background_jobs");
export const pushSubscriptions = db.collection<PushSubscriptionRecord>("push_subscriptions");
export const serverLogs = db.collection<ServerLog>("server_logs");
export const adminAudit = db.collection<AdminAudit>("admin_audit");
export const activityDays = db.collection<ActivityDay>("activity_days");
export async function connectDatabase() {
  await mongo.connect();
  await Promise.all([
    authTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    authTokens.createIndex({ tokenHash: 1 }, { unique: true }),
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ username: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
    users.createIndex({ lastActiveAt: -1 }),
    serverLogs.createIndex({ at: 1 }, { expireAfterSeconds: 86400 * 7 }),
    serverLogs.createIndex({ service: 1, level: 1, at: -1 }),
    serverLogs.createIndex({ requestId: 1 }),
    adminAudit.createIndex({ at: -1, _id: -1 }),
    adminAudit.createIndex({ targetId: 1, at: -1 }),
    activityDays.createIndex({ day: 1, userId: 1 }),
    activityDays.createIndex({ at: 1 }, { expireAfterSeconds: 86400 * 365 }),
    reports.createIndex({ at: -1 }),
    posts.createIndex({ createdAt: -1, _id: -1 }),
    posts.createIndex({ authorId: 1, createdAt: -1 }),
    posts.createIndex({ savedBy: 1, createdAt: -1 }),
    posts.createIndex({ "comments.createdAt": -1 }),
    stories.createIndex({ day: -1 }),
    stories.createIndex({ userId: 1, day: 1 }, { unique: true }),
    stories.createIndex({ updatedAt: -1 }),
    conversations.createIndex(
      { directKey: 1 },
      {
        unique: true,
        partialFilterExpression: { directKey: { $type: "string" } },
      },
    ),
    conversations.createIndex({ participants: 1, updatedAt: -1 }),
    messages.createIndex({ conversationId: 1, at: -1, _id: -1 }),
    notices.createIndex({ recipientId: 1, at: -1 }),
    media.createIndex({ ownerId: 1, url: 1 }),
    reports.createIndex({ userId: 1, postId: 1 }, { unique: true }),
    outbox.createIndex({ status: 1, availableAt: 1 }),
    outbox.createIndex({ finishedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }),
    pushSubscriptions.createIndex({ userId: 1 }),
    pushSubscriptions.createIndex({ "subscription.endpoint": 1 }, { unique: true }),
  ]);
}
