import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { livesTable } from "./lives";

/* ── 유입경로 마스터 DB ─────────────────────────────── */

export const channelSourcesTable = pgTable("channel_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),          // "유튜브", "인스타그램" 등
  category: text("category"),                      // "SNS", "오픈채팅방", "지인", "기타"
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── 유입경로별 성과 추적 ───────────────────────────── */

export const channelSourceStatsTable = pgTable("channel_source_stats", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  sourceName: text("source_name").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ── 라이브별 신청폼 설정 ──────────────────────────── */

export const liveFormConfigTable = pgTable("live_form_config", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .unique()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  // 기본 필드 on/off
  showEmail: boolean("show_email").notNull().default(true),
  showIndustry: boolean("show_industry").notNull().default(true),
  showChannelSource: boolean("show_channel_source").notNull().default(true),
  showSkillLevel: boolean("show_skill_level").notNull().default(false),
  showMessage: boolean("show_message").notNull().default(true),
  showMarketingConsent: boolean("show_marketing_consent").notNull().default(true),
  // 업종 옵션 (null이면 기본 목록 사용)
  industryOptions: jsonb("industry_options").$type<string[]>(),
  // 유입경로 옵션 (null이면 channel_sources 마스터 사용)
  channelSourceOptions: jsonb("channel_source_options").$type<string[]>(),
  // AI가 생성한 추천 질문 (저장용)
  aiRecommendedQuestions: jsonb("ai_recommended_questions").$type<{
    question: string;
    questionType: string;
    options?: string[];
    purpose: string;   // 질문 의도
  }[]>(),
  // 감사 페이지 설정
  thankYouTitle: text("thank_you_title"),
  thankYouBody: text("thank_you_body"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ── Types ──────────────────────────────────────────── */

export type ChannelSource = typeof channelSourcesTable.$inferSelect;
export type ChannelSourceStats = typeof channelSourceStatsTable.$inferSelect;
export type LiveFormConfig = typeof liveFormConfigTable.$inferSelect;
