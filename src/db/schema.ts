import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const topicStatus = pgEnum("topic_status", ["todo", "in_progress", "done"]);

export const resourceType = pgEnum("resource_type", [
  "video",
  "article",
  "course",
  "docs",
  "other",
]);

/** Topik / materi yang sedang dipelajari */
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  status: topicStatus("status").notNull().default("todo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/** Log tiap sesi belajar */
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  title: text("title"), // nullable agar sesi lama (sebelum ada judul) tetap valid
  date: date("date").notNull(), // format YYYY-MM-DD
  durationMinutes: integer("duration_minutes").notNull(),
  note: text("note"), // HTML dari rich text editor (disanitasi saat disimpan)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Link course, artikel, video, dll — dilampirkan ke sesi belajar */
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  // nullable: resource lama dibuat sebelum resource menjadi bagian dari sesi
  sessionId: integer("session_id").references(() => studySessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: resourceType("type").notNull().default("other"),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Topic = typeof topics.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type TopicStatus = (typeof topicStatus.enumValues)[number];
export type ResourceType = (typeof resourceType.enumValues)[number];
