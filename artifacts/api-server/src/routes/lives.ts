import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  livesTable,
  registrationsTable,
  liveCustomQuestionsTable,
  insertLiveSchema,
  insertRegistrationSchema,
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
    const insertData = insertLiveSchema.parse({
      title: body.title,
      description: body.description ?? null,
      youtubeUrl: body.youtubeUrl ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.status,
      thumbnailUrl: body.thumbnailUrl ?? null,
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

    // Extra optional analytics fields from body (beyond Zod schema)
    const rawBody = req.body as {
      industry?: string;
      channelSource?: string[];
      skillLevel?: string;
      customAnswers?: Record<string, string | string[]>;
    };

    const insertData = insertRegistrationSchema.parse({
      liveId,
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      message: body.message ?? null,
      industry: rawBody.industry ?? null,
      channelSource: Array.isArray(rawBody.channelSource) ? rawBody.channelSource : null,
      skillLevel: rawBody.skillLevel ?? null,
      customAnswers: rawBody.customAnswers ?? null,
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
