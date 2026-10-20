"use client";

import { useState, type ReactNode } from "react";
import { deleteSession } from "@/app/actions";
import { formatDate, formatMinutes } from "@/lib/format";
import { ConfirmButton } from "./form-controls";
import { LogSessionForm, type EditableSessionData } from "./log-session-form";

/**
 * Satu sesi di daftar log. Tombol "Edit" mengganti tampilan dengan form edit.
 * `children` = isi sesi yang dirender di server (catatan + resource).
 */
export function SessionItem({
  session,
  topicId,
  children,
}: {
  session: EditableSessionData;
  topicId: number;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-lg border border-accent/60 bg-accent-soft/20 p-4">
        <p className="mb-3 text-xs font-medium tracking-wide text-accent uppercase">Edit sesi</p>
        <LogSessionForm topicId={topicId} session={session} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="group rounded-lg border border-line p-4">
      <div className="flex items-start gap-3">
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
      {children}
    </li>
  );
}
