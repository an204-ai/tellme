import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // reaction | comment | connection | message | mention
  entityType: varchar("entity_type", { length: 20 }).notNull(), // post | story | comment
  entityId: uuid("entity_id").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
