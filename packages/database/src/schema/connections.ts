import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // friend_request | friend | follow
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | accepted | rejected | blocked
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
