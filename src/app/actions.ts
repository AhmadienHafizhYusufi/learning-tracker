"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  resources,
  resourceType,
  studySessions,
  topics,
  topicStatus,
} from "@/db/schema";
import { todayISO } from "@/lib/format";
import { sanitizeNote } from "@/lib/sanitize";
import { getUserId } from "@/auth";

// ---------- Helpers ----------

/**
 * Server action bisa dipanggil langsung lewat HTTP dengan ID apa saja,
 * jadi setiap action:
 *  1. mengambil userId dari session (bukan dari form!), dan
 *  2. menyaring setiap UPDATE/DELETE dengan `id = ? AND user_id = ?`,
 * sehingga user tidak bisa menyentuh data milik user lain.
 */
async function requireUser(): Promise<number> {
  const userId = await getUserId();
  if (!userId) throw new Error("Silakan login terlebih dahulu");
  return userId;
}

/** Pastikan topik ada dan milik user ini */
async function ownsTopic(userId: number, topicId: number) {
  const [row] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
  return Boolean(row);
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const id = z.coerce.number().int().positive();

function parse<T extends z.ZodType>(schema: T, formData: FormData): z.infer<T> {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join(", "));
  }
  return result.data;
}

function refresh(topicId?: number) {
  revalidatePath("/");
  revalidatePath("/topics");
  if (topicId) revalidatePath(`/topics/${topicId}`);
}

// ---------- Topik ----------

const topicSchema = z.object({
  title: z.string().trim().min(1, "Judul topik wajib diisi").max(200),
  category: optionalText,
  description: optionalText,
  status: z.enum(topicStatus.enumValues).default("todo"),
});

export async function createTopic(formData: FormData) {
  const userId = await requireUser();
  const data = parse(topicSchema, formData);
  const [row] = await db
    .insert(topics)
    .values({ ...data, userId, completedAt: data.status === "done" ? new Date() : null })
    .returning({ id: topics.id });
  refresh();
  redirect(`/topics/${row.id}`);
}

export async function updateTopic(formData: FormData) {
  const userId = await requireUser();
  const { id: topicId, ...data } = parse(topicSchema.extend({ id }), formData);
  await db
    .update(topics)
    .set({
      ...data,
      updatedAt: new Date(),
      completedAt: data.status === "done" ? new Date() : null,
    })
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
  refresh(topicId);
}

export async function setTopicStatus(formData: FormData) {
  const userId = await requireUser();
  const { id: topicId, status } = parse(
    z.object({ id, status: z.enum(topicStatus.enumValues) }),
    formData,
  );
  await db
    .update(topics)
    .set({ status, updatedAt: new Date(), completedAt: status === "done" ? new Date() : null })
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
  refresh(topicId);
}

export async function deleteTopic(formData: FormData) {
  const userId = await requireUser();
  const { id: topicId } = parse(z.object({ id }), formData);
  await db.delete(topics).where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
  refresh();
  redirect("/topics");
}

// ---------- Sesi belajar ----------

const sessionSchema = z.object({
  topicId: id,
  title: z.string().trim().min(1, "Judul sesi wajib diisi").max(200),
  date: z.iso.date("Format tanggal tidak valid").default(() => todayISO()),
  durationMinutes: z.coerce
    .number({ error: "Durasi wajib diisi" })
    .int()
    .min(1, "Durasi minimal 1 menit")
    .max(24 * 60, "Durasi maksimal 24 jam"),
  note: z.string().max(100_000, "Catatan terlalu panjang").optional(),
});

const sessionResourceSchema = z.object({
  title: z.string().trim().min(1, "Judul resource wajib diisi").max(200),
  url: z.url("URL resource tidak valid"),
  type: z.enum(resourceType.enumValues).default("other"),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

type SessionResource = z.infer<typeof sessionResourceSchema>;

/** Baca resource dari field berulang: resourceTitle, resourceUrl, resourceType */
function parseSessionResources(formData: FormData): SessionResource[] | { error: string } {
  const titles = formData.getAll("resourceTitle").map(String);
  const urls = formData.getAll("resourceUrl").map(String);
  const types = formData.getAll("resourceType").map(String);
  const links: SessionResource[] = [];
  for (let i = 0; i < titles.length; i++) {
    // Baris yang judul & URL-nya kosong diabaikan
    if (!titles[i]?.trim() && !urls[i]?.trim()) continue;
    const r = sessionResourceSchema.safeParse({
      title: titles[i] || urls[i],
      url: urls[i],
      type: types[i] || undefined,
    });
    if (!r.success) return { error: `Resource #${i + 1}: ${r.error.issues[0].message}` };
    links.push(r.data);
  }
  return links;
}

/**
 * Catat sesi + resource-nya. Mengembalikan hasil (bukan throw) supaya
 * pesan error bisa ditampilkan langsung di form.
 * Resource dikirim sebagai field berulang: resourceTitle, resourceUrl, resourceType.
 */
export async function logSession(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { note, ...data } = parsed.data;

  const links = parseSessionResources(formData);
  if ("error" in links) return { ok: false, error: links.error };

  // topicId datang dari form → pastikan topiknya milik user ini
  if (!(await ownsTopic(userId, data.topicId))) return { ok: false, error: "Topik tidak ditemukan" };

  await db.transaction(async (tx) => {
    // Sesi baru ditaruh paling atas: posisinya 1 lebih kecil dari posisi terkecil di topik ini
    const [{ minPos }] = await tx
      .select({ minPos: sql<number>`coalesce(min(${studySessions.position}), 0)`.mapWith(Number) })
      .from(studySessions)
      .where(and(eq(studySessions.topicId, data.topicId), eq(studySessions.userId, userId)));

    const [session] = await tx
      .insert(studySessions)
      .values({ ...data, userId, position: minPos - 1, note: note ? sanitizeNote(note) : null })
      .returning({ id: studySessions.id });

    if (links.length) {
      await tx
        .insert(resources)
        .values(
          links.map((l) => ({ ...l, userId, topicId: data.topicId, sessionId: session.id })),
        );
    }

    // Topik yang baru dicatat sesinya otomatis jadi "sedang dipelajari"
    const [topic] = await tx
      .select({ status: topics.status })
      .from(topics)
      .where(and(eq(topics.id, data.topicId), eq(topics.userId, userId)));
    await tx
      .update(topics)
      .set({
        updatedAt: new Date(),
        ...(topic?.status === "todo" ? { status: "in_progress" as const } : {}),
      })
      .where(and(eq(topics.id, data.topicId), eq(topics.userId, userId)));
  });

  refresh(data.topicId);
  return { ok: true };
}

/** Edit sesi yang sudah ada: judul, catatan, durasi, tanggal + resource baru */
export async function updateSession(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = sessionSchema.extend({ id }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id: sessionId, topicId, note, ...data } = parsed.data;

  const links = parseSessionResources(formData);
  if ("error" in links) return { ok: false, error: links.error };

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(studySessions)
      .set({ ...data, note: note ? sanitizeNote(note) : null })
      // topicId ikut dicek supaya sesi topik lain tidak bisa diubah lewat form ini
      .where(
        and(
          eq(studySessions.id, sessionId),
          eq(studySessions.topicId, topicId),
          eq(studySessions.userId, userId),
        ),
      )
      .returning({ id: studySessions.id });
    if (!rows.length) return false;

    if (links.length) {
      await tx.insert(resources).values(links.map((l) => ({ ...l, userId, topicId, sessionId })));
    }
    await tx
      .update(topics)
      .set({ updatedAt: new Date() })
      .where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
    return true;
  });

  if (!updated) return { ok: false, error: "Sesi tidak ditemukan" };
  refresh(topicId);
  return { ok: true };
}

/**
 * Simpan urutan sesi hasil drag & drop.
 * `orderedIds` = semua ID sesi di topik ini, sesuai urutan baru (atas → bawah).
 */
export async function reorderSessions(topicId: number, orderedIds: number[]): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = z
    .object({ topicId: id, orderedIds: z.array(id).min(1).max(1000) })
    .safeParse({ topicId, orderedIds });
  if (!parsed.success) return { ok: false, error: "Data urutan tidak valid" };
  const ids = parsed.data.orderedIds;
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Data urutan tidak valid" };

  // Pastikan semua ID memang sesi milik user ini di topik ini
  const owned = await db
    .select({ id: studySessions.id })
    .from(studySessions)
    .where(
      and(
        inArray(studySessions.id, ids),
        eq(studySessions.topicId, parsed.data.topicId),
        eq(studySessions.userId, userId),
      ),
    );
  if (owned.length !== ids.length) return { ok: false, error: "Sesi tidak ditemukan" };

  // Satu UPDATE untuk semua baris: position = urutan di array
  const cases = sql.join(
    // ::int wajib — tanpa cast, Postgres menganggap parameter sebagai text
    ids.map((sid, i) => sql`when ${sid}::int then ${i}::int`),
    sql` `,
  );
  await db
    .update(studySessions)
    .set({ position: sql`case ${studySessions.id} ${cases} end` })
    .where(and(inArray(studySessions.id, ids), eq(studySessions.userId, userId)));

  refresh(parsed.data.topicId);
  return { ok: true };
}

export async function deleteSession(formData: FormData) {
  const userId = await requireUser();
  const { id: sessionId, topicId } = parse(z.object({ id, topicId: id }), formData);
  await db
    .delete(studySessions)
    .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)));
  refresh(topicId);
}

// ---------- Resource ----------

export async function toggleResource(formData: FormData) {
  const userId = await requireUser();
  const { id: resourceId, topicId, done } = parse(
    z.object({ id, topicId: id, done: z.enum(["true", "false"]) }),
    formData,
  );
  await db
    .update(resources)
    .set({ done: done === "true" })
    .where(and(eq(resources.id, resourceId), eq(resources.userId, userId)));
  refresh(topicId);
}

export async function deleteResource(formData: FormData) {
  const userId = await requireUser();
  const { id: resourceId, topicId } = parse(z.object({ id, topicId: id }), formData);
  await db
    .delete(resources)
    .where(and(eq(resources.id, resourceId), eq(resources.userId, userId)));
  refresh(topicId);
}
