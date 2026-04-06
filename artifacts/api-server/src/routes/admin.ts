import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminConfigTable, liveYoutubeStatsTable, livesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAdminAuth, createAdminSession, invalidateAdminSession } from "../middleware/adminAuth";

export { requireAdminAuth };

const router: IRouter = Router();

/* ── Seed initial admin config on startup ───────────── */

export async function seedAdminConfig(): Promise<void> {
  try {
    const [existing] = await db.select().from(adminConfigTable);
    if (existing) return; // already configured

    const envPassword = process.env["ADMIN_INITIAL_PASSWORD"];

    if (!envPassword && process.env["NODE_ENV"] === "production") {
      throw new Error(
        "ADMIN_INITIAL_PASSWORD env var must be set for production admin initialization."
      );
    }

    // In development: fall back to a random password printed once to logs
    const generatedPassword = envPassword ?? randomUUID().replace(/-/g, "").slice(0, 16);
    const hash = await bcrypt.hash(generatedPassword, 10);
    await db.insert(adminConfigTable).values({ passwordHash: hash });

    if (envPassword) {
      logger.info("Admin config seeded from ADMIN_INITIAL_PASSWORD env var");
    } else {
      // Log generated password prominently — admin MUST change it immediately
      logger.warn(
        `\n\n  *** ADMIN INITIAL PASSWORD ***\n  ${generatedPassword}\n  Change this immediately via the API 설정 > 비밀번호 변경 section.\n`
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin config");
    if (process.env["NODE_ENV"] === "production") throw err;
  }
}

/* ── Simple in-memory rate limiter for login ─────────── */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function resetLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/* ── POST /admin/login ──────────────────────────────── */

router.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown");
    if (!checkLoginRateLimit(ip)) {
      return res.status(429).json({ error: "너무 많은 시도입니다. 잠시 후 다시 시도해주세요." });
    }

    const { password } = req.body as { password?: string };
    if (!password) return res.status(400).json({ error: "password required" });

    const [config] = await db.select().from(adminConfigTable);
    if (!config) return res.status(500).json({ error: "Admin not configured" });

    const valid = await bcrypt.compare(password, config.passwordHash);
    if (!valid) return res.status(401).json({ error: "비밀번호가 틀렸습니다." });

    resetLoginAttempts(ip);
    const token = await createAdminSession();
    return res.json({ success: true, token });
  } catch (err) {
    logger.error({ err }, "POST /admin/login failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /admin/session (validate token) ────────────── */

router.get("/admin/session", requireAdminAuth, (_req: Request, res: Response) => {
  return res.json({ valid: true });
});

/* ── POST /admin/logout ─────────────────────────────── */

router.post("/admin/logout", async (req: Request, res: Response) => {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (token) await invalidateAdminSession(token);
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

    const raw = req.body as {
      views?: unknown; peakConcurrent?: unknown; watchTimeMinutes?: unknown;
      likes?: unknown; comments?: unknown;
    };

    const toNonNegativeInt = (v: unknown, field: string): number => {
      const n = Number(v ?? 0);
      if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a non-negative number`);
      return Math.floor(n);
    };

    let views: number, peakConcurrent: number, watchTimeMinutes: number, likes: number, comments: number;
    try {
      views = toNonNegativeInt(raw.views, "views");
      peakConcurrent = toNonNegativeInt(raw.peakConcurrent, "peakConcurrent");
      watchTimeMinutes = toNonNegativeInt(raw.watchTimeMinutes, "watchTimeMinutes");
      likes = toNonNegativeInt(raw.likes, "likes");
      comments = toNonNegativeInt(raw.comments, "comments");
    } catch (validationErr) {
      return res.status(400).json({ error: (validationErr as Error).message });
    }

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

/* ── GET /youtube/channel-videos — 채널 영상 불러오기 ── */

const YT_CHANNEL_ID = "UCYg51KBo-UcA4QILcYl5LEw"; // 윤자동

router.get("/youtube/channel-videos", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    // Fetch /streams page to find UPCOMING lives
    const pageRes = await fetch(`https://www.youtube.com/@yunjadong/streams`, {
      headers: { "Accept-Language": "ko-KR,ko" },
    });
    const html = await pageRes.text();

    // Parse video entries with their overlay style
    const videoBlocks = html.split('"videoRenderer"').slice(1);
    const videos: { id: string; title: string; isUpcoming: boolean }[] = [];
    const seen = new Set<string>();

    for (const block of videoBlocks) {
      const idMatch = block.match(/"videoId":"([^"]{11})"/);
      const titleMatch = block.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}/);
      const isUpcoming = block.includes('"style":"UPCOMING"');

      if (idMatch && titleMatch && !seen.has(idMatch[1])) {
        seen.add(idMatch[1]);
        videos.push({ id: idMatch[1], title: titleMatch[1], isUpcoming });
      }
    }

    // Only return UPCOMING streams
    const upcoming = videos.filter((v) => v.isUpcoming);

    // Get existing youtube URLs
    const existingLives = await db.select({ youtubeUrl: livesTable.youtubeUrl }).from(livesTable);
    const existingIds = new Set(
      existingLives.map((l) => {
        if (!l.youtubeUrl) return null;
        const m = l.youtubeUrl.match(/(?:v=|\/live\/)([^#&?]{11})/);
        return m ? m[1] : null;
      }).filter(Boolean)
    );

    const newVideos = upcoming.filter((v) => !existingIds.has(v.id));

    return res.json({ total: upcoming.length, new: newVideos.length, videos: newVideos });
  } catch (err) {
    logger.error({ err }, "GET /youtube/channel-videos failed");
    return res.status(500).json({ error: "채널 영상을 불러오는데 실패했습니다." });
  }
});

export default router;
