"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { reorderSessions } from "@/app/actions";
import type { EditableSessionData } from "./log-session-form";
import { SessionItem } from "./session-item";

export type SortableSessionEntry = {
  session: EditableSessionData;
  /** Isi sesi yang sudah dirender di server (catatan + resource) */
  content: ReactNode;
};

/**
 * Daftar sesi yang urutannya bisa diubah dengan drag & drop.
 * Mouse: tarik pegangan ⠿. Layar sentuh: tekan-tahan pegangan ⠿ lalu geser.
 * Keyboard: fokus ke pegangan, Spasi untuk angkat, panah atas/bawah, Spasi untuk taruh.
 */
export function SortableSessionList({
  topicId,
  entries,
}: {
  topicId: number;
  entries: SortableSessionEntry[];
}) {
  const serverOrder = entries.map((e) => e.session.id);
  const [order, setOrder] = useState(serverOrder);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Data dari server berubah (sesi baru/dihapus/diedit) → ikuti urutan server
  const serverKey = serverOrder.join(",");
  useEffect(() => {
    setOrder(serverKey ? serverKey.split(",").map(Number) : []);
  }, [serverKey]);

  const byId = new Map(entries.map((e) => [e.session.id, e]));
  // Buang ID yang sudah tidak ada (mis. baru dihapus) sebelum efek di atas berjalan
  const visible = order.filter((id) => byId.has(id));

  const sensors = useSensors(
    // Harus digeser 5px dulu → klik biasa pada pegangan tidak dianggap drag
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Di HP: tekan-tahan 200ms supaya tidak bentrok dengan scroll
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = visible;
    const next = arrayMove(
      visible,
      visible.indexOf(Number(active.id)),
      visible.indexOf(Number(over.id)),
    );
    setOrder(next); // langsung terlihat (optimistic update)
    setError(null);
    startSaving(async () => {
      let message: string | null = null;
      try {
        const res = await reorderSessions(topicId, next);
        if (!res.ok) message = res.error;
      } catch {
        // Error dari server (mis. koneksi putus) — pesan aslinya disembunyikan di production
        message = "Gagal menyimpan urutan. Coba lagi.";
      }
      if (message) {
        setOrder(previous); // kembalikan urutan semula
        setError(message);
      }
    });
  }

  return (
    <div>
      <div className="mb-2 flex h-5 items-center justify-between text-xs text-muted">
        <span>Drag ⠿ untuk mengatur urutan</span>
        {saving && <span>Menyimpan urutan…</span>}
        {error && (
          <span role="alert" className="text-danger">
            {error}
          </span>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Tekan Spasi untuk mengangkat sesi. Gunakan panah atas/bawah untuk memindahkan, Spasi untuk menaruh, Escape untuk batal.",
          },
        }}
      >
        <SortableContext items={visible} strategy={verticalListSortingStrategy}>
          <ol className="space-y-3">
            {visible.map((id) => {
              const entry = byId.get(id)!;
              return (
                <SortableSession key={id} topicId={topicId} session={entry.session}>
                  {entry.content}
                </SortableSession>
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableSession({
  topicId,
  session,
  children,
}: {
  topicId: number;
  session: EditableSessionData;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  return (
    <SessionItem
      topicId={topicId}
      session={session}
      sortable={{
        setNodeRef,
        setHandleRef: setActivatorNodeRef,
        style: { transform: CSS.Translate.toString(transform), transition },
        handleProps: { ...attributes, ...listeners },
        isDragging,
      }}
    >
      {children}
    </SessionItem>
  );
}
