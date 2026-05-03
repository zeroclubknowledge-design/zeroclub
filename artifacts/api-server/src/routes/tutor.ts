import { Router } from "express";
import { db } from "@workspace/db";
import {
  bootcampsTable,
  bootcampModulesTable,
  enrollmentsTable,
  profilesTable,
} from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";

const router = Router();

async function requireTutorOwner(
  req: AuthRequest,
  res: import("express").Response,
  bootcampId: string,
): Promise<typeof bootcampsTable.$inferSelect | null> {
  if (!req.userId) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  const rows = await db
    .select()
    .from(bootcampsTable)
    .where(eq(bootcampsTable.id, bootcampId))
    .limit(1);
  const bootcamp = rows[0] ?? null;
  if (!bootcamp) {
    res.status(404).json({ error: "not_found" });
    return null;
  }
  if (bootcamp.tutorId !== req.userId) {
    res.status(403).json({ error: "forbidden", message: "You do not own this bootcamp" });
    return null;
  }
  return bootcamp;
}

router.get("/my-stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [bcCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bootcampsTable)
      .where(eq(bootcampsTable.tutorId, req.userId!));

    const myBootcamps = await db
      .select({ id: bootcampsTable.id })
      .from(bootcampsTable)
      .where(eq(bootcampsTable.tutorId, req.userId!));

    const ids = myBootcamps.map((b) => b.id);

    let studentCount = 0;
    let totalXp = 0;
    let moduleCount = 0;

    for (const bid of ids) {
      const [enCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.bootcampId, bid));
      studentCount += enCount?.count ?? 0;

      const mods = await db
        .select({ xpReward: bootcampModulesTable.xpReward })
        .from(bootcampModulesTable)
        .where(eq(bootcampModulesTable.bootcampId, bid));
      moduleCount += mods.length;
      totalXp += mods.reduce((s, m) => s + m.xpReward, 0);
    }

    res.json({
      bootcamps: bcCount?.count ?? 0,
      students: studentCount,
      modules: moduleCount,
      totalXpDistributed: totalXp,
    });
  } catch (err) {
    req.log.error({ err }, "tutor stats error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/my-bootcamps", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bootcamps = await db
      .select()
      .from(bootcampsTable)
      .where(eq(bootcampsTable.tutorId, req.userId!))
      .orderBy(asc(bootcampsTable.createdAt));

    const enriched = await Promise.all(
      bootcamps.map(async (b) => {
        const [enCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollmentsTable)
          .where(eq(enrollmentsTable.bootcampId, b.id));
        const modules = await db
          .select()
          .from(bootcampModulesTable)
          .where(eq(bootcampModulesTable.bootcampId, b.id))
          .orderBy(asc(bootcampModulesTable.orderIndex));
        return { ...b, enrollmentCount: enCount?.count ?? 0, modules };
      }),
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "tutor list bootcamps error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/bootcamps/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  const bootcamp = await requireTutorOwner(req, res, id);
  if (!bootcamp) return;
  try {
    const [enCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.bootcampId, id));
    const modules = await db
      .select()
      .from(bootcampModulesTable)
      .where(eq(bootcampModulesTable.bootcampId, id))
      .orderBy(asc(bootcampModulesTable.orderIndex));
    res.json({ ...bootcamp, enrollmentCount: enCount?.count ?? 0, modules });
  } catch (err) {
    req.log.error({ err }, "tutor get bootcamp error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/bootcamps", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, subtitle, description, coverUrl, track, difficulty, deliveryMedium, xpReward, priceCents } =
      req.body as Record<string, unknown>;
    if (!title || !subtitle || !description || !track || !difficulty) {
      res.status(400).json({ error: "validation_error", message: "Missing required fields" });
      return;
    }
    const id = generateId();
    const [bootcamp] = await db
      .insert(bootcampsTable)
      .values({
        id,
        title: title as string,
        subtitle: subtitle as string,
        description: description as string,
        coverUrl: (coverUrl as string) ?? null,
        track: track as typeof bootcampsTable.$inferInsert["track"],
        difficulty: (difficulty as typeof bootcampsTable.$inferInsert["difficulty"]),
        deliveryMedium: ((deliveryMedium ?? "video") as typeof bootcampsTable.$inferInsert["deliveryMedium"]),
        xpReward: (xpReward as number) ?? 100,
        priceCents: (priceCents as number) ?? 0,
        modulesCount: 0,
        tutorId: req.userId!,
        adminReviewed: false,
      })
      .returning();
    res.status(201).json(bootcamp);
  } catch (err) {
    req.log.error({ err }, "tutor create bootcamp error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.put("/bootcamps/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  const bootcamp = await requireTutorOwner(req, res, id);
  if (!bootcamp) return;
  try {
    const { title, subtitle, description, coverUrl, track, difficulty, deliveryMedium, xpReward, priceCents } =
      req.body as Record<string, unknown>;
    const update: Partial<typeof bootcampsTable.$inferInsert> = {};
    if (title != null) update.title = title as string;
    if (subtitle != null) update.subtitle = subtitle as string;
    if (description != null) update.description = description as string;
    if (coverUrl !== undefined) update.coverUrl = (coverUrl as string) ?? null;
    if (track != null) update.track = track as typeof bootcampsTable.$inferInsert["track"];
    if (difficulty != null) update.difficulty = difficulty as typeof bootcampsTable.$inferInsert["difficulty"];
    if (deliveryMedium != null) update.deliveryMedium = deliveryMedium as typeof bootcampsTable.$inferInsert["deliveryMedium"];
    if (xpReward != null) update.xpReward = xpReward as number;
    if (priceCents != null) update.priceCents = priceCents as number;
    const [updated] = await db.update(bootcampsTable).set(update).where(eq(bootcampsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "tutor update bootcamp error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/bootcamps/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  const bootcamp = await requireTutorOwner(req, res, id);
  if (!bootcamp) return;
  try {
    await db.delete(bootcampsTable).where(eq(bootcampsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "tutor delete bootcamp error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/bootcamps/:id/students", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  const bootcamp = await requireTutorOwner(req, res, id);
  if (!bootcamp) return;
  try {
    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.bootcampId, id))
      .orderBy(asc(enrollmentsTable.createdAt));
    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, e.userId)).limit(1);
        return { ...e, profile: profiles[0] ?? null };
      }),
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "tutor students error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
