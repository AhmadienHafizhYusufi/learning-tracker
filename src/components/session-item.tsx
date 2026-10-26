"use client";

import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { deleteSession } from "@/app/actions";
import { formatDate, formatMinutes } from "@/lib/format";
import { ConfirmButton } from "./form-controls";
import { LogSessionForm, type EditableSessionData } from "./log-session-form";

/** Properti dari useSortable (dnd-kit) untuk membuat item bisa di-drag */
export type SortableBindings = {
  setNodeRef: (el: HTMLElement | null) => void;
  style: CSSProperties;
  handleProps: HTMLAttributes<HTMLButtonElement>;
  setHandleRef: (el: HTMLElement | null) => void;
  isDragging: boolean;
};

/**
 * Satu sesi di daftar log. Tombol "Edit" mengganti tampilan dengan form edit.
 * `children` = isi sesi yang dirender di server (catatan + resource).
 * `sortable` = opsional; kalau ada, muncul pegangan ⠿ untuk drag & drop.
 */
export function SessionItem({
  session,
  topicId,
  children,
  sortable,
}: {
  session: EditableSessionData;
  topicId: number;
  children: ReactNode;
  sortable?: SortableBindings;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li
        id={`sesi-${session.id}`}
        ref={sortable?.setNodeRef}
        style={sortable?.style}
        className="rounded-lg border border-accent/60 bg-accent-soft/20 p-4"
      >
        <p className="mb-3 text-xs font-medium tracking-wide text-accent uppercase">Edit sesi</p>
        <LogSessionForm topicId={topicId} session={session} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li
      id={`sesi-${session.id}`}
      ref={sortable?.setNodeRef}
      style={sortable?.style}
      className={`group relative rounded-lg border bg-card p-4 ${
        sortable?.isDragging
          ? "z-10 border-accent shadow-lg ring-2 ring-accent/30"
          : "border-line"
      }`}
    >
      <div className="flex items-start gap-2">
        {sortable && (
          <button
            type="button"
            ref={sortable.setHandleRef}
            {...sortable.handleProps}
            aria-label={`Pindahkan sesi "${session.title ?? "tanpa judul"}"`}
            title="Drag untuk memindahkan (atau fokus + Spasi, lalu panah atas/bawah)"
            className={`-ml-1.5 mt-0.5 grid h-7 w-5 shrink-0 touch-none place-items-center rounded text-muted transition hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${
              sortable.isDragging ? "cursor-grabbing text-accent" : "cursor-grab"
            }`}
          >
            <GripIcon />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{session.title ?? <span className="text-muted">Tanpa judul</span>}</h3>
          <p className="text-xs text-muted">
            {formatDate(session.date, { weekday: "short" })} ·{" "}
            <span className="num">{formatMinutes(session.durationMinutes)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-muted hover:text-accent"
          >
            ✎ Edit
          </button>
          <form action={deleteSession}>
            <input type="hidden" name="id" value={session.id} />
            <input type="hidden" name="topicId" value={topicId} />
            <ConfirmButton message="Hapus sesi ini beserta resource-nya?">Hapus</ConfirmButton>
          </form>
        </div>
      </div>
      <div className={sortable ? "pl-5" : undefined}>{children}</div>
    </li>
  );
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
      <circle cx="2.5" cy="3" r="1.4" />
      <circle cx="7.5" cy="3" r="1.4" />
      <circle cx="2.5" cy="8" r="1.4" />
      <circle cx="7.5" cy="8" r="1.4" />
      <circle cx="2.5" cy="13" r="1.4" />
      <circle cx="7.5" cy="13" r="1.4" />
    </svg>
  );
}
