import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  livesTable,
  registrationsTable,
  liveCustomQuestionsTable,
  liveFormConfigTable,
  reviewsTable,
  afterpartyGlobalConfigTable,
  afterpartyEventsTable,
  insertLiveSchema,
  insertRegistrationSchema,
  insertReviewSchema,
} from "@workspace/db";
import { eq, count, sql, and, gte, lte, asc } from "drizzle-orm";
import {
  GetLivesQueryParams,
  CreateLiveBody,
  UpdateLiveBody,
  GetLiveParams,
  UpdateLiveParams,
  DeleteLiveParams,
  GetRegistrationsParams,
  CreateRegistrationParams,
  CreateRegistrationBody,
} from "@workspace/api-zod";
import { fireRegistrationTrigger } from "./notifications";
import { requireAdminAuth } from "../middleware/adminAuth";
const router: IRouter = Router();

router.get("/lives", async (req: Request, res: Response) => {
  try {
    const query = GetLivesQueryParams.parse(req.query);

    const conditions = [];
    if (query.status) {
      conditions.push(eq(livesTable.status, query.status));
    }

    const lives = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        tags: livesTable.tags,
        afterpartyKakaoUrl: livesTable.afterpartyKakaoUrl,
        afterpartyMaterials: livesTable.afterpartyMaterials,
        afterpartyProducts: livesTable.afterpartyProducts,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(livesTable.id)
      .orderBy(sql`${livesTable.scheduledAt} DESC NULLS LAST, ${livesTable.createdAt} DESC`);

    res.json(lives);
  } catch (error) {
    req.log.error({ error }, "Error fetching lives");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lives", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const body = CreateLiveBody.parse(req.body);
    const rawBody = req.body as Record<string, unknown>;
    const insertData = insertLiveSchema.parse({
      title: body.title,
      description: body.description ?? null,
      youtubeUrl: body.youtubeUrl ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.status,
      thumbnailUrl: body.thumbnailUrl ?? null,
      tags: Array.isArray(rawBody.tags) ? rawBody.tags : null,
      afterpartyKakaoUrl: typeof rawBody.afterpartyKakaoUrl === "string" && rawBody.afterpartyKakaoUrl.trim() !== ""
        ? rawBody.afterpartyKakaoUrl.trim()
        : null,
      afterpartyMaterials: Array.isArray(rawBody.afterpartyMaterials)
        ? (rawBody.afterpartyMaterials as Array<{ title?: unknown; url?: unknown }>)
            .map((m) => ({ title: String(m?.title ?? "").trim(), url: String(m?.url ?? "").trim() }))
            .filter((m) => m.title !== "" && m.url !== "")
        : null,
      afterpartyProducts: Array.isArray(rawBody.afterpartyProducts)
        ? (rawBody.afterpartyProducts as Array<{ title?: unknown; url?: unknown }>)
            .map((m) => ({ title: String(m?.title ?? "").trim(), url: String(m?.url ?? "").trim() }))
            .filter((m) => m.title !== "" && m.url !== "")
        : null,
    });

    const [live] = await db.insert(livesTable).values(insertData).returning();

    const [result] = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        tags: livesTable.tags,
        afterpartyKakaoUrl: livesTable.afterpartyKakaoUrl,
        afterpartyMaterials: livesTable.afterpartyMaterials,
        afterpartyProducts: livesTable.afterpartyProducts,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(eq(livesTable.id, live.id))
      .groupBy(livesTable.id);

    res.status(201).json(result);
  } catch (error) {
    req.log.error({ error }, "Error creating live");
    res.status(400).json({ error: "Bad request" });
  }
});

/* ── OG meta page for social sharing ─────────────── */
router.get("/og/lives/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [live] = await db.select().from(livesTable).where(eq(livesTable.id, id));
    if (!live) return res.status(404).send("Not found");

    const ytMatch = live.youtubeUrl?.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([^#&?]{11})/);
    const thumb = ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : "";
    const siteUrl = `https://yunjadong-live-class.vercel.app/lives/${id}/register`;
    const title = `[윤자동 클래스] ${live.title}`;
    const desc = live.description || "무료 라이브 특강에 참가 신청하세요!";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
      <meta property="og:description" content="${desc.replace(/"/g, "&quot;")}" />
      <meta property="og:image" content="${thumb}" />
      <meta property="og:url" content="${siteUrl}" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}" />
      <meta name="twitter:description" content="${desc.replace(/"/g, "&quot;")}" />
      <meta name="twitter:image" content="${thumb}" />
      <meta http-equiv="refresh" content="0;url=${siteUrl}" />
      <title>${title.replace(/</g, "&lt;")}</title>
    </head><body><p>Redirecting to <a href="${siteUrl}">${siteUrl}</a>...</p></body></html>`);
  } catch (err) {
    req.log.error({ err }, "GET /og/lives/:id failed");
    res.status(500).send("Error");
  }
});

router.get("/lives/:id", async (req: Request, res: Response) => {
  try {
    const { id } = GetLiveParams.parse({ id: parseInt(String(req.params.id), 10) });

    const [live] = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        tags: livesTable.tags,
        afterpartyKakaoUrl: livesTable.afterpartyKakaoUrl,
        afterpartyMaterials: livesTable.afterpartyMaterials,
        afterpartyProducts: livesTable.afterpartyProducts,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(eq(livesTable.id, id))
      .groupBy(livesTable.id);

    if (!live) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    res.json(live);
  } catch (error) {
    req.log.error({ error }, "Error fetching live");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lives/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = UpdateLiveParams.parse({ id: parseInt(String(req.params.id), 10) });
    const body = UpdateLiveBody.parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description ?? null;
    if (body.youtubeUrl !== undefined) updateData.youtubeUrl = body.youtubeUrl ?? null;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl ?? null;
    const rawBody = req.body as Record<string, unknown>;
    if (rawBody.tags !== undefined) updateData.tags = Array.isArray(rawBody.tags) ? rawBody.tags : null;
    if (rawBody.afterpartyKakaoUrl !== undefined) {
      updateData.afterpartyKakaoUrl =
        typeof rawBody.afterpartyKakaoUrl === "string" && rawBody.afterpartyKakaoUrl.trim() !== ""
          ? rawBody.afterpartyKakaoUrl.trim()
          : null;
    }
    if (rawBody.afterpartyMaterials !== undefined) {
      updateData.afterpartyMaterials = Array.isArray(rawBody.afterpartyMaterials)
        ? (rawBody.afterpartyMaterials as Array<{ title?: unknown; url?: unknown }>)
            .map((m) => ({ title: String(m?.title ?? "").trim(), url: String(m?.url ?? "").trim() }))
            .filter((m) => m.title !== "" && m.url !== "")
        : null;
    }
    if (rawBody.afterpartyProducts !== undefined) {
      updateData.afterpartyProducts = Array.isArray(rawBody.afterpartyProducts)
        ? (rawBody.afterpartyProducts as Array<{ title?: unknown; url?: unknown }>)
            .map((m) => ({ title: String(m?.title ?? "").trim(), url: String(m?.url ?? "").trim() }))
            .filter((m) => m.title !== "" && m.url !== "")
        : null;
    }

    const [updated] = await db.update(livesTable).set(updateData).where(eq(livesTable.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    const [result] = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        tags: livesTable.tags,
        afterpartyKakaoUrl: livesTable.afterpartyKakaoUrl,
        afterpartyMaterials: livesTable.afterpartyMaterials,
        afterpartyProducts: livesTable.afterpartyProducts,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(eq(livesTable.id, id))
      .groupBy(livesTable.id);

    res.json(result);
  } catch (error) {
    req.log.error({ error }, "Error updating live");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/lives/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = DeleteLiveParams.parse({ id: parseInt(String(req.params.id), 10) });

    const [deleted] = await db.delete(livesTable).where(eq(livesTable.id, id)).returning();

    if (!deleted) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Error deleting live");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /lives/:liveId/registrations (admin) ─────── */

router.get("/lives/:liveId/registrations", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { liveId } = GetRegistrationsParams.parse({ liveId: parseInt(String(req.params.liveId), 10) });

    const [live] = await db.select({ id: livesTable.id }).from(livesTable).where(eq(livesTable.id, liveId));

    if (!live) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    const registrations = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.liveId, liveId))
      .orderBy(sql`${registrationsTable.createdAt} DESC`);

    res.json(registrations);
  } catch (error) {
    req.log.error({ error }, "Error fetching registrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /lives/:liveId/custom-questions (public) ─── */

router.get("/lives/:liveId/custom-questions", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.liveId), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid liveId" });

    const questions = await db
      .select()
      .from(liveCustomQuestionsTable)
      .where(eq(liveCustomQuestionsTable.liveId, liveId))
      .orderBy(asc(liveCustomQuestionsTable.displayOrder));

    return res.json(questions);
  } catch (error) {
    req.log.error({ error }, "Error fetching custom questions");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PUT /lives/:liveId/custom-questions (admin) ─── */

type CustomQuestionInput = {
  question: string;
  questionType: "text" | "textarea" | "radio" | "checkbox" | "skill_level";
  options?: string[] | null;
  displayOrder?: number | null;
};

function parseCustomQuestions(body: unknown): CustomQuestionInput[] {
  if (!Array.isArray(body)) throw new Error("Expected an array of questions");
  const validTypes = ["text", "textarea", "radio", "checkbox", "skill_level"] as const;
  return body.map((q: unknown, i: number) => {
    if (typeof q !== "object" || q === null) throw new Error(`Question ${i} is not an object`);
    const obj = q as Record<string, unknown>;
    if (typeof obj.question !== "string" || obj.question.trim().length === 0) throw new Error(`Question ${i} missing text`);
    const questionType = (obj.questionType as string) ?? "text";
    if (!validTypes.includes(questionType as typeof validTypes[number])) throw new Error(`Question ${i} has invalid questionType`);
    const options = Array.isArray(obj.options) ? (obj.options as string[]).filter((o) => typeof o === "string") : null;
    if ((questionType === "radio" || questionType === "checkbox") && (!options || options.length === 0)) {
      throw new Error(`Question ${i} (type=${questionType}) requires at least one option`);
    }
    return {
      question: obj.question.trim(),
      questionType: questionType as CustomQuestionInput["questionType"],
      options,
      displayOrder: typeof obj.displayOrder === "number" ? Math.floor(obj.displayOrder) : i,
    };
  });
}

router.put("/lives/:liveId/custom-questions", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.liveId), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid liveId" });

    let questions: CustomQuestionInput[];
    try { questions = parseCustomQuestions(req.body); }
    catch (err) { return res.status(400).json({ error: (err as Error).message }); }

    if (questions.length > 3) {
      return res.status(400).json({ error: "맞춤 질문은 최대 3개까지 설정할 수 있습니다." });
    }

    const [live] = await db.select({ id: livesTable.id }).from(livesTable).where(eq(livesTable.id, liveId));
    if (!live) return res.status(404).json({ error: "Live not found" });

    await db.delete(liveCustomQuestionsTable).where(eq(liveCustomQuestionsTable.liveId, liveId));

    if (questions.length > 0) {
      await db.insert(liveCustomQuestionsTable).values(
        questions.map((q: { question: string; questionType: string; options?: string[] | null; displayOrder?: number | null }, i: number) => ({
          liveId,
          question: q.question,
          questionType: q.questionType,
          options: q.options ?? null,
          displayOrder: q.displayOrder ?? i,
        }))
      );
    }

    const saved = await db
      .select()
      .from(liveCustomQuestionsTable)
      .where(eq(liveCustomQuestionsTable.liveId, liveId))
      .orderBy(asc(liveCustomQuestionsTable.displayOrder));

    return res.json(saved);
  } catch (error) {
    req.log.error({ error }, "Error saving custom questions");
    return res.status(400).json({ error: "Bad request" });
  }
});

/* ── GET /lives/:liveId/registration-analytics (admin) */

router.get("/lives/:liveId/registration-analytics", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.liveId), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid liveId" });

    // Check live exists
    const [live] = await db.select({ id: livesTable.id }).from(livesTable).where(eq(livesTable.id, liveId));
    if (!live) return res.status(404).json({ error: "Live not found" });

    // Industry breakdown
    const industryRows = await db.execute(sql`
      SELECT industry, COUNT(*)::int AS count
      FROM registrations
      WHERE live_id = ${liveId} AND industry IS NOT NULL AND industry != ''
      GROUP BY industry
      ORDER BY count DESC
    `);

    // Channel source breakdown (unnest jsonb array)
    const channelRows = await db.execute(sql`
      SELECT ch AS channel, COUNT(*)::int AS count
      FROM registrations, jsonb_array_elements_text(channel_source) AS ch
      WHERE live_id = ${liveId} AND channel_source IS NOT NULL
      GROUP BY ch
      ORDER BY count DESC
    `);

    // Skill level breakdown
    const skillRows = await db.execute(sql`
      SELECT skill_level, COUNT(*)::int AS count
      FROM registrations
      WHERE live_id = ${liveId} AND skill_level IS NOT NULL AND skill_level != ''
      GROUP BY skill_level
      ORDER BY count DESC
    `);

    // Daily signups (last 30 days)
    const dailyRows = await db.execute(sql`
      SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') AS date, COUNT(*)::int AS count
      FROM registrations
      WHERE live_id = ${liveId}
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul')
      ORDER BY date ASC
    `);

    // Custom questions + answers summary
    const questions = await db
      .select()
      .from(liveCustomQuestionsTable)
      .where(eq(liveCustomQuestionsTable.liveId, liveId))
      .orderBy(asc(liveCustomQuestionsTable.displayOrder));

    const regs = await db
      .select({ customAnswers: registrationsTable.customAnswers })
      .from(registrationsTable)
      .where(eq(registrationsTable.liveId, liveId));

    const customAnswersSummary = questions.map((q) => {
      const tally: Record<string, number> = {};
      for (const reg of regs) {
        const ans = reg.customAnswers?.[String(q.id)];
        if (!ans) continue;
        const vals = Array.isArray(ans) ? ans : [ans];
        for (const v of vals) {
          const key = String(v);
          tally[key] = (tally[key] ?? 0) + 1;
        }
      }
      return { questionId: q.id, question: q.question, questionType: q.questionType, answers: tally };
    });

    return res.json({
      industryBreakdown: industryRows.rows,
      channelBreakdown: channelRows.rows,
      skillLevelBreakdown: skillRows.rows,
      dailySignups: dailyRows.rows,
      customAnswersSummary,
    });
  } catch (error) {
    req.log.error({ error }, "Error fetching registration analytics");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /lives/:liveId/public-dashboard (public, no PII) ── */

router.get("/lives/:liveId/public-dashboard", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.liveId), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid liveId" });

    const [live] = await db.select({
      id: livesTable.id,
      title: livesTable.title,
      scheduledAt: livesTable.scheduledAt,
      status: livesTable.status,
    }).from(livesTable).where(eq(livesTable.id, liveId));
    if (!live) return res.status(404).json({ error: "Live not found" });

    // 라이브의 폼 빌더 설정 (AI 추천 질문 라벨)
    const [fc] = await db.select({
      aiRecommendedQuestions: liveFormConfigTable.aiRecommendedQuestions,
    }).from(liveFormConfigTable).where(eq(liveFormConfigTable.liveId, liveId));
    const aiQuestions: Array<{ question: string; questionType: string; options?: string[] | null }> = (fc?.aiRecommendedQuestions as any) ?? [];

    // 라이브의 DB 커스텀 질문
    const customQuestions = await db
      .select()
      .from(liveCustomQuestionsTable)
      .where(eq(liveCustomQuestionsTable.liveId, liveId))
      .orderBy(asc(liveCustomQuestionsTable.displayOrder));

    // PII 제외하고 집계용 데이터만 가져옴 (이름/연락처/이메일은 select 자체를 안 함)
    const regs = await db
      .select({
        industry: registrationsTable.industry,
        channelSource: registrationsTable.channelSource,
        skillLevel: registrationsTable.skillLevel,
        message: registrationsTable.message,
        customAnswers: registrationsTable.customAnswers,
        createdAt: registrationsTable.createdAt,
      })
      .from(registrationsTable)
      .where(eq(registrationsTable.liveId, liveId));

    const total = regs.length;

    // KST 기준 오늘
    const nowKst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const todayKey = nowKst.toISOString().slice(0, 10);
    const todayCount = regs.filter((r) => {
      if (!r.createdAt) return false;
      const d = new Date(new Date(r.createdAt as unknown as string).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
      return d.toISOString().slice(0, 10) === todayKey;
    }).length;

    // 일별 신청 추이 (최근 14일)
    const dayMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(nowKst.getTime() - i * 24 * 60 * 60 * 1000);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of regs) {
      if (!r.createdAt) continue;
      const d = new Date(new Date(r.createdAt as unknown as string).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
      const key = d.toISOString().slice(0, 10);
      if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
    const dailySignups = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

    // 분포 헬퍼
    const tally = (vals: Array<string | null | undefined>) => {
      const m = new Map<string, number>();
      for (const v of vals) {
        if (!v) continue;
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      return Array.from(m.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    };

    const industryBreakdown = tally(regs.map((r) => r.industry));
    const skillLevelBreakdown = tally(regs.map((r) => r.skillLevel));

    // channel은 array
    const channelFlat: string[] = [];
    for (const r of regs) {
      if (Array.isArray(r.channelSource)) channelFlat.push(...r.channelSource.filter(Boolean));
    }
    const channelBreakdown = tally(channelFlat);

    // 질문 정의 통합 (DB 커스텀 + AI 추천)
    type QDef = {
      key: string;
      question: string;
      questionType: string;
      options?: string[] | null;
    };
    const questionDefs: QDef[] = [
      ...customQuestions.map((q) => ({
        key: String(q.id),
        question: q.question,
        questionType: q.questionType,
        options: q.options ?? null,
      })),
      ...aiQuestions.map((q, qi) => ({
        key: `ai_${qi}`,
        question: q.question,
        questionType: q.questionType ?? "radio",
        options: q.options ?? null,
      })),
    ];

    const questions = questionDefs.map((q) => {
      const isFreeText = q.questionType === "text" || q.questionType === "textarea";
      let answeredCount = 0;
      const valTally = new Map<string, number>();
      for (const r of regs) {
        const ans = r.customAnswers?.[q.key];
        if (ans === undefined || ans === null) continue;
        const arr = Array.isArray(ans) ? ans : [ans];
        const has = arr.some((v) => String(v).trim() !== "");
        if (!has) continue;
        answeredCount += 1;
        if (!isFreeText) {
          for (const v of arr) {
            const key = String(v).trim();
            if (!key) continue;
            valTally.set(key, (valTally.get(key) ?? 0) + 1);
          }
        }
      }
      const breakdown = isFreeText
        ? null
        : Array.from(valTally.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);
      return {
        key: q.key,
        question: q.question,
        questionType: q.questionType,
        options: q.options ?? null,
        answeredCount,
        breakdown,
      };
    });

    // 익명 respondents — PII 없음. 클라이언트 크로스 필터링용.
    // 자유 입력 답변(text/textarea)은 포함하지 않음 (PII 위험)
    const freeTextKeys = new Set(
      questionDefs.filter((q) => q.questionType === "text" || q.questionType === "textarea").map((q) => q.key)
    );
    const respondents = regs.map((r) => {
      const safeAnswers: Record<string, string | string[]> = {};
      if (r.customAnswers) {
        for (const [k, v] of Object.entries(r.customAnswers)) {
          if (freeTextKeys.has(k)) continue; // 자유 입력은 제외
          if (k === "marketing_consent") continue; // 동의 항목은 분포에 의미 없음
          if (v === null || v === undefined) continue;
          safeAnswers[k] = v;
        }
      }
      return {
        industry: r.industry ?? null,
        channels: r.channelSource ?? null,
        skillLevel: r.skillLevel ?? null,
        answers: safeAnswers,
      };
    });

    // 사전 질문(자유 입력)도 라이브 중 시청자에게 보여줄 수 있도록 포함.
    // 단, 익명 처리되어 누가 작성했는지는 식별 불가.
    const messages = regs
      .map((r) => (r.message ?? "").trim())
      .filter((m) => m.length > 0);

    return res.json({
      live: {
        id: live.id,
        title: live.title,
        scheduledAt: live.scheduledAt,
        status: live.status,
      },
      total,
      todayCount,
      dailySignups,
      industryBreakdown,
      channelBreakdown,
      skillLevelBreakdown,
      questions,
      messages,
      respondents,
    });
  } catch (error) {
    req.log.error({ error }, "Error fetching public dashboard");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /lives/:liveId/registrations (public) ───── */

router.post("/lives/:liveId/registrations", async (req: Request, res: Response) => {
  try {
    const { liveId } = CreateRegistrationParams.parse({ liveId: parseInt(String(req.params.liveId), 10) });
    const body = CreateRegistrationBody.parse(req.body);

    const [live] = await db.select().from(livesTable).where(eq(livesTable.id, liveId));

    if (!live) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    const insertData = insertRegistrationSchema.parse({
      liveId,
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      message: body.message ?? null,
      industry: body.industry ?? null,
      channelSource: Array.isArray(body.channelSource) ? body.channelSource : null,
      skillLevel: body.skillLevel ?? null,
      customAnswers: body.customAnswers ?? null,
    });

    const [registration] = await db.insert(registrationsTable).values(insertData).returning();

    fireRegistrationTrigger(liveId, { phone: body.phone, name: body.name }).catch((err) => {
      req.log.error({ err }, "Failed to fire registration trigger");
    });

    res.status(201).json(registration);
  } catch (error) {
    req.log.error({ error }, "Error creating registration");
    res.status(400).json({ error: "Bad request" });
  }
});

/* ── GET /lives/:liveId/reviews (public) ──────────── */

router.get("/lives/:liveId/reviews", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.liveId), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid liveId" });

    const [live] = await db.select({ id: livesTable.id }).from(livesTable).where(eq(livesTable.id, liveId));
    if (!live) return res.status(404).json({ error: "Live not found" });

    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.liveId, liveId))
      .orderBy(sql`${reviewsTable.createdAt} DESC`);

    return res.json(reviews);
  } catch (error) {
    req.log.error({ error }, "Error fetching reviews");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /lives/:liveId/reviews (public) ─────────── */

router.post("/lives/:liveId/reviews", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.liveId), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid liveId" });

    const [live] = await db.select({ id: livesTable.id, status: livesTable.status }).from(livesTable).where(eq(livesTable.id, liveId));
    if (!live) return res.status(404).json({ error: "Live not found" });
    if (live.status !== "ended" && live.status !== "live") return res.status(400).json({ error: "진행 중이거나 종료된 라이브에만 후기를 남길 수 있습니다." });

    const insertData = insertReviewSchema.parse({
      liveId,
      name: req.body.name,
      rating: Number(req.body.rating),
      content: req.body.content,
    });

    const [review] = await db.insert(reviewsTable).values(insertData).returning();
    return res.status(201).json(review);
  } catch (error) {
    req.log.error({ error }, "Error creating review");
    return res.status(400).json({ error: "Bad request" });
  }
});

/* ── 후속 후기 페이지 ─────────────────────────────── */

router.get("/lives/:id/after", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [live] = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        scheduledAt: livesTable.scheduledAt,
        youtubeUrl: livesTable.youtubeUrl,
        thumbnailUrl: livesTable.thumbnailUrl,
        afterpartyKakaoUrl: livesTable.afterpartyKakaoUrl,
        afterpartyMaterials: livesTable.afterpartyMaterials,
        afterpartyProducts: livesTable.afterpartyProducts,
      })
      .from(livesTable)
      .where(eq(livesTable.id, id));

    if (!live) return res.status(404).json({ error: "Live not found" });

    const [global] = await db.select().from(afterpartyGlobalConfigTable).limit(1);

    const kakaoUrl = (live.afterpartyKakaoUrl ?? global?.defaultKakaoUrl ?? "").trim();
    const materials = Array.isArray(live.afterpartyMaterials) ? live.afterpartyMaterials : [];
    const products = Array.isArray(live.afterpartyProducts) ? live.afterpartyProducts : [];

    return res.json({
      live: {
        id: live.id,
        title: live.title,
        description: live.description,
        scheduledAt: live.scheduledAt,
        youtubeUrl: live.youtubeUrl,
        thumbnailUrl: live.thumbnailUrl,
      },
      materials,
      products,
      kakao: {
        url: kakaoUrl,
        headline: global?.kakaoHeadline ?? "매주 무료 AI 실무 특강 — 지금 카톡방으로 입장하세요",
        body:
          global?.kakaoBody ??
          "라이브 대기방에 들어오시면 매주 각 분야의 AI 실무자들이 실제 현장에서 어떻게 AI를 활용하는지 무료 특강을 진행합니다. 톡방에 들어오기만 해도 매주 무료 자료를 받을 수 있고, 모든 라이브 특강 다시보기도 무료로 보실 수 있어요.",
        buttonLabel: global?.buttonLabel ?? "무료 카톡방 입장하기",
      },
    });
  } catch (error) {
    req.log.error({ error }, "Error fetching afterparty page data");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/afterparty-config", async (_req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(afterpartyGlobalConfigTable).limit(1);
    res.json(
      row ?? {
        id: null,
        defaultKakaoUrl: "",
        kakaoHeadline: "",
        kakaoBody: "",
        buttonLabel: "",
      },
    );
  } catch (error) {
    _req.log.error({ error }, "Error fetching afterparty config");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/afterparty-config", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const data = {
      defaultKakaoUrl: typeof body.defaultKakaoUrl === "string" ? body.defaultKakaoUrl.trim() || null : null,
      kakaoHeadline: typeof body.kakaoHeadline === "string" ? body.kakaoHeadline.trim() || null : null,
      kakaoBody: typeof body.kakaoBody === "string" ? body.kakaoBody.trim() || null : null,
      buttonLabel: typeof body.buttonLabel === "string" ? body.buttonLabel.trim() || null : null,
      updatedAt: new Date(),
    };

    const [existing] = await db.select({ id: afterpartyGlobalConfigTable.id }).from(afterpartyGlobalConfigTable).limit(1);

    let saved;
    if (existing) {
      [saved] = await db
        .update(afterpartyGlobalConfigTable)
        .set(data)
        .where(eq(afterpartyGlobalConfigTable.id, existing.id))
        .returning();
    } else {
      [saved] = await db.insert(afterpartyGlobalConfigTable).values(data).returning();
    }

    res.json(saved);
  } catch (error) {
    req.log.error({ error }, "Error saving afterparty config");
    res.status(400).json({ error: "Bad request" });
  }
});

/* ── 후기첨부용 페이지 이벤트 트래킹 ───────────────── */

const VALID_EVENT_TYPES = new Set(["page_view", "replay_click", "material_click", "kakao_click", "product_click"]);

router.post("/lives/:id/track", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const body = req.body as Record<string, unknown>;
    const eventType = typeof body.eventType === "string" ? body.eventType : "";
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.slice(0, 64) : "";
    if (!VALID_EVENT_TYPES.has(eventType)) return res.status(400).json({ error: "Invalid eventType" });
    if (!visitorId) return res.status(400).json({ error: "Missing visitorId" });

    await db.insert(afterpartyEventsTable).values({
      liveId,
      eventType,
      visitorId,
      meta: typeof body.meta === "object" && body.meta !== null ? (body.meta as Record<string, unknown>) : null,
      userAgent: (req.headers["user-agent"] ?? "").toString().slice(0, 500) || null,
      referrer: (req.headers["referer"] ?? "").toString().slice(0, 500) || null,
    });

    return res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Error inserting afterparty event");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lives/:id/afterparty-stats", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const rows = await db.execute(sql`
      SELECT event_type, COUNT(*)::int AS total, COUNT(DISTINCT visitor_id)::int AS unique_count
      FROM afterparty_events
      WHERE live_id = ${liveId}
      GROUP BY event_type
    `);

    const dailyRows = await db.execute(sql`
      SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') AS date,
             event_type,
             COUNT(*)::int AS total,
             COUNT(DISTINCT visitor_id)::int AS unique_count
      FROM afterparty_events
      WHERE live_id = ${liveId}
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul'), event_type
      ORDER BY date ASC
    `);

    const byType: Record<string, { total: number; unique: number }> = {};
    for (const r of rows.rows as Array<{ event_type: string; total: number; unique_count: number }>) {
      byType[r.event_type] = { total: r.total, unique: r.unique_count };
    }

    const get = (k: string) => byType[k] ?? { total: 0, unique: 0 };
    const pv = get("page_view");
    const replay = get("replay_click");
    const material = get("material_click");
    const kakao = get("kakao_click");
    const product = get("product_click");
    const safeRate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

    return res.json({
      pageView: pv,
      replayClick: replay,
      materialClick: material,
      kakaoClick: kakao,
      productClick: product,
      rates: {
        replay: safeRate(replay.unique, pv.unique),
        material: safeRate(material.unique, pv.unique),
        kakao: safeRate(kakao.unique, pv.unique),
        product: safeRate(product.unique, pv.unique),
      },
      daily: dailyRows.rows,
    });
  } catch (error) {
    req.log.error({ error }, "Error fetching afterparty stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard-summary", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [[activeLivesResult], [upcomingResult], [totalRegResult], [totalLivesResult]] =
      await Promise.all([
        db.select({ count: count() }).from(livesTable).where(eq(livesTable.status, "live")),
        db.select({ count: count() }).from(livesTable).where(and(eq(livesTable.status, "scheduled"), gte(livesTable.scheduledAt, now), lte(livesTable.scheduledAt, weekEnd))),
        db.select({ count: count() }).from(registrationsTable),
        db.select({ count: count() }).from(livesTable),
      ]);

    res.json({
      activeLivesCount: activeLivesResult.count,
      upcomingThisWeekCount: upcomingResult.count,
      totalRegistrationsCount: totalRegResult.count,
      totalLivesCount: totalLivesResult.count,
    });
  } catch (error) {
    _req.log.error({ error }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
