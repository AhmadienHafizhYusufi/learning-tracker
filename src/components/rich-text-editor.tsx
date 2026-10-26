"use client";

import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
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
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        class: "rte-content min-h-28 px-3 py-2.5 text-sm outline-none",
      },
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
    </div>
  );
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
  keys,
  isMac,
  hint,
  align = "center",
  active,
  disabled,
  wide,
  onClick,
}: {
  children: ReactNode;
  label: string;
  keys: readonly string[];
  isMac: boolean;
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
  const position =
    align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={`${label} (${shortcut})`}
        aria-keyshortcuts={keys.map((k) => (k === "Mod" ? (isMac ? "Meta" : "Control") : k)).join("+")}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex h-7 items-center justify-center gap-1 rounded-md text-sm transition disabled:opacity-35 ${
          wide ? "px-2" : "w-7"
        } ${active ? "bg-ink text-paper" : "text-ink hover:bg-paper"}`}
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
          <span className="flex gap-0.5">
            {keys.map((k) => (
              <kbd
                key={k}
                className="rounded border border-paper/25 bg-paper/10 px-1 font-mono text-[10px] leading-4"
              >
                {formatKey(k, isMac)}
              </kbd>
            ))}
          </span>
        </span>
        {hint && <span className="mt-0.5 block text-[11px] text-paper/70">{hint}</span>}
      </span>
    </span>
  );
}

function Sep() {
  return <span className="mx-1 h-4 w-px bg-line" />;
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
