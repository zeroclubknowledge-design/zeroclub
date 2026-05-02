import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const referralsTable = pgTable("referrals", {
  id: text("id").primaryKey(),
  referrerId: text("referrer_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  refereeId: text("referee_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  sameSchool: boolean("same_school").notNull().default(false),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReferralSchema = createInsertSchema(referralsTable).omit({
  createdAt: true,
});
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;
