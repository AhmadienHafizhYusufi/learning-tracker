import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { imageOwner } from "./note-image";

/** Semua URL gambar di HTML catatan */
export function extractImageUrls(html: string | null | undefined): string[] {
  if (!html) return [];
  return [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

/**
 * Hapus file gambar yang sudah tidak dipakai di catatan mana pun milik user ini.
 * Dipanggil setelah sesi diedit/dihapus supaya kuota penyimpanan tidak habis oleh file yatim.
 * Gagal menghapus tidak dianggap error (paling buruk file tertinggal).
 */
export async function deleteUnusedImages(userId: number, urls: string[]) {
  for (const url of new Set(urls)) {
    if (imageOwner(url) !== userId) continue; // hanya file milik user ini
    try {
      // Gambar yang sama bisa dipakai di catatan lain (copy-paste antar sesi)
      const [stillUsed] = await db
        .select({ id: studySessions.id })
        .from(studySessions)
        .where(and(eq(studySessions.userId, userId), sql`strpos(${studySessions.note}, ${url}) > 0`))
        .limit(1);
      if (stillUsed) continue;

      if (url.startsWith("/uploads/dev/")) {
        await unlink(path.join(process.cwd(), "public", ...url.split("/").filter(Boolean)));
      } else if (process.env.BLOB_READ_WRITE_TOKEN) {
        await del(url);
      }
    } catch (err) {
      console.error("Gagal menghapus gambar lama:", url, err);
    }
  }
}
