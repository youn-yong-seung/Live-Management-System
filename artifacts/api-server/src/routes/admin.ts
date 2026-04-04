import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminConfigTable, liveYoutubeStatsTable, livesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_PASSWORD = "admin1234";

/* ── In-memory session store ────────────────────────── */
// Maps token → expiry (ms). Resets on server restart — acceptable for this single-admin use case.
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const adminSessions = new Map<string, number>();

/* ── Middleware: require valid admin token ───────────── */

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "인증이 필요합니다." });
    return;
  }
  const expiry = adminSessions.get(token);
  if (!expiry || expiry < Date.now()) {
    adminSessions.delete(token);
    res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인하세요." });
    return;
  }
  next();
}

/* ── Seed initial admin config on startup ───────────── */

export async function seedAdminConfig(): Promise<void> {
  try {
    const [existing] = await db.select().from(adminConfigTable);
    if (!existing) {
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await db.insert(adminConfigTable).values({ passwordHash: hash });
      logger.info("Admin config seeded with default password");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin config");
  }
}

/* ── POST /admin/login ──────────────────────────────── */

router.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const { password } = req.body as { password?: string };
    if (!password) return res.status(400).json({ error: "password required" });

    const [config] = await db.select().from(adminConfigTable);
    if (!config) return res.status(500).json({ error: "Admin not configured" });

    const valid = await bcrypt.compare(password, config.passwordHash);
    if (!valid) return res.status(401).json({ error: "비밀번호가 틀렸습니다." });

    const token = randomUUID();
    adminSessions.set(token, Date.now() + SESSION_TTL_MS);

    return res.json({ success: true, token });
  } catch (err) {
    logger.error({ err }, "POST /admin/login failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /admin/logout ─────────────────────────────── */

router.post("/admin/logout", (req: Request, res: Response) => {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (token) adminSessions.delete(token);
  return res.json({ success: true });
});

/* ── PUT /admin/password (protected) ───────────────── */

router.put("/admin/password", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string; newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword required" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "비밀번호는 최소 4자 이상이어야 합니다." });
    }

    const [config] = await db.select().from(adminConfigTable);
    if (!config) return res.status(500).json({ error: "Admin not configured" });

    const valid = await bcrypt.compare(currentPassword, config.passwordHash);
    if (!valid) return res.status(401).json({ error: "현재 비밀번호가 틀렸습니다." });

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.update(adminConfigTable)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(adminConfigTable.id, config.id));

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "PUT /admin/password failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /lives/:id/youtube-stats (protected) ───────── */

router.get("/lives/:id/youtube-stats", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db.select().from(liveYoutubeStatsTable)
      .where(eq(liveYoutubeStatsTable.liveId, liveId));

    if (!row) {
      return res.json({
        liveId, views: 0, peakConcurrent: 0,
        watchTimeMinutes: 0, likes: 0, comments: 0,
      });
    }
    return res.json(row);
  } catch (err) {
    logger.error({ err }, "GET /lives/:id/youtube-stats failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PUT /lives/:id/youtube-stats (protected) ───────── */

router.put("/lives/:id/youtube-stats", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const { views = 0, peakConcurrent = 0, watchTimeMinutes = 0, likes = 0, comments = 0 } = req.body as {
      views?: number; peakConcurrent?: number; watchTimeMinutes?: number;
      likes?: number; comments?: number;
    };

    const [existing] = await db.select().from(liveYoutubeStatsTable)
      .where(eq(liveYoutubeStatsTable.liveId, liveId));

    if (existing) {
      await db.update(liveYoutubeStatsTable).set({
        views, peakConcurrent, watchTimeMinutes, likes, comments,
        updatedAt: new Date(),
      }).where(eq(liveYoutubeStatsTable.liveId, liveId));
    } else {
      await db.insert(liveYoutubeStatsTable).values({
        liveId, views, peakConcurrent, watchTimeMinutes, likes, comments,
      });
    }

    const [updated] = await db.select().from(liveYoutubeStatsTable)
      .where(eq(liveYoutubeStatsTable.liveId, liveId));
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /lives/:id/youtube-stats failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /youtube-stats/all (protected) ─────────────── */

router.get("/youtube-stats/all", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        liveId: liveYoutubeStatsTable.liveId,
        liveTitle: livesTable.title,
        scheduledAt: livesTable.scheduledAt,
        views: liveYoutubeStatsTable.views,
        peakConcurrent: liveYoutubeStatsTable.peakConcurrent,
        watchTimeMinutes: liveYoutubeStatsTable.watchTimeMinutes,
        likes: liveYoutubeStatsTable.likes,
        comments: liveYoutubeStatsTable.comments,
        updatedAt: liveYoutubeStatsTable.updatedAt,
      })
      .from(liveYoutubeStatsTable)
      .innerJoin(livesTable, eq(liveYoutubeStatsTable.liveId, livesTable.id))
      .orderBy(livesTable.scheduledAt);
    return res.json(rows);
  } catch (err) {
    logger.error({ err }, "GET /youtube-stats/all failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
