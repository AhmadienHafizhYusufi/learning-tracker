import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteResource,
  deleteTopic,
  toggleResource,
  updateTopic,
} from "@/app/actions";
import type { Resource } from "@/db/schema";
import { ConfirmButton, SubmitButton } from "@/components/form-controls";
import { LogSessionForm } from "@/components/log-session-form";
import { NoteContent } from "@/components/note-content";
import { SortableSessionList } from "@/components/sortable-session-list";
import { StatusBadge } from "@/components/status-badge";
import { TableOfContents, type TocItem } from "@/components/table-of-contents";
import { TopicFields } from "@/components/topic-fields";
import { extractNoteHeadings, headingId } from "@/lib/headings";
import { formatMinutes, hostOf, RESOURCE_LABEL } from "@/lib/format";
import { getCategories, getTopic } from "@/lib/queries";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isInteger(topicId) || topicId <= 0) notFound();

  const userId = await requirePageUser();
  // Topik milik user lain → 404 (sama seperti topik yang tidak ada)
  const [data, categories] = await Promise.all([getTopic(userId, topicId), getCategories(userId)]);
  if (!data) notFound();
  const { topic, sessions, unattachedResources, resourceCount, resourceDone, totalMinutes } = data;

  // Daftar isi: Topik → Log sesi belajar → tiap sesi → H1 di catatan sesi itu
  const toc: TocItem[] = [
    { id: "topik", label: topic.title, level: 0 },
    { id: "log-sesi", label: "Log sesi belajar", level: 0 },
    ...sessions.flatMap((s): TocItem[] => [
      { id: `sesi-${s.id}`, label: s.title ?? "Tanpa judul", level: 1 },
      ...extractNoteHeadings(s.note).map(
        (text, i): TocItem => ({ id: headingId(s.id, i), label: text, level: 2 }),
      ),
    ]),
  ];

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
      <aside className="lg:pt-10">
        <TableOfContents items={toc} />
      </aside>

    <div className="space-y-6">
      <Link href="/topics" className="inline-block text-sm text-muted hover:text-ink">
        ← Semua topik
      </Link>

      {/* Header */}
      <section id="topik" className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={topic.status} />
              {topic.category && <span className="text-xs text-muted">{topic.category}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{topic.title}</h1>
            {topic.description && <p className="mt-1 max-w-prose text-sm text-muted">{topic.description}</p>}
          </div>
          <dl className="grid grid-cols-3 gap-6 text-right">
            <Metric label="Waktu" value={formatMinutes(totalMinutes)} />
            <Metric label="Sesi" value={`${sessions.length}`} />
            <Metric label="Resource" value={`${resourceDone}/${resourceCount}`} />
          </dl>
        </div>

        <details className="group mt-4 border-t border-line pt-4">
          <summary className="cursor-pointer list-none text-sm text-muted hover:text-ink">
            <span className="group-open:hidden">✎ Edit topik</span>
            <span className="hidden group-open:inline">× Tutup edit</span>
          </summary>
          <form action={updateTopic} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={topic.id} />
            <TopicFields topic={topic} categories={categories} />
            <div className="flex items-center justify-between sm:col-span-2">
              <SubmitButton>Simpan perubahan</SubmitButton>
            </div>
          </form>
          <form action={deleteTopic} className="mt-3 text-right">
            <input type="hidden" name="id" value={topic.id} />
            <ConfirmButton
              message={`Hapus topik "${topic.title}" beserta semua sesi dan resource-nya?`}
              className="text-xs text-danger hover:underline"
            >
              Hapus topik
            </ConfirmButton>
          </form>
        </details>
      </section>

      {/* Log sesi belajar (termasuk resource tiap sesi) */}
      <section id="log-sesi" className="card p-5">
        <h2 className="mb-4 font-semibold">Log sesi belajar</h2>
        <LogSessionForm topicId={topic.id} />

        {sessions.length ? (
          <div className="mt-6 border-t border-line pt-4">
            <SortableSessionList
              topicId={topic.id}
              entries={sessions.map((s) => ({
                session: {
                  id: s.id,
                  title: s.title,
                  note: s.note,
                  durationMinutes: s.durationMinutes,
                  date: s.date,
                },
                // Dirender di server, lalu diteruskan ke komponen client sebagai ReactNode
                content: (
                  <>
                    {s.note && (
                      <div className="mt-3">
                        <NoteContent html={s.note} sessionId={s.id} />
                      </div>
                    )}
                    {s.resources.length > 0 && (
                      <ResourceList
                        resources={s.resources}
                        topicId={topic.id}
                        className="mt-3 border-t border-line pt-2"
                      />
                    )}
                  </>
                ),
              }))}
            />
          </div>
        ) : (
          <p className="mt-6 border-t border-line pt-4 text-sm text-muted">Belum ada sesi untuk topik ini.</p>
        )}

        {unattachedResources.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="label">Resource lain (sebelum ada sesi)</h3>
            <ResourceList resources={unattachedResources} topicId={topic.id} />
          </div>
        )}
      </section>
    </div>
    </div>
  );
}

function ResourceList({
  resources,
  topicId,
  className = "",
}: {
  resources: Resource[];
  topicId: number;
  className?: string;
}) {
  return (
    <ul className={className}>
      {resources.map((r) => (
        <li key={r.id} className="group/r flex items-center gap-3 py-1.5">
          <form action={toggleResource}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="topicId" value={topicId} />
            <input type="hidden" name="done" value={String(!r.done)} />
            <button
              type="submit"
              aria-label={r.done ? "Tandai belum selesai" : "Tandai selesai"}
              className={`grid size-5 place-items-center rounded border text-[11px] transition ${
                r.done ? "border-accent bg-accent text-card" : "border-line hover:border-accent"
              }`}
            >
              {r.done ? "✓" : ""}
            </button>
          </form>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`min-w-0 flex-1 ${r.done ? "text-muted line-through decoration-line" : ""}`}
          >
            <span className="text-sm hover:text-accent">{r.title}</span>
            <span className="ml-2 text-xs text-muted">
              {RESOURCE_LABEL[r.type]} · {hostOf(r.url)}
            </span>
          </a>
          <form action={deleteResource} className="transition sm:opacity-0 sm:group-hover/r:opacity-100 sm:focus-within:opacity-100">
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="topicId" value={topicId} />
            <ConfirmButton message="Hapus resource ini?">✕</ConfirmButton>
          </form>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num text-lg font-semibold">{value}</dd>
    </div>
  );
}
