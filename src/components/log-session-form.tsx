"use client";

import { useId, useRef, useState, useTransition } from "react";
import { logSession, updateSession } from "@/app/actions";
import type { ResourceType } from "@/db/schema";
import { RESOURCE_LABEL, todayISO } from "@/lib/format";
import { RichTextEditor, type RichTextEditorHandle } from "./rich-text-editor";

/** Data sesi yang sedang diedit (mode edit) */
export type EditableSessionData = {
  id: number;
  title: string | null;
  note: string | null;
  durationMinutes: number;
  date: string;
};

type Props = (
  | { topicId: number; topics?: never }
  | { topicId?: never; topics: { id: number; title: string }[] }
) & {
  /** Kalau diisi, form berjalan dalam mode edit untuk sesi ini */
  session?: EditableSessionData;
  /** Dipanggil setelah simpan berhasil / tombol Batal (mode edit) */
  onDone?: () => void;
};

/**
 * Form catat sesi: judul, catatan (rich text + blok kode), durasi, tanggal,
 * dan resource/link yang dipakai di sesi itu.
 * Kalau `topicId` diberikan, pilihan topik disembunyikan.
 */
export function LogSessionForm(props: Props) {
  const { session, onDone } = props;
  const isEdit = Boolean(session);
  const uid = useId(); // id unik: bisa ada beberapa form di satu halaman
  const today = todayISO();
  const formRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [rows, setRows] = useState<number[]>([]);
  const nextRow = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addRow = () => setRows((r) => [...r, nextRow.current++]);
  const removeRow = (key: number) => setRows((r) => r.filter((k) => k !== key));

  // Pakai onSubmit (bukan `action`) supaya isi form tidak di-reset otomatis
  // oleh React ketika validasi server gagal.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = isEdit ? await updateSession(formData) : await logSession(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (isEdit) {
        onDone?.();
        return;
      }
      formRef.current?.reset();
      editorRef.current?.clear();
      setRows([]);
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
      {props.topicId ? (
        <>
          <input type="hidden" name="topicId" value={props.topicId} />
          {session && <input type="hidden" name="id" value={session.id} />}
        </>
      ) : (
        <div className="col-span-2">
          <label className="label" htmlFor={`${uid}-topic`}>
            Topik
          </label>
          <select id={`${uid}-topic`} name="topicId" required className="input" defaultValue="">
            <option value="" disabled>
              Pilih topik…
            </option>
            {(props.topics ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="col-span-2">
        <label className="label" htmlFor={`${uid}-title`}>
          Judul sesi
        </label>
        <input
          id={`${uid}-title`}
          name="title"
          required
          defaultValue={session?.title ?? ""}
          maxLength={200}
          placeholder="mis. Belajar useEffect"
          className="input"
        />
      </div>
      <div className="col-span-2">
        <span className="label">Catatan</span>
        <RichTextEditor
          ref={editorRef}
          name="note"
          initialContent={session?.note ?? ""}
          placeholder="Apa yang dipelajari? Klik </> Kode untuk menyisipkan potongan kode."
        />
      </div>
      <div>
        <label className="label" htmlFor={`${uid}-duration`}>
          Durasi (menit)
        </label>
        <input
          id={`${uid}-duration`}
          name="durationMinutes"
          defaultValue={session?.durationMinutes}
          type="number"
          min={1}
          max={1440}
          step={1}
          required
          placeholder="45"
          className="input num"
        />
      </div>
      <div>
        <label className="label" htmlFor={`${uid}-date`}>
          Tanggal
        </label>
        <input
          id={`${uid}-date`}
          name="date"
          type="date"
          required
          defaultValue={session?.date ?? today}
          max={today}
          className="input num"
        />
      </div>

      {/* Resource yang dipakai di sesi ini */}
      <div className="col-span-2">
        <span className="label">{isEdit ? "Tambah resource baru" : "Resource"}</span>
        {rows.length > 0 && (
          <ul className="mb-2 space-y-2">
            {rows.map((key, i) => (
              <li key={key} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_1.2fr_auto_auto]">
                <input
                  name="resourceTitle"
                  maxLength={200}
                  placeholder="Judul (mis. React docs)"
                  aria-label={`Judul resource ${i + 1}`}
                  className="input col-span-2 sm:col-span-1"
                />
                <input
                  name="resourceUrl"
                  type="url"
                  required
                  placeholder="https://…"
                  aria-label={`URL resource ${i + 1}`}
                  className="input"
                />
                <select
                  name="resourceType"
                  defaultValue="article"
                  aria-label={`Jenis resource ${i + 1}`}
                  className="input hidden w-auto sm:block"
                >
                  {(Object.keys(RESOURCE_LABEL) as ResourceType[]).map((t) => (
                    <option key={t} value={t}>
                      {RESOURCE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(key)}
                  aria-label={`Hapus resource ${i + 1}`}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-paper hover:text-danger"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={addRow}
          className="w-full rounded-lg border border-dashed border-line px-3 py-2 text-left text-sm text-muted transition hover:border-accent hover:text-accent"
        >
          + Tambah link resource
        </button>
      </div>

      {error && (
        <p role="alert" className="col-span-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="col-span-2 flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Catat sesi"}
        </button>
        {isEdit && (
          <button type="button" onClick={onDone} disabled={pending} className="btn-ghost">
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
