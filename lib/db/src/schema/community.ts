import { pgTable, serial, text, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const communityPostsTable = pgTable(
  "community_posts",
  {
    id: serial("id").primaryKey(),
    authorId: uuid("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    bodyHtml: text("body_html"),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_community_posts_author").on(t.authorId),
    index("idx_community_posts_created").on(t.createdAt),
  ],
);

export const communityCommentsTable = pgTable(
  "community_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => communityPostsTable.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    parentCommentId: integer("parent_comment_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_community_comments_post").on(t.postId),
    index("idx_community_comments_parent").on(t.parentCommentId),
  ],
);

export const insertCommunityPostSchema = createInsertSchema(communityPostsTable).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPostsTable.$inferSelect;

export const insertCommunityCommentSchema = createInsertSchema(communityCommentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCommunityComment = z.infer<typeof insertCommunityCommentSchema>;
export type CommunityComment = typeof communityCommentsTable.$inferSelect;
