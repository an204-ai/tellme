import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull(), // post | comment | user | story | message
  targetId: uuid("target_id").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at")
});

export const blocks = pgTable("blocks", {
  blockerId: uuid("blocker_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  blockedId: uuid("blocked_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
