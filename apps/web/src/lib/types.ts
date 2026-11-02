export type Privacy = "public" | "connections" | "private";
export interface AnonymousIdentity {
  name: string;
  animal: "cat" | "fish" | "bird" | "nightingale" | "sparrow" | "owl" | "rabbit" | "turtle" | "squirrel" | "dog" | "bear" | "otter" | "fox" | "frog" | "penguin";
  color: "lavender" | "mint" | "peach" | "sky" | "sand" | "rose";
}
export interface ArchiveItem {
  id: string;
  kind: "post" | "story";
  at: string;
  privacy: Privacy;
  person: Person | null;
  text: string;
  image: string;
  count?: number;
  anonymousIdentity?: AnonymousIdentity;
}
export interface ArchivePage { items: ArchiveItem[]; total: number; nextCursor: number | null }
export type Reaction = "like" | "love" | "haha" | "wow" | "sad";
export interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  birthday?: string;
  occupation?: string;
  interests?: string;
  favoriteLunch?: string;
  favoriteDrink?: string;
  followersCount?: number;
  followingCount?: number;
  cover: string;
}
export type ProfileConnection = Pick<Person, "id" | "username" | "name" | "avatar">;
export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  parentId?: string;
  liked?: boolean;
  isAuthor?: boolean;
  media?: CommentMedia;
}
export interface CommentMedia {
  id: string;
  kind: "gif" | "sticker";
  url: string;
  alt: string;
  width: number;
  height: number;
}
export interface Post {
  id: string;
  authorId: string;
  content: string;
  image: string;
  topic: string;
  privacy: Privacy;
  anonymous: boolean;
  anonymousIdentity?: AnonymousIdentity;
  createdAt: string;
  likes: number;
  reactorIds?: string[];
  reaction: Reaction | null;
  reactorReactions?: Record<string, Reaction>;
  comments: Comment[];
  saved: boolean;
  shares: number;
}
export interface MomentItem {
  id: string;
  image: string;
  caption: string;
  at: string;
  /** Optional per-photo restriction; absent means the day-wide audience applies. */
  privacy?: Privacy;
  reaction?: Reaction | null;
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
export interface DayStory {
  id: string;
  userId: string;
  day: string;
  privacy: Privacy;
  items: MomentItem[];
  music?: StoryMusic;
}
export interface Message {
  stickerId?: string;
  userId?: string;
  postId?: string;
  storyReply?: {
    storyId: string;
    momentId: string;
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
  postId?: string;
}
export interface Preferences {
  audience: Privacy;
  notifyLikes: boolean;
  notifyMessages: boolean;
  notifySystem?: boolean;
  emailUpdates: boolean;
  reducedMotion: boolean;
}
export interface AppData {
  version: 1;
  authenticated?: boolean;
  features?: { pushPublicKey: string | null; emailEnabled: boolean };
  people: Person[];
  posts: Post[];
  stories: DayStory[];
  conversations: Conversation[];
  notifications: Notice[];
  following: string[];
  connections: string[];
  blocked: string[];
  hiddenPosts: string[];
  hiddenStories?: string[];
  savedStories?: string[];
  reports: { postId: string; reason: string; at: string }[];
  settings: Preferences;
  paginationSeedVersion?: number;
  topicStats?: { name: string; count: number }[];
  postCounts?: Record<string, number>;
}
export interface PostFilters {
  view?: "feed" | "saved" | "search" | "profile";
  tab?: string;
  topic?: string;
  search?: string;
  authorId?: string;
}
export interface PostPage {
  items: Post[];
  nextCursor: number | undefined;
  total: number;
}

export interface JourneyMonth {
  accountCreatedAt: string;
  days: { day: string; storyId: string; image: string; count: number }[];
  firstDay: string | null;
  latestDay: string | null;
}

export type ProfileActivity =
  | { kind: "post"; id: string; at: string; post: Post }
  | { kind: "day"; id: string; at: string; story: DayStory };
export interface ProfileActivityPage {
  items: ProfileActivity[];
  nextCursor: number | undefined;
  total: number;
}

export interface StoryPage {
  items: DayStory[];
  nextCursor: number | undefined;
}
