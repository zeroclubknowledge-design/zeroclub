import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeLevel } from "./auth";

const router = Router();

// GET /profiles/:userId
router.get("/:userId", async (req, res) => {
  const { userId } = req.params as { userId: string };
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
    res.json({ ...p, level: computeLevel(p.xpBalance) });
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
  const { displayName, bio, avatarUrl, track } = req.body as {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    track?: string;
  };
  try {
    const updates: Partial<typeof profilesTable.$inferInsert> = {};
    if (displayName) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (track) updates.track = track as "product_design" | "frontend" | "growth" | "branding" | "mentorship";

    await db.update(profilesTable).set(updates).where(eq(profilesTable.id, userId));
    const updated = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, userId))
      .limit(1);
    const p = updated[0]!;
    res.json({ ...p, level: computeLevel(p.xpBalance) });
  } catch (err) {
    req.log.error({ err }, "update profile error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
