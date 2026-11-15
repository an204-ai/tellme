export type Privacy = "public" | "connections" | "private";
export type Reaction = import("@tellme/shared/reactions").MomentReaction;
export interface Person {
  foundingMember?: boolean;
  foundingWelcomePending?: boolean;
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  cover: string;
}
export type ProfileConnection = Pick<Person, "id" | "username" | "name" | "avatar">;
export interface MomentItem {
  id: string;
  image: string;
  caption: string;
  at: string;
  /** Optional per-photo restriction; absent means the day-wide audience applies. */
  privacy?: Privacy;
  reaction?: Reaction | null;
  /** Viewer reaction values returned only when the story owner opens this day's timeline. */
  incomingReactions?: Reaction[];
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
export interface DayStory {
  id: string;
  userId: string;
  day: string;
  privacy: Privacy;
  items: MomentItem[];
  music?: StoryMusic;
}
export interface Message {
  replyTo?: { messageId: string; userId: string; text: string; stickerId?: string };
  /** Local outbox state, never persisted or sent to the server. */
  pending?: boolean;
  stickerId?: string;
  userId?: string;
  storyReply?: {
    storyId: string;
    momentId: string;
    groupId?: string;
    image?: string;
    caption?: string;
    at?: string;
  };
  id: string;
  text: string;
  own: boolean;
  at: string;
}
export interface Conversation {
  readAt?: Record<string, string>;
  ownerId?: string;
  muted?: boolean;
  avatar?: string;
  canMessage?: boolean;
  kind?: "direct" | "group";
  title?: string;
  participantIds?: string[];
  id: string;
  userId: string;
  unread: number;
  messages: Message[];
}
export interface Notice {
  kind?: "like" | "message" | "system";
  systemIcon?: "sunrise" | "lunch" | "sunset" | "moon" | "weather";
  title?: string;
  url?: string;
  id: string;
  userId: string;
  text: string;
  read: boolean;
  at: string;
  storyId?: string;
  momentId?: string;
  conversationId?: string;
  groupCount?: number;
  unreadCount?: number;
}
export interface NotificationPage {
  items: Notice[];
  nextCursor: number | null;
  olderAvailable: boolean;
}
export interface Preferences {
  audience: Privacy;
  notifyLikes: boolean;
  notifyMessages: boolean;
  notifySystem?: boolean;
  emailUpdates: boolean;
  reducedMotion: boolean;
}
export interface FriendRequest { id: string; person: ProfileConnection; at: string }
export interface FriendLookup { person: ProfileConnection; relationship: "self" | "friends" | "incoming" | "outgoing" | "none"; requestId?: string }
export interface AppData {
  version: 1;
  authenticated?: boolean;
  features?: { pushPublicKey: string | null; emailEnabled: boolean };
  people: Person[];
  stories: DayStory[];
  conversations: Conversation[];
  notifications: Notice[];
  unreadNotifications?: number;
  friendRequests?: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  connections: string[];
  blocked: string[];
  settings: Preferences;
  paginationSeedVersion?: number;
}
export interface JourneyMonth {
  accountCreatedAt: string;
  days: { day: string; storyId: string; image: string; count: number }[];
  firstDay: string | null;
  latestDay: string | null;
}

export interface StoryPage {
  items: DayStory[];
  nextCursor: number | undefined;
}
export interface GroupPhoto extends MomentItem {
  groupId: string;
  userId: string;
  person?: Person;
}
export interface PhotoGroupInvitation { id: string; title: string; avatar: string; expiresAt: string; owner: Person; }
export interface PhotoGroup {
  pendingMembers?: Person[];
  isJoined?: boolean;
  canPost?: boolean;
  durationDays?: 1 | 3 | 7;
  expiresAt?: string;
  endedAt?: string;
  endReason?: "cancelled";
  id: string;
  title: string;
  avatar: string;
  ownerId: string;
  memberIds: string[];
  members?: Person[];
  createdAt: string;
  updatedAt: string;
  count: number;
  latest?: GroupPhoto;
}
