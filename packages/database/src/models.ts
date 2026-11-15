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
  | "smile"
  | `emoji:${string}`;
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
  /** Immutable creation order, retained in the counter after deletion. */
  memberNumber?: number;
  foundingWelcomedAt?: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt?: string;
  emailVerificationRequired?: boolean;
  username: string;
  name: string;
  avatar: string;
  cover: string;
  bio: string;
  following: string[];
  blocked: string[];
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
export interface FriendRequest {
  /** One pending request per pair, regardless of who sends it. */
  _id: string;
  fromId: string;
  toId: string;
  at: string;
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
  provider: "epidemic-sound";
  trackId: string;
  title: string;
  artists: string[];
  cover: string;
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
export interface PhotoGroup {
  /** Invitation grants no membership or media access until accepted. */
  pendingMemberIds?: string[];
  /** Unique sparse multikey index reserves one active group per member. Unset on end/expiry. */
  activeMemberIds?: string[];
  durationDays?: 1 | 3 | 7;
  expiresAt?: string;
  endedAt?: string;
  endReason?: "cancelled";
  _id: string;
  title: string;
  avatar: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface GroupPhoto {
  _id: string;
  groupId: string;
  userId: string;
  image: string;
  caption: string;
  at: string;
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
  storyId?: string;
  momentId?: string;
  conversationId?: string;
  kind?: "like" | "message";
}
export interface Media {
  _id: string;
  ownerId: string;
  url: string;
  createdAt: string;
  state?: "active" | "deleting";
  deliveryType?: "upload" | "authenticated";
  lastReferencedAt?: string;
  variants?: { feed: string; thumbnail: string; blurhash: string; width: number; height: number };
}
export type JobKind = "media.process" | "media.cleanup" | "media.sweep" | "notification.deliver" | "notification.email" | "notification.push" | "notification.account-email" | "notification.system";
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
  targetType: "story" | "user";
  targetId: string;
  _id: string;
  userId: string;
  reason: string;
  at: string;
  resolution?: { action: "dismiss" | "hide-content" | "suspend-user"; actorId: string; at: string; reason?: string };
}
export const defaults: Preferences = {
  audience: "connections",
  notifyLikes: true,
  notifyMessages: true,
  notifySystem: true,
  emailUpdates: false,
  reducedMotion: false,
};
