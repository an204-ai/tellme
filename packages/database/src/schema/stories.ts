import { pgTable, uuid, date, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

export const dailyStories = pgTable("daily_stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  storyDate: date("story_date").notNull(),
  caption: text("caption"),
  privacyLevel: varchar("privacy_level", { length: 20 }).default("public").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const storyItems = pgTable("story_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  dailyStoryId: uuid("daily_story_id").references(() => dailyStories.id, { onDelete: "cascade" }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  blurhash: varchar("blurhash", { length: 100 }),
  note: text("note"),
  displayOrder: integer("display_order").default(0).notNull(),
  takenAt: timestamp("taken_at").defaultNow().notNull()
});
