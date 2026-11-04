/*
 * Aturan gambar di catatan — dipakai di browser (editor) dan di server (upload, sanitasi).
 * Gambar hanya boleh berasal dari penyimpanan aplikasi ini:
 *  - Vercel Blob:  https://<store>.public.blob.vercel-storage.com/notes/<userId>/<uuid>.<ext>
 *  - Lokal (dev):  /uploads/dev/<userId>/<uuid>.<ext>   (kalau BLOB_READ_WRITE_TOKEN belum di-set)
 * Gambar dari situs lain tidak disimpan (privasi + link bisa mati).
 */

export const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

/** Batas ukuran file yang diterima server (Vercel Functions maksimal ±4,5 MB per request) */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const FILE = String.raw`(\d+)/[0-9a-f-]{36}\.(?:png|jpg|webp|gif)`;
const BLOB_SRC = new RegExp(String.raw`^https://[a-z0-9]+\.public\.blob\.vercel-storage\.com/notes/${FILE}$`);
const LOCAL_SRC = new RegExp(String.raw`^/uploads/dev/${FILE}$`);

export function isAllowedImageSrc(src: string | null | undefined): boolean {
  return !!src && (BLOB_SRC.test(src) || LOCAL_SRC.test(src));
}

/** ID user pemilik gambar (dari path-nya), atau null kalau bukan gambar aplikasi ini */
export function imageOwner(src: string): number | null {
  const m = BLOB_SRC.exec(src) ?? LOCAL_SRC.exec(src);
  return m ? Number(m[1]) : null;
}
