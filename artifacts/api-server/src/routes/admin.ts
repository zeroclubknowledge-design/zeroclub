import { Router } from "express";
import { db } from "@workspace/db";
import {
  bootcampsTable,
  bootcampModulesTable,
  enrollmentsTable,
  profilesTable,
  deliveryMediumEnum,
} from "@workspace/db";
import { eq, sql, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";

const router = Router();

async function requireTutor(req: AuthRequest, res: import("express").Response, next: import("express").NextFunction) {
  if (!req.userId) { res.status(401).json({ error: "unauthorized" }); return; }
  const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId)).limit(1);
  if (!profiles[0] || profiles[0].tutorVerified < 1) {
    res.status(403).json({ error: "forbidden", message: "Tutor verification required" });
    return;
  }
  next();
}

// GET /admin/stats
router.get("/stats", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  try {
    const [bootcampCount] = await db.select({ count: sql<number>`count(*)::int` }).from(bootcampsTable);
    const [enrollmentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable);
    const [profileCount] = await db.select({ count: sql<number>`count(*)::int` }).from(profilesTable);
    const [tutorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(profilesTable).where(eq(profilesTable.tutorVerified, 1));
    const [moduleCount] = await db.select({ count: sql<number>`count(*)::int` }).from(bootcampModulesTable);
    res.json({
      bootcamps: bootcampCount?.count ?? 0,
      enrollments: enrollmentCount?.count ?? 0,
      profiles: profileCount?.count ?? 0,
      tutors: tutorCount?.count ?? 0,
      modules: moduleCount?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "admin stats error");
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /admin/bootcamps
router.get("/bootcamps", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  try {
    const bootcamps = await db.select().from(bootcampsTable).orderBy(asc(bootcampsTable.createdAt));
    const enriched = await Promise.all(bootcamps.map(async (b) => {
      const [enCount] = await db.select({ count: sql<number>`count(*)::int` }).from(enrollmentsTable).where(eq(enrollmentsTable.bootcampId, b.id));
      const modules = await db.select().from(bootcampModulesTable).where(eq(bootcampModulesTable.bootcampId, b.id)).orderBy(asc(bootcampModulesTable.orderIndex));
      return { ...b, enrollmentCount: enCount?.count ?? 0, modules };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "admin list bootcamps error");
    res.status(500).json({ error: "internal_error" });
  }
});

// POST /admin/bootcamps
router.post("/bootcamps", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  try {
    const { title, subtitle, description, coverUrl, track, difficulty, deliveryMedium, xpReward, priceCents } = req.body as {
      title: string; subtitle: string; description: string; coverUrl?: string;
      track: string; difficulty: string; deliveryMedium?: string;
      xpReward?: number; priceCents?: number;
    };
    if (!title || !subtitle || !description || !track || !difficulty) {
      res.status(400).json({ error: "validation_error", message: "Missing required fields" });
      return;
    }
    const id = generateId();
    const [bootcamp] = await db.insert(bootcampsTable).values({
      id, title, subtitle, description,
      coverUrl: coverUrl ?? null,
      track: track as typeof bootcampsTable.$inferInsert["track"],
      difficulty: difficulty as typeof bootcampsTable.$inferInsert["difficulty"],
      deliveryMedium: (deliveryMedium ?? "video") as typeof bootcampsTable.$inferInsert["deliveryMedium"],
      xpReward: xpReward ?? 100,
      priceCents: priceCents ?? 0,
      modulesCount: 0,
    }).returning();
    res.status(201).json(bootcamp);
  } catch (err) {
    req.log.error({ err }, "admin create bootcamp error");
    res.status(500).json({ error: "internal_error" });
  }
});

// PUT /admin/bootcamps/:id
router.put("/bootcamps/:id", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  try {
    const { title, subtitle, description, coverUrl, track, difficulty, deliveryMedium, xpReward, priceCents } = req.body as Record<string, unknown>;
    const updateData: Partial<typeof bootcampsTable.$inferInsert> = {};
    if (title != null) updateData.title = title as string;
    if (subtitle != null) updateData.subtitle = subtitle as string;
    if (description != null) updateData.description = description as string;
    if (coverUrl !== undefined) updateData.coverUrl = (coverUrl as string) ?? null;
    if (track != null) updateData.track = track as typeof bootcampsTable.$inferInsert["track"];
    if (difficulty != null) updateData.difficulty = difficulty as typeof bootcampsTable.$inferInsert["difficulty"];
    if (deliveryMedium != null) updateData.deliveryMedium = deliveryMedium as typeof bootcampsTable.$inferInsert["deliveryMedium"];
    if (xpReward != null) updateData.xpReward = xpReward as number;
    if (priceCents != null) updateData.priceCents = priceCents as number;
    const [updated] = await db.update(bootcampsTable).set(updateData).where(eq(bootcampsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "admin update bootcamp error");
    res.status(500).json({ error: "internal_error" });
  }
});

// DELETE /admin/bootcamps/:id
router.delete("/bootcamps/:id", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  try {
    await db.delete(bootcampsTable).where(eq(bootcampsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin delete bootcamp error");
    res.status(500).json({ error: "internal_error" });
  }
});

// POST /admin/bootcamps/:id/modules
router.post("/bootcamps/:id/modules", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { id: bootcampId } = req.params as { id: string };
  try {
    const { title, description, durationMinutes, xpReward, orderIndex } = req.body as {
      title: string; description: string; durationMinutes?: number; xpReward?: number; orderIndex?: number;
    };
    if (!title || !description) {
      res.status(400).json({ error: "validation_error", message: "Missing required fields" });
      return;
    }
    const existing = await db.select().from(bootcampModulesTable).where(eq(bootcampModulesTable.bootcampId, bootcampId)).orderBy(asc(bootcampModulesTable.orderIndex));
    const nextIndex = orderIndex ?? existing.length;
    const moduleId = generateId();
    const [module] = await db.insert(bootcampModulesTable).values({
      id: moduleId, bootcampId, title, description,
      durationMinutes: durationMinutes ?? 20,
      xpReward: xpReward ?? 25,
      orderIndex: nextIndex,
    }).returning();
    await db.update(bootcampsTable).set({ modulesCount: existing.length + 1 }).where(eq(bootcampsTable.id, bootcampId));
    res.status(201).json(module);
  } catch (err) {
    req.log.error({ err }, "admin add module error");
    res.status(500).json({ error: "internal_error" });
  }
});

// PUT /admin/modules/:moduleId
router.put("/modules/:moduleId", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { moduleId } = req.params as { moduleId: string };
  try {
    const { title, description, durationMinutes, xpReward, orderIndex } = req.body as Record<string, unknown>;
    const updateData: Partial<typeof bootcampModulesTable.$inferInsert> = {};
    if (title != null) updateData.title = title as string;
    if (description != null) updateData.description = description as string;
    if (durationMinutes != null) updateData.durationMinutes = durationMinutes as number;
    if (xpReward != null) updateData.xpReward = xpReward as number;
    if (orderIndex != null) updateData.orderIndex = orderIndex as number;
    const [updated] = await db.update(bootcampModulesTable).set(updateData).where(eq(bootcampModulesTable.id, moduleId)).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "admin update module error");
    res.status(500).json({ error: "internal_error" });
  }
});

// DELETE /admin/modules/:moduleId
router.delete("/modules/:moduleId", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { moduleId } = req.params as { moduleId: string };
  try {
    const modules = await db.select().from(bootcampModulesTable).where(eq(bootcampModulesTable.id, moduleId)).limit(1);
    if (!modules[0]) { res.status(404).json({ error: "not_found" }); return; }
    const bootcampId = modules[0].bootcampId;
    await db.delete(bootcampModulesTable).where(eq(bootcampModulesTable.id, moduleId));
    const remaining = await db.select().from(bootcampModulesTable).where(eq(bootcampModulesTable.bootcampId, bootcampId));
    await db.update(bootcampsTable).set({ modulesCount: remaining.length }).where(eq(bootcampsTable.id, bootcampId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin delete module error");
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /admin/profiles
router.get("/profiles", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  try {
    const profiles = await db.select().from(profilesTable).orderBy(asc(profilesTable.createdAt));
    res.json(profiles);
  } catch (err) {
    req.log.error({ err }, "admin list profiles error");
    res.status(500).json({ error: "internal_error" });
  }
});

// PUT /admin/profiles/:userId/verify-tutor
router.put("/profiles/:userId/verify-tutor", requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { userId } = req.params as { userId: string };
  try {
    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
    if (!profiles[0]) { res.status(404).json({ error: "not_found" }); return; }
    const newVal = profiles[0].tutorVerified ? 0 : 1;
    const [updated] = await db.update(profilesTable).set({ tutorVerified: newVal }).where(eq(profilesTable.id, userId)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "admin verify tutor error");
    res.status(500).json({ error: "internal_error" });
  }
});

// PUT /admin/profiles/:userId/make-admin (grant tutor directly - used for bootstrapping)
router.put("/profiles/:userId/make-admin", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params as { userId: string };
  if (req.userId !== userId) {
    res.status(403).json({ error: "forbidden", message: "You can only promote yourself" });
    return;
  }
  try {
    const [updated] = await db.update(profilesTable).set({ tutorVerified: 1 }).where(eq(profilesTable.id, userId)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "make-admin error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
