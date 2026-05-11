import {
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liveStatusEnum = pgEnum("live_status", [
  "live",
  "scheduled",
  "ended",
]);

export const livesTable = pgTable("lives", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  youtubeUrl: text("youtube_url"),
  scheduledAt: timestamp("scheduled_at"),
  status: liveStatusEnum("status").notNull().default("scheduled"),
  thumbnailUrl: text("thumbnail_url"),
  tags: jsonb("tags").$type<string[]>(),
  afterpartyKakaoUrl: text("afterparty_kakao_url"),
  afterpartyMaterials: jsonb("afterparty_materials").$type<{ title: string; url: string }[]>(),
  afterpartyProducts: jsonb("afterparty_products").$type<{ title: string; url: string }[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLiveSchema = createInsertSchema(livesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLive = z.infer<typeof insertLiveSchema>;
export type Live = typeof livesTable.$inferSelect;

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  /** 회원과 연결 (이메일 자동 매칭). 비회원 신청은 null. */
  userId: text("user_id"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  message: text("message"),
  industry: text("industry"),
  channelSource: jsonb("channel_source").$type<string[]>(),
  skillLevel: text("skill_level"),
  customAnswers: jsonb("custom_answers").$type<Record<string, string | string[]>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(
  registrationsTable,
).omit({ id: true, createdAt: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;

export const liveCustomQuestionsTable = pgTable("live_custom_questions", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionType: text("question_type").notNull().default("text"),
  options: jsonb("options").$type<string[]>(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LiveCustomQuestion = typeof liveCustomQuestionsTable.$inferSelect;

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── 후기첨부용 페이지 이벤트 트래킹 ─────────────────── */

export const afterpartyEventsTable = pgTable(
  "afterparty_events",
  {
    id: serial("id").primaryKey(),
    liveId: integer("live_id")
      .notNull()
      .references(() => livesTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    visitorId: text("visitor_id").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    byLiveAndType: index("afterparty_events_live_type_idx").on(t.liveId, t.eventType),
    byLiveAndVisitor: index("afterparty_events_live_visitor_idx").on(t.liveId, t.visitorId),
  }),
);

export type AfterpartyEvent = typeof afterpartyEventsTable.$inferSelect;

export const insertReviewSchema = createInsertSchema(reviewsTable, {
  name: (s) => s.min(1, "이름을 입력해주세요.").max(50, "이름은 50자 이하여야 합니다."),
  rating: (s) => s.min(1, "별점을 선택해주세요.").max(5, "별점은 5점 이하여야 합니다."),
  content: (s) => s.min(1, "후기 내용을 입력해주세요.").max(2000, "후기는 2000자 이하여야 합니다."),
}).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
