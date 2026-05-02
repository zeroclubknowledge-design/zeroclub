import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable,
  profilesTable,
  likesTable,
  bookmarksTable,
  commentsTable,
  xpEventsTable,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";
import { computeLevel } from "./auth";

const router = Router();

async function enrichPost(post: typeof postsTable.$inferSelect, userId?: string) {
  const [authorArr, likeCount, commentCount, liked, bookmarked] = await Promise.all([
    db.select().from(profilesTable).where(eq(profilesTable.id, post.authorId)).limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(likesTable)
      .where(eq(likesTable.postId, post.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(commentsTable)
      .where(eq(commentsTable.postId, post.id)),
    userId
      ? db
          .select()
          .from(likesTable)
          .where(and(eq(likesTable.postId, post.id), eq(likesTable.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
    userId
      ? db
          .select()
          .from(bookmarksTable)
          .where(and(eq(bookmarksTable.postId, post.id), eq(bookmarksTable.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const author = authorArr[0]!;
  return {
    ...post,
    author: { ...author, level: computeLevel(author.xpBalance) },
    likeCount: likeCount[0]?.count ?? 0,
    commentCount: commentCount[0]?.count ?? 0,
    isLiked: liked.length > 0,
    isBookmarked: bookmarked.length > 0,
  };
}

// GET /posts
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 20), 50);
  const offset = Number(req.query["offset"] ?? 0);
  const track = req.query["track"] as string | undefined;

  try {
    const query = db
      .select()
      .from(postsTable)
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const posts = track
      ? await db
          .select()
          .from(postsTable)
          .where(eq(postsTable.track, track as typeof postsTable.$inferSelect.track))
          .orderBy(desc(postsTable.createdAt))
          .limit(limit)
          .offset(offset)
      : await query;

    const [enriched, total] = await Promise.all([
      Promise.all(posts.map((p) => enrichPost(p, req.userId))),
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable),
    ]);

    res.json({
      posts: enriched,
      total: total[0]?.count ?? 0,
      hasMore: offset + posts.length < (total[0]?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "list posts error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /posts
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { body, imageUrl, track, isProofProject } = req.body as {
    body: string;
    imageUrl?: string;
    track: string;
    isProofProject: boolean;
  };

  if (!body || !track) {
    res.status(400).json({ error: "validation_error", message: "body and track are required" });
    return;
  }

  try {
    const id = generateId();
    const xpAwarded = isProofProject ? 50 : 15;
    const xpSource = isProofProject ? "proof_project" : "build_posted";

    await db.insert(postsTable).values({
      id,
      authorId: req.userId!,
      body,
      imageUrl: imageUrl ?? null,
      track: track as typeof postsTable.$inferSelect.track,
      isProofProject: !!isProofProject,
      xpAwarded,
    });

    // Award XP
    await db.insert(xpEventsTable).values({
      id: generateId(),
      userId: req.userId!,
      source: xpSource as "build_posted" | "proof_project",
      detail: `Post: ${body.slice(0, 50)}`,
      amount: xpAwarded,
    });

    await db
      .update(profilesTable)
      .set({ xpBalance: sql`${profilesTable.xpBalance} + ${xpAwarded}` })
      .where(eq(profilesTable.id, req.userId!));

    const post = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
    const enriched = await enrichPost(post[0]!, req.userId);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error({ err }, "create post error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /posts/:postId
router.get("/:postId", requireAuth, async (req: AuthRequest, res) => {
  const { postId } = req.params as { postId: string };
  try {
    const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (posts.length === 0) {
      res.status(404).json({ error: "not_found", message: "Post not found" });
      return;
    }
    const enriched = await enrichPost(posts[0]!, req.userId);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "get post error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

async function maybeAwardBuildMilestone(postId: string) {
  const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!posts[0]) return;
  const authorId = posts[0].authorId;

  const [likeResult, commentResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(likesTable).where(eq(likesTable.postId, postId)),
    db.select({ count: sql<number>`count(*)::int` }).from(commentsTable).where(eq(commentsTable.postId, postId)),
  ]);

  const likeCount = likeResult[0]?.count ?? 0;
  const commentCount = commentResult[0]?.count ?? 0;

  if (likeCount >= 3 && commentCount >= 1) {
    const alreadyAwarded = await db
      .select()
      .from(xpEventsTable)
      .where(
        and(
          eq(xpEventsTable.userId, authorId),
          eq(xpEventsTable.source, "build_milestone"),
          eq(xpEventsTable.detail, `post:${postId}`),
        ),
      )
      .limit(1);

    if (alreadyAwarded.length === 0) {
      await db.insert(xpEventsTable).values({
        id: generateId(),
        userId: authorId,
        source: "build_milestone",
        detail: `post:${postId}`,
        amount: 15,
      });
      await db
        .update(profilesTable)
        .set({ xpBalance: sql`${profilesTable.xpBalance} + 15` })
        .where(eq(profilesTable.id, authorId));
    }
  }
}

// POST /posts/:postId/like
router.post("/:postId/like", requireAuth, async (req: AuthRequest, res) => {
  const { postId } = req.params as { postId: string };
  try {
    const existing = await db
      .select()
      .from(likesTable)
      .where(and(eq(likesTable.postId, postId), eq(likesTable.userId, req.userId!)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(likesTable)
        .where(and(eq(likesTable.postId, postId), eq(likesTable.userId, req.userId!)));
    } else {
      await db.insert(likesTable).values({ userId: req.userId!, postId });
      await maybeAwardBuildMilestone(postId);
    }

    const count = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(likesTable)
      .where(eq(likesTable.postId, postId));

    res.json({ liked: existing.length === 0, likeCount: count[0]?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "like post error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /posts/:postId/bookmark
router.post("/:postId/bookmark", requireAuth, async (req: AuthRequest, res) => {
  const { postId } = req.params as { postId: string };
  try {
    const existing = await db
      .select()
      .from(bookmarksTable)
      .where(and(eq(bookmarksTable.postId, postId), eq(bookmarksTable.userId, req.userId!)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(bookmarksTable)
        .where(and(eq(bookmarksTable.postId, postId), eq(bookmarksTable.userId, req.userId!)));
    } else {
      await db.insert(bookmarksTable).values({ userId: req.userId!, postId });
    }

    res.json({ bookmarked: existing.length === 0 });
  } catch (err) {
    req.log.error({ err }, "bookmark post error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// GET /posts/:postId/comments
router.get("/:postId/comments", requireAuth, async (req: AuthRequest, res) => {
  const { postId } = req.params as { postId: string };
  try {
    const comments = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));

    const enriched = await Promise.all(
      comments.map(async (c) => {
        const authors = await db
          .select()
          .from(profilesTable)
          .where(eq(profilesTable.id, c.authorId))
          .limit(1);
        return { ...c, author: { ...authors[0]!, level: computeLevel(authors[0]!.xpBalance) } };
      }),
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "list comments error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

// POST /posts/:postId/comments
router.post("/:postId/comments", requireAuth, async (req: AuthRequest, res) => {
  const { postId } = req.params as { postId: string };
  const { body } = req.body as { body: string };
  if (!body) {
    res.status(400).json({ error: "validation_error", message: "body is required" });
    return;
  }
  try {
    const id = generateId();
    await db.insert(commentsTable).values({ id, postId, authorId: req.userId!, body });
    await maybeAwardBuildMilestone(postId);
    const authors = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);
    const comment = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);
    res.status(201).json({
      ...comment[0]!,
      author: { ...authors[0]!, level: computeLevel(authors[0]!.xpBalance) },
    });
  } catch (err) {
    req.log.error({ err }, "create comment error");
    res.status(500).json({ error: "internal_error", message: "Failed" });
  }
});

export default router;
