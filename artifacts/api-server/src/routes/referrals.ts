import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, referralsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

// GET /referrals/stats
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
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

    const referrals = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, req.userId!));

    const totalXpEarned = referrals.reduce((sum, r) => sum + r.xpAwarded, 0);
    const sameSchoolCount = referrals.filter((r) => r.sameSchool).length;
    const crossSchoolCount = referrals.filter((r) => !r.sameSchool).length;

    res.json({
      referralCode: profiles[0]!.referralCode ?? null,
      referredCount: referrals.length,
      totalXpEarned,
      sameSchoolCount,
      crossSchoolCount,
    });
  } catch (err) {
    req.log.error({ err }, "referral stats error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
