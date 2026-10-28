import { pgTable, uuid, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { users } from "./users";

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).default("text").notNull(), // text | image | post_share | story_share
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
