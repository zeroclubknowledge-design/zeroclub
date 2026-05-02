import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, xpEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeLevel } from "./auth";

const router = Router();

function computeXpForLevel(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

// GET /wallet
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);
    if (profiles.length === 0) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    const p = profiles[0]!;
    const level = computeLevel(p.xpBalance);
    const xpForCurrentLevel = computeXpForLevel(level - 1);
    const totalXpForNextLevel = computeXpForLevel(level);
    const xpToNextLevel = totalXpForNextLevel - p.xpBalance;

    res.json({
      userId: p.id,
      xpBalance: p.xpBalance,
      level,
      xpToNextLevel,
      xpForCurrentLevel,
      totalXpForNextLevel,
    });
  } catch (err) {
    req.log.error({ err }, "get wallet error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /wallet/events
router.get("/events", requireAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 50), 100);
  try {
    const events = await db
      .select()
      .from(xpEventsTable)
      .where(eq(xpEventsTable.userId, req.userId!))
      .orderBy(desc(xpEventsTable.createdAt))
      .limit(limit);
    res.json(events);
  } catch (err) {
    req.log.error({ err }, "list xp events error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
