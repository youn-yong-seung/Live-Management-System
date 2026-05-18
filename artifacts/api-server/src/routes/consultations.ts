import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  communityConsultationsTable,
  communityConsultationLikesTable,
  consultationFormConfigTable,
  DEFAULT_CONSULTATION_FORM_CONFIG,
  livesTable,
  registrationsTable,
  usersTable,
} from "@workspace/db";
import type { ConsultationFormConfig } from "@workspace/db";
import { eq, desc, sql, and, gte, asc, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { optionalUser, requireUser } from "../middleware/userAuth.js";
import { requireAdminAuth } from "../middleware/adminAuth";
import { fireRegistrationTrigger } from "./notifications";

const router: IRouter = Router();

/* ── 입력 스키마 ─────────────────────────────────────── */

const createConsultationSchema = z.object({
  name: z.string().min(2, "성함을 입력해주세요").max(50),
  ageRange: z.string().min(1, "나이대를 선택해주세요"),
  phone: z
    .string()
    .min(9, "연락처를 정확히 입력해주세요")
    .max(20)
    .regex(/^[\d\-\+\s\(\)]+$/, "전화번호 형식이 올바르지 않습니다"),
  industry: z.string().min(1, "직군분야를 선택해주세요"),
  industryCustom: z.string().max(60).optional().nullable(),
  jobType: z.string().min(1, "직업구분을 선택해주세요"),
  jobTypeCustom: z.string().max(60).optional().nullable(),
  currentWork: z.string().min(2, "어떤 일을 하시는지 알려주세요").max(2000),
  concern: z.string().min(2, "고민 내용을 적어주세요").max(2000),
  hardest: z.string().min(2, "가장 힘든 부분을 알려주세요").max(2000),
  liveRequested: z.boolean().default(false),
  /** liveRequested = true 인데 liveId 명시 안 하면 가장 가까운 예정 라이브로 자동 매칭 */
  liveId: z.number().int().positive().optional().nullable(),
});

type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

/* ── GET /community/consultations ─────────────────── */
/* 목록 (좋아요 많은 순 + 최신순) */

router.get("/community/consultations", optionalUser, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "30"), 10) || 30, 100);
  const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
  const order = String(req.query.order ?? "popular"); // popular | recent

  const rows = await db
    .select({
      id: communityConsultationsTable.id,
      authorId: communityConsultationsTable.authorId,
      name: communityConsultationsTable.name,
      ageRange: communityConsultationsTable.ageRange,
      industry: communityConsultationsTable.industry,
      industryCustom: communityConsultationsTable.industryCustom,
      jobType: communityConsultationsTable.jobType,
      jobTypeCustom: communityConsultationsTable.jobTypeCustom,
      currentWork: communityConsultationsTable.currentWork,
      concern: communityConsultationsTable.concern,
      hardest: communityConsultationsTable.hardest,
      liveRequested: communityConsultationsTable.liveRequested,
      liveId: communityConsultationsTable.liveId,
      likeCount: communityConsultationsTable.likeCount,
      viewCount: communityConsultationsTable.viewCount,
      status: communityConsultationsTable.status,
      isSeed: communityConsultationsTable.isSeed,
      createdAt: communityConsultationsTable.createdAt,
      authorName: usersTable.name,
      authorAvatarUrl: usersTable.avatarUrl,
    })
    .from(communityConsultationsTable)
    .leftJoin(usersTable, eq(communityConsultationsTable.authorId, usersTable.id))
    .where(sql`${communityConsultationsTable.status} <> 'hidden'`)
    .orderBy(
      ...(order === "recent"
        ? [desc(communityConsultationsTable.createdAt)]
        : [
            desc(communityConsultationsTable.likeCount),
            desc(communityConsultationsTable.createdAt),
          ]),
    )
    .limit(limit)
    .offset(offset);

  // 내가 좋아요 눌렀는지 (로그인 시)
  const userId = req.user?.id ?? null;
  let likedSet = new Set<number>();
  if (userId && rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const liked = await db
      .select({ consultationId: communityConsultationLikesTable.consultationId })
      .from(communityConsultationLikesTable)
      .where(
        and(
          eq(communityConsultationLikesTable.userId, userId),
          sql`${communityConsultationLikesTable.consultationId} IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      );
    likedSet = new Set(liked.map((l) => l.consultationId));
  }

  res.json({
    consultations: rows.map((r) => ({
      ...r,
      // 전화번호/이름은 목록에서 마스킹
      name: maskName(r.name),
      liked: likedSet.has(r.id),
    })),
  });
});

/* ── GET /community/consultations/:id ─────────────── */

router.get(
  "/community/consultations/:id",
  optionalUser,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "잘못된 사연 ID" });
      return;
    }

    const [row] = await db
      .select({
        id: communityConsultationsTable.id,
        authorId: communityConsultationsTable.authorId,
        name: communityConsultationsTable.name,
        ageRange: communityConsultationsTable.ageRange,
        industry: communityConsultationsTable.industry,
        industryCustom: communityConsultationsTable.industryCustom,
        jobType: communityConsultationsTable.jobType,
        jobTypeCustom: communityConsultationsTable.jobTypeCustom,
        currentWork: communityConsultationsTable.currentWork,
        concern: communityConsultationsTable.concern,
        hardest: communityConsultationsTable.hardest,
        liveRequested: communityConsultationsTable.liveRequested,
        liveId: communityConsultationsTable.liveId,
        likeCount: communityConsultationsTable.likeCount,
        viewCount: communityConsultationsTable.viewCount,
        status: communityConsultationsTable.status,
        isSeed: communityConsultationsTable.isSeed,
        createdAt: communityConsultationsTable.createdAt,
        authorName: usersTable.name,
        authorAvatarUrl: usersTable.avatarUrl,
      })
      .from(communityConsultationsTable)
      .leftJoin(usersTable, eq(communityConsultationsTable.authorId, usersTable.id))
      .where(eq(communityConsultationsTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "사연을 찾을 수 없습니다." });
      return;
    }

    await db
      .update(communityConsultationsTable)
      .set({ viewCount: sql`${communityConsultationsTable.viewCount} + 1` })
      .where(eq(communityConsultationsTable.id, id));

    // 좋아요 여부
    let liked = false;
    if (req.user?.id) {
      const [hit] = await db
        .select({ id: communityConsultationLikesTable.id })
        .from(communityConsultationLikesTable)
        .where(
          and(
            eq(communityConsultationLikesTable.consultationId, id),
            eq(communityConsultationLikesTable.userId, req.user.id),
          ),
        )
        .limit(1);
      liked = Boolean(hit);
    }

    res.json({
      consultation: { ...row, name: maskName(row.name), liked },
    });
  },
);

/* ── POST /community/consultations ────────────────── */
/* 폼 제출 + (옵션) 라이브 신청 자동 연동 */

router.post("/community/consultations", optionalUser, async (req: Request, res: Response) => {
  const parsed = createConsultationSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "잘못된 입력", details: parsed.error.flatten() });
    return;
  }
  const data: CreateConsultationInput = parsed.data;

  let resolvedLiveId: number | null = null;
  let registrationId: number | null = null;

  if (data.liveRequested) {
    // 명시된 liveId 우선, 없으면 가장 가까운 예정 라이브
    if (data.liveId) {
      const [hit] = await db
        .select({ id: livesTable.id })
        .from(livesTable)
        .where(eq(livesTable.id, data.liveId))
        .limit(1);
      if (hit) resolvedLiveId = hit.id;
    } else {
      const upcoming = await findNextLive();
      if (upcoming) resolvedLiveId = upcoming.id;
    }

    if (resolvedLiveId) {
      try {
        // 이메일 매칭 (로그인 사용자라면 그 이메일 사용)
        let matchedUserId: string | null = req.user?.id ?? null;
        let email: string | null = req.user?.email ?? null;
        if (!matchedUserId && req.body?.email) {
          email = String(req.body.email);
          const [u] = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);
          if (u) matchedUserId = u.id;
        }

        const [reg] = await db
          .insert(registrationsTable)
          .values({
            liveId: resolvedLiveId,
            userId: matchedUserId,
            name: data.name,
            phone: data.phone,
            email,
            message: data.concern, // 고민 본문을 사전 메시지로 같이 보냄
            industry:
              data.industry === "기타" && data.industryCustom
                ? data.industryCustom
                : data.industry,
            channelSource: ["고민상담 폼"],
            skillLevel: null,
            customAnswers: {
              consultation_age_range: data.ageRange,
              consultation_job_type:
                data.jobType === "기타" && data.jobTypeCustom
                  ? data.jobTypeCustom
                  : data.jobType,
              consultation_current_work: data.currentWork,
              consultation_concern: data.concern,
              consultation_hardest: data.hardest,
            },
          })
          .returning();
        registrationId = reg.id;

        fireRegistrationTrigger(resolvedLiveId, {
          phone: data.phone,
          name: data.name,
        }).catch((err) => {
          req.log.error({ err }, "Failed to fire registration trigger from consultation");
        });
      } catch (err) {
        req.log.error({ err }, "Failed to auto-register live from consultation");
        // 신청 실패해도 사연은 저장.
      }
    }
  }

  const [created] = await db
    .insert(communityConsultationsTable)
    .values({
      authorId: req.user?.id ?? null,
      name: data.name,
      ageRange: data.ageRange,
      phone: data.phone,
      industry: data.industry,
      industryCustom: data.industryCustom ?? null,
      jobType: data.jobType,
      jobTypeCustom: data.jobTypeCustom ?? null,
      currentWork: data.currentWork,
      concern: data.concern,
      hardest: data.hardest,
      liveRequested: data.liveRequested,
      liveId: resolvedLiveId,
      registrationId,
      status: "pending",
      isSeed: false,
    })
    .returning();

  res.status(201).json({
    consultation: { ...created, name: maskName(created.name) },
    liveRegistered: Boolean(registrationId),
    liveId: resolvedLiveId,
  });
});

/* ── POST /community/consultations/:id/like ───────── */
/* 좋아요 토글 (로그인 사용자 1회 / 비로그인은 visitorId) */

router.post(
  "/community/consultations/:id/like",
  optionalUser,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "잘못된 사연 ID" });
      return;
    }

    const userId = req.user?.id ?? null;
    const visitorId = !userId
      ? typeof req.body?.visitorId === "string" && req.body.visitorId.length <= 64
        ? req.body.visitorId
        : null
      : null;

    if (!userId && !visitorId) {
      res.status(400).json({ error: "visitorId 또는 로그인이 필요합니다." });
      return;
    }

    const whereClause = userId
      ? and(
          eq(communityConsultationLikesTable.consultationId, id),
          eq(communityConsultationLikesTable.userId, userId),
        )
      : and(
          eq(communityConsultationLikesTable.consultationId, id),
          isNull(communityConsultationLikesTable.userId),
          eq(communityConsultationLikesTable.visitorId, visitorId!),
        );

    const [existing] = await db
      .select({ id: communityConsultationLikesTable.id })
      .from(communityConsultationLikesTable)
      .where(whereClause)
      .limit(1);

    let liked: boolean;
    if (existing) {
      await db
        .delete(communityConsultationLikesTable)
        .where(eq(communityConsultationLikesTable.id, existing.id));
      await db
        .update(communityConsultationsTable)
        .set({ likeCount: sql`GREATEST(${communityConsultationsTable.likeCount} - 1, 0)` })
        .where(eq(communityConsultationsTable.id, id));
      liked = false;
    } else {
      await db.insert(communityConsultationLikesTable).values({
        consultationId: id,
        userId,
        visitorId,
      });
      await db
        .update(communityConsultationsTable)
        .set({ likeCount: sql`${communityConsultationsTable.likeCount} + 1` })
        .where(eq(communityConsultationsTable.id, id));
      liked = true;
    }

    const [updated] = await db
      .select({ likeCount: communityConsultationsTable.likeCount })
      .from(communityConsultationsTable)
      .where(eq(communityConsultationsTable.id, id))
      .limit(1);

    res.json({ liked, likeCount: updated?.likeCount ?? 0 });
  },
);

/* ── GET /community/consultations/upcoming-live ───── */
/* 폼에서 "이번 라이브" 정보 보여주기용 */

router.get(
  "/community/consultations/meta/upcoming-live",
  async (_req: Request, res: Response) => {
    const live = await findNextLive();
    res.json({ live });
  },
);

/* ── DELETE /community/consultations/:id ──────────── */
/* 본인 or admin */

router.delete(
  "/community/consultations/:id",
  requireUser,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "잘못된 사연 ID" });
      return;
    }
    const [existing] = await db
      .select({ authorId: communityConsultationsTable.authorId })
      .from(communityConsultationsTable)
      .where(eq(communityConsultationsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "사연을 찾을 수 없습니다." });
      return;
    }
    if (existing.authorId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "삭제 권한이 없습니다." });
      return;
    }
    await db.delete(communityConsultationsTable).where(eq(communityConsultationsTable.id, id));
    res.json({ ok: true });
  },
);

/* ── GET /community/consultations/meta/form-config ─ */
/* 폼/게시판 텍스트 (public) */

router.get(
  "/community/consultations/meta/form-config",
  async (_req: Request, res: Response) => {
    const [row] = await db.select().from(consultationFormConfigTable).limit(1);
    res.json({ config: row?.config ?? DEFAULT_CONSULTATION_FORM_CONFIG });
  },
);

/* ════════════════════════════════════════════════════
 * ADMIN: 사연 관리
 * ════════════════════════════════════════════════════ */

/* ── GET /admin/consultations ─────────────────────── */
/* 시드 + 실제 + hidden 모두 노출. 마스킹 X. */

router.get(
  "/admin/consultations",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const filter = String(req.query.filter ?? "all"); // all | seeds | real
    const order = String(req.query.order ?? "recent"); // recent | popular

    const whereClauses: any[] = [];
    if (filter === "seeds") whereClauses.push(eq(communityConsultationsTable.isSeed, true));
    else if (filter === "real") whereClauses.push(eq(communityConsultationsTable.isSeed, false));

    const rows = await db
      .select()
      .from(communityConsultationsTable)
      .where(whereClauses.length ? and(...whereClauses) : undefined as any)
      .orderBy(
        order === "popular"
          ? desc(communityConsultationsTable.likeCount)
          : desc(communityConsultationsTable.createdAt),
      );

    // 통계
    const allRows = await db.select().from(communityConsultationsTable);
    const stats = {
      total: allRows.length,
      seeds: allRows.filter((r) => r.isSeed).length,
      real: allRows.filter((r) => !r.isSeed).length,
      hidden: allRows.filter((r) => r.status === "hidden").length,
      seedsVisible: allRows.some((r) => r.isSeed && r.status !== "hidden"),
    };

    res.json({ consultations: rows, stats });
  },
);

/* ── PATCH /admin/consultations/:id ───────────────── */
/* 부분 업데이트 (status, isSeed, 본문 텍스트 등) */

const adminPatchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  ageRange: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  jobType: z.string().optional(),
  currentWork: z.string().max(5000).optional(),
  concern: z.string().max(5000).optional(),
  hardest: z.string().max(5000).optional(),
  status: z.enum(["pending", "featured", "answered", "hidden"]).optional(),
  isSeed: z.boolean().optional(),
  liveRequested: z.boolean().optional(),
});

/* ── PATCH /admin/consultations/form-config ───────── */
/* (반드시 :id 라우트보다 먼저 등록 — 그렇지 않으면 "form-config" 가 :id 로 잡힘) */

router.patch(
  "/admin/consultations/form-config",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const cfg = req.body?.config as ConsultationFormConfig | undefined;
    if (!cfg || typeof cfg !== "object") {
      res.status(400).json({ error: "config 객체가 필요합니다." });
      return;
    }
    if (!cfg.board || !cfg.form || !cfg.form.fields || !cfg.thankYou) {
      res.status(400).json({ error: "config 구조가 올바르지 않습니다." });
      return;
    }

    const [existing] = await db.select().from(consultationFormConfigTable).limit(1);
    let saved;
    if (existing) {
      [saved] = await db
        .update(consultationFormConfigTable)
        .set({ config: cfg, updatedAt: new Date() })
        .where(eq(consultationFormConfigTable.id, existing.id))
        .returning();
    } else {
      [saved] = await db
        .insert(consultationFormConfigTable)
        .values({ config: cfg })
        .returning();
    }
    res.json({ config: saved.config });
  },
);

/* ── POST /admin/consultations/seeds-visible ──────── */
/* (마찬가지로 :id 라우트보다 먼저) */

router.post(
  "/admin/consultations/seeds-visible",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const visible = Boolean(req.body?.visible);
    await db
      .update(communityConsultationsTable)
      .set({
        status: visible ? "pending" : "hidden",
        updatedAt: new Date(),
      })
      .where(eq(communityConsultationsTable.isSeed, true));
    res.json({ ok: true, visible });
  },
);

router.patch(
  "/admin/consultations/:id",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "잘못된 사연 ID" });
      return;
    }
    const parsed = adminPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "잘못된 입력", details: parsed.error.flatten() });
      return;
    }

    const [updated] = await db
      .update(communityConsultationsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(communityConsultationsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "사연을 찾을 수 없습니다." });
      return;
    }
    res.json({ consultation: updated });
  },
);

/* ── DELETE /admin/consultations/:id ──────────────── */

router.delete(
  "/admin/consultations/:id",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "잘못된 사연 ID" });
      return;
    }
    await db.delete(communityConsultationsTable).where(eq(communityConsultationsTable.id, id));
    res.json({ ok: true });
  },
);

/* ── Helpers ──────────────────────────────────────── */

async function findNextLive() {
  const now = new Date();
  const [live] = await db
    .select({
      id: livesTable.id,
      title: livesTable.title,
      scheduledAt: livesTable.scheduledAt,
      thumbnailUrl: livesTable.thumbnailUrl,
      status: livesTable.status,
    })
    .from(livesTable)
    .where(
      and(
        or(
          eq(livesTable.status, "scheduled"),
          eq(livesTable.status, "live"),
        ),
        // scheduledAt 이 null 이거나 미래
        sql`(${livesTable.scheduledAt} IS NULL OR ${livesTable.scheduledAt} >= ${now})`,
      ),
    )
    .orderBy(asc(sql`COALESCE(${livesTable.scheduledAt}, NOW())`))
    .limit(1);
  return live ?? null;
}

function maskName(name: string): string {
  if (!name) return "";
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(Math.min(name.length - 2, 3)) + name[name.length - 1];
}

export default router;
