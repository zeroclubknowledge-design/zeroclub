import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, xpEventsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeLevel } from "./auth";
import { generateId } from "../lib/ids";

// Level upgrade pricing in kobo (1 kobo = ₦0.01, 100 kobo = ₦1)
// Price to purchase/unlock each level directly with funds
export const LEVEL_UPGRADE_PRICES_KOBO: Record<number, number> = {
  2:  50_000,       // ₦500
  3:  120_000,      // ₦1,200
  4:  250_000,      // ₦2,500
  5:  500_000,      // ₦5,000
  6:  900_000,      // ₦9,000
  7:  1_500_000,    // ₦15,000
  8:  2_500_000,    // ₦25,000  (Bronze Ambassador unlock)
  9:  4_000_000,    // ₦40,000  (Silver Ambassador)
  10: 6_500_000,    // ₦65,000  (Gold Ambassador)
  11: 10_000_000,   // ₦100,000 (Platinum Ambassador)
  12: 16_000_000,   // ₦160,000 (Diamond Ambassador)
  13: 25_000_000,   // ₦250,000 (Elite Ambassador)
  14: 40_000_000,   // ₦400,000 (Master Ambassador)
  15: 70_000_000,   // ₦700,000 (Grand Ambassador)
};

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
  const purchasedLevel = p.purchasedLevel ?? 1;
  return {
    userId: p.id,
    xpBalance: p.xpBalance,
    fundsBalance: p.fundsBalance ?? 0,
    level,
    purchasedLevel,
    xpToNextLevel,
    xpForCurrentLevel,
    totalXpForNextLevel,
    minWithdrawalXp: 2000,
    conversionFeePercent: 10,
    levelUpgradePrices: LEVEL_UPGRADE_PRICES_KOBO,
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

// POST /wallet/upgrade-level — pay funds to unlock a club level
router.post("/upgrade-level", requireAuth, async (req: AuthRequest, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { targetLevel } = req.body as { targetLevel?: number };

  if (!targetLevel || typeof targetLevel !== "number" || targetLevel < 2 || targetLevel > 15) {
    res.status(400).json({ error: "validation_error", message: "targetLevel must be between 2 and 15" });
    return;
  }

  const priceKobo = LEVEL_UPGRADE_PRICES_KOBO[targetLevel];
  if (!priceKobo) {
    res.status(400).json({ error: "validation_error", message: "Invalid level" });
    return;
  }

  try {
    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId)).limit(1);
    const profile = profiles[0];
    if (!profile) { res.status(404).json({ error: "not_found", message: "Profile not found" }); return; }

    const currentPurchased = profile.purchasedLevel ?? 1;
    if (currentPurchased >= targetLevel) {
      res.status(400).json({ error: "already_unlocked", message: "You already have this level or higher" });
      return;
    }

    const funds = profile.fundsBalance ?? 0;
    if (funds < priceKobo) {
      res.status(400).json({
        error: "insufficient_funds",
        message: `You need ₦${(priceKobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })} to unlock Level ${targetLevel}`,
        requiredKobo: priceKobo,
        currentKobo: funds,
      });
      return;
    }

    await db
      .update(profilesTable)
      .set({
        fundsBalance: sql`${profilesTable.fundsBalance} - ${priceKobo}`,
        purchasedLevel: targetLevel,
      })
      .where(eq(profilesTable.id, req.userId));

    await db.insert(xpEventsTable).values({
      id: generateId(),
      userId: req.userId,
      source: "referral_bonus" as const,
      detail: `Level upgrade: purchased Level ${targetLevel} for ₦${(priceKobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
      amount: 0,
    });

    const updated = await getWalletData(req.userId);
    res.json({ ok: true, purchasedLevel: targetLevel, fundsBalance: updated?.fundsBalance ?? 0 });
  } catch (err) {
    req.log.error({ err }, "upgrade level error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
