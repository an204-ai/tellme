import type { Filter } from "mongodb";
import { anonymousIdentity } from "./anonymous.js";
import {
  users,
  posts,
  stories,
  conversations,
  messages,
  media,
} from "./database.js";
import { fail } from "./security.js";
import type { User, Post, Story, Conversation, Privacy, Message } from "./models.js";
import { enqueue, visibleStoryMusic } from "@tellme/database";
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
  return {
    blocked: [
      ...new Set([
        ...me.blocked,
        ...others.filter((u) => u.blocked.includes(me._id)).map((u) => u._id),
      ]),
    ],
    mutual: others
      .filter(
        (u) => u.following.includes(me._id) && me.following.includes(u._id),
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
    [field]: { $nin: r.blocked },
    $or: [
      { [field]: me._id },
      { privacy: "public" },
      { privacy: "connections", [field]: { $in: r.mutual } },
    ],
  };
}
export function personDTO(
  user: Pick<
    User,
    "_id" | "username" | "name" | "avatar" | "cover" | "bio" | "location" | "birthday" | "occupation" | "interests" | "favoriteLunch" | "favoriteDrink"
  >,
  me: User,
) {
  return {
    id: externalId(user._id, me),
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    cover: user.cover,
    bio: user.bio,
    location: user.location,
    birthday: user.birthday || "",
    occupation: user.occupation || "",
    interests: user.interests || "",
    favoriteLunch: user.favoriteLunch || "",
    favoriteDrink: user.favoriteDrink || "",
  };
}
export function postDTO(post: Post, me: User) {
  return {
    id: post._id,
    authorId:
      post.anonymous && post.authorId !== me._id
        ? "anonymous"
        : externalId(post.authorId, me),
    content: post.content,
    image: post.image,
    topic: post.topic,
    privacy: post.privacy,
    anonymous: post.anonymous,
    ...(post.anonymous ? { anonymousIdentity: anonymousIdentity(post._id, post.anonymousVersion) } : {}),
    createdAt: post.createdAt,
    likes: Object.keys(post.reactions).length,
    reactorIds: Object.keys(post.reactions)
      .filter((id) => id !== me._id)
      .map((id) => externalId(id, me)),
    reaction: normalizeReaction(post.reactions[me._id]),
    reactorReactions: Object.fromEntries(Object.entries(post.reactions).map(([id, reaction]) => [externalId(id, me), normalizeReaction(reaction)])),
    comments: post.comments
      .filter((comment) => !me.blocked.includes(comment.userId))
      .map(({ likedBy, ...comment }) => ({
        ...comment,
        userId: post.anonymous && comment.userId === post.authorId ? "anonymous" : externalId(comment.userId, me),
        ...(post.anonymous && comment.userId === post.authorId ? { isAuthor: true } : {}),
        liked: likedBy.includes(me._id),
      })),
    saved: post.savedBy.includes(me._id),
    shares: post.sharedBy.length,
  };
}
export function storyDTO(story: Story, me: User, mutual: string[] = []) {
  return {
    id: story._id,
    userId: externalId(story.userId, me),
    day: story.day,
    privacy: story.privacy,
    ...(story.music ? { music: visibleStoryMusic(story.music) } : {}),
    items: story.items
      .filter((item) => {
        if (story.userId === me._id) return true;
        const audience = item.privacy || story.privacy;
        return audience === "public" || (audience === "connections" && mutual.includes(story.userId));
      })
      .map(({ reactions, ...item }) => ({
        ...item,
        reaction: normalizeReaction(reactions[me._id]),
      })),
  };
}
export async function canViewMoment(story: Story, momentId: string, me: User) {
  const item = story.items.find((entry) => entry.id === momentId);
  if (!item) return false;
  if (story.userId === me._id) return true;
  const audience = item.privacy || story.privacy;
  if (audience === "public") return true;
  if (audience === "private" || me._id === "guest") return false;
  return (await relations(me)).mutual.includes(story.userId);
}
export async function requirePost(id: string, me: User) {
  const post = await posts.findOne({
    $and: [{ _id: id }, await visibility(me, "authorId")],
  } as Filter<Post>);
  if (!post) fail(404, "Bài viết không tồn tại hoặc bạn không có quyền xem.");
  return post;
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
async function conversationAllowed(chat: Conversation) {
  const people = await users.find({ _id: { $in: chat.participants } }, { projection: { _id: 1, following: 1, blocked: 1 } }).toArray();
  return canSendInConversation(chat, people);
}
export async function requireConversation(id: string, me: User, sending = false) {
  const chat = await conversations.findOne({ _id: id, participants: me._id });
  if (!chat) fail(404, "Cuộc trò chuyện không khả dụng.");
  const r = await relations(me);
  if (chat.participants.some((id) => r.blocked.includes(id)))
    fail(403, "Không thể nhắn tin cho tài khoản đã chặn.");
  if (sending && !await conversationAllowed(chat)) fail(403, chat.kind === "group" ? "Không thể gửi tin trong nhóm có tài khoản đã chặn hoặc không còn khả dụng." : "Hai người cần follow nhau để nhắn tin riêng.");
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
  postId?: string,
  kind: "like" | "message" = "like",
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
    at: now(),
    ...(postId ? { postId } : {}),
    kind,
  });
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
    messages: await Promise.all(items.reverse().map((m) => messageDTO(m, me))),
  };
}
export async function messageDTO(message: Message, me: User) {
  let reply;
  if (message.storyReply) {
    const story = await stories.findOne({
      $and: [{ _id: message.storyReply.storyId }, await visibility(me, "userId")],
    } as Filter<Story>);
    const moment = story?.items.find((item) => item.id === message.storyReply?.momentId);
    reply = {
      ...message.storyReply,
      ...(moment && story && await canViewMoment(story, moment.id, me) ? { image: moment.image, caption: moment.caption, at: moment.at } : {}),
    };
  }
  return {
    id: message._id,
    userId: externalId(message.senderId, me),
    text: message.text,
    own: message.senderId === me._id,
    at: message.at,
    ...(message.postId ? { postId: message.postId } : {}),
    ...(reply ? { storyReply: reply } : {}),
  };
}
export async function postFilter(
  me: User,
  query: Record<string, string>,
): Promise<Filter<Post>> {
  const conditions: Filter<Post>[] = [
    (await visibility(me, "authorId")) as Filter<Post>,
    { _id: { $nin: me.hiddenPosts } },
  ];
  if (query.view === "saved") conditions.push({ savedBy: me._id });
  if (query.view === "profile")
    conditions.push({
      authorId: internalId(query.authorId || "", me),
      anonymous: false,
    });
  if (query.view === "search") conditions.push({ privacy: "public" });
  if (query.topic) conditions.push({ topic: query.topic.slice(0, 40) });
  if (query.tab === "following")
    conditions.push({ authorId: { $in: [me._id, ...me.following] } });
  if (query.search) {
    const escaped = query.search
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    conditions.push({
      $or: [
        { content: { $regex: escaped, $options: "i" } },
        { topic: { $regex: escaped, $options: "i" } },
      ],
    });
  }
  return { $and: conditions };
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
      privacy === "public" ||
      (privacy === "connections" && mutual.includes(authorId)))
  );
}
