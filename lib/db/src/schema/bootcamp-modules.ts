import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bootcampsTable } from "./bootcamps";

export const bootcampModulesTable = pgTable("bootcamp_modules", {
  id: text("id").primaryKey(),
  bootcampId: text("bootcamp_id")
    .notNull()
    .references(() => bootcampsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(20),
  xpReward: integer("xp_reward").notNull().default(25),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBootcampModuleSchema = createInsertSchema(bootcampModulesTable).omit({
  createdAt: true,
});
export type InsertBootcampModule = z.infer<typeof insertBootcampModuleSchema>;
export type BootcampModule = typeof bootcampModulesTable.$inferSelect;
