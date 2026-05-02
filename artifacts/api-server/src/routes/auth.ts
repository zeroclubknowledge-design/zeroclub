import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";

const router = Router();

function computeLevel(xp: number): number {
  let level = 1;
  while (true) {
    const required = (100 * level * (level + 1)) / 2;
    if (xp < required) return level;
    level++;
  }
}

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, password, username, displayName, track } = req.body as {
    email: string;
    password: string;
    username: string;
    displayName: string;
    track: string;
  };

  if (!email || !password || !username || !displayName || !track) {
    res.status(400).json({ error: "validation_error", message: "All fields are required" });
    return;
  }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "email_taken", message: "Email already in use" });
      return;
    }

    const existingUsername = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.username, username))
      .limit(1);
    if (existingUsername.length > 0) {
      res.status(400).json({ error: "username_taken", message: "Username already taken" });
      return;
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(usersTable).values({ id, email, passwordHash });
    await db.insert(profilesTable).values({
      id,
      email,
      username,
      displayName,
      track: track as "product_design" | "frontend" | "growth" | "branding" | "mentorship",
    });

    const token = signToken(id);
    const profile = await db.select().from(profilesTable).where(eq(profilesTable.id, id)).limit(1);

    res.status(201).json({
      token,
      user: {
        ...profile[0],
        level: computeLevel(0),
        xpBalance: 0,
      },
    });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "internal_error", message: "Registration failed" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "validation_error", message: "Email and password required" });
    return;
  }

  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
      return;
    }

    const user = users[0]!;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id);
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, user.id))
      .limit(1);
    const profile = profiles[0]!;

    res.json({
      token,
      user: {
        ...profile,
        level: computeLevel(profile.xpBalance),
      },
    });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "internal_error", message: "Login failed" });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
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
    const p = profiles[0]!;
    res.json({ ...p, level: computeLevel(p.xpBalance) });
  } catch (err) {
    req.log.error({ err }, "me error");
    res.status(500).json({ error: "internal_error", message: "Failed to get profile" });
  }
});

export { computeLevel };
export default router;
