import { pgTable, uuid, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  privacyLevel: varchar("privacy_level", { length: 20 }).default("public").notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  reactionCount: integer("reaction_count").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const postMedia = pgTable("post_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  blurhash: varchar("blurhash", { length: 100 }),
  width: integer("width"),
  height: integer("height"),
  displayOrder: integer("display_order").default(0).notNull()
});
