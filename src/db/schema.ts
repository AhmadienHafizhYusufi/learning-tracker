import {
  boolean,
  date,
  index,
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

/** Pengguna aplikasi — dibuat otomatis saat pertama kali login dengan GitHub */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // ID numerik GitHub: tidak berubah walau username diganti
  githubId: text("github_id").notNull().unique(),
  login: text("login").notNull(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

/*
 * Setiap tabel data punya user_id. Sesi & resource sebenarnya bisa ditelusuri
 * lewat topik, tapi user_id langsung di tiap tabel membuat filter kepemilikan
 * sederhana dan sulit terlewat: WHERE id = ? AND user_id = ?
 */
const ownerColumn = () =>
  integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

/** Topik / materi yang sedang dipelajari */
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  userId: ownerColumn(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  status: topicStatus("status").notNull().default("todo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [index("topics_user_id_idx").on(t.userId)]);

/** Log tiap sesi belajar */
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: ownerColumn(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  title: text("title"), // nullable agar sesi lama (sebelum ada judul) tetap valid
  date: date("date").notNull(), // format YYYY-MM-DD
  durationMinutes: integer("duration_minutes").notNull(),
  note: text("note"), // HTML dari rich text editor (disanitasi saat disimpan)
  // Urutan tampilan hasil drag & drop (kecil = di atas). Sesi lama bernilai 0,
  // sehingga tetap diurutkan berdasarkan tanggal sampai user mengubah urutannya.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("study_sessions_user_id_idx").on(t.userId)]);

/** Link course, artikel, video, dll — dilampirkan ke sesi belajar */
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  userId: ownerColumn(),
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
}, (t) => [index("resources_user_id_idx").on(t.userId)]);

export type User = typeof users.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type TopicStatus = (typeof topicStatus.enumValues)[number];
export type ResourceType = (typeof resourceType.enumValues)[number];
