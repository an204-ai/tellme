export type Privacy = "public" | "connections" | "private";
export type Reaction =
  | "like"
  | "love"
  | "cheer"
  | "celebrate"
  | "appreciate"
  | "smile";
export interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  cover: string;
}
export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  parentId?: string;
  liked?: boolean;
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
  createdAt: string;
  likes: number;
  reactorIds?: string[];
  reaction: Reaction | null;
  comments: Comment[];
  saved: boolean;
  shares: number;
}
export interface MomentItem {
  id: string;
  image: string;
  caption: string;
  at: string;
  reaction?: Reaction | null;
}
export interface DayStory {
  id: string;
  userId: string;
  day: string;
  privacy: Privacy;
  items: MomentItem[];
}
export interface Message {
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
  kind?: "direct" | "group";
  title?: string;
  participantIds?: string[];
  id: string;
  userId: string;
  unread: number;
  messages: Message[];
}
export interface Notice {
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
  emailUpdates: boolean;
  reducedMotion: boolean;
}
export interface AppData {
  version: 1;
  people: Person[];
  posts: Post[];
  stories: DayStory[];
  conversations: Conversation[];
  notifications: Notice[];
  following: string[];
  connections: string[];
  blocked: string[];
  hiddenPosts: string[];
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

export type ProfileActivity =
  | { kind: "post"; id: string; at: string; post: Post }
  | { kind: "day"; id: string; at: string; story: DayStory };
export interface ProfileActivityPage {
  items: ProfileActivity[];
  nextCursor: number | undefined;
  total: number;
}
