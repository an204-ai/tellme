import type { Filter } from "mongodb";
import {
  users,
  stories,
  conversations,
  messages,
  media,
  photoGroups,
  groupPhotos,
} from "./database.js";
import { photoGroupVisibility } from "./photo-group-access.js";
import { fail } from "./security.js";
import type { User, Story, Conversation, Privacy, Message } from "./models.js";
import { enqueue } from "@tellme/database";
import { normalizeReaction } from "./social-assets.js";
import { canChatTogether, canSendInConversation } from "./chat-policy.js";
export const now = () => new Date().toISOString();
export const day = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const externalId = (id: string, me: User) => (id === me._id ? "me" : id);
export const internalId = (id: string, me: User) => (id === "me" ? me._id : id);
export async function relations(me: User) {
  const others = await users
    .find(
      { $or: [{ blocked: me._id }, { following: me._id }] },
      { projection: { _id: 1, blocked: 1, following: 1 } },
    )
    .toArray();
  const blocked = [
      ...new Set([
        ...me.blocked,
        ...others.filter((u) => u.blocked.includes(me._id)).map((u) => u._id),
      ]),
    ];
  return {
    blocked,
    mutual: others
      .filter(
        (u) => !blocked.includes(u._id) && u.following.includes(me._id) && me.following.includes(u._id),
      )
      .map((u) => u._id),
  };
}
export async function visibility(
  me: User,
  field: "authorId" | "userId",
): Promise<Record<string, unknown>> {
  const r = await relations(me);
  return {
    "moderation.hidden": { $ne: true },
    [field]: { $nin: r.blocked },
    $or: [
      { [field]: me._id },
      { privacy: { $in: ["public", "connections"] }, [field]: { $in: r.mutual } },
    ],
  };
}
export function personDTO(
  user: Pick<
    User,
    "_id" | "username" | "name" | "avatar" | "cover" | "bio" | "memberNumber" | "foundingWelcomedAt"
  >,
  me: User,
  full = true,
) {
  return {
    id: externalId(user._id, me),
    username: user.username,
    foundingMember: Number.isInteger(user.memberNumber) && user.memberNumber! >= 1 && user.memberNumber! <= 100,
    ...(user._id === me._id ? { foundingWelcomePending: Number.isInteger(user.memberNumber) && user.memberNumber! >= 1 && user.memberNumber! <= 100 && !user.foundingWelcomedAt } : {}),
    name: user.name,
    avatar: user.avatar,
    cover: full ? user.cover : "",
    bio: full ? user.bio : "",
  };
}
export function storyDTO(story: Story, me: User, mutual: string[] = [], includeIncomingReactions = false) {
  return {
    id: story._id,
    userId: externalId(story.userId, me),
    day: story.day,
    privacy: story.privacy === "private" ? "private" : "connections",
    ...(story.music ? { music: story.music } : {}),
    items: story.items
      .filter((item) => {
        if (story.userId === me._id) return true;
        const audience = item.privacy || story.privacy;
        return story.privacy !== "private" && audience !== "private" && mutual.includes(story.userId);
      })
      .map(({ reactions, ...item }) => ({
        ...item,
        ...(item.privacy ? { privacy: item.privacy === "private" ? "private" : "connections" } : {}),
        reaction: story.userId === me._id ? null : normalizeReaction(reactions[me._id]),
        ...(includeIncomingReactions && story.userId === me._id
          ? { incomingReactions: Object.entries(reactions)
              .filter(([userId]) => userId !== me._id)
              .map(([, value]) => normalizeReaction(value))
              .filter((value): value is NonNullable<typeof value> => !!value) }
          : {}),
      })),
  };
}
export async function canViewMoment(story: Story, momentId: string, me: User) {
  const item = story.items.find((entry) => entry.id === momentId);
  if (!item) return false;
  if (story.userId === me._id) return true;
  const audience = item.privacy || story.privacy;
  if (story.privacy === "private" || audience === "private" || me._id === "guest") return false;
  const r = await relations(me);
  return !r.blocked.includes(story.userId) && r.mutual.includes(story.userId);
}
export async function requireStory(id: string, me: User) {
  const story = await stories.findOne({
    $and: [{ _id: id }, await visibility(me, "userId")],
  } as Filter<Story>);
  if (!story) fail(404, "Chuỗi ảnh không khả dụng.");
  return story;
}
export async function chatAllowed(participants: string[], creatorId?: string) {
  const people = await users.find({ _id: { $in: participants } }, { projection: { _id: 1, following: 1, blocked: 1 } }).toArray();
  return canChatTogether(participants, people, creatorId);
}
export async function conversationAllowed(chat: Conversation) {
  const people = await users.find({ _id: { $in: chat.participants } }, { projection: { _id: 1, following: 1, blocked: 1 } }).toArray();
  return canSendInConversation(chat, people);
}
export async function requireConversation(id: string, me: User, sending = false) {
  const chat = await conversations.findOne({ _id: id, participants: me._id });
  if (!chat) fail(404, "Cuộc trò chuyện không khả dụng.");
  const r = await relations(me);
  if (chat.participants.some((id) => r.blocked.includes(id)))
    fail(403, "Không thể nhắn tin cho tài khoản đã chặn.");
  if (sending && !await conversationAllowed(chat)) fail(403, chat.kind === "group" ? "Không thể gửi tin trong nhóm có tài khoản đã chặn hoặc không còn khả dụng." : "Hai người cần chấp nhận kết bạn để nhắn tin riêng.");
  return chat;
}
export async function ownedImage(url: string, me: User) {
  if (!url) return;
  if (url === me.avatar || url === me.cover) return;
  if (!(await media.findOne({ ownerId: me._id, url })))
    fail(400, "Vui lòng tải ảnh lên trước khi lưu.");
}
export async function notify(
  recipientId: string,
  userId: string,
  text: string,
  kind: "like" | "message" = "like",
  messageContext?: { messageId: string; conversationId: string; at: string },
  storyContext?: { storyId: string; momentId: string },
) {
  if (recipientId === userId) return;
  const recipient = await users.findOne({ _id: recipientId });
  if (
    !recipient ||
    recipient.blocked.includes(userId) ||
    !(kind === "message"
      ? recipient.settings.notifyMessages
      : recipient.settings.notifyLikes)
  )
    return;
  await enqueue("notification.deliver", {
    recipientId,
    userId,
    text,
    read: false,
    at: messageContext?.at || now(),
    ...(storyContext ? storyContext : {}),
    ...(messageContext ? { conversationId: messageContext.conversationId } : {}),
    kind,
  }, messageContext ? { id: `message-${messageContext.messageId}-${recipientId}` } : {});
}
export async function conversationDTO(chat: Conversation, me: User, allowed?: boolean) {
  const items = await messages
    .find({ conversationId: chat._id })
    .sort({ at: -1, _id: -1 })
    .limit(50)
    .toArray();
  const unread = await messages.countDocuments({
    conversationId: chat._id,
    senderId: { $ne: me._id },
    at: { $gt: chat.readAt[me._id] || "" },
  });
  return {
    id: chat._id,
    userId: externalId(
      chat.participants.find((id) => id !== me._id) || me._id,
      me,
    ),
    kind: chat.kind,
    ownerId: chat.kind === "group" ? externalId(chat.ownerId || chat.participants[0]!, me) : undefined,
    muted: !!chat.mutedBy?.includes(me._id),
    canMessage: allowed ?? await conversationAllowed(chat),
    title: chat.title,
    avatar: chat.avatar || "",
    participantIds: chat.participants.map((id) => externalId(id, me)),
    unread,
    readAt: Object.fromEntries(Object.entries(chat.readAt).map(([id, at]) => [externalId(id, me), at])),
    messages: await Promise.all(items.reverse().map((m) => messageDTO(m, me))),
  };
}
export async function messageDTO(message: Message, me: User) {
  let reply;
  if (message.storyReply) {
    if (message.storyReply.groupId) {
      const group = await photoGroups.findOne({ _id: message.storyReply.groupId, ...photoGroupVisibility(me._id, await relations(me)) });
      const photo = group && await groupPhotos.findOne({ _id: message.storyReply.momentId, groupId: group._id });
      reply = { ...message.storyReply, ...(photo ? { image: photo.image, caption: photo.caption, at: photo.at } : {}) };
    } else {
      const story = await stories.findOne({
        $and: [{ _id: message.storyReply.storyId }, await visibility(me, "userId")],
      } as Filter<Story>);
      const moment = story?.items.find((item) => item.id === message.storyReply?.momentId);
      reply = {
        ...message.storyReply,
        ...(moment && story && await canViewMoment(story, moment.id, me) ? { image: moment.image, caption: moment.caption, at: moment.at } : {}),
      };
    }
  }
  return {
    id: message._id,
    userId: externalId(message.senderId, me),
    text: message.text,
    ...(message.stickerId ? { stickerId: message.stickerId } : {}),
    ...(message.replyTo ? { replyTo: { messageId: message.replyTo.messageId, userId: externalId(message.replyTo.senderId, me), text: message.replyTo.text, ...(message.replyTo.stickerId ? { stickerId: message.replyTo.stickerId } : {}) } } : {}),
    own: message.senderId === me._id,
    at: message.at,
    ...(reply ? { storyReply: reply } : {}),
  };
}
export function canSee(
  authorId: string,
  privacy: Privacy,
  me: User,
  blocked: string[],
  mutual: string[],
) {
  return (
    !blocked.includes(authorId) &&
    (authorId === me._id ||
      (privacy !== "private" && mutual.includes(authorId)))
  );
}
