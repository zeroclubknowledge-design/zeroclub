import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
  xpEventsTable,
  referralsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";

function generateReferralCode(username: string): string {
  const prefix = username.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + suffix;
}

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
  const { email, password, username, displayName, track, school, referralCode } =
    req.body as {
      email: string;
      password: string;
      username: string;
      displayName: string;
      track: string;
      school?: string;
      referralCode?: string;
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

    let referrerProfile = null;
    if (referralCode) {
      const referrers = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.referralCode, referralCode))
        .limit(1);
      referrerProfile = referrers[0] ?? null;
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, 10);
    const newReferralCode = generateReferralCode(username);
    const welcomeXp = referrerProfile ? 50 : 0;

    await db.insert(usersTable).values({ id, email, passwordHash });
    await db.insert(profilesTable).values({
      id,
      email,
      username,
      displayName,
      track: track as "product_design" | "frontend" | "growth" | "branding" | "mentorship",
      school: school ?? null,
      referralCode: newReferralCode,
      xpBalance: welcomeXp,
    });

    if (referrerProfile) {
      const sameSchool = !!(
        school &&
        referrerProfile.school &&
        school.toLowerCase().trim() === referrerProfile.school.toLowerCase().trim()
      );
      const referrerXp = sameSchool ? 250 : 400;

      await db.insert(xpEventsTable).values({
        id: generateId(),
        userId: referrerProfile.id,
        source: "referral_bonus",
        detail: `Referred ${displayName}${sameSchool ? " · same school bonus" : " · cross-school bonus"}`,
        amount: referrerXp,
      });
      await db
        .update(profilesTable)
        .set({ xpBalance: referrerProfile.xpBalance + referrerXp })
        .where(eq(profilesTable.id, referrerProfile.id));

      if (welcomeXp > 0) {
        await db.insert(xpEventsTable).values({
          id: generateId(),
          userId: id,
          source: "referral_bonus",
          detail: `Welcome bonus — referred by ${referrerProfile.displayName}`,
          amount: welcomeXp,
        });
      }

      await db.insert(referralsTable).values({
        id: generateId(),
        referrerId: referrerProfile.id,
        refereeId: id,
        sameSchool,
        xpAwarded: referrerXp,
      });
    }

    const token = signToken(id);
    const profile = await db.select().from(profilesTable).where(eq(profilesTable.id, id)).limit(1);

    res.status(201).json({
      token,
      user: {
        ...profile[0],
        level: computeLevel(welcomeXp),
        xpBalance: welcomeXp,
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
