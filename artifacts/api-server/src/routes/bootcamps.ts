import { Router } from "express";
import { db } from "@workspace/db";
import {
  bootcampsTable,
  bootcampModulesTable,
  enrollmentsTable,
  profilesTable,
  xpEventsTable,
} from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";
import { sendPushToUser } from "../lib/notifications";

const router = Router();

// GET /bootcamps
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bootcamps = await db.select().from(bootcampsTable);
    const enriched = await Promise.all(
      bootcamps.map(async (b) => {
        const enrollment = await db
          .select()
          .from(enrollmentsTable)
          .where(and(eq(enrollmentsTable.bootcampId, b.id), eq(enrollmentsTable.userId, req.userId!)))
          .limit(1);
        return { ...b, enrolled: enrollment.length > 0, enrollment: enrollment[0] ?? null };
      }),
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "list bootcamps error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /bootcamps/:bootcampId/preview — public, no auth required
router.get("/:bootcampId/preview", async (req, res) => {
  const { bootcampId } = req.params as { bootcampId: string };
  try {
    const rows = await db
      .select({
        id: bootcampsTable.id,
        title: bootcampsTable.title,
        subtitle: bootcampsTable.subtitle,
        coverUrl: bootcampsTable.coverUrl,
        priceCents: bootcampsTable.priceCents,
        track: bootcampsTable.track,
        difficulty: bootcampsTable.difficulty,
        xpReward: bootcampsTable.xpReward,
      })
      .from(bootcampsTable)
      .where(eq(bootcampsTable.id, bootcampId))
      .limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(rows[0]!);
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /bootcamps/:bootcampId
router.get("/:bootcampId", requireAuth, async (req: AuthRequest, res) => {
  const { bootcampId } = req.params as { bootcampId: string };
  try {
    const bootcamps = await db
      .select()
      .from(bootcampsTable)
      .where(eq(bootcampsTable.id, bootcampId))
      .limit(1);
    if (bootcamps.length === 0) {
      res.status(404).json({ error: "not_found", message: "Bootcamp not found" });
      return;
    }
    const b = bootcamps[0]!;
    const [enrollment, modules] = await Promise.all([
      db
        .select()
        .from(enrollmentsTable)
        .where(and(eq(enrollmentsTable.bootcampId, bootcampId), eq(enrollmentsTable.userId, req.userId!)))
        .limit(1),
      db
        .select()
        .from(bootcampModulesTable)
        .where(eq(bootcampModulesTable.bootcampId, bootcampId))
        .orderBy(asc(bootcampModulesTable.orderIndex)),
    ]);
    res.json({ ...b, enrolled: enrollment.length > 0, enrollment: enrollment[0] ?? null, modules });
  } catch (err) {
    req.log.error({ err }, "get bootcamp error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /bootcamps/:bootcampId/enroll
router.post("/:bootcampId/enroll", requireAuth, async (req: AuthRequest, res) => {
  const { bootcampId } = req.params as { bootcampId: string };
  try {
    const bootcamps = await db
      .select()
      .from(bootcampsTable)
      .where(eq(bootcampsTable.id, bootcampId))
      .limit(1);
    if (bootcamps.length === 0) {
      res.status(404).json({ error: "not_found", message: "Bootcamp not found" });
      return;
    }
    const bootcamp = bootcamps[0]!;

    // Paid bootcamps require payment first
    if (bootcamp.priceCents > 0) {
      const { paymentRef } = req.body as { paymentRef?: string };
      if (!paymentRef) {
        res.status(402).json({ error: "payment_required", message: "This bootcamp requires payment" });
        return;
      }
    }

    const existing = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.bootcampId, bootcampId), eq(enrollmentsTable.userId, req.userId!)))
      .limit(1);
    if (existing.length > 0) {
      res.status(201).json(existing[0]!);
      return;
    }

    const id = generateId();
    const { paymentRef, referralCode } = req.body as { paymentRef?: string; referralCode?: string };

    // Resolve referrer from referral code
    let referrerId: string | null = null;
    if (referralCode) {
      const referrerRows = await db
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(eq(profilesTable.referralCode, referralCode))
        .limit(1);
      if (referrerRows.length > 0 && referrerRows[0]!.id !== req.userId) {
        referrerId = referrerRows[0]!.id;
      }
    }

    await db.insert(enrollmentsTable).values({
      id,
      userId: req.userId!,
      bootcampId,
      referrerId,
      modulesCompleted: 0,
      progress: 0,
      paid: bootcamp.priceCents > 0,
      paymentRef: paymentRef ?? null,
    });

    // Award commission XP to referrer for paid bootcamp enrollments
    if (referrerId && bootcamp.priceCents > 0) {
      const commissionXp = Math.max(50, Math.floor(bootcamp.priceCents / 100));
      await db.insert(xpEventsTable).values({
        id: generateId(),
        userId: referrerId,
        source: "bootcamp_commission",
        detail: `Commission — someone enrolled in "${bootcamp.title}" via your share link`,
        amount: commissionXp,
      });
      await db
        .update(profilesTable)
        .set({ xpBalance: sql`${profilesTable.xpBalance} + ${commissionXp}` })
        .where(eq(profilesTable.id, referrerId));
      void sendPushToUser(
        referrerId,
        "💸 Commission Earned!",
        `Someone enrolled in "${bootcamp.title}" via your link — +${commissionXp} XP`,
        { type: "bootcamp_commission", bootcampId },
      );
    }

    const enrollment = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.id, id))
      .limit(1);
    res.status(201).json(enrollment[0]!);
  } catch (err) {
    req.log.error({ err }, "enroll bootcamp error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// PUT /bootcamps/:bootcampId/progress
router.put("/:bootcampId/progress", requireAuth, async (req: AuthRequest, res) => {
  const { bootcampId } = req.params as { bootcampId: string };
  const { modulesCompleted } = req.body as { modulesCompleted: number };
  try {
    const bootcamps = await db
      .select()
      .from(bootcampsTable)
      .where(eq(bootcampsTable.id, bootcampId))
      .limit(1);
    if (bootcamps.length === 0) {
      res.status(404).json({ error: "not_found", message: "Bootcamp not found" });
      return;
    }
    const bootcamp = bootcamps[0]!;
    const progress = Math.min(100, Math.round((modulesCompleted / bootcamp.modulesCount) * 100));
    const isCompleted = progress === 100;

    await db
      .update(enrollmentsTable)
      .set({ modulesCompleted, progress, ...(isCompleted ? { completedAt: new Date() } : {}) })
      .where(and(eq(enrollmentsTable.bootcampId, bootcampId), eq(enrollmentsTable.userId, req.userId!)));

    const xpAmount = isCompleted ? bootcamp.xpReward : 25;
    const xpSource = isCompleted ? "bootcamp_completed" : "bootcamp_module";

    await db.insert(xpEventsTable).values({
      id: generateId(),
      userId: req.userId!,
      source: xpSource,
      detail: bootcamp.title,
      amount: xpAmount,
    });
    await db
      .update(profilesTable)
      .set({ xpBalance: sql`${profilesTable.xpBalance} + ${xpAmount}` })
      .where(eq(profilesTable.id, req.userId!));

    // Push notification for module/completion
    const notifTitle = isCompleted ? "Bootcamp Complete!" : "Module Done!";
    const notifBody = isCompleted
      ? `You finished "${bootcamp.title}" — +${bootcamp.xpReward} XP earned!`
      : `Module ${modulesCompleted} done — +25 XP. Keep going!`;
    void sendPushToUser(req.userId!, notifTitle, notifBody, { bootcampId, type: xpSource });

    const enrollment = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.bootcampId, bootcampId), eq(enrollmentsTable.userId, req.userId!)))
      .limit(1);
    res.json(enrollment[0]!);
  } catch (err) {
    req.log.error({ err }, "update progress error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /enrollments/me
router.get("/enrollments/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.userId, req.userId!));
    res.json(enrollments);
  } catch (err) {
    req.log.error({ err }, "list enrollments error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
