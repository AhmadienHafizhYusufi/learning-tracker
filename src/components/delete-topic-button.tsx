"use client";

import { useId, useRef, useState, useTransition } from "react";
import { deleteTopic } from "@/app/actions";

/**
 * Tombol hapus topik + dialog konfirmasi.
 * Dialog menyebutkan apa saja yang ikut terhapus supaya user tidak kaget.
 * `goToList` dipakai di halaman detail topik: setelah dihapus, server mengarahkan ke /topics.
 */
export function DeleteTopicButton({
  topic,
  variant = "icon",
  goToList = false,
}: {
  topic: { id: number; title: string; sessionCount: number; resourceCount: number };
  variant?: "icon" | "link";
  goToList?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const descId = useId();

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      let message: string | null = null;
      try {
        // Kalau goToList, server me-redirect → res bisa undefined
        const res = await deleteTopic(topic.id, goToList);
        if (res && !res.ok) message = res.error;
      } catch {
        message = "Gagal menghapus topik. Coba lagi.";
      }
      if (message) {
        setError(message);
        return;
      }
      dialogRef.current?.close();
    });
  }

  const lost = [
    topic.sessionCount > 0 && `${topic.sessionCount} sesi belajar beserta catatan & gambarnya`,
    topic.resourceCount > 0 && `${topic.resourceCount} resource`,
  ].filter(Boolean) as string[];

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={open}
          aria-label={`Hapus topik ${topic.title}`}
          title="Hapus topik"
          className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
        >
          <TrashIcon />
        </button>
      ) : (
        <button type="button" onClick={open} className="text-xs text-danger hover:underline">
          Hapus topik
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descId}
        // Klik di luar kotak dialog (backdrop) = batal
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onCancel={(e) => {
          if (pending) e.preventDefault(); // jangan bisa ditutup (Esc) saat sedang menghapus
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
              <TrashIcon />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-semibold">
                Hapus topik?
              </h2>
              <div id={descId} className="mt-1 space-y-2 text-sm text-muted">
                <p>
                  <strong className="font-medium break-words text-ink">“{topic.title}”</strong> akan dihapus
                  permanen{lost.length ? " beserta:" : "."}
                </p>
                {lost.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5">
                    {lost.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
                <p>Tindakan ini tidak bisa dibatalkan.</p>
              </div>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-paper/60 px-5 py-3">
          {/* autoFocus di Batal: Enter yang tidak sengaja tidak langsung menghapus */}
          <button type="button" autoFocus onClick={close} disabled={pending} className="btn-ghost">
            Batal
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-danger px-3.5 py-2 text-sm font-medium text-card transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Menghapus…" : "Hapus topik"}
          </button>
        </div>
      </dialog>
    </>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2.5 4h11M6.5 4V2.75h3V4M4 4l.7 9.1a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4M6.75 6.75v4.5M9.25 6.75v4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
