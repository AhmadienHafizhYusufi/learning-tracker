import "server-only";

/*
 * Tombol "H1" di editor menyimpan heading sebagai <h2> di HTML
 * (h1 sudah dipakai untuk judul halaman). File ini mengambil heading tsb
 * untuk daftar isi, dan memberi id supaya bisa dituju dengan link #anchor.
 */

const H2 = /<h2>([\s\S]*?)<\/h2>/g;

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, "") // buang tag di dalam heading (mis. <strong>, <code>)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

/** ID anchor untuk heading ke-n dalam catatan sebuah sesi */
export function headingId(sessionId: number, index: number) {
  return `sesi-${sessionId}-h${index + 1}`;
}

/** Teks semua heading H1 (= <h2>) dalam catatan, berurutan */
export function extractNoteHeadings(html: string | null): string[] {
  if (!html) return [];
  return [...html.matchAll(H2)].map((m) => decode(m[1])).filter(Boolean);
}

/** Tambahkan id ke setiap <h2> supaya bisa di-scroll dari daftar isi */
export function addHeadingIds(html: string, sessionId: number): string {
  let i = 0;
  return html.replace(H2, (_, inner: string) => {
    // Heading kosong tidak masuk daftar isi → jangan menggeser penomoran
    if (!decode(inner)) return `<h2>${inner}</h2>`;
    return `<h2 id="${headingId(sessionId, i++)}">${inner}</h2>`;
  });
}
