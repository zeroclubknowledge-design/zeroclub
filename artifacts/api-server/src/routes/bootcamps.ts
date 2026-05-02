import { Router } from "express";
import { db } from "@workspace/db";
import {
  bootcampsTable,
  enrollmentsTable,
  profilesTable,
  xpEventsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";

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
          .where(
            and(
              eq(enrollmentsTable.bootcampId, b.id),
              eq(enrollmentsTable.userId, req.userId!),
            ),
          )
          .limit(1);
        return {
          ...b,
          enrolled: enrollment.length > 0,
          enrollment: enrollment[0] ?? null,
        };
      }),
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "list bootcamps error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
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
    const enrollment = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.bootcampId, bootcampId),
          eq(enrollmentsTable.userId, req.userId!),
        ),
      )
      .limit(1);
    res.json({ ...b, enrolled: enrollment.length > 0, enrollment: enrollment[0] ?? null });
  } catch (err) {
    req.log.error({ err }, "get bootcamp error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /bootcamps/:bootcampId/enroll
router.post("/:bootcampId/enroll", requireAuth, async (req: AuthRequest, res) => {
  const { bootcampId } = req.params as { bootcampId: string };
  try {
    const existing = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.bootcampId, bootcampId),
          eq(enrollmentsTable.userId, req.userId!),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      res.status(201).json(existing[0]!);
      return;
    }
    const id = generateId();
    await db.insert(enrollmentsTable).values({
      id,
      userId: req.userId!,
      bootcampId,
      modulesCompleted: 0,
      progress: 0,
    });
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
    const progress = Math.min(
      100,
      Math.round((modulesCompleted / bootcamp.modulesCount) * 100),
    );
    const isCompleted = progress === 100;

    await db
      .update(enrollmentsTable)
      .set({
        modulesCompleted,
        progress,
        ...(isCompleted ? { completedAt: new Date() } : {}),
      })
      .where(
        and(
          eq(enrollmentsTable.bootcampId, bootcampId),
          eq(enrollmentsTable.userId, req.userId!),
        ),
      );

    if (isCompleted) {
      await db.insert(xpEventsTable).values({
        id: generateId(),
        userId: req.userId!,
        source: "bootcamp_completed",
        detail: bootcamp.title,
        amount: bootcamp.xpReward,
      });
      await db
        .update(profilesTable)
        .set({ xpBalance: sql`${profilesTable.xpBalance} + ${bootcamp.xpReward}` })
        .where(eq(profilesTable.id, req.userId!));
    } else {
      await db.insert(xpEventsTable).values({
        id: generateId(),
        userId: req.userId!,
        source: "bootcamp_module",
        detail: bootcamp.title,
        amount: 25,
      });
      await db
        .update(profilesTable)
        .set({ xpBalance: sql`${profilesTable.xpBalance} + 25` })
        .where(eq(profilesTable.id, req.userId!));
    }

    const enrollment = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.bootcampId, bootcampId),
          eq(enrollmentsTable.userId, req.userId!),
        ),
      )
      .limit(1);
    res.json(enrollment[0]!);
  } catch (err) {
    req.log.error({ err }, "update progress error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /enrollments
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
