import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const xpSourceEnum = pgEnum("xp_source", [
  "build_posted",
  "proof_project",
  "bootcamp_module",
  "bootcamp_completed",
  "referral_bonus",
  "build_milestone",
]);

export const xpEventsTable = pgTable("xp_events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  source: xpSourceEnum("source").notNull(),
  detail: text("detail"),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertXpEventSchema = createInsertSchema(xpEventsTable).omit({
  createdAt: true,
});
export type InsertXpEvent = z.infer<typeof insertXpEventSchema>;
export type XpEvent = typeof xpEventsTable.$inferSelect;
