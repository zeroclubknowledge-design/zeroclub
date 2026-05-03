import { Router } from "express";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { db } from "@workspace/db";
import { xpEventsTable, followsTable, profilesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

const XP_MESSAGES: Record<string, (amount: number, detail?: string | null) => string> = {
  build_posted:       (xp) => `You earned +${xp} XP for sharing a build`,
  proof_project:      (xp) => `Proof project verified — +${xp} XP added`,
  bootcamp_module:    (xp, d) => `Module complete${d ? `: ${d}` : ""} — +${xp} XP`,
  bootcamp_completed: (xp, d) => `Bootcamp finished${d ? `: ${d}` : ""}! +${xp} XP earned`,
  referral_bonus:     (xp) => `Friend joined using your referral — +${xp} XP`,
  build_milestone:    (xp) => `Build milestone reached! +${xp} XP bonus`,
};

const XP_ICONS: Record<string, string> = {
  build_posted:       "edit-3",
  proof_project:      "zap",
  bootcamp_module:    "book",
  bootcamp_completed: "award",
  referral_bonus:     "users",
  build_milestone:    "star",
};

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [xpEvents, newFollowers] = await Promise.all([
    db
      .select()
      .from(xpEventsTable)
      .where(eq(xpEventsTable.userId, userId))
      .orderBy(desc(xpEventsTable.createdAt))
      .limit(40),

    db
      .select({
        followerId: followsTable.followerId,
        createdAt: followsTable.createdAt,
        displayName: profilesTable.displayName,
        username: profilesTable.username,
        avatarUrl: profilesTable.avatarUrl,
      })
      .from(followsTable)
      .innerJoin(profilesTable, eq(followsTable.followerId, profilesTable.id))
      .where(eq(followsTable.followingId, userId))
      .orderBy(desc(followsTable.createdAt))
      .limit(20),
  ]);

  const notifications: {
    id: string;
    type: string;
    icon: string;
    iconColor: string;
    title: string;
    message: string;
    createdAt: string;
    xp?: number;
  }[] = [];

  for (const evt of xpEvents) {
    const messageFn = XP_MESSAGES[evt.source] ?? ((xp: number) => `+${xp} XP earned`);
    notifications.push({
      id: `xp-${evt.id}`,
      type: "xp",
      icon: XP_ICONS[evt.source] ?? "zap",
      iconColor: "#f59e0b",
      title: "XP Earned",
      message: messageFn(evt.amount, evt.detail),
      createdAt: evt.createdAt.toISOString(),
      xp: evt.amount,
    });
  }

  for (const f of newFollowers) {
    notifications.push({
      id: `follow-${f.followerId}`,
      type: "follow",
      icon: "user-plus",
      iconColor: "#D4387C",
      title: "New Follower",
      message: `${f.displayName} (@${f.username}) started following you`,
      createdAt: new Date(f.createdAt).toISOString(),
    });
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  res.json({ notifications: notifications.slice(0, 50) });
});

export default router;
