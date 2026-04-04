import {
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
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
