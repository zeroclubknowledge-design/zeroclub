import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, profilesTable } from "@workspace/db";
import { sql, gte } from "drizzle-orm";
import { optionalAuth, type AuthRequest } from "../lib/auth";

const router = Router();

// GET /feed/summary — public
router.get("/summary", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [postsToday, activeMembersToday, totalMembers] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(postsTable)
        .where(gte(postsTable.createdAt, today)),
      db
        .select({ count: sql<number>`count(distinct ${postsTable.authorId})::int` })
        .from(postsTable)
        .where(gte(postsTable.createdAt, today)),
      db.select({ count: sql<number>`count(*)::int` }).from(profilesTable),
    ]);

    const trackCounts = await db
      .select({
        track: postsTable.track,
        count: sql<number>`count(*)::int`,
      })
      .from(postsTable)
      .groupBy(postsTable.track)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    res.json({
      activeMembersToday: activeMembersToday[0]?.count ?? 0,
      postsToday: postsToday[0]?.count ?? 0,
      topTracks: trackCounts.map((t) => ({ track: t.track, count: t.count })),
      totalMembers: totalMembers[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "feed summary error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
