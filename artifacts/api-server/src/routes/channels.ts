import { Router } from "express";
import { db } from "@workspace/db";
import {
  channelsTable,
  messagesTable,
  profilesTable,
  bootcampsTable,
} from "@workspace/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";
import { computeLevel } from "./auth";

const router = Router();

const BOOTCAMP_SUB_CHANNELS = [
  { slug: "general", title: "General", description: "General discussion" },
  { slug: "show-and-tell", title: "Show & Tell", description: "Share your work and progress" },
  { slug: "resources", title: "Resources", description: "Links, articles, and learning materials" },
  { slug: "feedback", title: "Feedback", description: "Get feedback on your builds" },
];

export async function syncBootcampChannels() {
  try {
    const bootcamps = await db.select().from(bootcampsTable);

    for (const bootcamp of bootcamps) {
      const existing = await db
        .select()
        .from(channelsTable)
        .where(
          and(
            eq(channelsTable.bootcampId, bootcamp.id),
            isNull(channelsTable.parentChannelId),
          ),
        )
        .limit(1);

      let parentId: string;

      if (existing.length === 0) {
        parentId = generateId();
        await db.insert(channelsTable).values({
          id: parentId,
          name: `bc-${bootcamp.id}`,
          title: bootcamp.title,
          description: bootcamp.subtitle,
          bootcampId: bootcamp.id,
          parentChannelId: null,
        });
      } else {
        parentId = existing[0]!.id;
      }

      for (const sub of BOOTCAMP_SUB_CHANNELS) {
        const subExists = await db
          .select()
          .from(channelsTable)
          .where(
            and(
              eq(channelsTable.parentChannelId, parentId),
              eq(channelsTable.name, sub.slug),
            ),
          )
          .limit(1);

        if (subExists.length === 0) {
          await db.insert(channelsTable).values({
            id: generateId(),
            name: sub.slug,
            title: sub.title,
            description: sub.description,
            bootcampId: bootcamp.id,
            parentChannelId: parentId,
          });
        }
      }
    }
  } catch (err) {
    console.error("syncBootcampChannels error", err);
  }
}

// GET /channels
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

        const subCount =
          c.parentChannelId === null && c.bootcampId
            ? (
                await db
                  .select()
                  .from(channelsTable)
                  .where(eq(channelsTable.parentChannelId, c.id))
              ).length
            : 0;

        return {
          ...c,
          lastMessage: lastMsg[0]?.body ?? null,
          lastMessageAt: lastMsg[0]?.createdAt ?? null,
          subChannelCount: subCount,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "list channels error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /channels/:channelId/sub-channels
router.get("/:channelId/sub-channels", requireAuth, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  try {
    const subs = await db
      .select()
      .from(channelsTable)
      .where(eq(channelsTable.parentChannelId, channelId));

    const enriched = await Promise.all(
      subs.map(async (c) => {
        const lastMsg = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.channelId, c.id))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);
        return {
          ...c,
          lastMessage: lastMsg[0]?.body ?? null,
          lastMessageAt: lastMsg[0]?.createdAt ?? null,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "list sub-channels error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /channels/:channelId/messages
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
        const authors = await db
          .select()
          .from(profilesTable)
          .where(eq(profilesTable.id, m.authorId))
          .limit(1);
        return {
          ...m,
          author: { ...authors[0]!, level: computeLevel(authors[0]!.xpBalance) },
        };
      }),
    );
    res.json(enriched.reverse());
  } catch (err) {
    req.log.error({ err }, "list messages error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /channels/:channelId/messages
router.post("/:channelId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const { body } = req.body as { body: string };
  if (!body) {
    res.status(400).json({ error: "validation_error", message: "body is required" });
    return;
  }
  try {
    const id = generateId();
    await db.insert(messagesTable).values({ id, channelId, authorId: req.userId!, body });
    const authors = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);
    const msg = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, id))
      .limit(1);
    res.status(201).json({
      ...msg[0]!,
      author: { ...authors[0]!, level: computeLevel(authors[0]!.xpBalance) },
    });
  } catch (err) {
    req.log.error({ err }, "send message error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
