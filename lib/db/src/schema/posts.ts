import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { trackEnum } from "./profiles";

export const postsTable = pgTable("posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  track: trackEnum("track").notNull(),
  isProofProject: boolean("is_proof_project").notNull().default(false),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  proofClickCount: integer("proof_click_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likesTable = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const proofClicksTable = pgTable(
  "proof_clicks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({
  createdAt: true,
  xpAwarded: true,
  proofClickCount: true,
});
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
export type Like = typeof likesTable.$inferSelect;
export type Bookmark = typeof bookmarksTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type ProofClick = typeof proofClicksTable.$inferSelect;
