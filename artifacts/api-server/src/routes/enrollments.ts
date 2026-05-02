import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

// GET /enrollments
router.get("/", requireAuth, async (req: AuthRequest, res) => {
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
