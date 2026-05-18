import {
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { livesTable, registrationsTable } from "./lives";

/**
 * 고민상담 — 윤자동의 자동화 상담소
 * 커뮤니티 안에서 폼형으로 사연을 받고,
 * liveRequested = true 이면 인접 라이브에 자동 등록까지.
 */
export const consultationStatusEnum = ["pending", "featured", "answered", "hidden"] as const;
export type ConsultationStatus = (typeof consultationStatusEnum)[number];

export const communityConsultationsTable = pgTable(
  "community_consultations",
  {
    id: serial("id").primaryKey(),
    /** 로그인 사용자가 작성하면 매칭. 비로그인도 허용. */
    authorId: uuid("author_id").references(() => usersTable.id, { onDelete: "set null" }),

    name: text("name").notNull(),
    ageRange: text("age_range").notNull(),
    phone: text("phone").notNull(),
    industry: text("industry").notNull(),
    industryCustom: text("industry_custom"),
    jobType: text("job_type").notNull(),
    jobTypeCustom: text("job_type_custom"),

    currentWork: text("current_work").notNull(),
    concern: text("concern").notNull(),
    hardest: text("hardest").notNull(),

    /** 라이브 신청 동시 체크. true면 liveId/registrationId 자동 세팅. */
    liveRequested: boolean("live_requested").notNull().default(false),
    liveId: integer("live_id").references(() => livesTable.id, { onDelete: "set null" }),
    registrationId: integer("registration_id").references(() => registrationsTable.id, {
      onDelete: "set null",
    }),

    likeCount: integer("like_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),

    /** 라이브에서 다룬 사연 표시 등 큐레이션용. */
    status: text("status").notNull().default("pending"),

    /** 시드 사연(가라) 표시 — 통계/뱃지에서 제외하기 위함. */
    isSeed: boolean("is_seed").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_consultations_created").on(t.createdAt),
    index("idx_consultations_status").on(t.status),
    index("idx_consultations_live").on(t.liveId),
    index("idx_consultations_author").on(t.authorId),
  ],
);

/**
 * 좋아요 (회원 1회 제한 / 비회원은 visitorId 로 1회 제한)
 */
export const communityConsultationLikesTable = pgTable(
  "community_consultation_likes",
  {
    id: serial("id").primaryKey(),
    consultationId: integer("consultation_id")
      .notNull()
      .references(() => communityConsultationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_consult_likes_consult").on(t.consultationId),
    uniqueIndex("uniq_consult_likes_user").on(t.consultationId, t.userId),
    uniqueIndex("uniq_consult_likes_visitor").on(t.consultationId, t.visitorId),
  ],
);

export const insertCommunityConsultationSchema = createInsertSchema(
  communityConsultationsTable,
).omit({
  id: true,
  likeCount: true,
  viewCount: true,
  registrationId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCommunityConsultation = z.infer<typeof insertCommunityConsultationSchema>;
export type CommunityConsultation = typeof communityConsultationsTable.$inferSelect;

export type CommunityConsultationLike = typeof communityConsultationLikesTable.$inferSelect;
