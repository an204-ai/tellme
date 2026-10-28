import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 100 }).notNull(),
  postCount: integer("post_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull()
});

export const postTopics = pgTable("post_topics", {
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }).notNull()
});
