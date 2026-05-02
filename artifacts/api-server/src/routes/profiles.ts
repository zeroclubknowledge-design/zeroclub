import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, followsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, verifyToken, type AuthRequest } from "../lib/auth";
import { computeLevel } from "./auth";

const router = Router();

// GET /profiles/:userId
router.get("/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
  // Extract auth token for isFollowing check
  const authHeader = req.headers["authorization"];
  let viewerId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      viewerId = payload?.sub ?? null;
    } catch {
      // not authenticated — skip
    }
  }

  try {
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, userId))
      .limit(1);
    if (profiles.length === 0) {
      res.status(404).json({ error: "not_found", message: "Profile not found" });
      return;
    }
    const p = profiles[0]!;

    const [{ followers }] = await db
      .select({ followers: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));

    const [{ following }] = await db
      .select({ following: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));

    let isFollowing: boolean | null = null;
    if (viewerId && viewerId !== userId) {
      const rows = await db
        .select()
        .from(followsTable)
        .where(
          sql`${followsTable.followerId} = ${viewerId} AND ${followsTable.followingId} = ${userId}`,
        )
        .limit(1);
      isFollowing = rows.length > 0;
    }

    res.json({
      ...p,
      level: computeLevel(p.xpBalance),
      followerCount: followers,
      followingCount: following,
      isFollowing,
    });
  } catch (err) {
    req.log.error({ err }, "get profile error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// PUT /profiles/:userId/update
router.put("/:userId/update", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params as { userId: string };
  if (req.userId !== userId) {
    res.status(403).json({ error: "forbidden", message: "Cannot update another user's profile" });
    return;
  }
  const { displayName, bio, avatarUrl, track, school } = req.body as {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    track?: string;
    school?: string;
  };
  try {
    const updates: Partial<typeof profilesTable.$inferInsert> = {};
    if (displayName) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (track) updates.track = track as typeof updates.track;
    if (school !== undefined) updates.school = school;

    await db.update(profilesTable).set(updates).where(eq(profilesTable.id, userId));
    const updated = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
    const p = updated[0]!;

    const [{ followers }] = await db
      .select({ followers: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));
    const [{ following }] = await db
      .select({ following: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));

    res.json({
      ...p,
      level: computeLevel(p.xpBalance),
      followerCount: followers,
      followingCount: following,
      isFollowing: null,
    });
  } catch (err) {
    req.log.error({ err }, "update profile error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// PUT /profiles/me/push-token
router.put("/me/push-token", requireAuth, async (req: AuthRequest, res) => {
  const { pushToken } = req.body as { pushToken: string };
  if (!pushToken) {
    res.status(400).json({ error: "bad_request", message: "pushToken required" });
    return;
  }
  try {
    await db
      .update(profilesTable)
      .set({ pushToken })
      .where(eq(profilesTable.id, req.userId!));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "push token update error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
