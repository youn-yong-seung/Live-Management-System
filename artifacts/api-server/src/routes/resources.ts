import { Router, type IRouter } from "express";
import multer from "multer";
import { db, resourcesTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/userAuth.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const resourceInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().min(1).max(100),
  iconName: z.string().max(50).nullable().optional(),
  badge: z.string().max(50).nullable().optional(),
  badgeColor: z.string().max(100).nullable().optional(),
  externalUrl: z.string().url().nullable().optional().or(z.literal("")),
  filePath: z.string().nullable().optional(),
  fileMimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  internalRoute: z.string().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

router.get("/resources", async (_req, res) => {
  const rows = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.isPublished, true))
    .orderBy(asc(resourcesTable.category), asc(resourcesTable.displayOrder), asc(resourcesTable.id));
  res.json({ resources: rows });
});

router.get("/resources/admin/all", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(resourcesTable)
    .orderBy(asc(resourcesTable.category), asc(resourcesTable.displayOrder), asc(resourcesTable.id));
  res.json({ resources: rows });
});

router.get("/resources/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "잘못된 ID" });
    return;
  }
  const [row] = await db.select().from(resourcesTable).where(eq(resourcesTable.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "찾을 수 없습니다." });
    return;
  }
  res.json({ resource: row });
});

router.post("/resources", requireAdmin, async (req, res) => {
  const parsed = resourceInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "잘못된 입력", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const externalUrl = data.externalUrl === "" ? null : data.externalUrl ?? null;

  const [created] = await db
    .insert(resourcesTable)
    .values({
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      iconName: data.iconName ?? null,
      badge: data.badge ?? null,
      badgeColor: data.badgeColor ?? null,
      externalUrl,
      filePath: data.filePath ?? null,
      fileMimeType: data.fileMimeType ?? null,
      fileSize: data.fileSize ?? null,
      internalRoute: data.internalRoute ?? null,
      displayOrder: data.displayOrder,
      isPublished: data.isPublished,
      createdBy: req.user!.id,
    })
    .returning();
  res.status(201).json({ resource: created });
});

router.put("/resources/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "잘못된 ID" });
    return;
  }
  const parsed = resourceInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "잘못된 입력", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const externalUrl = data.externalUrl === "" ? null : data.externalUrl ?? null;

  const [updated] = await db
    .update(resourcesTable)
    .set({
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      iconName: data.iconName ?? null,
      badge: data.badge ?? null,
      badgeColor: data.badgeColor ?? null,
      externalUrl,
      filePath: data.filePath ?? null,
      fileMimeType: data.fileMimeType ?? null,
      fileSize: data.fileSize ?? null,
      internalRoute: data.internalRoute ?? null,
      displayOrder: data.displayOrder,
      isPublished: data.isPublished,
      updatedAt: sql`now()`,
    })
    .where(eq(resourcesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "찾을 수 없습니다." });
    return;
  }
  res.json({ resource: updated });
});

router.delete("/resources/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "잘못된 ID" });
    return;
  }

  const [existing] = await db
    .select({ filePath: resourcesTable.filePath })
    .from(resourcesTable)
    .where(eq(resourcesTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "찾을 수 없습니다." });
    return;
  }

  if (existing.filePath) {
    await supabaseAdmin.storage.from("resources").remove([existing.filePath]).catch(() => undefined);
  }

  await db.delete(resourcesTable).where(eq(resourcesTable.id, id));
  res.json({ ok: true });
});

router.post("/resources/upload", requireAdmin, upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "파일이 없습니다." });
    return;
  }

  const safeName = file.originalname.replace(/[^\w.\-가-힣]/g, "_");
  const objectPath = `uploads/${randomUUID()}-${safeName}`;

  const { error } = await supabaseAdmin.storage
    .from("resources")
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) {
    res.status(500).json({ error: `업로드 실패: ${error.message}` });
    return;
  }

  const { data: pub } = supabaseAdmin.storage.from("resources").getPublicUrl(objectPath);
  res.json({
    filePath: objectPath,
    publicUrl: pub.publicUrl,
    fileMimeType: file.mimetype,
    fileSize: file.size,
    originalName: file.originalname,
  });
});

router.post("/resources/:id/download", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "잘못된 ID" });
    return;
  }
  await db
    .update(resourcesTable)
    .set({ downloadCount: sql`${resourcesTable.downloadCount} + 1` })
    .where(eq(resourcesTable.id, id));
  res.json({ ok: true });
});

export default router;
