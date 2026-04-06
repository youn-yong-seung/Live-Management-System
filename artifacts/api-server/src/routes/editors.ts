import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  editorsTable,
  editorSessionsTable,
  videoProjectsTable,
  projectMessagesTable,
  projectTodosTable,
} from "@workspace/db";
import { eq, lt, desc, and, asc, isNull } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/adminAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ════════════════════════════════════════════════════════
   ADMIN: 편집자 CRUD
   ════════════════════════════════════════════════════════ */

// GET /editors — 편집자 목록
router.get("/editors", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const editors = await db.select({
      id: editorsTable.id,
      name: editorsTable.name,
      phone: editorsTable.phone,
      email: editorsTable.email,
      payType: editorsTable.payType,
      payAmount: editorsTable.payAmount,
      payNote: editorsTable.payNote,
      bankInfo: editorsTable.bankInfo,
      isActive: editorsTable.isActive,
      createdAt: editorsTable.createdAt,
    }).from(editorsTable).orderBy(desc(editorsTable.createdAt));
    res.json(editors);
  } catch (err) {
    logger.error({ err }, "GET /editors failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /editors — 편집자 추가
router.post("/editors", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, phone, email, password, payType, payAmount, payNote, bankInfo } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "이름, 연락처, 비밀번호는 필수입니다." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [editor] = await db.insert(editorsTable).values({
      name, phone, email: email || null, passwordHash,
      payType: payType || "per_video",
      payAmount: payAmount || 0,
      payNote: payNote || null,
      bankInfo: bankInfo || null,
    }).returning();
    res.status(201).json({ ...editor, passwordHash: undefined });
  } catch (err) {
    logger.error({ err }, "POST /editors failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /editors/:id — 편집자 수정
router.put("/editors/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, phone, email, password, payType, payAmount, payNote, bankInfo, isActive } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
    if (payType !== undefined) updateData.payType = payType;
    if (payAmount !== undefined) updateData.payAmount = payAmount;
    if (payNote !== undefined) updateData.payNote = payNote || null;
    if (bankInfo !== undefined) updateData.bankInfo = bankInfo || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db.update(editorsTable).set(updateData).where(eq(editorsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "편집자를 찾을 수 없습니다." });
    res.json({ ...updated, passwordHash: undefined });
  } catch (err) {
    logger.error({ err }, "PUT /editors/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /editors/:id — 편집자 삭제
router.delete("/editors/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db.delete(editorsTable).where(eq(editorsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "편집자를 찾을 수 없습니다." });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /editors/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ════════════════════════════════════════════════════════
   ADMIN: 영상 프로젝트 관리
   ════════════════════════════════════════════════════════ */

// GET /video-projects — 전체 프로젝트 목록
router.get("/video-projects", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const projects = await db
      .select({
        id: videoProjectsTable.id,
        title: videoProjectsTable.title,
        description: videoProjectsTable.description,
        editorId: videoProjectsTable.editorId,
        editorName: editorsTable.name,
        status: videoProjectsTable.status,
        draftDeadline: videoProjectsTable.draftDeadline,
        proposedDeadline: videoProjectsTable.proposedDeadline,
        finalDeadline: videoProjectsTable.finalDeadline,
        driveLink: videoProjectsTable.driveLink,
        thumbnailLink: videoProjectsTable.thumbnailLink,
        scheduledUploadAt: videoProjectsTable.scheduledUploadAt,
        youtubeUrl: videoProjectsTable.youtubeUrl,
        payAmount: videoProjectsTable.payAmount,
        isPaid: videoProjectsTable.isPaid,
        createdAt: videoProjectsTable.createdAt,
        updatedAt: videoProjectsTable.updatedAt,
      })
      .from(videoProjectsTable)
      .leftJoin(editorsTable, eq(videoProjectsTable.editorId, editorsTable.id))
      .orderBy(desc(videoProjectsTable.createdAt));
    res.json(projects);
  } catch (err) {
    logger.error({ err }, "GET /video-projects failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /video-projects — 프로젝트 생성
router.post("/video-projects", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, editorId, draftDeadline } = req.body;
    if (!title) return res.status(400).json({ error: "제목은 필수입니다." });

    const [project] = await db.insert(videoProjectsTable).values({
      title,
      description: description || null,
      editorId: editorId || null,
      status: editorId ? "assigned" : "draft",
      draftDeadline: draftDeadline ? new Date(draftDeadline) : null,
    }).returning();

    // TODO: SMS 발송 (편집자 배정 시)

    res.status(201).json(project);
  } catch (err) {
    logger.error({ err }, "POST /video-projects failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /video-projects/:id — 프로젝트 수정 (PD)
router.put("/video-projects/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const body = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.editorId !== undefined) updateData.editorId = body.editorId || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.draftDeadline !== undefined) updateData.draftDeadline = body.draftDeadline ? new Date(body.draftDeadline) : null;
    if (body.finalDeadline !== undefined) updateData.finalDeadline = body.finalDeadline ? new Date(body.finalDeadline) : null;
    if (body.scheduledUploadAt !== undefined) updateData.scheduledUploadAt = body.scheduledUploadAt ? new Date(body.scheduledUploadAt) : null;
    if (body.youtubeUrl !== undefined) updateData.youtubeUrl = body.youtubeUrl;
    if (body.payAmount !== undefined) updateData.payAmount = body.payAmount;
    if (body.isPaid !== undefined) updateData.isPaid = body.isPaid;
    if (body.paidAt !== undefined) updateData.paidAt = body.paidAt ? new Date(body.paidAt) : null;

    const [updated] = await db.update(videoProjectsTable).set(updateData).where(eq(videoProjectsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /video-projects/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /video-projects/:id
router.delete("/video-projects/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db.delete(videoProjectsTable).where(eq(videoProjectsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /video-projects/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /video-projects/:id/messages — 피드백 목록
router.get("/video-projects/:id/messages", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    const messages = await db.select().from(projectMessagesTable)
      .where(eq(projectMessagesTable.projectId, projectId))
      .orderBy(projectMessagesTable.createdAt);
    res.json(messages);
  } catch (err) {
    logger.error({ err }, "GET /video-projects/:id/messages failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /video-projects/:id/messages — PD 피드백 작성
router.post("/video-projects/:id/messages", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "메시지를 입력해주세요." });

    const [msg] = await db.insert(projectMessagesTable).values({
      projectId, senderType: "pd", senderId: null, message,
    }).returning();
    res.status(201).json(msg);
  } catch (err) {
    logger.error({ err }, "POST /video-projects/:id/messages failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ════════════════════════════════════════════════════════
   EDITOR PORTAL: 편집자 전용 API
   ════════════════════════════════════════════════════════ */

// Middleware: 편집자 인증
async function requireEditorAuth(req: Request, res: Response, next: Function) {
  const token = req.headers["x-editor-token"] as string | undefined;
  if (!token) return res.status(401).json({ error: "인증이 필요합니다." });

  const [session] = await db.select().from(editorSessionsTable)
    .where(eq(editorSessionsTable.token, token)).limit(1);

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.delete(editorSessionsTable).where(eq(editorSessionsTable.token, token));
    return res.status(401).json({ error: "세션이 만료되었습니다." });
  }

  (req as any).editorId = session.editorId;
  next();
}

// POST /editor/login
router.post("/editor/login", async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: "연락처와 비밀번호를 입력해주세요." });

    const [editor] = await db.select().from(editorsTable).where(eq(editorsTable.phone, phone));
    if (!editor) return res.status(401).json({ error: "연락처 또는 비밀번호가 틀렸습니다." });
    if (!editor.isActive) return res.status(403).json({ error: "비활성화된 계정입니다." });

    const valid = await bcrypt.compare(password, editor.passwordHash);
    if (!valid) return res.status(401).json({ error: "연락처 또는 비밀번호가 틀렸습니다." });

    // Clean expired sessions
    await db.delete(editorSessionsTable).where(lt(editorSessionsTable.expiresAt, new Date()));

    const token = randomUUID();
    await db.insert(editorSessionsTable).values({
      token, editorId: editor.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });

    res.json({ success: true, token, editor: { id: editor.id, name: editor.name } });
  } catch (err) {
    logger.error({ err }, "POST /editor/login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /editor/session
router.get("/editor/session", requireEditorAuth, async (req: Request, res: Response) => {
  const editorId = (req as any).editorId;
  const [editor] = await db.select({
    id: editorsTable.id, name: editorsTable.name, phone: editorsTable.phone, email: editorsTable.email,
  }).from(editorsTable).where(eq(editorsTable.id, editorId));
  res.json({ valid: true, editor });
});

// GET /editor/projects — 내 프로젝트 목록
router.get("/editor/projects", requireEditorAuth, async (req: Request, res: Response) => {
  try {
    const editorId = (req as any).editorId;
    const projects = await db.select({
      id: videoProjectsTable.id,
      title: videoProjectsTable.title,
      description: videoProjectsTable.description,
      status: videoProjectsTable.status,
      draftDeadline: videoProjectsTable.draftDeadline,
      proposedDeadline: videoProjectsTable.proposedDeadline,
      finalDeadline: videoProjectsTable.finalDeadline,
      driveLink: videoProjectsTable.driveLink,
      scheduledUploadAt: videoProjectsTable.scheduledUploadAt,
      youtubeUrl: videoProjectsTable.youtubeUrl,
      payAmount: videoProjectsTable.payAmount,
      isPaid: videoProjectsTable.isPaid,
      paidAt: videoProjectsTable.paidAt,
      createdAt: videoProjectsTable.createdAt,
    }).from(videoProjectsTable)
      .where(eq(videoProjectsTable.editorId, editorId))
      .orderBy(desc(videoProjectsTable.createdAt));
    res.json(projects);
  } catch (err) {
    logger.error({ err }, "GET /editor/projects failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /editor/projects/:id/accept — 편집 수락
router.put("/editor/projects/:id/accept", requireEditorAuth, async (req: Request, res: Response) => {
  try {
    const editorId = (req as any).editorId;
    const id = parseInt(String(req.params.id), 10);

    const [project] = await db.select().from(videoProjectsTable)
      .where(and(eq(videoProjectsTable.id, id), eq(videoProjectsTable.editorId, editorId)));
    if (!project) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });

    const [updated] = await db.update(videoProjectsTable).set({
      status: "accepted",
      finalDeadline: project.draftDeadline,
      updatedAt: new Date(),
    }).where(eq(videoProjectsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /editor/projects/:id/accept failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /editor/projects/:id/propose-date — 날짜 변경 요청
router.put("/editor/projects/:id/propose-date", requireEditorAuth, async (req: Request, res: Response) => {
  try {
    const editorId = (req as any).editorId;
    const id = parseInt(String(req.params.id), 10);
    const { proposedDeadline, message } = req.body;
    if (!proposedDeadline) return res.status(400).json({ error: "제안 날짜를 입력해주세요." });

    const [project] = await db.select().from(videoProjectsTable)
      .where(and(eq(videoProjectsTable.id, id), eq(videoProjectsTable.editorId, editorId)));
    if (!project) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });

    const [updated] = await db.update(videoProjectsTable).set({
      status: "date_requested",
      proposedDeadline: new Date(proposedDeadline),
      updatedAt: new Date(),
    }).where(eq(videoProjectsTable.id, id)).returning();

    if (message) {
      await db.insert(projectMessagesTable).values({
        projectId: id, senderType: "editor", senderId: editorId, message,
      });
    }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /editor/projects/:id/propose-date failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /editor/projects/:id/submit — 편집 완료, 드라이브 링크 제출
router.put("/editor/projects/:id/submit", requireEditorAuth, async (req: Request, res: Response) => {
  try {
    const editorId = (req as any).editorId;
    const id = parseInt(String(req.params.id), 10);
    const { driveLink, thumbnailLink } = req.body;
    if (!driveLink) return res.status(400).json({ error: "드라이브 링크를 입력해주세요." });

    const [project] = await db.select().from(videoProjectsTable)
      .where(and(eq(videoProjectsTable.id, id), eq(videoProjectsTable.editorId, editorId)));
    if (!project) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });

    const [updated] = await db.update(videoProjectsTable).set({
      status: "submitted",
      driveLink,
      thumbnailLink: thumbnailLink || null,
      updatedAt: new Date(),
    }).where(eq(videoProjectsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /editor/projects/:id/submit failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /editor/projects/:id/messages — 내 프로젝트 피드백 조회
router.get("/editor/projects/:id/messages", requireEditorAuth, async (req: Request, res: Response) => {
  try {
    const editorId = (req as any).editorId;
    const id = parseInt(String(req.params.id), 10);

    const [project] = await db.select({ id: videoProjectsTable.id }).from(videoProjectsTable)
      .where(and(eq(videoProjectsTable.id, id), eq(videoProjectsTable.editorId, editorId)));
    if (!project) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });

    const messages = await db.select().from(projectMessagesTable)
      .where(eq(projectMessagesTable.projectId, id))
      .orderBy(projectMessagesTable.createdAt);
    res.json(messages);
  } catch (err) {
    logger.error({ err }, "GET /editor/projects/:id/messages failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /editor/projects/:id/messages — 편집자 메시지
router.post("/editor/projects/:id/messages", requireEditorAuth, async (req: Request, res: Response) => {
  try {
    const editorId = (req as any).editorId;
    const id = parseInt(String(req.params.id), 10);
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "메시지를 입력해주세요." });

    const [project] = await db.select({ id: videoProjectsTable.id }).from(videoProjectsTable)
      .where(and(eq(videoProjectsTable.id, id), eq(videoProjectsTable.editorId, editorId)));
    if (!project) return res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });

    const [msg] = await db.insert(projectMessagesTable).values({
      projectId: id, senderType: "editor", senderId: editorId, message,
    }).returning();
    res.status(201).json(msg);
  } catch (err) {
    logger.error({ err }, "POST /editor/projects/:id/messages failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ════════════════════════════════════════════════════════
   ADMIN: 프로젝트 TODO 관리
   ════════════════════════════════════════════════════════ */

const SOP_TEMPLATE = [
  { title: "영상 기획", assigneeType: "pd" },
  { title: "영상 대본 제작", assigneeType: "pd" },
  { title: "영상 촬영", assigneeType: "pd" },
  { title: "편집 전 영상 소스 정리 및 업로드", assigneeType: "pd" },
  { title: "영상 1차 초안 업로드", assigneeType: "editor" },
  { title: "영상 초안 1차 피드백 진행", assigneeType: "pd" },
  { title: "영상 최종 업로드", assigneeType: "editor" },
  { title: "썸네일 제작", assigneeType: "editor" },
  { title: "YouTube 업로드 & 예약", assigneeType: "pd" },
];

// GET /video-projects/:id/todos
router.get("/video-projects/:id/todos", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    const todos = await db.select().from(projectTodosTable)
      .where(eq(projectTodosTable.projectId, projectId))
      .orderBy(asc(projectTodosTable.sortOrder), asc(projectTodosTable.createdAt));
    res.json(todos);
  } catch (err) {
    logger.error({ err }, "GET /video-projects/:id/todos failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /video-projects/:id/todos — 단일 TODO 추가
router.post("/video-projects/:id/todos", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    const { title, scheduledDate, assigneeType, sortOrder } = req.body;
    if (!title) return res.status(400).json({ error: "업무명은 필수입니다." });

    const [todo] = await db.insert(projectTodosTable).values({
      projectId, title,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      assigneeType: assigneeType || null,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(todo);
  } catch (err) {
    logger.error({ err }, "POST /video-projects/:id/todos failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /video-projects/:id/todos/sop — SOP 템플릿으로 TODO 일괄 생성
router.post("/video-projects/:id/todos/sop", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    const todos = await db.insert(projectTodosTable).values(
      SOP_TEMPLATE.map((t, i) => ({
        projectId, title: t.title, assigneeType: t.assigneeType, sortOrder: i,
      }))
    ).returning();
    res.status(201).json(todos);
  } catch (err) {
    logger.error({ err }, "POST /video-projects/:id/todos/sop failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /todos/:id — TODO 수정 (상태, 날짜, 제목 등)
router.put("/todos/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const body = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.scheduledDate !== undefined) updateData.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    if (body.assigneeType !== undefined) updateData.assigneeType = body.assigneeType;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const [updated] = await db.update(projectTodosTable).set(updateData).where(eq(projectTodosTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "TODO를 찾을 수 없습니다." });
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /todos/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /todos/:id
router.delete("/todos/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(projectTodosTable).where(eq(projectTodosTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /todos/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /todos/all — 전체 TODO (캘린더용)
router.get("/todos/all", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const todos = await db
      .select({
        id: projectTodosTable.id,
        projectId: projectTodosTable.projectId,
        projectTitle: videoProjectsTable.title,
        title: projectTodosTable.title,
        status: projectTodosTable.status,
        scheduledDate: projectTodosTable.scheduledDate,
        sortOrder: projectTodosTable.sortOrder,
        assigneeType: projectTodosTable.assigneeType,
      })
      .from(projectTodosTable)
      .innerJoin(videoProjectsTable, eq(projectTodosTable.projectId, videoProjectsTable.id))
      .orderBy(asc(projectTodosTable.scheduledDate), asc(projectTodosTable.sortOrder));
    res.json(todos);
  } catch (err) {
    logger.error({ err }, "GET /todos/all failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /todos/unscheduled — 날짜 미정 TODO (드래그용)
router.get("/todos/unscheduled", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const todos = await db
      .select({
        id: projectTodosTable.id,
        projectId: projectTodosTable.projectId,
        projectTitle: videoProjectsTable.title,
        title: projectTodosTable.title,
        status: projectTodosTable.status,
        assigneeType: projectTodosTable.assigneeType,
      })
      .from(projectTodosTable)
      .innerJoin(videoProjectsTable, eq(projectTodosTable.projectId, videoProjectsTable.id))
      .where(isNull(projectTodosTable.scheduledDate))
      .orderBy(asc(projectTodosTable.sortOrder));
    res.json(todos);
  } catch (err) {
    logger.error({ err }, "GET /todos/unscheduled failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
