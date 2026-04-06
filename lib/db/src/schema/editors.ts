import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
  real,
} from "drizzle-orm/pg-core";

/* ── Enums ──────────────────────────────────────────── */

export const payTypeEnum = pgEnum("pay_type", [
  "per_video",    // 건당
  "monthly",      // 월급
  "hourly",       // 시급
]);

export const projectStatusEnum = pgEnum("project_status", [
  "draft",            // PD가 기획만 한 상태
  "assigned",         // 편집자 배정됨 (SMS 발송)
  "accepted",         // 편집자 수락
  "date_requested",   // 편집자가 날짜 변경 요청
  "in_progress",      // 편집 진행 중
  "submitted",        // 편집 완료 → 드라이브 링크 제출
  "revision",         // PD 피드백 → 재편집 요청
  "approved",         // PD 승인 완료
  "scheduled",        // 업로드 예약됨
  "uploaded",         // 업로드 완료
]);

/* ── Editors (편집자) ───────────────────────────────── */

export const editorsTable = pgTable("editors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  payType: payTypeEnum("pay_type").notNull().default("per_video"),
  payAmount: real("pay_amount").notNull().default(0),    // 건당 금액, 월급, 시급
  payNote: text("pay_note"),                              // 정산 관련 메모
  bankInfo: text("bank_info"),                            // 계좌 정보
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ── Editor Sessions ────────────────────────────────── */

export const editorSessionsTable = pgTable("editor_sessions", {
  token: text("token").primaryKey(),
  editorId: integer("editor_id")
    .notNull()
    .references(() => editorsTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Video Projects (영상 프로젝트) ─────────────────── */

export const videoProjectsTable = pgTable("video_projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  editorId: integer("editor_id")
    .references(() => editorsTable.id, { onDelete: "set null" }),
  status: projectStatusEnum("status").notNull().default("draft"),

  // 일정
  draftDeadline: timestamp("draft_deadline"),         // PD가 지정한 초안 마감일
  proposedDeadline: timestamp("proposed_deadline"),    // 편집자가 제안한 날짜
  finalDeadline: timestamp("final_deadline"),          // 최종 확정 마감일

  // 편집 결과물
  driveLink: text("drive_link"),                      // 구글 드라이브 영상 링크
  thumbnailLink: text("thumbnail_link"),              // 썸네일 링크

  // 업로드
  scheduledUploadAt: timestamp("scheduled_upload_at"),  // 예약 업로드 시간
  youtubeUrl: text("youtube_url"),                      // 업로드된 YouTube URL
  uploadedAt: timestamp("uploaded_at"),

  // 정산
  payAmount: real("pay_amount"),                        // 이 프로젝트 정산 금액
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ── Project Messages (피드백/커뮤니케이션) ──────────── */

export const projectMessagesTable = pgTable("project_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => videoProjectsTable.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(),   // "pd" or "editor"
  senderId: integer("sender_id"),               // editor id (null if PD)
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Todo Status ─────────────────────────────────────── */

export const todoStatusEnum = pgEnum("todo_status", [
  "pending",      // 대기
  "in_progress",  // 진행 중
  "done",         // 완료
  "skipped",      // 건너뜀
]);

/* ── Project Todos ──────────────────────────────────── */

export const projectTodosTable = pgTable("project_todos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => videoProjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: todoStatusEnum("status").notNull().default("pending"),
  scheduledDate: timestamp("scheduled_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  assigneeType: text("assignee_type"),   // "pd" | "editor" | null
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ── Types ──────────────────────────────────────────── */

export type Editor = typeof editorsTable.$inferSelect;
export type VideoProject = typeof videoProjectsTable.$inferSelect;
export type ProjectMessage = typeof projectMessagesTable.$inferSelect;
export type ProjectTodo = typeof projectTodosTable.$inferSelect;
