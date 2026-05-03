import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { bankAccountsTable, withdrawalsTable, profilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

const MIN_WITHDRAWAL_XP = 2000;
const XP_TO_KOBO = 10; // 1 XP = 10 kobo → 1000 XP = ₦100

// GET /bank-accounts
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const accounts = await db
      .select()
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.userId, req.userId!));
    res.json(accounts);
  } catch (err) {
    req.log.error({ err }, "list bank accounts error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /bank-accounts
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { bankName, accountNumber, accountName } = req.body as {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  if (!bankName || !accountNumber || !accountName) {
    res.status(400).json({ error: "bad_request", message: "bankName, accountNumber, accountName required" });
    return;
  }
  try {
    const [account] = await db
      .insert(bankAccountsTable)
      .values({ id: randomUUID(), userId: req.userId!, bankName, accountNumber, accountName })
      .returning();
    res.status(201).json(account);
  } catch (err) {
    req.log.error({ err }, "create bank account error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// DELETE /bank-accounts/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  try {
    await db
      .delete(bankAccountsTable)
      .where(and(eq(bankAccountsTable.id, id), eq(bankAccountsTable.userId, req.userId!)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "delete bank account error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /withdrawals
router.get("/withdrawals", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, req.userId!));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "list withdrawals error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /withdrawals
router.post("/withdrawals", requireAuth, async (req: AuthRequest, res) => {
  const { bankAccountId, amountXp } = req.body as { bankAccountId: string; amountXp: number };
  if (!bankAccountId || !amountXp) {
    res.status(400).json({ error: "bad_request", message: "bankAccountId and amountXp required" });
    return;
  }
  if (amountXp < MIN_WITHDRAWAL_XP) {
    res.status(400).json({
      error: "insufficient_xp",
      message: `Minimum withdrawal is ${MIN_WITHDRAWAL_XP} XP`,
    });
    return;
  }
  try {
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);
    const profile = profiles[0];
    if (!profile) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    if (profile.xpBalance < amountXp) {
      res.status(400).json({ error: "insufficient_xp", message: "Not enough XP" });
      return;
    }

    const grossKobo = amountXp * XP_TO_KOBO;
    const platformFeeKobo = Math.floor(grossKobo * 0.10); // 10% platform fee
    const netKobo = grossKobo - platformFeeKobo;          // student receives 90%

    const [withdrawal] = await db
      .insert(withdrawalsTable)
      .values({ id: randomUUID(), userId: req.userId!, bankAccountId, amountXp, amountKobo: netKobo })
      .returning();

    await db
      .update(profilesTable)
      .set({
        xpBalance: profile.xpBalance - amountXp,
        fundsBalance: (profile.fundsBalance ?? 0) + netKobo,
      })
      .where(eq(profilesTable.id, req.userId!));

    res.status(201).json({ ...withdrawal, grossKobo, platformFeeKobo, netKobo });
  } catch (err) {
    req.log.error({ err }, "create withdrawal error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export { MIN_WITHDRAWAL_XP, XP_TO_KOBO };
export default router;
