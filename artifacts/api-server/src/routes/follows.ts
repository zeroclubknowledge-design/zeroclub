import { Router } from "express";
import { db } from "@workspace/db";
import { followsTable, profilesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeLevel } from "./auth";

const router = Router();

// POST /profiles/:userId/follow
router.post("/:userId/follow", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params as { userId: string };
  const followerId = req.userId!;
  if (followerId === userId) {
    res.status(400).json({ error: "bad_request", message: "Cannot follow yourself" });
    return;
  }
  try {
    await db
      .insert(followsTable)
      .values({ followerId, followingId: userId })
      .onConflictDoNothing();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));
    res.json({ following: true, followerCount: count });
  } catch (err) {
    req.log.error({ err }, "follow error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// DELETE /profiles/:userId/follow
router.delete("/:userId/follow", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params as { userId: string };
  const followerId = req.userId!;
  try {
    await db
      .delete(followsTable)
      .where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, userId)));
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));
    res.json({ following: false, followerCount: count });
  } catch (err) {
    req.log.error({ err }, "unfollow error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /profiles/:userId/followers
router.get("/:userId/followers", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params as { userId: string };
  try {
    const rows = await db
      .select({ profile: profilesTable })
      .from(followsTable)
      .innerJoin(profilesTable, eq(followsTable.followerId, profilesTable.id))
      .where(eq(followsTable.followingId, userId));
    res.json(rows.map(({ profile: p }) => ({ ...p, level: computeLevel(p.xpBalance) })));
  } catch (err) {
    req.log.error({ err }, "list followers error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /profiles/:userId/following
router.get("/:userId/following", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params as { userId: string };
  try {
    const rows = await db
      .select({ profile: profilesTable })
      .from(followsTable)
      .innerJoin(profilesTable, eq(followsTable.followingId, profilesTable.id))
      .where(eq(followsTable.followerId, userId));
    res.json(rows.map(({ profile: p }) => ({ ...p, level: computeLevel(p.xpBalance) })));
  } catch (err) {
    req.log.error({ err }, "list following error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
