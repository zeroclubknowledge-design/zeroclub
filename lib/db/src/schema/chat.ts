import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const channelsTable = pgTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  description: text("description"),
  bootcampId: text("bootcamp_id"),
  parentChannelId: text("parent_channel_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  channelId: text("channel_id")
    .notNull()
    .references(() => channelsTable.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChannelSchema = createInsertSchema(channelsTable).omit({
  createdAt: true,
});
export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  createdAt: true,
});
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Channel = typeof channelsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
