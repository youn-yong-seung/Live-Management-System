import { Router, type IRouter, type Request, type Response } from "express";
import { google } from "googleapis";
import { db } from "@workspace/db";
import { googleTokensTable, videoProjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/adminAuth";
import { logger } from "../lib/logger";
import { Readable } from "stream";

const router: IRouter = Router();

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || "";
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || "";

function getOAuth2Client() {
  return new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, REDIRECT_URI);
}

/* ── GET /youtube/auth-url — OAuth 인증 URL 생성 ────── */

router.get("/youtube/auth-url", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      return res.status(400).json({ error: "YouTube OAuth 자격증명이 설정되지 않았습니다." });
    }

    const oauth2 = getOAuth2Client();
    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube",
      ],
    });

    res.json({ url });
  } catch (err) {
    logger.error({ err }, "GET /youtube/auth-url failed");
    res.status(500).json({ error: "인증 URL 생성 실패" });
  }
});

/* ── GET /youtube/auth-callback — OAuth 콜백 ─────────── */

router.get("/youtube/auth-callback", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: "코드가 없습니다." });

    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token || !tokens.access_token) {
      return res.status(400).json({ error: "토큰 발급 실패. 다시 인증해주세요." });
    }

    // Upsert token
    const [existing] = await db.select().from(googleTokensTable).limit(1);
    if (existing) {
      await db.update(googleTokensTable).set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600000),
        scope: tokens.scope ?? null,
        updatedAt: new Date(),
      }).where(eq(googleTokensTable.id, existing.id));
    } else {
      await db.insert(googleTokensTable).values({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600000),
        scope: tokens.scope ?? null,
      });
    }

    // Redirect to admin page with success
    res.send(`<html><body><h2>Google 인증 완료!</h2><p>이 창을 닫고 관리자 페이지로 돌아가세요.</p><script>window.close();</script></body></html>`);
  } catch (err) {
    logger.error({ err }, "GET /youtube/auth-callback failed");
    res.status(500).json({ error: "인증 콜백 처리 실패" });
  }
});

/* ── GET /youtube/auth-status — 인증 상태 확인 ────────── */

router.get("/youtube/auth-status", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const [token] = await db.select().from(googleTokensTable).limit(1);
    if (!token) return res.json({ connected: false });

    res.json({
      connected: true,
      expiresAt: token.expiresAt,
      scope: token.scope,
    });
  } catch (err) {
    logger.error({ err }, "GET /youtube/auth-status failed");
    res.status(500).json({ error: "상태 확인 실패" });
  }
});

/* ── Helper: Get authenticated YouTube client ────────── */

async function getYouTubeClient() {
  const [token] = await db.select().from(googleTokensTable).limit(1);
  if (!token) throw new Error("Google 인증이 필요합니다.");

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  // Auto-refresh if expired
  if (token.expiresAt.getTime() < Date.now()) {
    const { credentials } = await oauth2.refreshAccessToken();
    await db.update(googleTokensTable).set({
      accessToken: credentials.access_token!,
      expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3600000),
      updatedAt: new Date(),
    }).where(eq(googleTokensTable.id, token.id));
  }

  return google.youtube({ version: "v3", auth: oauth2 });
}

/* ── POST /youtube/upload — 영상 업로드 ───────────────── */

router.post("/youtube/upload", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      projectId, title, description, tags,
      privacyStatus = "private",
      publishAt, driveLink, categoryId = "22",
    } = req.body as {
      projectId?: number; title: string; description?: string; tags?: string[];
      privacyStatus?: string; publishAt?: string; driveLink: string;
      categoryId?: string;
    };

    if (!title || !driveLink) {
      return res.status(400).json({ error: "제목과 드라이브 링크는 필수입니다." });
    }

    const youtube = await getYouTubeClient();

    // Download video from Google Drive
    const driveFileId = extractDriveFileId(driveLink);
    if (!driveFileId) return res.status(400).json({ error: "유효한 구글 드라이브 링크가 아닙니다." });

    const [token] = await db.select().from(googleTokensTable).limit(1);
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({ access_token: token!.accessToken, refresh_token: token!.refreshToken });
    const drive = google.drive({ version: "v3", auth: oauth2 });

    logger.info({ driveFileId, title }, "Starting YouTube upload from Drive");

    // Get file from Drive as stream
    const driveRes = await drive.files.get(
      { fileId: driveFileId, alt: "media" },
      { responseType: "stream" }
    );

    // Upload to YouTube
    const snippet: Record<string, unknown> = {
      title,
      description: description || "",
      categoryId,
    };
    if (tags?.length) snippet.tags = tags;

    const status: Record<string, unknown> = {
      privacyStatus: publishAt ? "private" : privacyStatus,
    };
    if (publishAt) {
      status.privacyStatus = "private";
      status.publishAt = new Date(publishAt).toISOString();
    }

    const uploadRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: { snippet, status },
      media: {
        body: driveRes.data as Readable,
      },
    });

    const videoId = uploadRes.data.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    logger.info({ videoId, title }, "YouTube upload complete");

    // Update project if projectId provided
    if (projectId) {
      await db.update(videoProjectsTable).set({
        youtubeUrl,
        status: publishAt ? "scheduled" : "uploaded",
        scheduledUploadAt: publishAt ? new Date(publishAt) : null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(videoProjectsTable.id, projectId));
    }

    return res.json({
      success: true,
      videoId,
      youtubeUrl,
      privacyStatus: publishAt ? "private (scheduled)" : privacyStatus,
      publishAt: publishAt || null,
    });
  } catch (err) {
    logger.error({ err }, "POST /youtube/upload failed");
    return res.status(500).json({ error: `업로드 실패: ${(err as Error).message}` });
  }
});

/* ── Helper: Extract Drive file ID from URL ─────────── */

function extractDriveFileId(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view
  const m1 = url.match(/\/d\/([^/]+)/);
  if (m1) return m1[1];
  // https://drive.google.com/open?id=FILE_ID
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2) return m2[1];
  return null;
}

export default router;
