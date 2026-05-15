import { Router, type IRouter, type Request, type Response } from "express";
import { db, siteEventsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/adminAuth";

const router: IRouter = Router();

/* ──────────────────────────────────────────────────────
 * POST /api/site-events
 *   배치 트래킹 이벤트 인서트 (sendBeacon 친화)
 *   body: { events: SiteEventInput[] }
 * ────────────────────────────────────────────────────── */

const ALLOWED_TYPES = new Set([
  "page_view",
  "click",
  "session_start",
  "session_end",
  "page_leave",
]);

interface IncomingEvent {
  eventType: string;
  path?: string | null;
  target?: string | null;
  targetLabel?: string | null;
  visitorId: string;
  sessionId: string;
  referrer?: string | null;
  viewport?: string | null;
  durationMs?: number | null;
  meta?: Record<string, unknown> | null;
  createdAt?: string | null;
}

function clean(s: unknown, max = 500): string | null {
  if (s == null) return null;
  const v = String(s).trim();
  return v ? v.slice(0, max) : null;
}

router.post("/site-events", async (req: Request, res: Response) => {
  try {
    let events: IncomingEvent[] = [];
    if (Array.isArray(req.body)) events = req.body;
    else if (Array.isArray(req.body?.events)) events = req.body.events;
    if (events.length === 0) return res.status(204).end();
    if (events.length > 100) events = events.slice(0, 100);

    const ua = clean(req.get("user-agent"), 500);

    const values = events
      .filter((e) => e && ALLOWED_TYPES.has(e.eventType) && e.visitorId && e.sessionId)
      .map((e) => ({
        eventType: e.eventType,
        path: clean(e.path, 500),
        target: clean(e.target, 500),
        targetLabel: clean(e.targetLabel, 200),
        visitorId: clean(e.visitorId, 100)!,
        sessionId: clean(e.sessionId, 100)!,
        referrer: clean(e.referrer, 500),
        userAgent: ua,
        viewport: clean(e.viewport, 50),
        durationMs:
          typeof e.durationMs === "number" && Number.isFinite(e.durationMs) && e.durationMs >= 0
            ? Math.min(Math.floor(e.durationMs), 24 * 60 * 60 * 1000)
            : null,
        meta: e.meta ?? null,
        createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
      }));

    if (values.length === 0) return res.status(204).end();

    await db.insert(siteEventsTable).values(values as any);
    return res.status(204).end();
  } catch (error) {
    req.log.error({ error }, "Error inserting site events");
    return res.status(400).json({ error: "Bad request" });
  }
});

/* ──────────────────────────────────────────────────────
 * GET /api/admin/site-analytics?days=30&tz=Asia/Seoul
 *   요약 + 일별 + 시간대별 + 페이지 랭킹 + 클릭 랭킹
 * ────────────────────────────────────────────────────── */

router.get("/admin/site-analytics", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const days = Math.max(1, Math.min(parseInt(String(req.query.days ?? "30"), 10) || 30, 365));
    const tz = String(req.query.tz ?? "Asia/Seoul");

    const since = sql.raw(`NOW() - INTERVAL '${days} days'`);

    // 1. 요약
    const summaryRows = await db.execute(sql`
      WITH base AS (
        SELECT * FROM site_events WHERE created_at >= ${since}
      ),
      sessions AS (
        SELECT session_id,
               MIN(created_at) AS started,
               MAX(created_at) AS ended,
               MAX(CASE WHEN event_type = 'session_end' OR event_type = 'page_leave'
                        THEN duration_ms ELSE NULL END) AS dur,
               COUNT(*) FILTER (WHERE event_type = 'page_view') AS pv_count
        FROM base GROUP BY session_id
      )
      SELECT
        (SELECT COUNT(*) FROM base WHERE event_type = 'page_view')::int AS total_page_views,
        (SELECT COUNT(DISTINCT visitor_id) FROM base)::int AS unique_visitors,
        (SELECT COUNT(DISTINCT session_id) FROM base)::int AS total_sessions,
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (ended - started))::numeric), 1), 0)::float AS avg_session_seconds,
        COALESCE(ROUND(100.0 * SUM(CASE WHEN pv_count <= 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1), 0)::float AS bounce_rate_pct,
        (SELECT COUNT(*) FROM base WHERE event_type = 'click')::int AS total_clicks
      FROM sessions
    `);
    const summary = (summaryRows as any).rows?.[0] ?? (summaryRows as any)[0] ?? {};

    // 2. 일별 (date in KST)
    const dailyRows = await db.execute(sql`
      SELECT
        TO_CHAR(date_trunc('day', created_at AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS day,
        COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(DISTINCT session_id)::int AS sessions
      FROM site_events
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1
    `);
    const daily = (dailyRows as any).rows ?? (dailyRows as any);

    // 3. 시간대별 (0~23)
    const hourlyRows = await db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM created_at AT TIME ZONE ${tz})::int AS hour,
        COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors
      FROM site_events
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1
    `);
    const hourly = (hourlyRows as any).rows ?? (hourlyRows as any);

    // 4. Top pages
    const pagesRows = await db.execute(sql`
      SELECT
        COALESCE(path, '(unknown)') AS path,
        COUNT(*)::int AS page_views,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COALESCE(ROUND(AVG(NULLIF(duration_ms, 0))::numeric / 1000, 1), 0)::float AS avg_seconds
      FROM site_events
      WHERE created_at >= ${since} AND event_type = 'page_view'
      GROUP BY path
      ORDER BY page_views DESC
      LIMIT 20
    `);
    const topPages = (pagesRows as any).rows ?? (pagesRows as any);

    // 5. Top click targets
    const clicksRows = await db.execute(sql`
      SELECT
        COALESCE(target_label, target, '(unknown)') AS label,
        COALESCE(target, '') AS target,
        COUNT(*)::int AS clicks,
        COUNT(DISTINCT visitor_id)::int AS unique_clickers
      FROM site_events
      WHERE created_at >= ${since} AND event_type = 'click'
      GROUP BY label, target
      ORDER BY clicks DESC
      LIMIT 20
    `);
    const topClicks = (clicksRows as any).rows ?? (clicksRows as any);

    // 6. Referrer 분포
    const refRows = await db.execute(sql`
      SELECT
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN '(직접 방문)'
          WHEN referrer ILIKE '%youtube.com%' OR referrer ILIKE '%youtu.be%' THEN 'YouTube'
          WHEN referrer ILIKE '%threads.com%' OR referrer ILIKE '%threads.net%' THEN 'Threads'
          WHEN referrer ILIKE '%instagram.com%' THEN 'Instagram'
          WHEN referrer ILIKE '%google.com%' OR referrer ILIKE '%google.co.%' THEN 'Google 검색'
          WHEN referrer ILIKE '%naver.com%' THEN 'Naver'
          WHEN referrer ILIKE '%kakao.com%' OR referrer ILIKE '%open.kakao%' THEN 'KakaoTalk'
          WHEN referrer ILIKE '%yunjadong%' THEN '윤자동 내부'
          ELSE COALESCE(NULLIF(referrer, ''), '(직접 방문)')
        END AS source,
        COUNT(*)::int AS visits
      FROM site_events
      WHERE created_at >= ${since} AND event_type = 'page_view'
      GROUP BY 1
      ORDER BY visits DESC
      LIMIT 15
    `);
    const referrers = (refRows as any).rows ?? (refRows as any);

    return res.json({
      since: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      days,
      tz,
      summary,
      daily,
      hourly,
      topPages,
      topClicks,
      referrers,
    });
  } catch (error) {
    req.log.error({ error }, "Error fetching site analytics");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
