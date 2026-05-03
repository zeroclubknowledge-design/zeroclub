import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { trackEnum } from "./profiles";

export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const deliveryMediumEnum = pgEnum("delivery_medium", [
  "video",
  "live",
  "text",
  "hybrid",
]);

export const bootcampsTable = pgTable("bootcamps", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url"),
  track: trackEnum("track").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("beginner"),
  deliveryMedium: deliveryMediumEnum("delivery_medium").notNull().default("video"),
  modulesCount: integer("modules_count").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(0),
  priceCents: integer("price_cents").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enrollmentsTable = pgTable("enrollments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  bootcampId: text("bootcamp_id")
    .notNull()
    .references(() => bootcampsTable.id, { onDelete: "cascade" }),
  modulesCompleted: integer("modules_completed").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  paid: boolean("paid").notNull().default(false),
  paymentRef: text("payment_ref"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBootcampSchema = createInsertSchema(bootcampsTable).omit({
  createdAt: true,
});
export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit(
  { createdAt: true, completedAt: true },
);
export type InsertBootcamp = z.infer<typeof insertBootcampSchema>;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Bootcamp = typeof bootcampsTable.$inferSelect;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
