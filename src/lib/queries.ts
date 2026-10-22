import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { resources, studySessions, topics, type TopicStatus } from "@/db/schema";
import { shiftDate, todayISO } from "./format";
import { noteToText } from "./sanitize";
import { computeStreak, dailyTotals } from "./stats";

/** Agregat per topik: total menit, jumlah sesi, jumlah resource */
// Catatan: nama tabel ditulis eksplisit ("topics"."id") karena Drizzle tidak
// menambahkan prefix tabel pada query satu tabel — tanpa prefix, subquery
// akan membandingkan kolom milik tabelnya sendiri.
// Subquery ini aman tanpa filter user_id karena dikorelasikan ke "topics"."id",
// dan topik yang dipilih sudah difilter per user di query utama.
const topicAggregates = {
  totalMinutes: sql<number>`coalesce((select sum(ss.duration_minutes) from study_sessions ss where ss.topic_id = "topics"."id"), 0)`.mapWith(Number),
  sessionCount: sql<number>`(select count(*) from study_sessions ss where ss.topic_id = "topics"."id")`.mapWith(Number),
  resourceCount: sql<number>`(select count(*) from resources r where r.topic_id = "topics"."id")`.mapWith(Number),
  resourceDone: sql<number>`(select count(*) from resources r where r.topic_id = "topics"."id" and r.done)`.mapWith(Number),
  lastStudied: sql<string | null>`(select max(ss.date)::text from study_sessions ss where ss.topic_id = "topics"."id")`,
};

/*
 * ATURAN: setiap fungsi di file ini WAJIB menerima `userId` dan memfilter
 * dengan kolom user_id. Jangan pernah membuat query tanpa filter user.
 */

export async function getTopicsWithStats(userId: number, status?: TopicStatus) {
  return db
    .select({
      id: topics.id,
      title: topics.title,
      category: topics.category,
      status: topics.status,
      updatedAt: topics.updatedAt,
      ...topicAggregates,
    })
    .from(topics)
    .where(and(eq(topics.userId, userId), status ? eq(topics.status, status) : undefined))
    .orderBy(desc(topics.updatedAt));
}

export type TopicWithStats = Awaited<ReturnType<typeof getTopicsWithStats>>[number];

export async function getAllTopicOptions(userId: number) {
  return db
    .select({ id: topics.id, title: topics.title, status: topics.status })
    .from(topics)
    .where(eq(topics.userId, userId))
    .orderBy(asc(topics.title));
}

export async function getCategories(userId: number) {
  const rows = await db
    .selectDistinct({ category: topics.category })
    .from(topics)
    .where(
      and(
        eq(topics.userId, userId),
        sql`${topics.category} is not null and ${topics.category} <> ''`,
      ),
    )
    .orderBy(asc(topics.category));
  return rows.map((r) => r.category!);
}

export async function getTopic(userId: number, id: number) {
  const [topic] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.id, id), eq(topics.userId, userId)));
  if (!topic) return null;

  const [sessions, links] = await Promise.all([
    db
      .select()
      .from(studySessions)
      .where(and(eq(studySessions.topicId, id), eq(studySessions.userId, userId)))
      .orderBy(desc(studySessions.date), desc(studySessions.createdAt)),
    db
      .select()
      .from(resources)
      .where(and(eq(resources.topicId, id), eq(resources.userId, userId)))
      .orderBy(asc(resources.createdAt)),
  ]);

  // Kelompokkan resource per sesi. Resource lama (tanpa sesi) dipisah.
  const bySession = new Map<number, typeof links>();
  const unattached: typeof links = [];
  for (const r of links) {
    if (r.sessionId == null) unattached.push(r);
    else bySession.set(r.sessionId, [...(bySession.get(r.sessionId) ?? []), r]);
  }

  const totalMinutes = sessions.reduce((s, x) => s + x.durationMinutes, 0);
  return {
    topic,
    sessions: sessions.map((s) => ({ ...s, resources: bySession.get(s.id) ?? [] })),
    unattachedResources: unattached,
    resourceCount: links.length,
    resourceDone: links.filter((r) => r.done).length,
    totalMinutes,
  };
}

export async function getDashboard(userId: number) {
  const today = todayISO();
  const from14 = shiftDate(today, -13);

  const [statusCounts, totals, daily, allDates, recent, inProgress] = await Promise.all([
    db
      .select({ status: topics.status, count: sql<number>`count(*)`.mapWith(Number) })
      .from(topics)
      .where(eq(topics.userId, userId))
      .groupBy(topics.status),
    db
      .select({
        totalMinutes: sql<number>`coalesce(sum(${studySessions.durationMinutes}), 0)`.mapWith(Number),
        sessionCount: sql<number>`count(*)`.mapWith(Number),
        weekMinutes: sql<number>`coalesce(sum(${studySessions.durationMinutes}) filter (where ${studySessions.date} >= ${shiftDate(today, -6)}), 0)`.mapWith(Number),
      })
      .from(studySessions)
      .where(eq(studySessions.userId, userId)),
    db
      .select({
        date: sql<string>`${studySessions.date}::text`,
        minutes: sql<number>`sum(${studySessions.durationMinutes})`.mapWith(Number),
      })
      .from(studySessions)
      .where(and(eq(studySessions.userId, userId), gte(studySessions.date, from14)))
      .groupBy(studySessions.date),
    db
      .selectDistinct({ date: sql<string>`${studySessions.date}::text` })
      .from(studySessions)
      .where(eq(studySessions.userId, userId)),
    db
      .select({
        id: studySessions.id,
        title: studySessions.title,
        date: studySessions.date,
        durationMinutes: studySessions.durationMinutes,
        note: studySessions.note,
        topicId: topics.id,
        topicTitle: topics.title,
      })
      .from(studySessions)
      .innerJoin(topics, eq(studySessions.topicId, topics.id))
      .where(eq(studySessions.userId, userId))
      .orderBy(desc(studySessions.date), desc(studySessions.createdAt))
      .limit(6),
    getTopicsWithStats(userId, "in_progress"),
  ]);

  const count = (s: TopicStatus) => statusCounts.find((r) => r.status === s)?.count ?? 0;
  const totalTopics = statusCounts.reduce((s, r) => s + r.count, 0);
  const done = count("done");

  return {
    today,
    topics: {
      total: totalTopics,
      todo: count("todo"),
      inProgress: count("in_progress"),
      done,
      percentDone: totalTopics ? Math.round((done / totalTopics) * 100) : 0,
    },
    time: totals[0],
    streak: computeStreak(new Set(allDates.map((r) => r.date)), today),
    last14: dailyTotals(daily, today, 14),
    recent: recent.map((r) => ({ ...r, note: noteToText(r.note) })),
    inProgress,
  };
}

