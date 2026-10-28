import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import * as schema from "./schema";

export type User = InferSelectModel<typeof schema.users>;
export type InsertUser = InferInsertModel<typeof schema.users>;

export type Post = InferSelectModel<typeof schema.posts>;
export type InsertPost = InferInsertModel<typeof schema.posts>;

export type DailyStory = InferSelectModel<typeof schema.dailyStories>;
export type StoryItem = InferSelectModel<typeof schema.storyItems>;
