export type Privacy = "public" | "connections" | "private";
export type Reaction =
  | "like"
  | "love"
  | "haha"
  | "wow"
  | "sad"
  | "cheer"
  | "celebrate"
  | "appreciate"
  | "smile";
export interface Preferences {
  audience: Privacy;
  notifyLikes: boolean;
  notifyMessages: boolean;
  notifySystem?: boolean;
  emailUpdates: boolean;
  reducedMotion: boolean;
}
export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt?: string;
  emailVerificationRequired?: boolean;
  username: string;
  name: string;
  avatar: string;
  cover: string;
  bio: string;
  location: string;
  birthday?: string;
  occupation?: string;
  interests?: string;
  breakTime?: string;
  favoriteLunch?: string;
  favoriteDrink?: string;
  following: string[];
  blocked: string[];
  hiddenPosts: string[];
  hiddenStories?: string[];
  savedStories?: string[];
  settings: Preferences;
  createdAt: string;
  suspension?: { reason: string; at: string; actorId: string; until?: string };
}
export interface ModerationState { hidden: boolean; reason: string; actorId: string; at: string }
export interface ServerLog {
  _id: string; at: Date; level: "info" | "warn" | "error"; service: string; event: string;
  requestId?: string; route?: string; method?: string; status?: number; durationMs?: number;
  actorId?: string; jobId?: string; jobKind?: string; code?: string;
}
export interface AuthToken {
  _id: string;
  userId: string;
  purpose: "verify-email" | "reset-password";
  tokenHash: string;
  codeNonce?: string;
  attempts?: number;
  resetGrantHash?: string;
  codeVerifiedAt?: Date;
  passwordHash: string;
  createdAt: Date;
  expiresAt: Date;
}
export interface Session {
  _id: string;
  userId: string;
  expiresAt: Date;
}
export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  parentId?: string;
  likedBy: string[];
  /** New reaction map; likedBy remains readable for comments created before reactions existed. */
  reactions?: Record<string, Reaction>;
  moderation?: ModerationState;
  media?: {
    id: string;
    kind: "gif" | "sticker";
    url: string;
    alt: string;
    width: number;
    height: number;
  };
}
export interface Post {
  _id: string;
  authorId: string;
  content: string;
  image: string;
  topic: string;
  privacy: Privacy;
  anonymous: boolean;
  /** Absent on older posts: retain the original per-post alias. */
  anonymousVersion?: 1 | 2;
  createdAt: string;
  reactions: Record<string, Reaction>;
  comments: Comment[];
  savedBy: string[];
  sharedBy: string[];
  moderation?: ModerationState;
}
export interface Moment {
  id: string;
  image: string;
  caption: string;
  at: string;
  /** Optional per-photo restriction; absent means the story audience applies. */
  privacy?: Privacy;
  reactions: Record<string, Reaction>;
}
export interface StoryMusic {
  provider: "epidemic-sound" | "youtube";
  trackId: string;
  title: string;
  artists: string[];
  cover: string;
  metadataUpdatedAt?: string;
  durationSeconds?: number;
  startSeconds?: number;
}
export interface Story {
  _id: string;
  userId: string;
  day: string;
  privacy: Privacy;
  items: Moment[];
  /** A single user-selected track for the whole day; never persist expiring stream URLs. */
  music?: StoryMusic;
  updatedAt: string;
  moderation?: ModerationState;
}
export interface Conversation {
  ownerId?: string;
  mutedBy?: string[];
  avatar?: string;
  _id: string;
  kind: "direct" | "group";
  title: string;
  participants: string[];
  directKey?: string;
  readAt: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
export interface Message {
  replyTo?: { messageId: string; senderId: string; text: string; stickerId?: string };
  stickerId?: string;
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  postId?: string;
  storyReply?: { storyId: string; momentId: string };
  at: string;
}
export interface Notice {
  _id: string;
  recipientId: string;
  userId: string;
  text: string;
  read: boolean;
  at: string;
  postId?: string;
  kind?: "like" | "message";
}
export interface Media {
  _id: string;
  ownerId: string;
  url: string;
  createdAt: string;
  state?: "active" | "deleting";
  lastReferencedAt?: string;
  variants?: { feed: string; thumbnail: string; blurhash: string; width: number; height: number };
}
export type JobKind = "media.process" | "media.cleanup" | "media.sweep" | "feed.rebuild" | "notification.deliver" | "notification.email" | "notification.push" | "notification.account-email" | "notification.system";
export interface BackgroundJob {
  _id: string;
  kind: JobKind;
  data: Record<string, unknown>;
  status: "pending" | "dispatched" | "completed" | "failed";
  createdAt: Date;
  availableAt: Date;
  attempts: number;
  error?: string;
  finishedAt?: Date;
}
export interface PushSubscriptionRecord {
  _id: string;
  userId: string;
  subscription: { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } };
}
export interface Report {
  targetType?: "post" | "story" | "user";
  targetId?: string;
  _id: string;
  userId: string;
  postId: string;
  reason: string;
  at: string;
  resolution?: { action: "dismiss" | "remove-post" | "hide-content" | "suspend-user"; actorId: string; at: string; reason?: string };
}
export const defaults: Preferences = {
  audience: "public",
  notifyLikes: true,
  notifyMessages: true,
  notifySystem: true,
  emailUpdates: false,
  reducedMotion: false,
};
