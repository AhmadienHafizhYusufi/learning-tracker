import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { getUserId } from "@/auth";
import { IMAGE_TYPES, MAX_UPLOAD_BYTES, type ImageType } from "@/lib/note-image";

/**
 * Upload gambar untuk catatan.
 * Body: multipart/form-data dengan field "file". Balasan: { url } atau { error }.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return fail(401, "Silakan login terlebih dahulu");

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return fail(400, "Data upload tidak valid");
  }
  if (!(file instanceof File) || file.size === 0) return fail(400, "File gambar tidak ditemukan");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "Ukuran gambar maksimal 4 MB");

  const bytes = Buffer.from(await file.arrayBuffer());
  // Cek isi file (bukan cuma nama/MIME dari browser) — SVG & file lain ditolak
  const type = sniffImageType(bytes);
  if (!type) return fail(415, "Format tidak didukung. Gunakan PNG, JPG, WebP, atau GIF.");

  const name = `${crypto.randomUUID()}.${IMAGE_TYPES[type]}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`notes/${userId}/${name}`, bytes, {
        access: "public",
        contentType: type,
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365, // nama file unik → aman di-cache lama
      });
      return Response.json({ url: blob.url });
    }

    // Development tanpa Vercel Blob: simpan ke public/uploads/dev (sudah di .gitignore)
    if (process.env.NODE_ENV !== "production") {
      const dir = path.join(process.cwd(), "public", "uploads", "dev", String(userId));
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), bytes);
      return Response.json({ url: `/uploads/dev/${userId}/${name}` });
    }
  } catch (err) {
    console.error("Upload gambar gagal:", err);
    return fail(502, "Gagal menyimpan gambar. Coba lagi.");
  }

  return fail(503, "Penyimpanan gambar belum diatur (BLOB_READ_WRITE_TOKEN).");
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

function sniffImageType(b: Buffer): ImageType | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}
