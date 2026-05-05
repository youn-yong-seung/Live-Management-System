import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  channelSourcesTable,
  channelSourceStatsTable,
  liveFormConfigTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/adminAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/* ════════════════════════════════════════════════════════
   유입경로 마스터 관리
   ════════════════════════════════════════════════════════ */

// GET /channel-sources — 유입경로 목록
router.get("/channel-sources", async (_req: Request, res: Response) => {
  try {
    const sources = await db.select().from(channelSourcesTable)
      .where(eq(channelSourcesTable.isActive, true))
      .orderBy(asc(channelSourcesTable.sortOrder));
    res.json(sources);
  } catch (err) {
    logger.error({ err }, "GET /channel-sources failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /channel-sources — 유입경로 추가
router.post("/channel-sources", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: "이름은 필수입니다." });
    const maxSort = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` }).from(channelSourcesTable);
    const [source] = await db.insert(channelSourcesTable).values({
      name, category: category || "기타", sortOrder: (maxSort[0]?.max ?? 0) + 1,
    }).returning();
    res.status(201).json(source);
  } catch (err) {
    logger.error({ err }, "POST /channel-sources failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /channel-sources/:id — 이름/카테고리 수정
router.patch("/channel-sources/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, category } = req.body;
    const updates: { name?: string; category?: string | null } = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "변경할 필드가 없습니다." });
    }
    const [updated] = await db.update(channelSourcesTable)
      .set(updates)
      .where(eq(channelSourcesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PATCH /channel-sources/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /channel-sources/:id
router.delete("/channel-sources/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.update(channelSourcesTable).set({ isActive: false }).where(eq(channelSourcesTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /channel-sources/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ════════════════════════════════════════════════════════
   유입경로 성과 분석
   ════════════════════════════════════════════════════════ */

// GET /channel-source-stats — 전체 유입경로 성과
router.get("/channel-source-stats", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    // 전체 라이브의 유입경로 집계
    const stats = await db.execute(sql`
      SELECT ch AS source_name, COUNT(*)::int AS count
      FROM registrations, jsonb_array_elements_text(channel_source) AS ch
      WHERE channel_source IS NOT NULL
      GROUP BY ch
      ORDER BY count DESC
    `);
    res.json(stats.rows);
  } catch (err) {
    logger.error({ err }, "GET /channel-source-stats failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /channel-source-stats/:liveId — 라이브별 유입경로 성과
router.get("/channel-source-stats/:liveId", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.liveId), 10);
    const stats = await db.execute(sql`
      SELECT ch AS source_name, COUNT(*)::int AS count
      FROM registrations, jsonb_array_elements_text(channel_source) AS ch
      WHERE live_id = ${liveId} AND channel_source IS NOT NULL
      GROUP BY ch
      ORDER BY count DESC
    `);
    res.json(stats.rows);
  } catch (err) {
    logger.error({ err }, "GET /channel-source-stats/:liveId failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ════════════════════════════════════════════════════════
   라이브 폼 설정
   ════════════════════════════════════════════════════════ */

// GET /lives/:id/form-config
router.get("/lives/:id/form-config", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    const [config] = await db.select().from(liveFormConfigTable).where(eq(liveFormConfigTable.liveId, liveId));
    if (!config) return res.json(null);
    res.json(config);
  } catch (err) {
    logger.error({ err }, "GET /lives/:id/form-config failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /lives/:id/form-config
router.put("/lives/:id/form-config", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    const body = req.body;

    const [existing] = await db.select().from(liveFormConfigTable).where(eq(liveFormConfigTable.liveId, liveId));

    const data = {
      showEmail: body.showEmail ?? true,
      showIndustry: body.showIndustry ?? true,
      showChannelSource: body.showChannelSource ?? true,
      showSkillLevel: body.showSkillLevel ?? false,
      showMessage: body.showMessage ?? true,
      showMarketingConsent: body.showMarketingConsent ?? true,
      industryOptions: body.industryOptions ?? null,
      channelSourceOptions: body.channelSourceOptions ?? null,
      aiRecommendedQuestions: body.aiRecommendedQuestions ?? null,
      thankYouTitle: body.thankYouTitle ?? null,
      thankYouBody: body.thankYouBody ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await db.update(liveFormConfigTable).set(data).where(eq(liveFormConfigTable.liveId, liveId)).returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(liveFormConfigTable).values({ liveId, ...data }).returning();
      res.status(201).json(created);
    }
  } catch (err) {
    logger.error({ err }, "PUT /lives/:id/form-config failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ════════════════════════════════════════════════════════
   AI 추천 질문 생성
   ════════════════════════════════════════════════════════ */

router.post("/lives/:id/ai-recommend-questions", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    const [live] = await db.select().from(livesTable).where(eq(livesTable.id, liveId));
    if (!live) return res.status(404).json({ error: "Live not found" });

    // AI 추천 로직 — 라이브 제목/설명 기반으로 맞춤 질문 생성
    const recommendations = generateRecommendedQuestions(live.title, live.description || "");

    res.json({ recommendations });
  } catch (err) {
    logger.error({ err }, "POST /lives/:id/ai-recommend-questions failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── AI 추천 질문 생성 로직 ──────────────────────────── */

function generateRecommendedQuestions(title: string, description: string): Array<{
  question: string; questionType: string; options?: string[]; purpose: string;
}> {
  const t = (title + " " + description).toLowerCase();
  const questions: Array<{ question: string; questionType: string; options?: string[]; purpose: string }> = [];

  // 기본 질문: 현재 직업/직군
  questions.push({
    question: "현재 직업/직군",
    questionType: "radio",
    options: ["자영업자", "1인 창업가 / 사업자", "직장인", "프리랜서", "대학생 / 대학원생", "기타"],
    purpose: "참석자 직군 분포 파악 → 콘텐츠 난이도/사례 조절",
  });

  // AI/자동화 관련
  if (t.includes("ai") || t.includes("자동화") || t.includes("클로드") || t.includes("gpt") || t.includes("코드") || t.includes("바이브")) {
    questions.push({
      question: "AI 도구 사용 경험이 있으신가요?",
      questionType: "radio",
      options: ["거의 안 써봤어요", "ChatGPT 정도는 써봤어요", "여러 AI 도구를 쓰고 있어요"],
      purpose: "참석자 AI 숙련도 파악 → 설명 수준 조절",
    });
    questions.push({
      question: "사용 중인 컴퓨터",
      questionType: "radio",
      options: ["Windows", "Mac", "둘 다 있음"],
      purpose: "설치/실습 가이드 OS별 대응 준비",
    });
    questions.push({
      question: "AI 도구에 매달 얼마 정도 쓰고 계시거나, 쓸 의향이 있으신가요?",
      questionType: "radio",
      options: ["무료만 쓰고 있어요", "월 2만원 이하", "월 2~5만원", "월 5~10만원", "월 10만원 이상"],
      purpose: "유료 툴 추천 가능 여부 & 유료 강의 전환 가능성 파악",
    });
  }

  // 마케팅/고객관리 관련
  if (t.includes("마케팅") || t.includes("고객") || t.includes("crm") || t.includes("병원") || t.includes("자영")) {
    questions.push({
      question: "현재 고객관리를 어떻게 하고 계시나요?",
      questionType: "radio",
      options: ["따로 안 하고 있어요", "엑셀·구글시트에 정리", "카톡·메모장에 기록", "CRM 툴 사용 중 (채널톡, 허브스팟 등)", "기타"],
      purpose: "현재 고객관리 수준 파악 → 맞춤 사례 제시",
    });
  }

  // 병원/의료 특화
  if (t.includes("병원") || t.includes("의원") || t.includes("의료") || t.includes("헬스케어")) {
    questions.push({
      question: "업종",
      questionType: "radio",
      options: ["병원·의원", "한의원", "치과", "피부과·성형외과", "안과·이비인후과", "동물병원", "약국", "기타 의료·헬스케어", "뷰티·에스테틱", "기타"],
      purpose: "참석자 업종 분포 파악 → 업종별 사례 준비",
    });
  }

  // 노션 관련
  if (t.includes("노션") || t.includes("notion")) {
    questions.push({
      question: "노션 사용 경험이 있으신가요?",
      questionType: "radio",
      options: ["처음 들어봐요", "설치만 해봤어요", "간단하게 써보고 있어요", "꽤 익숙해요"],
      purpose: "노션 숙련도 파악 → 설명 수준 조절",
    });
  }

  // 콘텐츠/카드뉴스 관련
  if (t.includes("카드뉴스") || t.includes("콘텐츠") || t.includes("sns") || t.includes("마케터")) {
    questions.push({
      question: "어떤 상황에서 오시나요?",
      questionType: "radio",
      options: ["SNS 콘텐츠 제작 루틴을 줄이고 싶은 마케터", "카드뉴스를 자주 만드는 크리에이터", "디자인 없이 콘텐츠 만들고 싶은 1인 창업가", "업무용 카드뉴스가 필요한 직장인", "기타"],
      purpose: "참석 동기 파악 → 사례 우선순위 결정",
    });
  }

  // 취업/커리어/채용 관련
  if (t.includes("취업") || t.includes("채용") || t.includes("면접") || t.includes("커리어") || t.includes("ceo") || t.includes("이직") || t.includes("퇴사")) {
    questions.push({
      question: "지금 어떤 상황이세요?",
      questionType: "radio",
      options: ["학생", "취준생", "사회초년생(1~3년차)", "이직 고민 중", "퇴사 후 쉬는 중", "프리랜서·1인기업", "직접 입력"],
      purpose: "참석자 현재 상황 파악 → 맞춤 사례/조언 준비",
    });
    questions.push({
      question: "지금 가장 큰 고민은?",
      questionType: "radio",
      options: ["내가 뭘 하고 싶은지 모르겠다", "지금 하는 일이 맞는지 모르겠다", "이직·퇴사 타이밍을 모르겠다", "커리어 전환이 두렵다", "AI 시대에 뭘 준비해야 할지 모르겠다", "직접 입력"],
      purpose: "핵심 고민 파악 → 라이브 중 집중 답변 주제 선정",
    });
  }

  // 사업/창업 관련
  if (t.includes("사업") || t.includes("창업") || t.includes("매출") || t.includes("수익")) {
    questions.push({
      question: "현재 사업 단계는 어디인가요?",
      questionType: "radio",
      options: ["아직 준비 중이에요", "막 시작했어요 (6개월 미만)", "운영 중이에요 (6개월~2년)", "안정기에 접어들었어요 (2년 이상)"],
      purpose: "사업 단계별 맞춤 조언 준비",
    });
  }

  // 공통: 기대 내용
  questions.push({
    question: "이번 라이브에서 가장 기대하는 내용",
    questionType: "radio",
    options: ["실전에 바로 적용할 수 있는 팁", "기초부터 차근차근 배우고 싶어요", "다른 사람들의 활용 사례가 궁금해요", "전반적으로 다 궁금해요"],
    purpose: "참석자 기대치 파악 → 강의 중점 조절",
  });

  // 공통: 사전 질문
  questions.push({
    question: "강사님께 미리 질문 남기기 (선택)",
    questionType: "textarea",
    purpose: "사전 질문 수집 → 라이브 중 답변 준비",
  });

  return questions;
}

/* ════════════════════════════════════════════════════════
   비즈니스 대시보드 — 한방에 분석 데이터 반환
   ════════════════════════════════════════════════════════ */

router.get("/admin/dashboard", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    // 활성 라이브 = scheduled_at 있는 진짜 라이브 (다시보기 갤러리 더미 제외)
    const activeLivesCte = sql`
      WITH active_lives AS (
        SELECT id, title, scheduled_at, status
        FROM lives
        WHERE scheduled_at IS NOT NULL
      ),
      norm AS (
        SELECT
          r.id, r.live_id, r.name, r.email, r.industry, r.created_at,
          r.channel_source,
          regexp_replace(r.phone, '[^0-9]', '', 'g') AS phone_n,
          r.phone AS phone_raw
        FROM registrations r
        INNER JOIN active_lives al ON al.id = r.live_id
        WHERE r.phone IS NOT NULL
      ),
      member_first_live AS (
        SELECT phone_n, MIN(live_id) AS first_live_id, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen, COUNT(*) AS reg_count
        FROM norm
        GROUP BY phone_n
      )`;

    /* ---- 1. Overview KPIs ---- */
    const overviewQ = await db.execute(sql`
      ${activeLivesCte},
      kpi AS (
        SELECT
          (SELECT COUNT(DISTINCT phone_n) FROM norm) AS total_members,
          (SELECT COUNT(*) FROM norm) AS total_registrations,
          (SELECT COUNT(*) FROM active_lives) AS total_lives,
          (SELECT COUNT(*) FILTER (WHERE reg_count >= 2) FROM member_first_live) AS returning_members,
          (SELECT COUNT(*) FILTER (WHERE reg_count >= 3) FROM member_first_live) AS super_fans,
          (SELECT COUNT(DISTINCT phone_n) FROM norm WHERE created_at >= NOW() - INTERVAL '7 days') AS members_last_7d
      )
      SELECT * FROM kpi
    `);

    /* ---- 2. Channel Performance ---- */
    const channelQ = await db.execute(sql`
      ${activeLivesCte},
      flat AS (
        SELECT n.phone_n, ch AS source_name
        FROM norm n, jsonb_array_elements_text(n.channel_source) AS ch
        WHERE n.channel_source IS NOT NULL
      )
      SELECT
        f.source_name,
        COALESCE(cs.category, '기타') AS category,
        COUNT(DISTINCT f.phone_n)::int AS unique_members,
        COUNT(*)::int AS total_registrations,
        COUNT(DISTINCT f.phone_n) FILTER (WHERE m.reg_count >= 2)::int AS returning_members
      FROM flat f
      JOIN member_first_live m ON m.phone_n = f.phone_n
      LEFT JOIN channel_sources cs ON cs.name = f.source_name
      GROUP BY f.source_name, cs.category
      ORDER BY total_registrations DESC
    `);

    /* ---- 3. Category Performance (groups) ---- */
    const categoryQ = await db.execute(sql`
      ${activeLivesCte},
      flat AS (
        SELECT n.phone_n, ch AS source_name
        FROM norm n, jsonb_array_elements_text(n.channel_source) AS ch
        WHERE n.channel_source IS NOT NULL
      )
      SELECT
        COALESCE(cs.category, '기타') AS category,
        COUNT(DISTINCT f.phone_n)::int AS unique_members,
        COUNT(*)::int AS total_registrations
      FROM flat f
      LEFT JOIN channel_sources cs ON cs.name = f.source_name
      GROUP BY cs.category
      ORDER BY total_registrations DESC
    `);

    /* ---- 4. Live Performance (신규 vs 재참여) ---- */
    const liveQ = await db.execute(sql`
      ${activeLivesCte}
      SELECT
        al.id AS live_id,
        al.title,
        al.scheduled_at,
        al.status,
        COUNT(n.id)::int AS total_apps,
        COUNT(*) FILTER (WHERE m.first_live_id = al.id)::int AS new_signups,
        COUNT(*) FILTER (WHERE m.first_live_id <> al.id)::int AS returning
      FROM active_lives al
      LEFT JOIN norm n ON n.live_id = al.id
      LEFT JOIN member_first_live m ON m.phone_n = n.phone_n
      GROUP BY al.id, al.title, al.scheduled_at, al.status
      ORDER BY al.scheduled_at ASC NULLS LAST
    `);

    /* ---- 5. Industry Distribution ---- */
    const industryQ = await db.execute(sql`
      ${activeLivesCte}
      SELECT industry, COUNT(DISTINCT phone_n)::int AS count
      FROM norm
      WHERE industry IS NOT NULL AND industry <> '' AND industry <> '직접 입력'
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 12
    `);

    /* ---- 6. Super Fans (3회 이상 신청) ---- */
    const superFansQ = await db.execute(sql`
      ${activeLivesCte},
      ranked AS (
        SELECT
          n.phone_n,
          (array_agg(n.name ORDER BY n.created_at DESC))[1] AS name,
          (array_agg(n.email ORDER BY n.created_at DESC))[1] AS email,
          (array_agg(n.phone_raw ORDER BY n.created_at DESC))[1] AS phone,
          (array_agg(n.industry ORDER BY n.created_at DESC) FILTER (WHERE n.industry IS NOT NULL))[1] AS industry,
          COUNT(*)::int AS registration_count,
          MIN(n.created_at) AS first_seen,
          MAX(n.created_at) AS last_seen,
          array_agg(DISTINCT n.live_id ORDER BY n.live_id) AS live_ids
        FROM norm n
        GROUP BY n.phone_n
        HAVING COUNT(*) >= 3
      )
      SELECT * FROM ranked ORDER BY registration_count DESC, last_seen DESC LIMIT 50
    `);

    /* ---- 7. Hourly Apply Distribution (KST = UTC + 9) ---- */
    const hourlyQ = await db.execute(sql`
      ${activeLivesCte}
      SELECT
        ((EXTRACT(HOUR FROM created_at)::int + 9) % 24) AS hour,
        COUNT(*)::int AS count
      FROM norm
      GROUP BY hour
      ORDER BY hour
    `);

    /* ---- 8. Weekly Acquisition Trend (라이브 단위, 최근 8개) ---- */
    const trendQ = await db.execute(sql`
      ${activeLivesCte}
      SELECT
        al.id AS live_id,
        al.title,
        al.scheduled_at,
        COUNT(*) FILTER (WHERE m.first_live_id = al.id)::int AS new_signups,
        COUNT(*) FILTER (WHERE m.first_live_id <> al.id)::int AS returning
      FROM active_lives al
      LEFT JOIN norm n ON n.live_id = al.id
      LEFT JOIN member_first_live m ON m.phone_n = n.phone_n
      GROUP BY al.id, al.title, al.scheduled_at
      ORDER BY al.scheduled_at DESC NULLS LAST
      LIMIT 8
    `);

    res.json({
      overview: overviewQ.rows[0] ?? null,
      channelPerformance: channelQ.rows,
      categoryPerformance: categoryQ.rows,
      livePerformance: liveQ.rows,
      industryDistribution: industryQ.rows,
      superFans: superFansQ.rows,
      hourlyDistribution: hourlyQ.rows,
      weeklyTrend: trendQ.rows.reverse(), // 시간 오름차순으로
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "GET /admin/dashboard failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
