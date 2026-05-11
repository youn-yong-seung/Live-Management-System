import { Router, type IRouter } from "express";
import multer from "multer";
import { db, communityPostsTable, communityCommentsTable, usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireUser, optionalUser } from "../middleware/userAuth.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router: IRouter = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("이미지 파일만 업로드 가능합니다."));
  },
});

const createPostSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(1).max(50_000),
  bodyHtml: z.string().max(200_000).optional(),
});

const createCommentSchema = z.object({
  body: z.string().min(1).max(5_000),
  parentCommentId: z.number().int().positive().optional(),
});

router.get("/community/posts", optionalUser, async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "30", 10) || 30, 100);
  const offset = Math.max(parseInt((req.query.offset as string) ?? "0", 10) || 0, 0);

  const rows = await db
    .select({
      id: communityPostsTable.id,
      title: communityPostsTable.title,
      body: communityPostsTable.body,
      viewCount: communityPostsTable.viewCount,
      createdAt: communityPostsTable.createdAt,
      authorId: communityPostsTable.authorId,
      authorName: usersTable.name,
      authorEmail: usersTable.email,
      authorAvatarUrl: usersTable.avatarUrl,
      authorRole: usersTable.role,
    })
    .from(communityPostsTable)
    .leftJoin(usersTable, eq(communityPostsTable.authorId, usersTable.id))
    .orderBy(desc(communityPostsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const counts = await db
    .select({
      postId: communityCommentsTable.postId,
      cnt: sql<number>`count(*)::int`,
    })
    .from(communityCommentsTable)
    .groupBy(communityCommentsTable.postId);
  const countMap = new Map(counts.map((c) => [c.postId, c.cnt]));

  res.json({
    posts: rows.map((r) => ({ ...r, commentCount: countMap.get(r.id) ?? 0 })),
  });
});

router.get("/community/posts/:id", optionalUser, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "잘못된 게시글 ID" });
    return;
  }

  const [post] = await db
    .select({
      id: communityPostsTable.id,
      title: communityPostsTable.title,
      body: communityPostsTable.body,
      bodyHtml: communityPostsTable.bodyHtml,
      viewCount: communityPostsTable.viewCount,
      createdAt: communityPostsTable.createdAt,
      updatedAt: communityPostsTable.updatedAt,
      authorId: communityPostsTable.authorId,
      authorName: usersTable.name,
      authorEmail: usersTable.email,
      authorAvatarUrl: usersTable.avatarUrl,
      authorRole: usersTable.role,
    })
    .from(communityPostsTable)
    .leftJoin(usersTable, eq(communityPostsTable.authorId, usersTable.id))
    .where(eq(communityPostsTable.id, id))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    return;
  }

  await db
    .update(communityPostsTable)
    .set({ viewCount: sql`${communityPostsTable.viewCount} + 1` })
    .where(eq(communityPostsTable.id, id));

  const comments = await db
    .select({
      id: communityCommentsTable.id,
      postId: communityCommentsTable.postId,
      parentCommentId: communityCommentsTable.parentCommentId,
      body: communityCommentsTable.body,
      createdAt: communityCommentsTable.createdAt,
      authorId: communityCommentsTable.authorId,
      authorName: usersTable.name,
      authorEmail: usersTable.email,
      authorAvatarUrl: usersTable.avatarUrl,
      authorRole: usersTable.role,
    })
    .from(communityCommentsTable)
    .leftJoin(usersTable, eq(communityCommentsTable.authorId, usersTable.id))
    .where(eq(communityCommentsTable.postId, id))
    .orderBy(communityCommentsTable.createdAt);

  res.json({ post, comments });
});

router.post("/community/posts", requireUser, async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "잘못된 입력", details: parsed.error.flatten() });
    return;
  }

  const [created] = await db
    .insert(communityPostsTable)
    .values({
      authorId: req.user!.id,
      title: parsed.data.title,
      body: parsed.data.body,
      bodyHtml: parsed.data.bodyHtml ?? null,
    })
    .returning();

  res.status(201).json({ post: created });
});

router.delete("/community/posts/:id", requireUser, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "잘못된 게시글 ID" });
    return;
  }

  const [existing] = await db
    .select({ authorId: communityPostsTable.authorId })
    .from(communityPostsTable)
    .where(eq(communityPostsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    return;
  }
  if (existing.authorId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "삭제 권한이 없습니다." });
    return;
  }

  await db.delete(communityPostsTable).where(eq(communityPostsTable.id, id));
  res.json({ ok: true });
});

router.post("/community/posts/:id/comments", requireUser, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (!Number.isFinite(postId) || postId <= 0) {
    res.status(400).json({ error: "잘못된 게시글 ID" });
    return;
  }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "잘못된 입력", details: parsed.error.flatten() });
    return;
  }

  const [exists] = await db
    .select({ id: communityPostsTable.id })
    .from(communityPostsTable)
    .where(eq(communityPostsTable.id, postId))
    .limit(1);
  if (!exists) {
    res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    return;
  }

  const [created] = await db
    .insert(communityCommentsTable)
    .values({
      postId,
      authorId: req.user!.id,
      body: parsed.data.body,
      parentCommentId: parsed.data.parentCommentId ?? null,
    })
    .returning();

  res.status(201).json({ comment: created });
});

router.post("/community/upload", requireUser, imageUpload.single("image"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "이미지가 없습니다." });
    return;
  }
  const safeName = file.originalname.replace(/[^\w.\-가-힣]/g, "_");
  const objectPath = `community/${randomUUID()}-${safeName}`;
  const { error } = await supabaseAdmin.storage
    .from("resources")
    .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) {
    res.status(500).json({ error: `업로드 실패: ${error.message}` });
    return;
  }
  const { data: pub } = supabaseAdmin.storage.from("resources").getPublicUrl(objectPath);
  res.json({ url: pub.publicUrl });
});

router.delete("/community/comments/:id", requireUser, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "잘못된 댓글 ID" });
    return;
  }

  const [existing] = await db
    .select({ authorId: communityCommentsTable.authorId })
    .from(communityCommentsTable)
    .where(eq(communityCommentsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    return;
  }
  if (existing.authorId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "삭제 권한이 없습니다." });
    return;
  }

  await db.delete(communityCommentsTable).where(eq(communityCommentsTable.id, id));
  res.json({ ok: true });
});

export default router;
