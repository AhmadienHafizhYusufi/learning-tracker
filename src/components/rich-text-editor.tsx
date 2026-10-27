"use client";

import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { TableKit } from "@tiptap/extension-table";
import { Caption } from "./caption-extension";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { DOMParser as PMDOMParser, Fragment, Slice, type ResolvedPos } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";

const lowlight = createLowlight(common);

/** Bahasa yang bisa dipilih untuk blok kode */
const LANGUAGES = [
  { value: "plaintext", label: "Plain text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "xml", label: "HTML / JSX" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
];

export type RichTextEditorHandle = { clear: () => void };

/**
 * Editor catatan sederhana ala Word: heading, bold, italic, underline,
 * list, quote, dan blok kode dengan syntax highlighting.
 * Isi editor dikirim sebagai HTML lewat hidden input `name`.
 */
export const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  { name: string; placeholder?: string; initialContent?: string }
>(function RichTextEditor({ name, placeholder, initialContent = "" }, ref) {
  const [html, setHtml] = useState(initialContent);

  const editor = useEditor({
    immediatelyRender: false, // wajib di Next.js agar tidak hydration mismatch
    // Catatan lama berupa teks polos dibungkus <p> agar terbaca editor
    content: /^\s*</.test(initialContent) ? initialContent : initialContent ? `<p>${escapeHtml(initialContent)}</p>` : "",
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false, // diganti CodeBlockLowlight
        link: false,
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "javascript" }),
      // Tabel: Table + TableRow + TableHeader + TableCell.
      // Paste dari Word / Google Docs / Excel / Sheets / web otomatis jadi tabel (lewat HTML clipboard).
      TableKit.configure({ table: { resizable: false } }),
      Caption,
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        class: "rte-content min-h-28 px-3 py-2.5 text-sm outline-none",
      },
      // Dipakai hanya saat clipboard berisi teks polos (tanpa HTML)
      clipboardTextParser: parsePlainTextPaste,
    },
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
  });

  useImperativeHandle(ref, () => ({
    clear: () => {
      editor?.commands.clearContent(true);
      setHtml("");
    },
  }));

  return (
    // Tanpa overflow-hidden supaya tooltip tombol tidak terpotong
    <div className="rounded-lg border border-line bg-paper transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      <EditorContent editor={editor} />
      {/* Toolbar di bawah & sticky: tetap terlihat di bawah layar walau catatannya panjang */}
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 rounded-b-lg border-t border-line bg-card" />}
      <input type="hidden" name={name} value={html} />
    </div>
  );
});

/**
 * Paste teks polos. Kalau teksnya berbentuk tabel (kolom dipisah Tab, ≥ 2 baris —
 * format yang dihasilkan saat copy dari spreadsheet/aplikasi tanpa HTML),
 * ubah jadi tabel. Selain itu: tiap baris jadi paragraf (perilaku normal).
 */
function parsePlainTextPaste(text: string, $context: ResolvedPos, _plain: boolean, view: EditorView): Slice {
  const { schema } = view.state;
  // Di dalam blok kode: tempel apa adanya, jangan diubah jadi tabel
  if ($context.parent.type.spec.code) {
    return text ? new Slice(Fragment.from(schema.text(text)), 0, 0) : Slice.empty;
  }

  const lines = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const looksLikeTable = lines.length >= 2 && lines.every((l) => l.includes("\t"));
  const dom = document.createElement("div");

  // Sudah di dalam sel tabel → jangan bikin tabel bersarang
  const $from = view.state.selection.$from;
  let insideCell = false;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.spec.tableRole === "cell" || $from.node(d).type.spec.tableRole === "header_cell") insideCell = true;
  }

  if (looksLikeTable && !insideCell) {
    const rows = lines.map((l) => l.split("\t"));
    const cols = Math.max(...rows.map((r) => r.length));
    const table = document.createElement("table");
    rows.forEach((cells, r) => {
      const tr = document.createElement("tr");
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(r === 0 ? "th" : "td"); // baris pertama = header
        const para = document.createElement("p");
        para.textContent = cells[c]?.trim() ?? "";
        cell.appendChild(para);
        tr.appendChild(cell);
      }
      table.appendChild(tr);
    });
    dom.appendChild(table);
  } else {
    for (const line of lines) {
      const para = document.createElement("p");
      para.textContent = line;
      dom.appendChild(para);
    }
  }
  return PMDOMParser.fromSchema(schema).parseSlice(dom, { preserveWhitespace: true, context: $context });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

/**
 * Shortcut bawaan Tiptap (dicek dari source extension-nya).
 * "Mod" = Ctrl di Windows/Linux, ⌘ di Mac.
 */
const SHORTCUTS = {
  bold: ["Mod", "B"],
  italic: ["Mod", "I"],
  underline: ["Mod", "U"],
  strike: ["Mod", "Shift", "S"],
  h1: ["Mod", "Alt", "2"], // tombol "H1" = heading level 2 di HTML
  h2: ["Mod", "Alt", "3"],
  bullet: ["Mod", "Shift", "8"],
  ordered: ["Mod", "Shift", "7"],
  quote: ["Mod", "Shift", "B"],
  code: ["Mod", "E"],
  codeBlock: ["Mod", "Alt", "C"],
  caption: ["Mod", "Alt", "9"],
  undo: ["Mod", "Z"],
  redo: ["Mod", "Shift", "Z"],
} as const;

type ShortcutKey = keyof typeof SHORTCUTS;

function Toolbar({ editor }: { editor: Editor }) {
  // Toolbar hanya dirender di browser (setelah editor siap), jadi aman membaca navigator
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  // Re-render toolbar hanya saat state format berubah
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      language: (e.getAttributes("codeBlock").language as string | undefined) ?? "plaintext",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      inTable: e.isActive("table"),
      caption: e.isActive("caption"),
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
    }),
  });

  const chain = () => editor.chain().focus();
  const btn = (key: ShortcutKey) => ({ keys: SHORTCUTS[key], isMac });

  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-0.5 rounded-b-lg border-t border-line bg-card px-1.5 py-1">
      <Btn {...btn("bold")} label="Tebal" hint="atau ketik **teks**" align="start" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn {...btn("italic")} label="Miring" hint="atau ketik *teks*" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <i className="font-serif">I</i>
      </Btn>
      <Btn {...btn("underline")} label="Garis bawah" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <u>U</u>
      </Btn>
      <Btn {...btn("strike")} label="Coret" hint="atau ketik ~~teks~~" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <s>S</s>
      </Btn>
      <Sep />
      <Btn {...btn("h1")} label="Judul" hint="atau ketik ## di awal baris" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        H1
      </Btn>
      <Btn {...btn("h2")} label="Subjudul" hint="atau ketik ### di awal baris" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        H2
      </Btn>
      <Btn
        {...btn("caption")}
        label="Caption (teks keterangan)"
        hint="Teks kecil & redup, mis. keterangan di bawah tabel. Enter di akhir = kembali ke teks biasa"
        active={s.caption}
        wide
        onClick={() => chain().toggleCaption().run()}
      >
        <span className="text-[11px] italic">Caption</span>
      </Btn>
      <Sep />
      <Btn {...btn("bullet")} label="Daftar poin" hint="atau ketik - di awal baris" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <ListIcon />
      </Btn>
      <Btn {...btn("ordered")} label="Daftar bernomor" hint="atau ketik 1. di awal baris" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <span className="num text-[11px]">1.</span>
      </Btn>
      <Btn {...btn("quote")} label="Kutipan" hint="atau ketik > di awal baris" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <span className="font-serif text-base leading-none">&ldquo;</span>
      </Btn>
      <Sep />
      <Btn {...btn("code")} label="Kode inline" hint="atau ketik `teks`" active={s.code} onClick={() => chain().toggleCode().run()}>
        <span className="num text-[11px]">`x`</span>
      </Btn>
      <Btn
        {...btn("codeBlock")}
        label="Blok kode"
        hint="atau ketik ``` lalu spasi"
        active={s.codeBlock}
        wide
        onClick={() => chain().toggleCodeBlock().run()}
      >
        <span className="num text-[11px]">{"</>"}</span>
        <span className="text-xs">Kode</span>
      </Btn>
      <Btn
        isMac={isMac}
        label="Sisipkan tabel 3×3"
        hint="atau paste tabel dari Word, Google Docs, Excel, Sheets"
        active={s.inTable}
        wide
        onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon />
        <span className="text-xs">Tabel</span>
      </Btn>
      {s.codeBlock && (
        <select
          aria-label="Bahasa blok kode"
          value={s.language}
          onChange={(e) => chain().updateAttributes("codeBlock", { language: e.target.value }).run()}
          className="ml-1 rounded-md border border-line bg-paper px-1.5 py-1 text-xs outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      )}
      <div className="ml-auto flex gap-0.5">
        <Btn {...btn("undo")} label="Urungkan" align="end" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          ↶
        </Btn>
        <Btn {...btn("redo")} label="Ulangi" align="end" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          ↷
        </Btn>
      </div>

      {/* Kontrol tabel: hanya muncul saat kursor ada di dalam tabel */}
      {s.inTable && (
        <div className="flex w-full flex-wrap items-center gap-0.5 border-t border-line pt-1">
          <span className="mr-1 px-1 text-[11px] font-medium tracking-wide text-muted uppercase">Tabel</span>
          <TableBtn isMac={isMac} label="Tambah baris di bawah" hint="Tab di sel terakhir juga menambah baris" align="start" onClick={() => chain().addRowAfter().run()}>
            + Baris
          </TableBtn>
          <TableBtn isMac={isMac} label="Tambah kolom di kanan" onClick={() => chain().addColumnAfter().run()}>
            + Kolom
          </TableBtn>
          <TableBtn isMac={isMac} label="Hapus baris ini" onClick={() => chain().deleteRow().run()}>
            − Baris
          </TableBtn>
          <TableBtn isMac={isMac} label="Hapus kolom ini" onClick={() => chain().deleteColumn().run()}>
            − Kolom
          </TableBtn>
          <Sep />
          <TableBtn isMac={isMac} label="Jadikan / batalkan baris pertama sebagai header" onClick={() => chain().toggleHeaderRow().run()}>
            Header
          </TableBtn>
          <TableBtn
            isMac={isMac}
            label={s.canSplit ? "Pisahkan sel" : "Gabungkan sel"}
            hint="Pilih beberapa sel dulu dengan drag atau Shift+klik"
            disabled={!s.canMerge && !s.canSplit}
            onClick={() => chain().mergeOrSplit().run()}
          >
            {s.canSplit ? "Pisah sel" : "Gabung sel"}
          </TableBtn>
          <TableBtn isMac={isMac} label="Hapus seluruh tabel" align="end" danger onClick={() => chain().deleteTable().run()}>
            Hapus tabel
          </TableBtn>
        </div>
      )}
    </div>
  );
}

/** Tombol teks kecil untuk baris kontrol tabel */
function TableBtn({ danger, ...props }: Omit<Parameters<typeof Btn>[0], "wide"> & { danger?: boolean }) {
  return <Btn {...props} wide className={danger ? "text-danger hover:bg-danger/10" : undefined} />;
}

function formatKey(key: string, isMac: boolean) {
  if (key === "Mod") return isMac ? "⌘" : "Ctrl";
  if (key === "Alt") return isMac ? "⌥" : "Alt";
  if (key === "Shift") return isMac ? "⇧" : "Shift";
  return key;
}

function Btn({
  children,
  label,
  keys = [],
  isMac,
  className,
  hint,
  align = "center",
  active,
  disabled,
  wide,
  onClick,
}: {
  children: ReactNode;
  label: string;
  keys?: readonly string[];
  isMac: boolean;
  className?: string;
  /** Cara alternatif (markdown) — ditampilkan kecil di tooltip */
  hint?: string;
  /** Posisi tooltip relatif terhadap tombol, supaya tidak keluar layar di tepi */
  align?: "start" | "center" | "end";
  active?: boolean;
  disabled?: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  const shortcut = keys.map((k) => formatKey(k, isMac)).join(isMac ? "" : "+");
  const hasShortcut = keys.length > 0;
  const position =
    align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={hasShortcut ? `${label} (${shortcut})` : label}
        aria-keyshortcuts={
          hasShortcut ? keys.map((k) => (k === "Mod" ? (isMac ? "Meta" : "Control") : k)).join("+") : undefined
        }
        aria-pressed={active}
        disabled={disabled}
        // Jangan rebut fokus dari editor saat diklik mouse — kalau fokus pindah ke tombol,
        // huruf yang diketik tepat setelah klik bisa hilang. (Tab/keyboard tetap bisa fokus.)
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={`inline-flex h-7 items-center justify-center gap-1 rounded-md text-sm transition disabled:opacity-35 ${
          wide ? "px-2" : "w-7"
        } ${active ? "bg-ink text-paper" : (className ?? "text-ink hover:bg-paper")}`}
      >
        {children}
      </button>
      {/* Tooltip: muncul di atas tombol saat hover atau fokus keyboard */}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-56 rounded-md bg-ink px-2.5 py-1.5 text-left text-xs text-paper opacity-0 shadow-lg transition-opacity delay-0 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-has-[:focus-visible]/tip:opacity-100 ${position}`}
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          {hasShortcut && <span className="flex gap-0.5">
            {keys.map((k) => (
              <kbd
                key={k}
                className="rounded border border-paper/25 bg-paper/10 px-1 font-mono text-[10px] leading-4"
              >
                {formatKey(k, isMac)}
              </kbd>
            ))}
          </span>}
        </span>
        {hint && <span className="mt-0.5 block text-[11px] text-paper/70">{hint}</span>}
      </span>
    </span>
  );
}

function Sep() {
  return <span className="mx-1 h-4 w-px bg-line" />;
}

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M1.5 6.5h13M1.5 10h13M6 6.5v7M10.5 6.5v7" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="2.5" cy="4" r="1.3" />
      <circle cx="2.5" cy="8" r="1.3" />
      <circle cx="2.5" cy="12" r="1.3" />
      <rect x="6" y="3.25" width="9" height="1.5" rx=".75" />
      <rect x="6" y="7.25" width="9" height="1.5" rx=".75" />
      <rect x="6" y="11.25" width="9" height="1.5" rx=".75" />
    </svg>
  );
}
