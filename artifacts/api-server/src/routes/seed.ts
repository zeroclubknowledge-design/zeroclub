import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { bootcampsTable, bootcampModulesTable, channelsTable, usersTable, profilesTable } from "@workspace/db";
import { generateId } from "../lib/ids";

const router = Router();

const MODULE_TEMPLATES: Record<string, { title: string; description: string; durationMinutes: number }[]> = {
  "UI/UX Fundamentals": [
    { title: "Design Thinking & Research", description: "Learn empathy-driven design and how to conduct user interviews that reveal real insights.", durationMinutes: 25 },
    { title: "Figma Essentials", description: "Master frames, auto-layout, components, and prototyping in Figma from scratch.", durationMinutes: 30 },
    { title: "Typography & Color Systems", description: "Build a cohesive visual language with type scales, color palettes, and accessibility.", durationMinutes: 25 },
    { title: "Component Libraries & Design Systems", description: "Structure scalable component libraries and document them for developer handoff.", durationMinutes: 30 },
    { title: "Prototyping & User Testing", description: "Create clickable prototypes and run moderated usability tests to validate your ideas.", durationMinutes: 35 },
    { title: "Build Your Case Study", description: "Document your design process into a compelling portfolio case study that impresses recruiters.", durationMinutes: 40 },
  ],
  "React & TypeScript Bootcamp": [
    { title: "TypeScript Fundamentals", description: "Types, interfaces, generics, and utility types — everything you need for production code.", durationMinutes: 35 },
    { title: "React 19 Core Concepts", description: "Components, props, JSX, conditional rendering, and the new React 19 compiler.", durationMinutes: 40 },
    { title: "Hooks Deep Dive", description: "useState, useEffect, useRef, useCallback, useMemo — when and how to use each.", durationMinutes: 35 },
    { title: "State Management with Zustand", description: "Manage global state cleanly with Zustand. Bye-bye prop drilling.", durationMinutes: 30 },
    { title: "Forms & Validation", description: "React Hook Form + Zod for bulletproof form handling with excellent UX.", durationMinutes: 25 },
    { title: "API Integration & React Query", description: "Fetch, cache, and sync server data effortlessly with TanStack Query.", durationMinutes: 40 },
    { title: "Performance Optimization", description: "Code splitting, lazy loading, memoization, and Lighthouse optimization.", durationMinutes: 35 },
    { title: "Capstone: Full-Stack App", description: "Build and deploy a full-stack app combining everything you've learned.", durationMinutes: 60 },
  ],
  "Growth Hacking 101": [
    { title: "Growth Mindset & Metrics", description: "Understand growth loops, define your north star metric, and build your measurement stack.", durationMinutes: 20 },
    { title: "Acquisition Channels", description: "Map and prioritize your top acquisition channels — SEO, social, paid, and referral.", durationMinutes: 25 },
    { title: "Conversion & Onboarding", description: "Optimize your funnel from click to activated user with proven onboarding patterns.", durationMinutes: 25 },
    { title: "Retention & Engagement", description: "Re-engage churned users and build habits that keep your power users coming back.", durationMinutes: 25 },
    { title: "Building Viral Loops", description: "Design referral and sharing mechanics that compound your growth automatically.", durationMinutes: 30 },
  ],
  "Brand Identity Crash Course": [
    { title: "Brand Strategy & Positioning", description: "Define your brand's purpose, personality, and the audience you're speaking to.", durationMinutes: 25 },
    { title: "Logo Design Principles", description: "Design and evaluate logos using the principles of form, balance, and versatility.", durationMinutes: 30 },
    { title: "Color Theory & Palettes", description: "Build primary, secondary, and neutral palettes rooted in color psychology.", durationMinutes: 25 },
    { title: "Typography & Voice", description: "Select typeface pairings and develop a brand voice that sounds distinct everywhere.", durationMinutes: 25 },
    { title: "Build Your Brand Guide", description: "Compile all decisions into a shareable brand guide that keeps your identity consistent.", durationMinutes: 35 },
  ],
  "Advanced Frontend Architecture": [
    { title: "Monorepo Setup with pnpm", description: "Configure a production-grade pnpm workspace with shared libs, apps, and scripts.", durationMinutes: 30 },
    { title: "TypeScript Configuration Deep Dive", description: "Project references, composite builds, path aliases, and strict mode configurations.", durationMinutes: 35 },
    { title: "Advanced React Patterns", description: "Compound components, render props, higher-order components, and context patterns.", durationMinutes: 40 },
    { title: "Code Splitting & Lazy Loading", description: "Dynamic imports, React.lazy, Suspense, and route-based splitting strategies.", durationMinutes: 30 },
    { title: "Server-Side Rendering", description: "SSR vs SSG vs ISR — understanding trade-offs and implementing each with Next.js.", durationMinutes: 35 },
    { title: "Testing Strategies", description: "Unit, integration, and E2E tests with Vitest, Testing Library, and Playwright.", durationMinutes: 35 },
    { title: "CI/CD Pipelines", description: "GitHub Actions workflows for lint, typecheck, test, build, and deploy.", durationMinutes: 30 },
    { title: "Performance Profiling", description: "Browser DevTools, React Profiler, and Lighthouse to find and fix real bottlenecks.", durationMinutes: 35 },
    { title: "Security Best Practices", description: "XSS, CSRF, CSP headers, secure dependency management, and secrets handling.", durationMinutes: 30 },
    { title: "Capstone: Production Deploy", description: "Deploy a production-hardened app with monitoring, logging, and alerting.", durationMinutes: 60 },
  ],
  "Mentorship Masterclass": [
    { title: "Finding Your Mentoring Style", description: "Discover whether you're a coach, advisor, or sponsor — and how to flex between styles.", durationMinutes: 25 },
    { title: "1:1 Session Frameworks", description: "Structured templates and conversation flows for high-impact mentoring sessions.", durationMinutes: 30 },
    { title: "Content Creation for Builders", description: "Turn your mentoring insights into threads, videos, and articles that build your audience.", durationMinutes: 30 },
    { title: "Building an Audience", description: "Grow a community around your expertise on LinkedIn, X, and YouTube.", durationMinutes: 25 },
    { title: "Monetization Strategies", description: "Cohorts, 1:1 packages, digital products — pricing and packaging your knowledge.", durationMinutes: 25 },
    { title: "Avoiding Mentor Burnout", description: "Set healthy boundaries, say no gracefully, and sustain your energy for the long game.", durationMinutes: 20 },
  ],
};

router.post("/", async (req, res) => {
  try {
    // Seed demo users
    const existingUsers = await db.select().from(usersTable);
    if (existingUsers.length === 0) {
      const hash = await bcrypt.hash("password123", 10);
      const demoUsers = [
        { email: "ada@zeroclub.io", username: "ada_builds", displayName: "Ada Okafor", track: "product_design" as const, school: "UNILAG" },
        { email: "kofi@zeroclub.io", username: "kofi_codes", displayName: "Kofi Mensah", track: "frontend" as const, school: "KNUST" },
        { email: "zara@zeroclub.io", username: "zara_grows", displayName: "Zara Yusuf", track: "growth" as const, school: "ABU Zaria" },
      ];
      for (const u of demoUsers) {
        const id = generateId();
        await db.insert(usersTable).values({ id, email: u.email, passwordHash: hash });
        await db.insert(profilesTable).values({
          id,
          email: u.email,
          username: u.username,
          displayName: u.displayName,
          track: u.track,
          school: u.school,
          referralCode: u.username.slice(0, 3).toUpperCase() + "DEMO1",
          xpBalance: Math.floor(Math.random() * 800) + 100,
        });
      }
    }

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
          priceCents: 0,
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
          priceCents: 2999,
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
          priceCents: 0,
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
          priceCents: 0,
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
          priceCents: 4999,
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
          priceCents: 1999,
        },
      ]);
    }

    // Seed modules for each bootcamp
    const allBootcamps = await db.select().from(bootcampsTable);
    const existingModules = await db.select().from(bootcampModulesTable);
    if (existingModules.length === 0) {
      for (const bootcamp of allBootcamps) {
        const modules = MODULE_TEMPLATES[bootcamp.title];
        if (modules) {
          await db.insert(bootcampModulesTable).values(
            modules.map((m, i) => ({
              id: generateId(),
              bootcampId: bootcamp.id,
              title: m.title,
              description: m.description,
              durationMinutes: m.durationMinutes,
              xpReward: 25,
              orderIndex: i + 1,
            })),
          );
        }
      }
    }

    res.json({ ok: true, message: "Seed complete" });
  } catch (err) {
    req.log.error({ err }, "seed error");
    res.status(500).json({ error: "seed_failed" });
  }
});

export default router;
