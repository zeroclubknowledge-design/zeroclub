import { Router } from "express";
import { db } from "@workspace/db";
import { channelsTable, messagesTable, profilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { computeLevel } from "./auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const channels = await db.select().from(channelsTable);
    const enriched = await Promise.all(
      channels.map(async (c) => {
        const lastMsg = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.channelId, c.id))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);
        return { ...c, lastMessage: lastMsg[0]?.body ?? null, lastMessageAt: lastMsg[0]?.createdAt ?? null };
      }),
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "list channels error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

router.get("/:channelId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  try {
    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.channelId, channelId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit);
    const enriched = await Promise.all(
      messages.map(async (m) => {
        const authors = await db.select().from(profilesTable).where(eq(profilesTable.id, m.authorId)).limit(1);
        return { ...m, author: { ...authors[0]!, level: computeLevel(authors[0]!.xpBalance) } };
      }),
    );
    res.json(enriched.reverse());
  } catch (err) {
    req.log.error({ err }, "list messages error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

router.post("/:channelId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const { body } = req.body as { body: string };
  if (!body) {
    res.status(400).json({ error: "validation_error", message: "body is required" });
    return;
  }
  try {
    const id = `${channelId}-${Date.now()}`;
    await db.insert(messagesTable).values({ id, channelId, authorId: req.userId!, body });
    const authors = await db.select().from(profilesTable).where(eq(profilesTable.id, req.userId!)).limit(1);
    const msg = await db.select().from(messagesTable).where(eq(messagesTable.id, id)).limit(1);
    res.status(201).json({ ...msg[0]!, author: { ...authors[0]!, level: computeLevel(authors[0]!.xpBalance) } });
  } catch (err) {
    req.log.error({ err }, "send message error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;