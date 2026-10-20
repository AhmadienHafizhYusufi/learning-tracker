import "server-only";
import { toHtml } from "hast-util-to-html";
import { common, createLowlight } from "lowlight";

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

/**
 * Render catatan (HTML yang sudah disanitasi saat disimpan).
 * Catatan lama berupa teks polos tetap tampil normal.
 */
export function NoteContent({ html }: { html: string }) {
  const isHtml = /^\s*</.test(html);
  if (!isHtml) return <p className="note-content text-sm whitespace-pre-wrap">{html}</p>;
  return (
    <div
      className="note-content text-sm"
      dangerouslySetInnerHTML={{ __html: highlightCodeBlocks(html) }}
    />
  );
}
