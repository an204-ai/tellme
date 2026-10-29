export type Privacy = "public" | "connections" | "private";
export type Reaction =
  | "like"
  | "love"
  | "cheer"
  | "celebrate"
  | "appreciate"
  | "smile";
export interface Preferences {
  audience: Privacy;
  notifyLikes: boolean;
  notifyMessages: boolean;
  emailUpdates: boolean;
  reducedMotion: boolean;
}
export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  username: string;
  name: string;
  avatar: string;
  cover: string;
  bio: string;
  location: string;
  following: string[];
  blocked: string[];
  hiddenPosts: string[];
  settings: Preferences;
  createdAt: string;
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
  createdAt: string;
  reactions: Record<string, Reaction>;
  comments: Comment[];
  savedBy: string[];
  sharedBy: string[];
}
export interface Moment {
  id: string;
  image: string;
  caption: string;
  at: string;
  reactions: Record<string, Reaction>;
}
export interface Story {
  _id: string;
  userId: string;
  day: string;
  privacy: Privacy;
  items: Moment[];
  updatedAt: string;
}
export interface Conversation {
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
}
export interface Media {
  _id: string;
  ownerId: string;
  url: string;
  createdAt: string;
}
export interface Report {
  _id: string;
  userId: string;
  postId: string;
  reason: string;
  at: string;
}
export const defaults: Preferences = {
  audience: "public",
  notifyLikes: true,
  notifyMessages: true,
  emailUpdates: false,
  reducedMotion: false,
};
