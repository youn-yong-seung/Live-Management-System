import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { livesTable } from "./lives";

export const solapiConfigTable = pgTable("solapi_config", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  senderPhone: text("sender_phone"),
  senderKey: text("sender_key"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationRulesTable = pgTable("notification_rules", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  offsetMinutes: integer("offset_minutes").notNull(),
  messageType: text("message_type").notNull().default("alimtalk"),
  templateId: text("template_id"),
  templateName: text("template_name"),
  messageBody: text("message_body"),
  customTime: text("custom_time"),
  customVariables: jsonb("custom_variables").$type<Record<string, string>>(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationLogTable = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  ruleId: integer("rule_id"),
  templateId: text("template_id"),
  templateName: text("template_name"),
  recipientCount: integer("recipient_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  status: text("status").notNull().default("sent"),
  isImmediate: boolean("is_immediate").notNull().default(false),
});

export const registrationTriggersTable = pgTable("registration_triggers", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .unique()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  messageType: text("message_type").notNull().default("alimtalk"),
  templateId: text("template_id"),
  templateName: text("template_name"),
  messageBody: text("message_body"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adminConfigTable = pgTable("admin_config", {
  id: serial("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adminSessionsTable = pgTable("admin_sessions", {
  token: text("token").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const liveYoutubeStatsTable = pgTable("live_youtube_stats", {
  id: serial("id").primaryKey(),
  liveId: integer("live_id")
    .notNull()
    .unique()
    .references(() => livesTable.id, { onDelete: "cascade" }),
  views: integer("views").notNull().default(0),
  peakConcurrent: integer("peak_concurrent").notNull().default(0),
  watchTimeMinutes: real("watch_time_minutes").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SolapiConfig = typeof solapiConfigTable.$inferSelect;
export type NotificationRule = typeof notificationRulesTable.$inferSelect;
export type NotificationLog = typeof notificationLogTable.$inferSelect;
export type RegistrationTrigger = typeof registrationTriggersTable.$inferSelect;
export type AdminConfig = typeof adminConfigTable.$inferSelect;
export type AdminSession = typeof adminSessionsTable.$inferSelect;
export type LiveYoutubeStats = typeof liveYoutubeStatsTable.$inferSelect;
