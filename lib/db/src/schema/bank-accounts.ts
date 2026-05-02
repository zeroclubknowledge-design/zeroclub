import { pgEnum, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

export const bankAccountsTable = pgTable("bank_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const withdrawalsTable = pgTable("withdrawals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  bankAccountId: text("bank_account_id")
    .notNull()
    .references(() => bankAccountsTable.id),
  amountXp: integer("amount_xp").notNull(),
  amountKobo: integer("amount_kobo").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccountsTable).omit({
  createdAt: true,
});
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccountsTable.$inferSelect;
export type Withdrawal = typeof withdrawalsTable.$inferSelect;
