import "server-only";
import { toHtml } from "hast-util-to-html";
import { common, createLowlight } from "lowlight";
import { addHeadingIds } from "@/lib/headings";

const lowlight = createLowlight(common);

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Tambahkan syntax highlighting ke setiap <pre><code class="language-x"> */
function highlightCodeBlocks(html: string) {
  return html.replace(
    /<pre><code(?: class="language-([\w-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, lang: string | undefined, body: string) => {
      const code = decode(body);
      const tree =
        lang && lang !== "plaintext" && lowlight.registered(lang)
          ? lowlight.highlight(lang, code)
          : lowlight.highlightAuto(code);
      const label = lang && lang !== "plaintext" ? lang : (tree.data?.language ?? "");
      return `<pre data-lang="${label}"><code class="hljs">${toHtml(tree)}</code></pre>`;
    },
  );
}

/** Bungkus tabel supaya tabel lebar bisa di-scroll ke samping (terutama di HP) */
function wrapTables(html: string) {
  return html.replace(/<table/g, '<div class="table-scroll"><table').replace(/<\/table>/g, "</table></div>");
}

/** Gambar: lazy-load, dan klik untuk membuka ukuran penuh di tab baru */
function enhanceImages(html: string) {
  return html.replace(
    /<img([^>]*?)\ssrc="([^"]+)"([^>]*)>/g,
    (_, a: string, src: string, b: string) =>
      `<a href="${src}" target="_blank" rel="noopener noreferrer" class="note-image"><img${a} src="${src}"${b.replace(/\s*\/$/, "")} loading="lazy" decoding="async"></a>`,
  );
}

/**
 * Render catatan (HTML yang sudah disanitasi saat disimpan).
 * Catatan lama berupa teks polos tetap tampil normal.
 */
export function NoteContent({ html, sessionId }: { html: string; sessionId?: number }) {
  const isHtml = /^\s*</.test(html);
  if (!isHtml) return <p className="note-content text-sm whitespace-pre-wrap">{html}</p>;
  return (
    <div
      className="note-content text-sm"
      dangerouslySetInnerHTML={{
        __html: enhanceImages(wrapTables(highlightCodeBlocks(sessionId ? addHeadingIds(html, sessionId) : html))),
      }}
    />
  );
}
