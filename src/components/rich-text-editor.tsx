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
    <div className="overflow-hidden rounded-lg border border-line bg-paper transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 border-b border-line" />}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
});

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

function Toolbar({ editor }: { editor: Editor }) {
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

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-card px-1.5 py-1">
      <Btn label="Tebal (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn label="Miring (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <i className="font-serif">I</i>
      </Btn>
      <Btn label="Garis bawah (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <u>U</u>
      </Btn>
      <Btn label="Coret" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <s>S</s>
      </Btn>
      <Sep />
      <Btn label="Judul" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        H1
      </Btn>
      <Btn label="Subjudul" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        H2
      </Btn>
      <Sep />
      <Btn label="Daftar poin" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <ListIcon />
      </Btn>
      <Btn label="Daftar bernomor" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <span className="num text-[11px]">1.</span>
      </Btn>
      <Btn label="Kutipan" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <span className="font-serif text-base leading-none">&ldquo;</span>
      </Btn>
      <Sep />
      <Btn label="Kode inline (Ctrl+E)" active={s.code} onClick={() => chain().toggleCode().run()}>
        <span className="num text-[11px]">`x`</span>
      </Btn>
      <Btn
        label="Blok kode"
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
        <Btn label="Urungkan (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          ↶
        </Btn>
        <Btn label="Ulangi (Ctrl+Y)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          ↷
        </Btn>
      </div>
    </div>
  );
}

function Btn({
  children,
  label,
  active,
  disabled,
  wide,
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 items-center justify-center gap-1 rounded-md text-sm transition disabled:opacity-35 ${
        wide ? "px-2" : "w-7"
      } ${active ? "bg-ink text-paper" : "text-ink hover:bg-paper"}`}
    >
      {children}
    </button>
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
