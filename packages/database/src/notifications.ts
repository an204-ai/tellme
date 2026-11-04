import webpush from "web-push";
import { config } from "./config.js";
import { users, notices, pushSubscriptions } from "./database.js";
import { enqueue, publishUpdate } from "./queue.js";

export function validPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && ["fcm.googleapis.com", "push.services.mozilla.com", "web.push.apple.com", "notify.windows.com"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}
export async function deliverNotification(data: Record<string, unknown>, id: string) {
  const recipientId = String(data.recipientId), userId = String(data.userId);
  const [recipient, actor] = await Promise.all([users.findOne({ _id: recipientId }), users.findOne({ _id: userId })]);
  if (!recipient || !actor || recipientId === userId || recipient.blocked.includes(userId) || actor.blocked.includes(recipientId)) return;
  if (!(data.kind === "message" ? recipient.settings.notifyMessages : recipient.settings.notifyLikes)) return;
  await notices.updateOne({ _id: id }, { $setOnInsert: { recipientId, userId, text: String(data.text), read: false, at: String(data.at), kind: data.kind === "message" ? "message" : "like", ...(data.postId ? { postId: String(data.postId) } : {}), ...(data.storyId ? { storyId: String(data.storyId) } : {}), ...(data.momentId ? { momentId: String(data.momentId) } : {}), ...(data.conversationId ? { conversationId: String(data.conversationId) } : {}) } }, { upsert: true });
  await publishUpdate([recipientId], "notifications", { noticeId: id });
  if (config.VAPID_PRIVATE_KEY && config.VAPID_PUBLIC_KEY && await pushSubscriptions.findOne({ userId: recipientId }, { projection: { _id: 1 } }))
    await enqueue("notification.push", { recipientId, noticeId: id }, { id: `push-${id}` });
}
// Retained to drain old queued jobs without sending interaction emails.
export async function sendEmail(_data: Record<string, unknown>, _id: string) { return; }
export async function sendPush(data: Record<string, unknown>) {
  if (!config.VAPID_PRIVATE_KEY || !config.VAPID_PUBLIC_KEY) return;
  const recipient = await users.findOne({ _id: String(data.recipientId) });
  const notice = await notices.findOne({ _id: String(data.noticeId), recipientId: recipient?._id });
  if (!recipient || !notice || notice.read || !(notice.kind === "message" ? recipient.settings.notifyMessages : recipient.settings.notifyLikes)) return;
  const actor = await users.findOne({ _id: notice.userId }, { projection: { name: 1, blocked: 1 } });
  if (!actor || recipient.blocked.includes(actor._id) || actor.blocked.includes(recipient._id)) return;
  const url = notice.conversationId
    ? `/community/messages/${encodeURIComponent(notice.conversationId)}`
    : notice.postId ? `/post/${encodeURIComponent(notice.postId)}` : "/community/today";
  const tagContext = notice.kind === "message" ? notice.conversationId || actor._id : actor._id;
  await pushToUser(recipient._id, {
    title: actor.name,
    body: notice.text,
    url,
    tag: `tellme-${notice.kind || "like"}-${recipient._id}-${tagContext}`.slice(0, 100),
  });
}
export async function pushToUser(userId: string, payload: { title: string; body: string; url: string; tag: string; icon?: string }, ttl = 3600) {
  if (!config.VAPID_PRIVATE_KEY || !config.VAPID_PUBLIC_KEY) return;
  webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY);
  for (const subscription of await pushSubscriptions.find({ userId }).toArray()) {
    if (!validPushEndpoint(subscription.subscription.endpoint)) continue;
    try { await webpush.sendNotification(subscription.subscription, JSON.stringify(payload), { TTL: ttl }); }
    catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await pushSubscriptions.deleteOne({ _id: subscription._id });
      else throw new Error("Web Push delivery unavailable");
    }
  }
}
