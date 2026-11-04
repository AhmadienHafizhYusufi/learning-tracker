import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./note-image";

/** Sisi terpanjang gambar setelah dikecilkan — cukup tajam untuk catatan, hemat kuota */
const MAX_DIMENSION = 1600;

export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

/**
 * Kecilkan & kompres gambar di browser (jadi WebP), lalu upload ke /api/upload.
 * GIF tidak dikompres supaya animasinya tetap jalan.
 */
export async function uploadImage(file: File): Promise<string> {
  const ready = await compress(file);
  if (!(ready.type in IMAGE_TYPES)) throw new Error("Format tidak didukung. Gunakan PNG, JPG, WebP, atau GIF.");
  if (ready.size > MAX_UPLOAD_BYTES) throw new Error("Ukuran gambar maksimal 4 MB");

  const body = new FormData();
  body.append("file", ready, ready.name);
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body });
  } catch {
    throw new Error("Koneksi terputus. Coba lagi.");
  }
  // Sesi login habis → proxy mengalihkan ke halaman login
  if (res.redirected && new URL(res.url).pathname === "/login") {
    throw new Error("Sesi login habis. Muat ulang halaman lalu login lagi.");
  }
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) throw new Error(data?.error ?? "Gagal mengunggah gambar");
  return data.url;
}

async function compress(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browser tidak bisa membaca (mis. HEIC) → kirim apa adanya, server yang memutuskan
    return file;
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  // Browser lama tanpa encoder WebP mengembalikan PNG — pakai yang lebih kecil
  if (!blob || (blob.size >= file.size && scale === 1 && file.type in IMAGE_TYPES)) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "gambar";
  return new File([blob], `${base}.${blob.type === "image/webp" ? "webp" : "png"}`, { type: blob.type });
}
