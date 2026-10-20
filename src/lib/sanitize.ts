import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Bersihkan HTML dari rich text editor sebelum disimpan.
 * Hanya tag yang bisa dibuat editor yang diizinkan — mencegah XSS
 * karena catatan nanti dirender dengan dangerouslySetInnerHTML.
 */
export function sanitizeNote(html: string): string | null {
  const clean = sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "code", "pre",
      "h2", "h3", "ul", "ol", "li", "blockquote", "hr", "span",
    ],
    allowedAttributes: {
      code: ["class"],
      span: ["class"],
    },
    allowedClasses: {
      code: [/^language-[\w-]+$/],
      span: [/^hljs(-[\w-]+)?$/],
    },
  }).trim();

  // Editor kosong menghasilkan "<p></p>"
  const textOnly = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim();
  return textOnly === "" ? null : clean;
}

/** Ambil teks polos (untuk preview singkat, mis. di dashboard) */
export function noteToText(html: string | null): string | null {
  if (!html) return null;
  const text = sanitizeHtml(html.replace(/<\/(p|h2|h3|li|pre)>/g, " "), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}
