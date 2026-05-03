import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, xpEventsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeLevel } from "./auth";
import { generateId } from "../lib/ids";

const router = Router();

function computeXpForLevel(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

async function getWalletData(userId: string) {
  const profiles = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId))
    .limit(1);
  if (!profiles[0]) return null;
  const p = profiles[0];
  const level = computeLevel(p.xpBalance);
  const xpForCurrentLevel = computeXpForLevel(level - 1);
  const totalXpForNextLevel = computeXpForLevel(level);
  const xpToNextLevel = totalXpForNextLevel - p.xpBalance;
  return {
    userId: p.id,
    xpBalance: p.xpBalance,
    fundsBalance: p.fundsBalance ?? 0,
    level,
    xpToNextLevel,
    xpForCurrentLevel,
    totalXpForNextLevel,
    minWithdrawalXp: 2000,
  };
}

// GET /wallet
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const data = await getWalletData(req.userId);
    if (!data) { res.status(404).json({ error: "not_found", message: "Profile not found" }); return; }
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "get wallet error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /wallet/events
router.get("/events", requireAuth, async (req: AuthRequest, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const limit = Math.min(Number(req.query["limit"] ?? 50), 100);
  try {
    const events = await db
      .select()
      .from(xpEventsTable)
      .where(eq(xpEventsTable.userId, req.userId))
      .orderBy(desc(xpEventsTable.createdAt))
      .limit(limit);
    res.json(events);
  } catch (err) {
    req.log.error({ err }, "list xp events error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /wallet/add-funds
router.post("/add-funds", requireAuth, async (req: AuthRequest, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { amountKobo } = req.body as { amountKobo?: number };

  if (!amountKobo || typeof amountKobo !== "number" || amountKobo <= 0) {
    res.status(400).json({ error: "validation_error", message: "amountKobo must be a positive number" });
    return;
  }

  const MAX_KOBO = 10_000_000_00; // ₦10,000,000 limit per transaction
  if (amountKobo > MAX_KOBO) {
    res.status(400).json({ error: "validation_error", message: "Amount exceeds maximum allowed per transaction" });
    return;
  }

  try {
    await db
      .update(profilesTable)
      .set({ fundsBalance: sql`${profilesTable.fundsBalance} + ${amountKobo}` })
      .where(eq(profilesTable.id, req.userId));

    // Record the deposit as an XP event for history tracking
    await db.insert(xpEventsTable).values({
      id: generateId(),
      userId: req.userId,
      source: "referral_bonus" as const, // reuse source for tracking; detail identifies it
      detail: `Funds deposit: ₦${(amountKobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
      amount: 0,
    });

    const updated = await getWalletData(req.userId);
    res.json({ ok: true, fundsBalance: updated?.fundsBalance ?? 0 });
  } catch (err) {
    req.log.error({ err }, "add funds error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
