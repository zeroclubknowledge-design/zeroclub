import { Router } from "express";
import { db } from "@workspace/db";
import { bootcampsTable, channelsTable } from "@workspace/db";
import { generateId } from "../lib/ids";

const router = Router();

// POST /seed (dev only — idempotent via checking count)
router.post("/", async (req, res) => {
  try {
    const existingChannels = await db.select().from(channelsTable);
    if (existingChannels.length === 0) {
      await db.insert(channelsTable).values([
        { id: generateId(), name: "general", description: "The main hangout for club members" },
        { id: generateId(), name: "design", description: "Product design, UI/UX, and visuals" },
        { id: generateId(), name: "frontend", description: "Web dev, React, and code" },
        { id: generateId(), name: "wins", description: "Ship something? Celebrate here" },
        { id: generateId(), name: "branding", description: "Brand, identity, and visual marketing" },
        { id: generateId(), name: "growth", description: "Marketing, distribution, and growth" },
      ]);
    }

    const existingBootcamps = await db.select().from(bootcampsTable);
    if (existingBootcamps.length === 0) {
      await db.insert(bootcampsTable).values([
        {
          id: generateId(),
          title: "UI/UX Fundamentals",
          subtitle: "Design systems, Figma, and user research from scratch",
          description: "Master the core principles of product design in 6 focused modules. Build real components using Figma, conduct user interviews, and ship a polished case study.",
          track: "product_design",
          difficulty: "beginner",
          modulesCount: 6,
          xpReward: 300,
        },
        {
          id: generateId(),
          title: "React & TypeScript Bootcamp",
          subtitle: "Build production-grade apps with React 19 and TypeScript",
          description: "Learn modern React patterns, hooks, state management with Zustand, and deploy your first full-stack app. Includes 8 hands-on modules and a capstone project.",
          track: "frontend",
          difficulty: "intermediate",
          modulesCount: 8,
          xpReward: 500,
        },
        {
          id: generateId(),
          title: "Growth Hacking 101",
          subtitle: "Acquisition, retention, and viral loops",
          description: "Learn the growth frameworks used by top startups. Build your first growth experiment, measure results, and iterate. Includes real case studies from Zero Club members.",
          track: "growth",
          difficulty: "beginner",
          modulesCount: 5,
          xpReward: 250,
        },
        {
          id: generateId(),
          title: "Brand Identity Crash Course",
          subtitle: "Logo, color, typography, and voice",
          description: "Build a complete brand identity from scratch. Includes logo design principles, color theory, type pairing, and creating a brand guide that scales.",
          track: "branding",
          difficulty: "beginner",
          modulesCount: 5,
          xpReward: 250,
        },
        {
          id: generateId(),
          title: "Advanced Frontend Architecture",
          subtitle: "Performance, patterns, and production engineering",
          description: "Deep dive into performance optimization, advanced React patterns, monorepo architecture, and CI/CD pipelines. For experienced developers ready to level up.",
          track: "frontend",
          difficulty: "advanced",
          modulesCount: 10,
          xpReward: 750,
        },
        {
          id: generateId(),
          title: "Mentorship Masterclass",
          subtitle: "Build your personal brand as a mentor and creator",
          description: "Learn how to effectively mentor early-career builders, create content, build an audience, and monetize your expertise without burning out.",
          track: "mentorship",
          difficulty: "intermediate",
          modulesCount: 6,
          xpReward: 400,
        },
      ]);
    }

    res.json({ ok: true, message: "Seed complete" });
  } catch (err) {
    req.log.error({ err }, "seed error");
    res.status(500).json({ error: "seed_failed" });
  }
});

export default router;
