import { pgTable, serial, text, timestamp, uuid, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const resourcesTable = pgTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    iconName: text("icon_name"),
    badge: text("badge"),
    badgeColor: text("badge_color"),
    /** 외부 링크 (노션/yunjadong.com 등) */
    externalUrl: text("external_url"),
    /** 내부 파일 (Supabase Storage public path) */
    filePath: text("file_path"),
    fileMimeType: text("file_mime_type"),
    fileSize: integer("file_size"),
    /** 내부 페이지 라우트 (예: /resources/nano-banana-vs-duct-tape) */
    internalRoute: text("internal_route"),
    displayOrder: integer("display_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    downloadCount: integer("download_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_resources_category").on(t.category),
    index("idx_resources_display_order").on(t.displayOrder),
    index("idx_resources_published").on(t.isPublished),
  ],
);

export const insertResourceSchema = createInsertSchema(resourcesTable).omit({
  id: true,
  downloadCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resourcesTable.$inferSelect;
